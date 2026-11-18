import { createHash, randomBytes } from "node:crypto";
import {
  createRemoteJWKSet,
  customFetch,
  jwtVerify,
  type JWTPayload,
} from "jose";
import type { AppConfig, OidcLoginConfig } from "@/config/config";
import type { DbExecutor } from "@/drizzle/drizzle";
import type { IModels } from "@/foundation/models";
import type { IAuthService } from "@/features/auth/service/auth-service";
import type { OidcLoginState } from "@/features/auth/data/oidc-login-state-model";
import { validateAuthReturnPath } from "@/features/auth/utils/auth-return-path";
import { BadUserInputError, ForbiddenError } from "@/shared/errors";
import { logger } from "@/shared/logger";

const moduleLogger = logger.child({ module: "oidc-login" });

export const OIDC_START_PATH = "/api-gateway/auth/oidc/start";
export const OIDC_CALLBACK_PATH = "/api-gateway/auth/oidc/callback";
const OIDC_TIMEOUT_MS = 10_000;

/** Shown by the dashboard; the backend only names the case. */
export type OidcLoginError =
  | "email_in_use"
  | "email_unverified"
  | "blocked"
  | "already_linked"
  | "account_linked"
  | "not_allowed"
  | "failed";

export interface OidcCallbackParams {
  code?: string;
  state?: string;
  /** The `state` the start route stored in this browser's cookie. */
  cookieState?: string;
  ip: string;
}

export interface OidcStartParams {
  next?: string;
  linkTicket?: string;
  /** The account this browser is signed in to, if any. */
  sessionUserId?: string;
}

export interface IOidcLoginService {
  /** The name on the sign-in button, or null when OIDC is off. */
  providerName(): string | null;
  /** `state` is unset when the browser goes straight to an error page. */
  start(
    params: OidcStartParams,
  ): Promise<{ redirectUrl: string; state?: string }>;
  /** Returns where to send the browser. */
  finish(params: OidcCallbackParams): Promise<string>;
  /** A start URL that links the provider to this signed-in account. */
  createLinkUrl(userId: string, next?: string): Promise<string>;
  isLinked(userId: string): Promise<boolean>;
  unlink(userId: string): Promise<void>;
}

interface Discovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
}

class OidcLoginFailure extends Error {
  constructor(readonly reason: OidcLoginError) {
    super(reason);
  }
}

const base64Url = (bytes: Buffer) => bytes.toString("base64url");

/** Entries come from `parseOidcAllowedEmails`, lowercased. */
const emailAllowed = (email: string, allowed: string[]) => {
  const domain = email.slice(email.lastIndexOf("@") + 1);
  return allowed.some((entry) =>
    entry.startsWith("@*.")
      ? domain.endsWith(entry.slice(2))
      : entry.startsWith("@")
        ? domain === entry.slice(1)
        : email === entry,
  );
};

/** The lowercased email, or "" when the provider hasn't verified it. */
const verifiedEmail = (claims: JWTPayload) => {
  // Some providers send the claim as a string.
  const verified =
    claims.email_verified === true || claims.email_verified === "true";
  return verified && typeof claims.email === "string"
    ? claims.email.trim().toLowerCase()
    : "";
};
const randomToken = () => base64Url(randomBytes(32));

export class OidcLoginService implements IOidcLoginService {
  private discovery?: Promise<Discovery>;
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    private readonly models: Pick<
      IModels,
      "user" | "oidcIdentity" | "oidcLoginState" | "magicLinkToken"
    >,
    private readonly db: DbExecutor,
    private readonly auth: Pick<IAuthService, "registerOidcUser">,
    private readonly config: Pick<
      AppConfig,
      "oidcLogin" | "dashboard" | "oauth"
    >,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  providerName = () => this.config.oidcLogin?.name ?? null;

  start = async (
    params: OidcStartParams,
  ): Promise<{ redirectUrl: string; state?: string }> => {
    const next = validateAuthReturnPath(params.next);
    const linking = params.linkTicket !== undefined;
    try {
      return await this.startSignIn(params, next);
    } catch (error) {
      return { redirectUrl: this.failureUrl(error, { linking, next }) };
    }
  };

