import type { IncomingMessage } from "node:http";
import Router from "@koa/router";
import { errors, Provider } from "oidc-provider";
import type { KoaContextWithOIDC } from "oidc-provider";
import {
  type DatabaseLayer,
  type ClientFactoryLayer,
} from "@/foundation/composition";
import type { AppConfig } from "@/config/config";
import { MemoryAdapter } from "../data/memory-adapter";
import { createPostgresAdapterFactory } from "../data/oauth-adapter-model";
import { resolveAuthUser } from "@/features/ai-agent/utils/route-guards";
import { assertLedgerAccess } from "@/features/ledger/utils/ledger-access-check";
import { API_SCOPES, assertSessionIdentity } from "@/server/api/identity";
import { legacyMcpResource } from "@/features/oauth/utils/oidc-verify";
import { apiResource } from "@/features/oauth/utils/oidc-verify";
import { CATEGORY_HTTP_STATUS, DomainError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import {
  MOBILE_CLIENT_ID,
  MOBILE_REDIRECT_URIS,
} from "@/features/oauth/constants";

export {
  MOBILE_CLIENT_ID,
  MOBILE_REDIRECT_URIS,
} from "@/features/oauth/constants";

const oidcLogger = logger.child({ module: "oidc-provider" });

const DAY_SECONDS = 24 * 60 * 60;
/** Refresh-token lifetime for every client except the native app. */
const DEFAULT_REFRESH_TTL = 30 * DAY_SECONDS;
/** Grant lifetime for every client except the native app. */
const DEFAULT_GRANT_TTL = 14 * DAY_SECONDS;
/**
 * oidc-provider's own rotation cutoff (`rotateRefreshToken` in
 * lib/helpers/defaults.js): a refresh chain older than this stops rotating.
 * Replicated because the default is not exported and we only override it for
 * the native client.
 */
const ROTATION_LIFETIME_CUTOFF = 365.25 * DAY_SECONDS;

const isMobileClient = (clientId: unknown): boolean =>
  clientId === MOBILE_CLIENT_ID;

/** The one `screen_hint` value this server forwards to the interaction page. */
const SIGNUP_SCREEN_HINT = "signup";

/**
 * Refresh-token and grant lifetimes in seconds, per client.
 *
 * A native-app session is an idle window rather than a fixed term: the rotating
 * refresh token and the grant behind it are both re-issued with a full lifetime
 * on every refresh, so a phone in regular use never gets signed out and only one
 * that goes quiet for the whole window has to re-authorize. Every other client
 * keeps the lifetimes it had before.
 */
export function oauthLifetimes(mobileSessionDays: number): {
  refreshToken: (clientId: unknown) => number;
  grant: (clientId: unknown) => number;
} {
  const mobileSessionTtl = mobileSessionDays * DAY_SECONDS;
  // The grant has to outlive the refresh token it backs: `validateGrant` runs
  // before the token is consumed, so a grant that expires first fails the
  // refresh with `invalid_grant` even though the token itself is still valid.
  // A day of slack absorbs clock skew and the ordering of the two writes.
  const mobileGrantTtl = mobileSessionTtl + DAY_SECONDS;
  return {
    refreshToken: (clientId) =>
      isMobileClient(clientId) ? mobileSessionTtl : DEFAULT_REFRESH_TTL,
    grant: (clientId) =>
      isMobileClient(clientId) ? mobileGrantTtl : DEFAULT_GRANT_TTL,
  };
}

/**
 * Whether a refresh exchange should mint a replacement refresh token.
 *
 * The native app rotates unconditionally — rotation is what slides its
 * idle-window session forward, since each rotation mints a token with a full
 * fresh lifetime, and oidc-provider's default stops rotating a chain older than
 * {@link ROTATION_LIFETIME_CUTOFF}, which would strand an actively used phone at
 * a hard cap regardless of activity. Every other client keeps that default,
 * mirrored here because oidc-provider does not export it.
 */
export function shouldRotateRefreshToken(
  client: { clientId?: string; clientAuthMethod?: string },
  refreshToken: {
    totalLifetime(): number;
    isSenderConstrained(): boolean;
    ttlPercentagePassed(): number;
  },
): boolean {
  if (isMobileClient(client.clientId)) return true;
  if (refreshToken.totalLifetime() >= ROTATION_LIFETIME_CUTOFF) return false;
  if (
    client.clientAuthMethod === "none" &&
    !refreshToken.isSenderConstrained()
  ) {
    return true;
  }
  return refreshToken.ttlPercentagePassed() >= 70;
}

interface IdentityClaims {
  sub: string;
  email?: string;
  email_verified?: boolean;
  preferred_username?: string;
  name?: string;
  picture?: string;
  [key: string]: unknown;
}

// Static client for third-party identity login (e.g. the Discourse forum's "Log in
// with Beancount"). No dynamic registration for this one — coexists here with open
// Dynamic Client Registration for MCP/AI-agent clients (features.registration below);
// per-client grant_types/scopes keep the two use cases from bleeding into each other.
//
// NOT a public/secretless client, despite PKCE being enforced unconditionally below
// — verified against oidc-provider's own client_auth.js that this can't actually
// work with discourse-openid-connect: that plugin's OmniAuth strategy always sends
// client authentication (Authorization: Basic <id>:<secret>, or client_secret_post
// per its discovery-driven auth_scheme switch — see openid_connect_authenticator.rb
// `discover!`), it never omits credentials for a "none" client. oidc-provider's
// client_auth.js explicitly rejects an empty secret in that Authorization header
// (`if (!clientSecret) throw new InvalidRequest(...)`) before even comparing it
// against the registered client, so neither `token_endpoint_auth_method: "none"`
// nor a registered empty-string secret can work — a real secret is required.
// Omitted entirely (not registered with an empty client_id) when unconfigured.
function buildStaticClients(
  config: AppConfig,
): NonNullable<ConstructorParameters<typeof Provider>[1]>["clients"] {
  const { clientId, clientSecret, redirectUri } = config.oauth.discourseClient;
  type StaticClient = NonNullable<
    NonNullable<ConstructorParameters<typeof Provider>[1]>["clients"]
  >[number];
  const clients: StaticClient[] = [
    {
      client_id: MOBILE_CLIENT_ID,
      client_name: "Beancount Mobile",
      application_type: "native",
      redirect_uris: [...MOBILE_REDIRECT_URIS],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: `openid offline_access ${API_SCOPES.join(" ")}`,
    },
  ];
  if (!clientId || !clientSecret) return clients;
  clients.push({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: [redirectUri],
    grant_types: ["authorization_code"],
    response_types: ["code"],
    token_endpoint_auth_method: "client_secret_basic",
  });
  return clients;
}

export function oauthWellKnownPath(kind: string, absoluteUrl: string): string {
  const path = new URL(absoluteUrl).pathname.replace(/^\/|\/$/g, "");
  return `/.well-known/${kind}${path ? `/${path}` : ""}`;
}

export function setOidcRoutes(
  router: Router,
  layers: { database: DatabaseLayer; clients: ClientFactoryLayer },
  config: AppConfig,
): void {
  const jwks = config.oauth.jwks;
  if (!jwks) {
    const unavailable: Router.Middleware = (ctx) => {
      ctx.status = 503;
      ctx.body = {
        error: "oauth_not_configured",
        error_description:
          "OAuth is unavailable because this server has no valid signing-key configuration.",
      };
    };
    oidcLogger.warn("OAuth routes are disabled", {
      reason: config.oauth.unavailableReason ?? "signing keys unavailable",
    });
    router.all("/api-gateway/oauth/{*path}", unavailable);
    router.all(
      oauthWellKnownPath("oauth-authorization-server", config.oauth.issuer),
      unavailable,
    );
    router.all("/.well-known/oauth-protected-resource", unavailable);
    router.all(
      oauthWellKnownPath(
        "oauth-protected-resource",
        apiResource(config.oauth.issuer),
      ),
      unavailable,
    );
    return;
  }

  const isIdentityClient = (clientId: unknown): boolean =>
    clientId === config.oauth.discourseClient.clientId;
  const lifetimes = oauthLifetimes(config.oauth.mobileSessionDays);
  const mobileGrantTtl = lifetimes.grant(MOBILE_CLIENT_ID);

  const provider = new Provider(config.oauth.issuer, {
    jwks,
    // Postgres in every environment except automated tests — dev/staging both have
    // a real Postgres available (docker-compose), and this app's Environment type
    // has no "staging" value, so a production-only gate would silently leave a
    // staging deploy on in-memory storage, losing all OAuth state on every restart.
    adapter:
      config.env === "test"
        ? MemoryAdapter
        : createPostgresAdapterFactory(layers.database.db),

    clients: buildStaticClients(config),
    responseTypes: ["code"],

    // `screen_hint=signup` lets the native app say "the user tapped Sign Up" so
    // the interaction page can open on registration instead of the login form.
    // oidc-provider discards any authorization parameter it does not know, so
    // the name has to be whitelisted here. Values are not validated: it is a
    // display hint, and an app one release ahead of a self-hosted server must
    // still get a login form, not an error. `interactions.url` forwards only
    // the value it understands.
    extraParams: ["screen_hint"],

    features: {
      devInteractions: { enabled: false },
      registration: { enabled: true },
      resourceIndicators: {
        enabled: true,
        // The identity client (Discourse) never gets a resource — leaving it
        // undefined here makes oidc-provider issue a plain userinfo-scoped access
        // token instead of one bound to the MCP resource (see oidc-provider's own
        // resourceIndicators docs: "if ... no resource parameter is present — an
        // Access Token for the UserInfo Endpoint is returned").
        defaultResource: (ctx, client, oneOf) => {
          // Falsy (not just literally undefined) reads as "no resource" —
          // see oidc-provider's checkResource/emptyResource.
          if (isIdentityClient(client.clientId)) return "";
          if (oneOf) return oneOf;
          if (isMobileClient(client.clientId)) {
            return apiResource(config.oauth.issuer);
          }
          // Still the legacy MCP indicator during the compatibility window, on
          // purpose. A grant stored before this change carries only that
          // indicator, and oidc-provider rejects a token request naming a
          // resource its grant does not carry (`resolveResource` ->
          // InvalidTarget). Switching the default now would break refresh for
          // every MCP client that authorized earlier. New grants additionally
          // carry the API indicator (see the consent handler below), so the
          // default can be flipped to `apiResource` once the window closes —
          // see legacyMcpResource for the date.
          return ctx.oidc.route === "authorization"
            ? [
                legacyMcpResource(config.oauth.issuer),
                apiResource(config.oauth.issuer),
              ]
            : legacyMcpResource(config.oauth.issuer);
        },
        getResourceServerInfo: (_ctx, resourceIndicator, client) => {
          const canonicalApiResource = apiResource(config.oauth.issuer);
          if (isIdentityClient(client.clientId)) {
            throw new errors.InvalidTarget(
              "identity clients cannot request an API resource",
            );
          }
          if (
            isMobileClient(client.clientId) &&
            resourceIndicator !== canonicalApiResource
          ) {
            throw new errors.InvalidTarget(
              "the native client must use the API resource",
            );
          }
          const allowed = new Set([
            canonicalApiResource,
            legacyMcpResource(config.oauth.issuer),
          ]);
          if (!allowed.has(resourceIndicator)) {
            throw new errors.InvalidTarget("unknown resource indicator");
          }
          return {
            scope: `openid offline_access ${API_SCOPES.join(" ")}`,
            accessTokenFormat: "jwt",
          };
        },
      },
      revocation: { enabled: true },
    },

    pkce: {
      required: () => true,
    },

    routes: {
      authorization: "/api-gateway/oauth/auth",
      token: "/api-gateway/oauth/token",
      registration: "/api-gateway/oauth/reg",
      revocation: "/api-gateway/oauth/revoke",
      jwks: "/api-gateway/oauth/jwks",
      end_session: "/api-gateway/oauth/logout",
      // userinfo and PAR are enabled by oidc-provider's defaults; remap them under
      // the gateway namespace so the advertised discovery endpoints are reachable
      // (the catch-all delegate + dashboard proxy only cover /api-gateway/oauth/*).
      userinfo: "/api-gateway/oauth/me",
      pushed_authorization_request: "/api-gateway/oauth/request",
    },

    interactions: {
      url: (_ctx, interaction) => {
        const path = isIdentityClient(interaction.params.client_id)
          ? "/oauth/identity-consent"
          : isMobileClient(interaction.params.client_id)
            ? "/oauth/mobile-consent"
            : "/oauth/consent";
        const consentUrl = new URL(
          path.replace(/^\//, ""),
          `${config.oauth.interactionUrl}/`,
        );
        consentUrl.searchParams.set("uid", interaction.uid);
        if (isMobileClient(interaction.params.client_id)) {
          consentUrl.searchParams.set(
            "scope",
            (interaction.params.scope as string | undefined) ?? "openid",
          );
          // Only the native client's interaction page knows what to do with
          // the hint; MCP and identity clients never see it, and a value this
          // server does not recognise is simply not forwarded.
          if (interaction.params.screen_hint === SIGNUP_SCREEN_HINT) {
            consentUrl.searchParams.set("screen_hint", SIGNUP_SCREEN_HINT);
          }
        }
        return consentUrl.toString();
      },
    },

    // accountId (this function's `sub` param) is "userId:ledgerId" for MCP grants,
    // bare "userId" for identity grants. oidc-provider always uses accountId
    // itself, verbatim, as the id_token/userinfo `sub` claim — the `sub` key
    // returned from claims() below is required by the IdentityClaims type but is
    // not actually consulted for that purpose; look up the real user by the bare
    // userId regardless of which shape accountId has.
    findAccount: async (_ctx, sub) => {
      const userId = sub.split(":")[0];
      const user = await layers.database.models.user.getById(
        layers.database.db,
        userId,
      );
      return {
        accountId: sub,
        claims: (_use, scope): IdentityClaims => {
          const claims: IdentityClaims = { sub };
          if (!user) return claims;
          const scopes = new Set(scope.split(" "));
          if (scopes.has("email")) {
            claims.email = user.email;
            // Every account is created through a magic-link or OTP flow that
            // already proves address ownership — no separate verified flag exists.
            claims.email_verified = true;
          }
          if (scopes.has("profile")) {
            claims.preferred_username = user.ledger_username;
            const name = [user.firstName, user.lastName]
              .filter(Boolean)
              .join(" ");
            if (name) claims.name = name;
            if (user.avatarUrl) claims.picture = user.avatarUrl;
          }
          return claims;
        },
      };
    },

    // accountId is "userId:ledgerId" for MCP grants — split into a clean ledger_id
    // claim; identity grants have no ledger suffix, so this resolves to undefined.
    extraTokenClaims: (_ctx, token) => {
      const accountId = "accountId" in token ? (token.accountId ?? "") : "";
      const parts = accountId.split(":");
      const ledgerId = parts.slice(1).join(":");
      return { ledger_id: ledgerId || undefined };
    },

    clientDefaults: {
      id_token_signed_response_alg: "ES256",
    },

    cookies: { keys: [config.jwt.secret] },
    scopes: ["openid", "offline_access", "profile", "email", ...API_SCOPES],
    claims: {
      openid: ["sub"],
      email: ["email", "email_verified"],
      profile: ["name", "preferred_username", "picture"],
    },

    ttl: {
      AccessToken: 3600,
      AuthorizationCode: 600,
      RefreshToken: (_ctx, token, client) =>
        lifetimes.refreshToken(client?.clientId ?? token.clientId),
      Interaction: 600,
      // The authorization server's own browser SSO cookie — deliberately short
      // and unrelated to how long an app stays signed in. It only decides
      // whether a *new* authorization has to re-enter credentials.
      Session: 1209600,
      Grant: (_ctx, grant) => lifetimes.grant(grant.clientId),
    },

    rotateRefreshToken: (ctx) => {
      const { RefreshToken: refreshToken, Client: client } = ctx.oidc.entities;
      if (!refreshToken || !client) return false;
      return shouldRotateRefreshToken(client, refreshToken);
    },

    ...(config.env !== "production"
      ? { dangerouslyAllowInsecureHttpToo: true }
      : {}),
  });

  // Provider extends Koa — proxy=true makes it read X-Forwarded-Host/Proto when
  // building absolute URLs (discovery endpoints, auth-flow redirects).
  provider.proxy = true;

  // oidc-provider writes a Grant only at authorization time, and every refresh
  // runs `validateGrant` first — so the Grant's expiry, not the refresh token's,
  // is what actually caps a session. Re-save the native app's grant after a
  // successful refresh so its expiry slides forward with the rotated token;
  // without this an actively used phone would still be signed out a fixed term
  // after it last logged in. `provider.use` inserts ahead of the provider's own
  // dispatch, so `next()` here is the token endpoint itself.
  provider.use(async (ctx, next) => {
    await next();
    const { oidc } = ctx as unknown as KoaContextWithOIDC;
    if (oidc?.route !== "token" || ctx.status !== 200) return;
    const refreshToken = oidc.entities.RefreshToken;
    if (!refreshToken?.grantId || !isMobileClient(refreshToken.clientId))
      return;

    try {
      const grant = await provider.Grant.find(refreshToken.grantId);
      if (!grant) return;
      // An active app refreshes hourly; rewriting the row every time buys
      // nothing. Skip while the grant still holds all but a day of a full term.
      const now = Math.floor(Date.now() / 1000);
      if (grant.exp && grant.exp - now > mobileGrantTtl - DAY_SECONDS) return;
      // `save()` persists `remainingTTL`, which is whatever is *left* once exp
      // is set. Clearing both cached values makes it compute a fresh full term
      // from `ttl.Grant` instead of re-saving the time already served.
      delete grant.exp;
      delete (grant as { expiresIn?: number }).expiresIn;
      await grant.save();
    } catch (error) {
      // The refresh itself already succeeded — the client keeps its new tokens
      // and the grant simply does not slide this time. Never turn a bookkeeping
      // failure into a failed sign-in.
      oidcLogger.warn("could not extend the mobile grant lifetime", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  const cb = provider.callback();

  // The discovery document and every redirect must reflect the configured issuer
  // — the same value that signs token `iss` — NOT whatever Host/X-Forwarded-* the
  // current proxy chain happens to send. Without this, oidc-provider derives those
  // absolute URLs from the request host, so a change in upstream network topology
  // (new LB hop dropping X-Forwarded-Host, a client hitting the backend directly,
  // a missing X-Forwarded-Proto) makes the endpoints drift away from `issuer` and
  // breaks OIDC/MCP clients that enforce same-origin metadata. Pin the forwarded
  // headers to the issuer so OIDC responses stay deterministic across topologies.
  const issuerUrl = new URL(config.oauth.issuer);
  function pinRequestToIssuer(req: IncomingMessage): void {
    req.headers.host = issuerUrl.host;
    req.headers["x-forwarded-host"] = issuerUrl.host;
    req.headers["x-forwarded-proto"] = issuerUrl.protocol.slice(0, -1); // "https"
    // The public reverse proxy strips an issuer path prefix before Koa routing.
    // oidc-provider normally learns that mount path from `originalUrl`; restore
    // it here so discovery and resume URLs retain the configured public prefix.
    const issuerPath = issuerUrl.pathname.replace(/\/$/, "");
    if (issuerPath) {
      (req as IncomingMessage & { originalUrl?: string }).originalUrl =
        `${issuerPath}${req.url ?? ""}`;
    }
  }

  function bridgeMcpAuthorizationResources(req: IncomingMessage): void {
    if (!req.url) return;
    const url = new URL(req.url, config.oauth.issuer);
    if (url.pathname !== "/api-gateway/oauth/auth") return;
    const clientId = url.searchParams.get("client_id");
    if (isIdentityClient(clientId) || isMobileClient(clientId)) return;

    const legacy = legacyMcpResource(config.oauth.issuer);
    const canonical = apiResource(config.oauth.issuer);
    const resources = url.searchParams.getAll("resource");
    if (resources.includes(legacy) && !resources.includes(canonical)) {
      url.searchParams.append("resource", canonical);
      req.url = `${url.pathname}${url.search}`;
    }
  }

  // --- Interaction endpoints (registered BEFORE catch-all) ---

  router.get("/api-gateway/oauth/interaction/:uid", async (ctx) => {
    try {
      pinRequestToIssuer(ctx.req);
      const interaction = await provider.interactionDetails(ctx.req, ctx.res);
      ctx.body = {
        uid: interaction.uid,
        client: interaction.params.client_id,
        scope: interaction.params.scope,
        resource: interaction.params.resource,
      };
    } catch (err) {
      oidcLogger.warn("Failed to get interaction details", {
        uid: ctx.params.uid,
        error: err instanceof Error ? err.message : String(err),
      });
      ctx.status = 400;
      ctx.body = { error: "interaction_not_found" };
    }
  });

  router.post("/api-gateway/oauth/interaction/:uid/login", async (ctx) => {
    try {
      pinRequestToIssuer(ctx.req);
      const interaction = await provider.interactionDetails(ctx.req, ctx.res);
      const { params, prompt } = interaction;

      const interactionBody = ctx.request.body as {
        decision?: string;
        ledgerId?: string;
        scope?: string;
      };
      if (interactionBody.decision === "cancel") {
        await provider.interactionFinished(
          ctx.req,
          ctx.res,
          { error: "access_denied", error_description: "User cancelled" },
          { mergeWithLastSubmission: false },
        );
        ctx.respond = false;
        return;
      }

      const { user, identity } = await resolveAuthUser(ctx, {
        models: layers.database.models,
        db: layers.database.db,
      });

      // Consent is an authorization decision, not merely an authenticated one.
      // Everything below derives the new grant's authority from the REQUEST —
      // `params.scope` for the scopes, `interactionBody.ledgerId` for the pin —
      // so whoever approves here hands out power they were never asked to hold.
      // Without this, a `ledger.read` API key pinned to one ledger could approve
      // an account-wide `ledger.admin` grant for a client it registered itself
      // via open DCR, and walk away with a 30-day refresh token: escalation in
      // two hops, no browser, no user interaction.
      //
      // A delegated scope cannot express "this person agreed", so the credential
      // must be the product's own session — the same rule CLI device approval
      // applies (`cli-auth-service.authorizeSession`). This route sits outside
      // the op-class gate by necessity (always-public.ts: requiring a token to
      // obtain a token closes the only door in), which is exactly why the check
      // has to live here.
      assertSessionIdentity(identity, "Approving an OAuth authorization");

      // oidc-provider v9 requires an explicit Grant document to issue an auth code.
      // Without grantId in the consent result, the resumed auth endpoint finds no grant
      // and re-enters the interaction loop.
      // Use params.scope for OIDC scopes: prompt.details.missingOIDCScope is only
      // populated when prompt.name === "consent", but the initial interaction is
      // prompt.name === "login". params.scope is always present.
      const requestedScope = (params.scope as string | undefined) ?? "openid";

      let accountId: string;
      let grantId: string;

      if (isIdentityClient(params.client_id)) {
        // Identity-only login (e.g. the Discourse forum) — no ledger concept, no
        // resource scope: this client never gets a resource (see defaultResource).
        accountId = user.id;
        const grant = new provider.Grant({
          accountId,
          clientId: params.client_id as string,
        });
        grant.addOIDCScope(requestedScope);
        grantId = await grant.save();
      } else {
        const { ledgerId } = interactionBody;

        if (isMobileClient(params.client_id) && ledgerId) {
          throw new errors.InvalidRequest(
            "the native client grant must be account-wide",
          );
        }
        if (
          isMobileClient(params.client_id) &&
          interactionBody.scope !== params.scope
        ) {
          throw new errors.InvalidRequest(
            "the displayed native-client scopes do not match the interaction",
          );
        }

        // A ledger is optional now. Pinning the grant to one ledger is the
        // least-privilege shape (an agent that should only see one book), but
        // an unpinned grant is what makes cross-ledger operations like listing
        // the caller's ledgers expressible at all (ADR 0006 D5). MCP still
        // requires the pinned form — it refuses an unpinned token itself.
        if (ledgerId) {
          await assertLedgerAccess(ledgerId, user.id, {
            models: layers.database.models,
            db: layers.database.db,
            favaClientFactory: layers.clients.favaClientFactory,
          });
        }

        accountId = ledgerId ? `${user.id}:${ledgerId}` : user.id;

        const grant = new provider.Grant({
          accountId,
          clientId: params.client_id as string,
        });
        grant.addOIDCScope(requestedScope);

        // Resource scopes: missingResourceScopes is populated only for "consent"
        // prompts. For "login" prompts, fall back to params.resource or the
        // configured default.
        const details = prompt.details as {
          missingResourceScopes?: Record<string, string[]>;
        };
        if (
          details.missingResourceScopes &&
          Object.keys(details.missingResourceScopes).length > 0
        ) {
          for (const [indicator, scopes] of Object.entries(
            details.missingResourceScopes,
          )) {
            const scope = scopes.join(" ");
            grant.addResourceScope(indicator, scope);
            if (
              !isMobileClient(params.client_id) &&
              indicator === legacyMcpResource(config.oauth.issuer)
            ) {
              grant.addResourceScope(apiResource(config.oauth.issuer), scope);
            }
          }
        } else {
          const paramResources = Array.isArray(params.resource)
            ? params.resource.filter(
                (resource): resource is string => typeof resource === "string",
              )
            : typeof params.resource === "string"
              ? [params.resource]
              : [];
          const resources =
            paramResources.length > 0
              ? paramResources
              : isMobileClient(params.client_id)
                ? [apiResource(config.oauth.issuer)]
                : [
                    legacyMcpResource(config.oauth.issuer),
                    apiResource(config.oauth.issuer),
                  ];
          // oidc-provider separates the OIDC and resource portions when the
          // grant is evaluated. Passing the original request here is required
          // for it to retain `offline_access` and avoid a second consent loop;
          // unsupported values were already rejected against `scopes` above.
          for (const resource of resources) {
            grant.addResourceScope(resource, requestedScope);
          }
        }

        grantId = await grant.save();
      }

      await provider.interactionFinished(
        ctx.req,
        ctx.res,
        {
          login: { accountId },
          consent: { grantId },
        },
        { mergeWithLastSubmission: false },
      );

      ctx.respond = false;
    } catch (err) {
      oidcLogger.warn("Interaction login failed", {
        uid: ctx.params.uid,
        error: err instanceof Error ? err.message : String(err),
      });
      // A refused credential is not a malformed request: this handler runs
      // outside the REST error middleware (it owns `ctx.respond` for the
      // provider's redirects), so map the category here rather than reporting
      // every failure as 400 and leaving a caller unable to tell "your consent
      // was rejected" from "your form was wrong".
      ctx.status =
        err instanceof DomainError
          ? (err.httpStatusHint ?? CATEGORY_HTTP_STATUS[err.category])
          : 400;
      ctx.body = {
        error: err instanceof Error ? err.message : "Login failed",
      };
    }
  });

  // Delegate /api-gateway/oauth/* to oidc-provider (no koa-mount, path preserved)
  router.all("/api-gateway/oauth/{*path}", async (ctx) => {
    try {
      bridgeMcpAuthorizationResources(ctx.req);
      pinRequestToIssuer(ctx.req);
      ctx.respond = false;
      await cb(ctx.req, ctx.res);
    } catch (err) {
      oidcLogger.error("oidc-provider error", {
        error: err instanceof Error ? err.message : String(err),
      });
      if (!ctx.res.headersSent) {
        ctx.res.writeHead(500, { "Content-Type": "application/json" });
        ctx.res.end(JSON.stringify({ error: "Internal server error" }));
      }
    }
  });

  // oidc-provider serves its discovery document at this path (proxied by dashboard)
  const authorizationServerMetadataPath = oauthWellKnownPath(
    "oauth-authorization-server",
    config.oauth.issuer,
  );
  const serveAuthorizationServerMetadata: Router.Middleware = async (ctx) => {
    try {
      // oidc-provider is mounted at the backend root. A public path prefix is
      // represented in the configured issuer and reverse proxy, not in its
      // internal router, so normalize the RFC 8414 derived URL before delegating.
      ctx.req.url = "/.well-known/oauth-authorization-server";
      pinRequestToIssuer(ctx.req);
      ctx.respond = false;
      await cb(ctx.req, ctx.res);
    } catch (err) {
      oidcLogger.error("Well-known endpoint error", {
        error: err instanceof Error ? err.message : String(err),
      });
      if (!ctx.res.headersSent) {
        ctx.res.writeHead(500, { "Content-Type": "application/json" });
        ctx.res.end(JSON.stringify({ error: "Internal server error" }));
      }
    }
  };
  router.get(authorizationServerMetadataPath, serveAuthorizationServerMetadata);

  // RFC 9728: Protected Resource Metadata. Advertises the closed API scope
  // vocabulary so a discovery-driven client requests exactly those
  // (ADR 0006 D3).
  //
  // `resource` deliberately still names the MCP endpoint. A client reads this
  // document and then names that value in its token requests (RFC 8707);
  // advertising the API resource while grants stored before this change carry
  // only the legacy one makes those requests fail `invalid_grant` on refresh.
  // Grants issued from now on carry both indicators, so this flips to
  // `apiResource` once the window closes — see legacyMcpResource for the date.
  router.get("/.well-known/oauth-protected-resource", async (ctx) => {
    ctx.body = {
      resource: legacyMcpResource(config.oauth.issuer),
      authorization_servers: [config.oauth.issuer],
      scopes_supported: ["openid", "offline_access", ...API_SCOPES],
      bearer_methods_supported: ["header"],
    };
  });

  const canonicalResource = apiResource(config.oauth.issuer);
  router.get(
    oauthWellKnownPath("oauth-protected-resource", canonicalResource),
    async (ctx) => {
      ctx.body = {
        resource: canonicalResource,
        authorization_servers: [config.oauth.issuer],
        scopes_supported: [...API_SCOPES],
        bearer_methods_supported: ["header"],
      };
    },
  );
}
