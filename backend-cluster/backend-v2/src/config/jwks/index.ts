import {
  createECDH,
  createHash,
  createPrivateKey,
  generateKeyPairSync,
  hkdfSync,
} from "node:crypto";
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

// Order of the P-256 group: a private scalar must lie in [1, N-1].
const P256_ORDER = BigInt(
  "0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551",
);
const DERIVATION_SALT = "beancount.io/oauth-signing-key/v1";
const DERIVATION_INFO = "ES256";

/**
 * A signing key derived, deterministically, from a deployment secret.
 *
 * For a deployment that cannot be asked to generate a P-256 key document, such
 * as a one-click platform deploy (`OAUTH_JWKS_FROM_AUTH_SECRET`). AUTH_SECRET
 * already protects every session token this API signs and is generated once and
 * kept, so the key adds no secret to store or lose: it is the same on every
 * restart and changes only when AUTH_SECRET does. The constants are part of the
 * key's identity; changing them signs every OAuth client out.
 */
export function deriveSigningJwks(secret: string | undefined): SigningJwks {
  if (!secret?.trim()) {
    throw new Error("AUTH_SECRET is required to derive the OAuth signing key");
  }
  // 48 bytes, then reduced, so the scalar is uniform in [1, N-1] rather than
  // biased by a 32-byte value that can exceed the group order.
  const material = Buffer.from(
    hkdfSync("sha256", secret, DERIVATION_SALT, DERIVATION_INFO, 48),
  );
  const scalar =
    (BigInt("0x" + material.toString("hex")) % (P256_ORDER - BigInt(1))) +
    BigInt(1);
  const d = Buffer.from(scalar.toString(16).padStart(64, "0"), "hex");

  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(d);
  const point = ecdh.getPublicKey(); // 0x04 || X || Y
  const x = point.subarray(1, 33);
  const y = point.subarray(33, 65);
  const kid = createHash("sha256")
    .update(x)
    .update(y)
    .digest("base64url")
    .slice(0, 22);

  return {
    keys: [
      {
        kty: "EC",
        crv: "P-256",
        alg: "ES256",
        use: "sig",
        kid,
        x: x.toString("base64url"),
        y: y.toString("base64url"),
        d: d.toString("base64url"),
      },
    ],
  };
}

/** Where a deployment may take its signing key from when none is supplied. */
export interface JwksDerivation {
  fromAuthSecret: boolean;
  authSecret: string | undefined;
}

function derivationFromEnvironment(): JwksDerivation {
  return {
    fromAuthSecret: process.env.OAUTH_JWKS_FROM_AUTH_SECRET === "true",
    authSecret: process.env.AUTH_SECRET,
  };
}

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
  derivation: JwksDerivation = derivationFromEnvironment(),
): SigningJwks {
  if (env !== "production") {
    return developmentJwks;
  }

  if (!serializedProductionJwks?.trim()) {
    // A key the operator supplied always wins; derivation is an explicit
    // opt-in, so a managed deployment that loses its key still fails closed.
    if (derivation.fromAuthSecret) {
      return deriveSigningJwks(derivation.authSecret);
    }
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
  derivation: JwksDerivation = derivationFromEnvironment(),
): OptionalSigningJwks {
  try {
    return { jwks: getJwks(env, serializedProductionJwks, derivation) };
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
