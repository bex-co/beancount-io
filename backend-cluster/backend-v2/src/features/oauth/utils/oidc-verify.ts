import { createLocalJWKSet, decodeProtectedHeader, jwtVerify } from "jose";
import { logger } from "@/shared/logger";
import type { AppConfig } from "@/config/config";
import {
  OAUTH_CONFIG,
  type OAuthResource,
  oauthResource,
} from "@/features/oauth/data/config";

const oidcVerifyLogger = logger.child({ module: "oidc-verify" });

/** JWK members that are secret. Everything else is safe to verify against. */
const PRIVATE_JWK_PARAMETERS = ["d", "p", "q", "dp", "dq", "qi", "k"] as const;

function publicJwk(key: object): Record<string, unknown> {
  const entries = Object.entries(key).filter(
    ([name]) => !(PRIVATE_JWK_PARAMETERS as readonly string[]).includes(name),
  );
  return Object.fromEntries(entries);
}

const keySets = new WeakMap<
  object,
  ReturnType<typeof createLocalJWKSet> | null
>();

/**
 * Verify against the signing keys this process already holds, not over HTTP.
 *
 * This resource server and that authorization server are the same process:
 * `resolveOidcIdentity` only ever verifies tokens whose issuer is
 * `config.oauth.issuer`, and `config.oauth.jwks` is that issuer's key material.
 * Fetching it back over the public issuer URL made every OAuth-authenticated
 * request depend on the deployment being able to reach its own front door from
 * the inside — which a container cannot do when the public URL names a host
 * port (`http://localhost:42601` resolves to the container itself, where
 * nothing listens on that port), and which Kubernetes platforms that deny
 * pod->node egress block outright. Self-hosted sign-in failed on exactly that.
 *
 * Returns null when no keys are configured: OAuth is disabled there, so no
 * access token can be valid, and there is nothing to fetch that would change
 * that answer.
 */
function getKeySet(config: AppConfig) {
  const jwks = config.oauth?.jwks;
  if (!jwks) return null;
  const cached = keySets.get(jwks);
  if (cached !== undefined) return cached;

  let keySet: ReturnType<typeof createLocalJWKSet> | null = null;
  try {
    keySet = createLocalJWKSet({ keys: jwks.keys.map(publicJwk) });
  } catch (err) {
    oidcVerifyLogger.error("OAuth signing keys cannot verify tokens", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
  keySets.set(jwks, keySet);
  return keySet;
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

/** A verified OAuth access token, projected onto what the API cares about. */
export interface OidcIdentity {
  userId: string;
  /** OAuth client that received this token, as asserted by our issuer. */
  clientId?: string;
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
 * Each surface accepts only its configured resource. Returns null for anything
 * that does not verify — bad signature, wrong issuer, wrong audience, expired —
 * without distinguishing which, so the token is never an oracle.
 */
export async function resolveOidcIdentity(
  token: string,
  config: AppConfig,
  resource: OAuthResource = OAUTH_CONFIG.resourceBindings.applicationApi,
): Promise<OidcIdentity | null> {
  // No issuer configured means there is no authority to verify against, so no
  // token can be an OAuth token. Returning null (rather than throwing) keeps
  // resolveIdentity's contract: it fails closed, and the caller falls through
  // to the other credential kinds.
  const issuer = config.oauth?.issuer;
  if (!issuer) return null;

  const audience = oauthResource(issuer, resource);
  if (!audience) return null;

  const keySet = getKeySet(config);
  if (!keySet) return null;

  // Reject a token that cannot possibly be one of ours BEFORE calling jwtVerify.
  //
  // Our session JWTs are symmetric (HS256) and structurally valid, so jwtVerify
  // would happily parse one and only then fail with ERR_JOSE_NOT_SUPPORTED.
  // OAuth access tokens are asymmetric (ES256, from config.oauth.jwks); session
  // tokens are HS*. The algorithm is the honest discriminator, and reading it
  // costs one base64 decode with no verification and no I/O.
  if (!isAsymmetricJwt(token)) return null;

  try {
    const { payload } = await jwtVerify(token, keySet, {
      issuer,
      audience,
      // Defense in depth alongside isAsymmetricJwt: never let a symmetric
      // algorithm reach the key set, whatever a header claims.
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
      clientId:
        typeof payload.client_id === "string" && payload.client_id
          ? payload.client_id
          : undefined,
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
