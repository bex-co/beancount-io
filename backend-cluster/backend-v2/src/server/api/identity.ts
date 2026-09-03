import type { RouterContext } from "@koa/router";
import type { AppConfig } from "@/config/config";
import type { DatabaseLayer } from "@/foundation/composition";
import { getTokenFromCtx } from "@/features/auth/utils/auth";
import { resolveOidcIdentity } from "@/features/oauth/utils/oidc-verify";
import { OAUTH_CONFIG, type OAuthResource } from "@/features/oauth/data/config";
import {
  API_KEY_PLAINTEXT_PREFIX,
  apiKeyDigest,
  apiKeyDigestsMatch,
  isApiKeyLive,
} from "@/features/apikeys/service/api-key-service";
import { logger } from "@/shared/logger";
import { ForbiddenError } from "@/shared/errors";

const identityLogger = logger.child({ module: "identity" });

/** Shared empty set, so every session identity does not allocate its own. */
const EMPTY_SCOPES: ReadonlySet<string> = new Set<string>();

const ALL_OPERATION_CAPABILITIES: ReadonlySet<OperationClass> = new Set([
  "read",
  "write",
  "admin",
]);

/**
 * A full-capability workload identity for a caller that has none: a cron run,
 * a webhook, or an internal workflow acting for one user.
 *
 * This is deliberately a `service` principal using the `system` method, not a
 * fabricated browser session. A predecessor named `trustedIdentity` was built
 * *inside* service methods, where claiming full capability was invisible: a
 * scoped token reached the service, the service promptly forgot it was scoped,
 * and the transport gate became the only enforcement (w3/m9). Worse, the
 * rebuilt value carries no `ledgerScope`, so the PDP has nothing left to check
 * and silently passes.
 *
 * Every remaining claim of exemption now happens at a call site under this one
 * name, so `grep systemIdentity` enumerates them. There is deliberately no
 * second, blander name for the same value.
 *
 * Use it only where there genuinely is no caller. If a request reached you, its
 * identity is what should authorize — thread it through instead.
 */
export function systemIdentity(
  userId: string,
  serviceId = "backend-v2",
): Identity {
  return {
    userId,
    principal: { type: "service", id: serviceId, onBehalfOfUserId: userId },
    method: "system",
    scopes: EMPTY_SCOPES,
    capabilities: ALL_OPERATION_CAPABILITIES,
    assurance: { type: "workload" },
  };
}

/**
 * How the caller proved who they are. The three request credential kinds are
 * joined by `system`, which exists only for trusted internal workloads.
 *
 * - `session` — the browser/mobile session JWT minted by our own auth flow,
 *   presented as a bearer or an httpOnly cookie.
 * - `oauth`   — an OAuth 2.1 access token from our OIDC provider (PKCE, DCR).
 * - `apikey`  — a durable `bcio_` key for CLI/CI/cron clients (w1/m22).
 */
export type AuthMethod = "session" | "oauth" | "apikey" | "system";

type Principal =
  | { readonly type: "user"; readonly id: string }
  | {
      readonly type: "service";
      readonly id: string;
      /** Stable user whose durable resource relationships constrain the work. */
      readonly onBehalfOfUserId: string;
    };

export interface AuthenticationAssurance {
  readonly type: "interactive" | "delegated" | "workload";
  /** Seconds since Unix epoch, when the issuer supplied an authentication time. */
  readonly authenticatedAt?: number;
  readonly acr?: string;
  readonly amr?: readonly string[];
}

/**
 * The API scope vocabulary. Deliberately closed and only three wide (ADR 0006
 * D3): a finer-grained list is one nobody chooses correctly, so every client
 * ends up requesting all of it. What each one unlocks is decided by the op-class
 * matrix in `op-class.ts`, which every surface consults.
 */
export const API_SCOPES = [
  "ledger.read",
  "ledger.write",
  "ledger.admin",
] as const;
export type ApiScope = (typeof API_SCOPES)[number];