  private async startSignIn(params: OidcStartParams, next?: string) {
    const oidc = this.settings();
    let linkUserId: string | undefined;
    if (params.linkTicket !== undefined) {
      linkUserId =
        (await this.models.oidcLoginState.takeLinkTicket(params.linkTicket)) ??
        undefined;
      // Only the signed-in browser that asked for the link may use it.
      if (!linkUserId || linkUserId !== params.sessionUserId) {
        throw new OidcLoginFailure("failed");
      }
    }

    const state = randomToken();
    const nonce = randomToken();
    const codeVerifier = randomToken();
    await this.models.oidcLoginState.saveState(state, {
      nonce,
      codeVerifier,
      next,
      linkUserId,
    });

    const { authorization_endpoint } = await this.discover();
    const url = new URL(authorization_endpoint);
    url.search = new URLSearchParams({
      response_type: "code",
      client_id: oidc.clientId,
      redirect_uri: this.redirectUri(),
      scope: "openid email profile",
      state,
      nonce,
      code_challenge: base64Url(
        createHash("sha256").update(codeVerifier).digest(),
      ),
      code_challenge_method: "S256",
    }).toString();
    return { redirectUrl: url.toString(), state };
  }

  finish = async (params: OidcCallbackParams): Promise<string> => {
    const record =
      params.state && params.state === params.cookieState
        ? await this.models.oidcLoginState.takeState(params.state)
        : null;
    if (!record) return this.errorUrl("failed", { linking: false });

    try {
      if (!params.code) throw new OidcLoginFailure("failed");
      const claims = await this.verifiedClaims(params.code, record);
      this.assertAllowed(claims);
      const userId = record.linkUserId
        ? await this.link(record.linkUserId, claims.sub!)
        : await this.findOrCreateUser(claims, params.ip);
      if (record.linkUserId) {
        return this.dashboardUrl(record.next ?? "/").toString();
      }
      const token = await this.models.magicLinkToken.regenerateToken(userId);
      const url = this.dashboardUrl("/auth/callback");
      url.searchParams.set("oneTimeToken", token.id);
      if (record.next) url.searchParams.set("next", record.next);
      return url.toString();
    } catch (error) {
      return this.failureUrl(error, {
        linking: record.linkUserId !== undefined,
        next: record.next,
      });
    }
  };

  createLinkUrl = async (userId: string, next?: string) => {
    this.settings();
    const ticket = await this.models.oidcLoginState.createLinkTicket(userId);
    const url = new URL(OIDC_START_PATH, this.config.oauth.issuer);
    url.searchParams.set("link", ticket);
    const returnPath = validateAuthReturnPath(next);
    if (returnPath) url.searchParams.set("next", returnPath);
    return url.toString();
  };

  isLinked = async (userId: string) =>
    this.config.oidcLogin
      ? this.models.oidcIdentity.isLinked(this.db, userId, this.issuer())
      : false;

  unlink = async (userId: string) => {
    this.settings();
    const user = await this.models.user.getById(this.db, userId);
    if (!user?.password) {
      throw new ForbiddenError(
        "Set a password before you unlink, or you can't sign in.",
        "unlinkOidc",
      );
    }
    await this.models.oidcIdentity.unlink(this.db, userId, this.issuer());
  };

  private settings(): OidcLoginConfig {
    const oidc = this.config.oidcLogin;
    if (!oidc) throw new BadUserInputError("OIDC sign-in is not configured");
    return oidc;
  }

  /** As configured: discovery and the ID token must report exactly this. */
  private issuer() {
    return this.settings().issuer;
  }

  private redirectUri() {
    return new URL(OIDC_CALLBACK_PATH, this.config.oauth.issuer).toString();
  }

  private dashboardUrl(path: string) {
    return new URL(path, this.config.dashboard.url);
  }

