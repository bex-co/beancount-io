import { importJWK, SignJWT } from "jose";
import type { AppConfig } from "@/config/config";
import { API_SCOPES } from "@/server/api/identity";
import { OAUTH_CONFIG, oauthResource } from "@/features/oauth/data/config";

/**
 * Mint an access token directly (bypassing the browser ceremony) for a caller
 * we have already authenticated.
 *
 * The audience is the MCP resource. `ledgerId` pins the token to a single
 * ledger; omit it for an unpinned one, which MCP refuses.
 */
export async function generateOAuthToken(
  userId: string,
  ledgerId: string | undefined,
  config: AppConfig,
): Promise<string> {
  const jwks = config.oauth.jwks;
  if (!jwks) {
    throw new Error("OAuth is not configured on this server");
  }
  const jwk = jwks.keys[0] as JsonWebKey & { kid?: string };
  const privateKey = await importJWK(jwk, "ES256");
  const audience = oauthResource(
    config.oauth.issuer,
    OAUTH_CONFIG.dynamicRegistration.resource,
  );
  if (!audience) {
    throw new Error("The configured MCP OAuth resource is invalid");
  }

  return new SignJWT({
    ...(ledgerId ? { ledger_id: ledgerId } : {}),
    scope: API_SCOPES.join(" "),
  })
    .setProtectedHeader({ alg: "ES256", kid: jwk.kid })
    .setIssuer(config.oauth.issuer)
    .setAudience(audience)
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${OAUTH_CONFIG.ttl.accessTokenSeconds}s`)
    .sign(privateKey);
}