export type OperationClass = "read" | "write" | "admin";

const OPERATION_SCOPE: Record<OperationClass, ApiScope> = {
  read: "ledger.read",
  write: "ledger.write",
  admin: "ledger.admin",
};

/**
 * A stronger grant satisfies every weaker operation. Keep this shared with
 * the per-ledger authorization seam so the transport gate and service checks
 * cannot disagree about scope implication.
 *
 * Exact matching creates credentials that may rewrite a ledger but cannot
 * inspect it first. Real write flows read before editing, so that model would
 * only teach clients to request every scope instead of choosing the least
 * authority their workflow needs.
 */
const SATISFYING_SCOPES: Record<ApiScope, readonly ApiScope[]> = {
  "ledger.read": ["ledger.read", "ledger.write", "ledger.admin"],
  "ledger.write": ["ledger.write", "ledger.admin"],
  "ledger.admin": ["ledger.admin"],
};

function hasRequiredScope(
  scopes: ReadonlySet<string>,
  required: ApiScope,
): boolean {
  return SATISFYING_SCOPES[required].some((scope) => scopes.has(scope));
}

/**
 * The resolved caller — the single shape GraphQL, REST, and MCP all read.
 *
 * Before this existed each surface parsed credentials itself: GraphQL accepted
 * only the session JWT, MCP only an OIDC bearer, and REST re-parsed ad hoc per
 * route. That is why one credential could not reach all three surfaces
 * (ADR 0006 problem 2).
 */
export interface Identity {
  userId: string;
  /** Who is acting. Runtime-resolved identities always carry this explicitly. */
  principal?: Principal;
  method: AuthMethod;
  /** OAuth client that received this credential, when `method` is `oauth`. */
  oauthClientId?: string;
  /**
   * Scopes granted to this credential. Empty for sessions, which are not
   * scope-constrained. Authorization consumes `capabilities`, not this raw set.
   */
  scopes: ReadonlySet<string>;
  /** Effective operation capabilities computed once from the credential grant. */
  capabilities?: ReadonlySet<OperationClass>;
  /** Authentication provenance/strength, kept separate from authorization. */
  assurance?: AuthenticationAssurance;
  /**
   * The single ledger this credential is confined to, when it is confined at
   * all. Set from an OAuth grant's `ledger_id` claim (a grant pinned to one
   * ledger at consent time) or an API key minted against one ledger. Undefined
   * means "not confined" — the caller's per-ledger access is then decided the
   * normal way, by the ledger access check.
   */
  ledgerScope?: string;
  /**
   * Stable identifier of the credential itself (OAuth `jti`, API key id) for
   * audit and revocation. Never the credential's secret material.
   */
  tokenId?: string;
}

/** Resolve the effective actor while old in-process fixtures are migrated. */
function identityPrincipal(identity: Identity): Principal | undefined {
  if (identity.principal) return identity.principal;
  if (identity.method === "system") return undefined;
  return { type: "user", id: identity.userId };
}

/** User whose durable relationships constrain this request, if well formed. */
export function identityUserId(identity: Identity): string | undefined {
  const principal = identityPrincipal(identity);
  if (!principal) return undefined;
  if (
    (identity.method === "system" && principal.type !== "service") ||
    (identity.method !== "system" && principal.type !== "user")
  ) {
    return undefined;
  }
  const principalUserId =
    principal.type === "user" ? principal.id : principal.onBehalfOfUserId;
  return principalUserId === identity.userId ? principalUserId : undefined;
}

export function identityAssurance(identity: Identity): AuthenticationAssurance {
  if (identity.assurance) {
    const expected =
      identity.method === "session"
        ? "interactive"
        : identity.method === "system"
          ? "workload"
          : "delegated";
    if (identity.assurance.type === expected) return identity.assurance;
    return { type: "delegated" };
  }
  if (identity.method === "session") return { type: "interactive" };
  if (identity.method === "system") return { type: "workload" };
  return { type: "delegated" };
}

