import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from "jose";
import { logger } from "@/shared/logger";
import type { AppConfig } from "@/config/config";

const oidcVerifyLogger = logger.child({ module: "oidc-verify" });

const jwksSets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(issuer: string) {
  if (!jwksSets.has(issuer)) {
    jwksSets.set(
      issuer,
      createRemoteJWKSet(new URL(`${issuer}/api-gateway/oauth/jwks`)),
    );
  }
  return jwksSets.get(issuer)!;
}

/**
 * The API's resource identifier — what an access token's `aud` must contain to
 * reach any surface. It names the API as a whole, not one endpoint on it, which
 * is what lets a single token serve GraphQL, REST, and MCP (ADR 0006 D5).
 */
export function apiResource(issuer: string): string {
  return `${issuer}/v1`;
}

/**
 * The resource every token carried before ADR 0006 D5 widened it: the MCP
 * endpoint itself, which confined a token to that one surface.
 *
 * Still the resource we mint against and advertise, and the one existing tokens
 * carry. It cannot be swapped for {@link apiResource} unilaterally: a refresh
 * token is bound to the resource indicator its authorization request named, and
 * oidc-provider refuses a token request naming any other (resolveResource ->
 * InvalidTarget, seen by the client as `400 invalid_grant`). Clients learn which
 * one to name from `.well-known/oauth-protected-resource`, so advertising the
 * new value while old grants are live would kill each of those sessions on its
 * next refresh.
 *
 * Refresh tokens live 30 days (`ttl.RefreshToken` in oidc-route.ts). On or after
 * **2026-09-23** every grant predating the dual-resource deployment has
 * expired, and the switch
 * is safe: point `defaultResource` and the RFC 9728 document at
 * {@link apiResource}, then drop this constant and the audience entry below.
 * `oidc-route.test.ts` ("does not advertise a resource that pre-existing grants
 * cannot refresh against") holds the line until then.
 */
export function legacyMcpResource(issuer: string): string {
  return `${issuer}/api-gateway/mcp`;
}

/**
 * Signature algorithms an OAuth access token of ours may carry. ES256 is what
 * `config.oauth.jwks` holds today; the RSA entries keep this correct if a key of
 * that type is ever added, without re-admitting the symmetric HS* family that
 * session tokens use.
 */
const ASYMMETRIC_ALGS = ["ES256", "ES384", "ES512", "RS256", "PS256"];

/**
 * True when the token is a JWS whose algorithm is asymmetric — i.e. it could be
 * an OAuth access token rather than a session JWT. Pure: no verification, no
 * network. A token that is not a JWT at all (git's `Basic …`, an opaque token)
 * fails header decoding and is reported as not-ours.
 */
function isAsymmetricJwt(token: string): boolean {
  try {
    const { alg } = decodeProtectedHeader(token);
    return typeof alg === "string" && ASYMMETRIC_ALGS.includes(alg);
  } catch {
    return false;
  }
}

export type OAuthAudience = "api" | "mcp";

function expectedAudiences(issuer: string, audience: OAuthAudience): string[] {
  return audience === "mcp"
    ? [apiResource(issuer), legacyMcpResource(issuer)]
    : [apiResource(issuer)];
}

/** A verified OAuth access token, projected onto what the API cares about. */
export interface OidcIdentity {
  userId: string;
  /** Present only when the grant was pinned to one ledger at consent time. */
  ledgerId?: string;
  /** Scopes granted, split from the space-delimited `scope` claim. */
  scopes: string[];
  /** The token's `jti`, for audit and revocation. Never its secret material. */
  tokenId?: string;
}

/**
 * Verify an OAuth access token and project it onto an {@link OidcIdentity}.
 *
 * API callers accept only the current resource. MCP additionally accepts its
 * legacy audience during the compatibility window described on
 * {@link legacyMcpResource}. Returns null for anything that does not verify —
 * bad signature, wrong issuer, wrong audience, expired — without distinguishing
 * which, so the token is never an oracle.
 */
export async function resolveOidcIdentity(
  token: string,
  config: AppConfig,
  audience: OAuthAudience = "api",
): Promise<OidcIdentity | null> {
  // No issuer configured means there is no authority to verify against, so no
  // token can be an OAuth token. Returning null (rather than throwing) keeps
  // resolveIdentity's contract: it fails closed, and the caller falls through
  // to the other credential kinds.
  const issuer = config.oauth?.issuer;
  if (!issuer) return null;

  // Reject a token that cannot possibly be one of ours BEFORE calling jwtVerify.
  //
  // This is not an optimization, it is a correctness fix. Our session JWTs are
  // symmetric (HS256) and structurally valid, so jwtVerify would happily parse
  // one, consult the remote JWKS — an actual HTTP request from this process to
  // our own public /jwks endpoint, out through the edge and back — and only
  // then fail with ERR_JOSE_NOT_SUPPORTED. That put a network round trip on the
  // authentication path of every signed-in dashboard and mobile request, and
  // made all of them hostage to the JWKS endpoint's availability.
  //
  // OAuth access tokens are asymmetric (ES256, from config.oauth.jwks); session
  // tokens are HS*. The algorithm is the honest discriminator, and reading it
  // costs one base64 decode with no verification and no I/O.
  if (!isAsymmetricJwt(token)) return null;

  try {
    const { payload } = await jwtVerify(token, getJwks(issuer), {
      issuer,
      audience: expectedAudiences(issuer, audience),
      // Defense in depth alongside isAsymmetricJwt: never let a symmetric
      // algorithm reach the remote key set. Not a narrowing — a symmetric token
      // could never have verified against a remote JWKS anyway; this only stops
      // it from taking a network round trip to find that out.
      algorithms: ASYMMETRIC_ALGS,
    });
    if (!payload.sub) return null;

    // `sub` is the oidc-provider accountId, which is `userId` for an unpinned
    // grant and `userId:ledgerId` for one pinned to a ledger. The `ledger_id`
    // claim carries the suffix separately (see extraTokenClaims in
    // oidc-route.ts); split `sub` regardless so the userId is clean either way.
    const userId = (payload.sub as string).split(":")[0];
    if (!userId) return null;

    const ledgerId =
      typeof payload["ledger_id"] === "string" && payload["ledger_id"]
        ? payload["ledger_id"]
        : undefined;

    return {
      userId,
      ledgerId,
      scopes: typeof payload.scope === "string" ? payload.scope.split(" ") : [],
      tokenId: typeof payload.jti === "string" ? payload.jti : undefined,
    };
  } catch (err) {
    oidcVerifyLogger.debug("OIDC token verification failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
