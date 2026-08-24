import { importJWK, SignJWT } from "jose";
import type { AppConfig } from "@/config/config";
import { API_SCOPES } from "@/server/api/identity";
import { legacyMcpResource } from "./oidc-verify";

const TTL_SECONDS = 3600;

/**
 * Mint an access token directly (bypassing the browser ceremony) for a caller
 * we have already authenticated.
 *
 * The audience stays the MCP resource, matching what the OIDC provider mints,
 * so there is ONE resource rename on one date rather than a split fleet — see
 * `legacyMcpResource`. GraphQL and REST deliberately reject this transitional
 * audience; the generated credential is handed only to MCP. `ledgerId` pins
 * the token to a single ledger; omit it for an unpinned one, which MCP refuses.
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

  return new SignJWT({
    ...(ledgerId ? { ledger_id: ledgerId } : {}),
    scope: API_SCOPES.join(" "),
  })
    .setProtectedHeader({ alg: "ES256", kid: jwk.kid })
    .setIssuer(config.oauth.issuer)
    .setAudience(legacyMcpResource(config.oauth.issuer))
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(privateKey);
}
