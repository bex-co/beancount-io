import { jwtVerify, decodeProtectedHeader } from "jose";
import { createHash, timingSafeEqual } from "crypto";
import { logger } from "@/shared/logger";
import type { IPlaidClient } from "@/features/plaid/service/plaid-client";
import { UnauthenticatedError } from "@/shared/errors";

const verificationLogger = logger.child({
  module: "plaid-webhook-verification",
});

/**
 * Cache for Plaid public keys to reduce API calls
 * Key: kid (key ID), Value: JWK public key
 */
const publicKeyCache = new Map<string, CryptoKey>();

/**
 * Validates a Plaid webhook by verifying its cryptographic signature
 *
 * Implements Plaid's webhook verification protocol:
 * 1. Extract JWT from Plaid-Verification header
 * 2. Decode JWT header to get kid (key ID)
 * 3. Fetch public key from Plaid API (cached)
 * 4. Verify JWT signature with public key (ES256)
 * 5. Check timestamp (must be <5 minutes old)
 * 6. Verify request body SHA-256 hash
 *
 * @param plaidClient - Plaid client instance for fetching verification keys
 * @param verificationHeader - The Plaid-Verification JWT header value
 * @param rawBody - The raw request body as a string
 * @throws {UnauthenticatedError} If verification fails
 *
 * @see https://plaid.com/docs/api/webhooks/webhook-verification/
 */
export async function validatePlaidWebhook(
  plaidClient: IPlaidClient,
  verificationHeader: string | undefined,
  rawBody: string,
): Promise<void> {
  if (!verificationHeader) {
    verificationLogger.warn("Missing Plaid-Verification header");
    throw new UnauthenticatedError("Missing webhook verification header");
  }

  try {
    // Step 1: Decode JWT header to get kid (key ID)
    const header = decodeProtectedHeader(verificationHeader);
    const kid = header.kid;

    if (!kid) {
      verificationLogger.warn("Missing kid in JWT header");
      throw new UnauthenticatedError("Invalid verification token");
    }

    // Verify algorithm is ES256
    if (header.alg !== "ES256") {
      verificationLogger.warn("Invalid JWT algorithm", {
        algorithm: header.alg,
      });
      throw new UnauthenticatedError("Invalid verification algorithm");
    }

    // Step 2: Get public key (cached or fetch from Plaid)
    let publicKey = publicKeyCache.get(kid);

    if (!publicKey) {
      verificationLogger.debug("Fetching public key from Plaid", { kid });
      const jwk = await plaidClient.getWebhookVerificationKey(kid);
      publicKey = await importJWK(jwk);
      publicKeyCache.set(kid, publicKey);
      verificationLogger.debug("Public key cached", { kid });
    }

    // Step 3: Verify JWT signature and check timestamp (max age: 5 minutes)
    const { payload } = await jwtVerify(verificationHeader, publicKey, {
      algorithms: ["ES256"],
      maxTokenAge: "5m", // Prevent replay attacks
    });

    // Step 4: Verify request body hash
    const requestBodySha256 = payload.request_body_sha256;

    if (!requestBodySha256 || typeof requestBodySha256 !== "string") {
      verificationLogger.warn("Missing request_body_sha256 in JWT payload");
      throw new UnauthenticatedError("Invalid verification payload");
    }

    // Calculate SHA-256 of request body using Node.js built-in crypto
    const calculatedHash = createHash("sha256")
      .update(rawBody, "utf8")
      .digest("hex");

    // Use constant-time comparison to prevent timing attacks
    // Convert strings to Buffers for timingSafeEqual (requires equal-length buffers)
    const expectedBuffer = Buffer.from(requestBodySha256, "utf8");
    const calculatedBuffer = Buffer.from(calculatedHash, "utf8");

    if (
      expectedBuffer.length !== calculatedBuffer.length ||
      !timingSafeEqual(expectedBuffer, calculatedBuffer)
    ) {
      verificationLogger.warn("Request body hash mismatch", {
        expected: requestBodySha256,
        calculated: calculatedHash,
      });
      throw new UnauthenticatedError("Invalid webhook signature");
    }

    verificationLogger.debug("Webhook signature verified successfully", {
      kid,
      iat: payload.iat,
    });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      throw error;
    }

    // Log unexpected errors
    verificationLogger.error("Webhook verification failed", { error });
    throw new UnauthenticatedError("Webhook verification failed");
  }
}

/**
 * Import JWK (JSON Web Key) from Plaid's webhook verification key format
 */
async function importJWK(jwk: Record<string, unknown>): Promise<CryptoKey> {
  // Convert Plaid's JWK format to Web Crypto API format
  // Note: kid is not part of JsonWebKey type, it's just metadata
  const keyData: JsonWebKey = {
    kty: jwk.kty as string,
    use: jwk.use as string,
    alg: jwk.alg as string,
    crv: jwk.crv as string,
    x: jwk.x as string,
    y: jwk.y as string,
  };

  return await crypto.subtle.importKey(
    "jwk",
    keyData,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    false,
    ["verify"],
  );
}
