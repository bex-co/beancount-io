import { createPrivateKey, generateKeyPairSync } from "node:crypto";
import type { Environment } from "@/config/config";

interface SigningJwk extends JsonWebKey {
  kid: string;
  kty: "EC";
  crv: "P-256";
  alg: "ES256";
  d: string;
}

export interface SigningJwks {
  keys: SigningJwk[];
}

export type OptionalSigningJwks =
  | { jwks: SigningJwks; unavailableReason?: never }
  | { jwks: undefined; unavailableReason: string };

function isSigningJwk(value: unknown): value is SigningJwk {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (
    !(
      candidate.kty === "EC" &&
      candidate.crv === "P-256" &&
      candidate.alg === "ES256" &&
      (candidate.use === undefined || candidate.use === "sig") &&
      (candidate.key_ops === undefined ||
        (Array.isArray(candidate.key_ops) &&
          candidate.key_ops.includes("sign"))) &&
      typeof candidate.kid === "string" &&
      candidate.kid.length > 0 &&
      typeof candidate.d === "string" &&
      candidate.d.length > 0
    )
  ) {
    return false;
  }
  try {
    return (
      createPrivateKey({ key: candidate as JsonWebKey, format: "jwk" })
        .asymmetricKeyType === "ec"
    );
  } catch {
    return false;
  }
}

function generateDevelopmentJwks(): SigningJwks {
  const { privateKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
  });
  const key = privateKey.export({ format: "jwk" });
  return {
    keys: [
      {
        ...key,
        kty: "EC",
        kid: "development-ephemeral",
        alg: "ES256",
        use: "sig",
      } as SigningJwk,
    ],
  };
}

const developmentJwks = generateDevelopmentJwks();

/**
 * Resolve the authorization server's private signing keys.
 *
 * Development and tests use a process-local ephemeral key so no private JWK is
 * tracked at all. Production must receive a complete private JWKS through the
 * deployment secret boundary. Falling back to a source-controlled key would
 * make every public clone an access-token issuer.
 */
export function getJwks(
  env: Environment,
  serializedProductionJwks: string | undefined = process.env.OAUTH_JWKS,
): SigningJwks {
  if (env !== "production") {
    return developmentJwks;
  }

  if (!serializedProductionJwks?.trim()) {
    throw new Error("OAUTH_JWKS is required in production");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(serializedProductionJwks);
  } catch {
    throw new Error("OAUTH_JWKS must be valid JSON");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("OAUTH_JWKS must be a JSON object");
  }

  const keys = (parsed as { keys?: unknown }).keys;
  if (!Array.isArray(keys) || keys.length === 0 || !keys.every(isSigningJwk)) {
    throw new Error(
      "OAUTH_JWKS must contain at least one valid private P-256 ES256 signing key with a unique kid",
    );
  }

  const keyIds = keys.map((key) => key.kid);
  if (new Set(keyIds).size !== keyIds.length) {
    throw new Error("OAUTH_JWKS key ids must be unique");
  }

  return { keys };
}

/**
 * OAuth is optional while legacy session authentication remains supported.
 * Missing production signing keys disable OAuth without taking down the API.
 */
export function getOptionalJwks(
  env: Environment,
  serializedProductionJwks: string | undefined = process.env.OAUTH_JWKS,
): OptionalSigningJwks {
  try {
    return { jwks: getJwks(env, serializedProductionJwks) };
  } catch (error) {
    return {
      jwks: undefined,
      unavailableReason:
        error instanceof Error
          ? error.message
          : "OAuth signing keys are invalid",
    };
  }
}
