import type { IncomingMessage } from "node:http";
import Router from "@koa/router";
import { errors, Provider } from "oidc-provider";
import {
  type DatabaseLayer,
  type ClientFactoryLayer,
} from "@/foundation/composition";
import type { AppConfig } from "@/config/config";
import { MemoryAdapter } from "../data/memory-adapter";
import { createPostgresAdapterFactory } from "../data/oauth-adapter-model";
import { resolveAuthUser } from "@/features/ai-agent/utils/route-guards";
import { assertLedgerAccess } from "@/features/ledger/utils/ledger-access-check";
import { API_SCOPES } from "@/server/api/identity";
import { legacyMcpResource } from "@/features/oauth/utils/oidc-verify";
import { apiResource } from "@/features/oauth/utils/oidc-verify";
import { logger } from "@/shared/logger";

const oidcLogger = logger.child({ module: "oidc-provider" });

export const MOBILE_CLIENT_ID = "beancount-mobile";
export const MOBILE_REDIRECT_URIS = [
  "io.beancount.ios:/oauth/callback",
  "io.beancount.android:/oauth/callback",
] as const;

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
  const isMobileClient = (clientId: unknown): boolean =>
    clientId === MOBILE_CLIENT_ID;

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
      RefreshToken: 2592000,
      Interaction: 600,
      Session: 1209600,
      Grant: 1209600,
    },

    ...(config.env !== "production"
      ? { dangerouslyAllowInsecureHttpToo: true }
      : {}),
  });

  // Provider extends Koa — proxy=true makes it read X-Forwarded-Host/Proto when
  // building absolute URLs (discovery endpoints, auth-flow redirects).
  provider.proxy = true;
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

      const { user } = await resolveAuthUser(ctx, {
        models: layers.database.models,
        db: layers.database.db,
      });

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
      ctx.status = 400;
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