export function identityAssuranceIsValid(identity: Identity): boolean {
  if (!identity.assurance) return true;
  const expected =
    identity.method === "session"
      ? "interactive"
      : identity.method === "system"
        ? "workload"
        : "delegated";
  return identity.assurance.type === expected;
}

function effectiveCapabilities(
  identity: Identity,
): ReadonlySet<OperationClass> {
  if (identity.capabilities) return identity.capabilities;
  if (identity.method === "session" || identity.method === "system") {
    return ALL_OPERATION_CAPABILITIES;
  }
  const capabilities = new Set<OperationClass>();
  for (const operation of ["read", "write", "admin"] as const) {
    if (hasRequiredScope(identity.scopes, OPERATION_SCOPE[operation])) {
      capabilities.add(operation);
    }
  }
  return capabilities;
}

/** The minimal Koa-ish shape `resolveIdentity` needs: just headers. */
export interface RequestLike {
  headers: Record<string, string | string[] | undefined>;
}

export interface ResolveIdentityOptions {
  oauthResource?: OAuthResource;
}

export function identityHasCapability(
  identity: Identity,
  operation: OperationClass,
): boolean {
  return effectiveCapabilities(identity).has(operation);
}

/** Whether the credential's optional single-ledger ceiling admits this id. */
export function identityAllowsLedgerScope(
  identity: Identity | undefined,
  ledgerId: string,
): boolean {
  return (
    identity?.ledgerScope === undefined || identity.ledgerScope === ledgerId
  );
}

/**
 * Require the product's full signed-in session credential, independently of
 * the op-class transport gate. Use this for account, billing, and credential
 * ceremonies that no delegated API scope is allowed to perform.
 */
export function assertSessionIdentity(
  identity: Identity,
  action = "This operation",
): void {
  if (
    identity.method !== "session" ||
    identityAssurance(identity).type !== "interactive"
  ) {
    throw new ForbiddenError(`${action} requires a full signed-in session`);
  }
}

/**
 * Resolve the caller from a request — the ONE authentication entry point for
 * every API surface (ADR 0006 D2).
 *
 * Order matters. The token extractor prefers an Authorization header, then
 * `x-api-key`, then the browser cookie, so an explicit credential is never
 * masked by a signed-in session. A bearer-shaped credential is tried against
 * the OAuth verifier first, then the API-key store, and only then the session
 * model: OAuth access tokens, personal access tokens, and session JWTs can all
 * arrive as `Authorization: Bearer`, and only verification distinguishes them.
 *
 * Returns `undefined` for an absent, malformed, expired, or revoked
 * credential — never throws, and never distinguishes the failure modes to the
 * caller. Surfaces decide what an unauthenticated request means for them.
 */
export async function resolveIdentity(
  ctx: RequestLike,
  database: DatabaseLayer,
  config: AppConfig,
  options: ResolveIdentityOptions = {},
): Promise<Identity | undefined> {
  const token = getTokenFromCtx(ctx as RouterContext);
  if (!token) {
    return undefined;
  }

  return (
    (await resolveOAuthIdentity(
      token,
      config,
      options.oauthResource ?? OAUTH_CONFIG.resourceBindings.applicationApi,
    )) ??
    // Between OAuth and session: keys are bearer-presented like OAuth tokens,
    // but are cheap to reject on their prefix before any verification work.
    (await resolveApiKeyIdentity(token, database)) ??
    (await resolveSessionIdentity(token, database))
  );
}

/** At most one `lastUsedAt` write per key per window, per process. */
const LAST_USED_THROTTLE_MS = 5 * 60 * 1000;
const lastUsedThrottle = new Map<string, number>();

/**
 * The API-key path: a durable `bcio_` credential for clients that cannot do a
 * browser ceremony (ADR 0006 D6).
 *
 * Revoked, expired, and never-existed all return `undefined` — the same answer
 * a garbage token gets. A caller that could tell them apart could enumerate
 * which keys were once real, and learn when one was revoked.
 */