  private failureUrl(
    error: unknown,
    target: { linking: boolean; next?: string },
  ) {
    if (error instanceof OidcLoginFailure) {
      return this.errorUrl(error.reason, target);
    }
    moduleLogger.error("OIDC sign-in failed", {
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return this.errorUrl("failed", target);
  }

  /** A failed link goes back to `next`; a failed sign-in to the login page. */
  private errorUrl(
    reason: OidcLoginError,
    { linking, next }: { linking: boolean; next?: string },
  ) {
    const url = this.dashboardUrl(linking ? (next ?? "/") : "/auth/login");
    url.searchParams.set("oidcError", reason);
    if (!linking && next) url.searchParams.set("next", next);
    return url.toString();
  }

  private discover(): Promise<Discovery> {
    const issuer = this.issuer();
    this.discovery ??= (async () => {
      const response = await this.fetchImpl(
        `${issuer.replace(/\/+$/, "")}/.well-known/openid-configuration`,
        { signal: AbortSignal.timeout(OIDC_TIMEOUT_MS) },
      );
      if (!response.ok) {
        throw new Error(`OIDC discovery failed: ${response.status}`);
      }
      const document = (await response.json()) as Discovery;
      if (document.issuer !== issuer) {
        throw new Error("OIDC discovery returned a different issuer");
      }
      return document;
    })().catch((error: unknown) => {
      this.discovery = undefined;
      throw error;
    });
    return this.discovery;
  }

  private async verifiedClaims(
    code: string,
    record: OidcLoginState,
  ): Promise<JWTPayload> {
    const oidc = this.settings();
    const discovery = await this.discover();
    const response = await this.fetchImpl(discovery.token_endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: `Basic ${Buffer.from(
          `${encodeURIComponent(oidc.clientId)}:${encodeURIComponent(oidc.clientSecret)}`,
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.redirectUri(),
        code_verifier: record.codeVerifier,
      }),
      signal: AbortSignal.timeout(OIDC_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`OIDC token request failed: ${response.status}`);
    }
    const { id_token } = (await response.json()) as { id_token?: string };
    if (!id_token) throw new Error("OIDC token response has no ID token");

    this.jwks ??= createRemoteJWKSet(new URL(discovery.jwks_uri), {
      timeoutDuration: OIDC_TIMEOUT_MS,
      [customFetch]: this.fetchImpl,
    });
    const { payload } = await jwtVerify(id_token, this.jwks, {
      issuer: discovery.issuer,
      audience: oidc.clientId,
    });
    if (payload.nonce !== record.nonce || !payload.sub) {
      throw new Error("OIDC ID token does not match this sign-in");
    }
    return payload;
  }

  /** The account this provider ID signs in to, created when it is new. */
  private async findOrCreateUser(
    claims: JWTPayload,
    ip: string,
  ): Promise<string> {
    const issuer = this.issuer();
    const sub = claims.sub!;
    const linked = await this.models.oidcIdentity.findUserId(
      this.db,
      issuer,
      sub,
    );
    if (linked) {
      await this.assertNotBlocked(linked);
      return linked;
    }

    const email = verifiedEmail(claims);
    if (!email) throw new OidcLoginFailure("email_unverified");
    const existing = await this.models.user.getByMail(this.db, email);
    if (existing) {
      if (!this.settings().linkByEmail) {
        throw new OidcLoginFailure("email_in_use");
      }
      return this.link(existing.id, sub);
    }
    if (!this.settings().allowedEmails.length) {
      throw new OidcLoginFailure("not_allowed");
    }
    return this.auth.registerOidcUser({
      email,
      firstName: typeof claims.given_name === "string" ? claims.given_name : "",
      lastName:
        typeof claims.family_name === "string" ? claims.family_name : "",
      ip,
      oidcIdentity: { issuer, sub },
    });
  }

  private async link(userId: string, sub: string): Promise<string> {
    await this.assertNotBlocked(userId);
    const issuer = this.issuer();
    const owner = await this.models.oidcIdentity.findUserId(
      this.db,
      issuer,
      sub,
    );
    if (owner === userId) return userId;
    if (owner) throw new OidcLoginFailure("already_linked");
    if (await this.models.oidcIdentity.isLinked(this.db, userId, issuer)) {
      throw new OidcLoginFailure("account_linked");
    }
    const created = await this.models.oidcIdentity.link(this.db, {
      issuer,
      sub,
      userId,
    });
    if (!created) throw new OidcLoginFailure("already_linked");
    return userId;
  }

  /** With an allowlist, every sign-in and link needs a verified email on it. */
  private assertAllowed(claims: JWTPayload) {
    const allowed = this.settings().allowedEmails;
    if (!allowed.length) return;
    const email = verifiedEmail(claims);
    if (!email) throw new OidcLoginFailure("email_unverified");
    if (!emailAllowed(email, allowed)) {
      throw new OidcLoginFailure("not_allowed");
    }
  }

  private async assertNotBlocked(userId: string): Promise<void> {
    const user = await this.models.user.getById(this.db, userId);
    if (!user || user.isBlocked) throw new OidcLoginFailure("blocked");
  }
}