async function resolveApiKeyIdentity(
  token: string,
  database: DatabaseLayer,
): Promise<Identity | undefined> {
  if (!token.startsWith(API_KEY_PLAINTEXT_PREFIX)) {
    return undefined;
  }

  const candidate = apiKeyDigest(token);
  const key = await database.models.apiKey.findByDigest(database.db, candidate);
  if (
    !key ||
    !apiKeyDigestsMatch(key.keyDigest, candidate) ||
    !isApiKeyLive(key, new Date())
  ) {
    return undefined;
  }

  void stampLastUsed(key.id, database);

  return {
    userId: key.userId,
    principal: { type: "user", id: key.userId },
    method: "apikey",
    scopes: new Set(key.scopes),
    capabilities: capabilitiesFromScopes(key.scopes),
    assurance: { type: "delegated" },
    ledgerScope: key.ledgerScope,
    tokenId: key.id,
  };
}

/**
 * Record that a key was used, off the request path and at most once per window.
 *
 * `lastUsedAt` exists so a person can look at their key list and see which key
 * their cron job is actually using — five-minute resolution answers that, and a
 * synchronous write per request would put the database in front of every
 * authenticated API call to buy precision nobody reads.
 */
async function stampLastUsed(
  keyId: string,
  database: DatabaseLayer,
): Promise<void> {
  const last = lastUsedThrottle.get(keyId) ?? 0;
  if (Date.now() - last <= LAST_USED_THROTTLE_MS) {
    return;
  }
  lastUsedThrottle.set(keyId, Date.now());
  try {
    await database.models.apiKey.touchLastUsedAt(
      database.db,
      keyId,
      new Date(),
    );
  } catch (err) {
    identityLogger.error("Failed to stamp API key lastUsedAt", {
      keyId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * The session path: verify the token against our own JWT model, which checks
 * both the signature and that the row still exists (logout deletes it).
 */
async function resolveSessionIdentity(
  token: string,
  database: DatabaseLayer,
): Promise<Identity | undefined> {
  const userId = await database.models.jwt.verify(database.db, token);
  if (!userId) {
    return undefined;
  }
  return {
    userId,
    principal: { type: "user", id: userId },
    method: "session",
    scopes: EMPTY_SCOPES,
    capabilities: ALL_OPERATION_CAPABILITIES,
    assurance: { type: "interactive" },
  };
}

/**
 * The OAuth path: verify against the provider's JWKS and project the grant onto
 * an Identity. A `ledger_id` claim confines the credential to that one ledger.
 */
async function resolveOAuthIdentity(
  token: string,
  config: AppConfig,
  resource: OAuthResource,
): Promise<Identity | undefined> {
  const oidc = await resolveOidcIdentity(token, config, resource);
  if (!oidc) {
    return undefined;
  }
  identityLogger.debug("Resolved OAuth identity", {
    userId: oidc.userId,
    hasLedgerScope: Boolean(oidc.ledgerId),
  });
  return {
    userId: oidc.userId,
    principal: { type: "user", id: oidc.userId },
    method: "oauth",
    oauthClientId: oidc.clientId,
    scopes: new Set(oidc.scopes),
    capabilities: capabilitiesFromScopes(oidc.scopes),
    assurance: {
      type: "delegated",
      authenticatedAt: oidc.authenticatedAt,
      acr: oidc.acr,
      amr: oidc.amr,
    },
    ledgerScope: oidc.ledgerId,
    tokenId: oidc.tokenId,
  };
}

function capabilitiesFromScopes(
  scopes: Iterable<string>,
): ReadonlySet<OperationClass> {
  const scopeSet = scopes instanceof Set ? scopes : new Set(scopes);
  const capabilities = new Set<OperationClass>();
  for (const operation of ["read", "write", "admin"] as const) {
    if (hasRequiredScope(scopeSet, OPERATION_SCOPE[operation])) {
      capabilities.add(operation);
    }
  }
  return capabilities;
}
