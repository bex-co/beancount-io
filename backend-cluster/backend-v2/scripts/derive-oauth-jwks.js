/**
 * Give a self-hosted deployment its OAuth signing key without asking a person
 * to generate one: derive it, deterministically, from AUTH_SECRET.
 *
 * Production refuses to start OAuth without OAUTH_JWKS, and every OAuth route,
 * including the discovery document an MCP client needs, answers 503 until it is
 * set. The key is a private P-256 JWK set, not a random string, so a platform
 * cannot generate it for you. AUTH_SECRET already protects every session
 * token this API signs and is generated once and kept, so a key derived from it
 * adds no new secret to store or lose: it is the same on every restart, and
 * changes only when AUTH_SECRET does (which invalidates sessions anyway).
 *
 * Acts only when OAUTH_JWKS_FROM_AUTH_SECRET=true and OAUTH_JWKS is unset, so
 * the managed service and any operator-supplied key are untouched. Prints an
 * `export` line for the caller to eval, like resolve-public-url.js; exits
 * non-zero if asked to derive without an AUTH_SECRET, so the container stops
 * rather than quietly running without OAuth.
 *
 * Plain CommonJS on purpose — it runs with bare `node`, no ts-node, no aliases.
 */
const { createECDH, createHash, hkdfSync } = require("node:crypto");

// Order of the P-256 group: a private scalar must be in [1, N-1].
const P256_ORDER = BigInt(
  "0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551",
);
const SALT = "beancount.io/oauth-signing-key/v1";
const INFO = "ES256";

const b64url = (buffer) => Buffer.from(buffer).toString("base64url");

/** The JWK set for `secret`: same secret, same key, every time. */
function deriveJwks(secret) {
  if (!secret || !String(secret).trim()) {
    throw new Error("AUTH_SECRET is required to derive the OAuth signing key");
  }
  // 48 bytes then reduce, so the scalar is uniform in [1, N-1] rather than
  // biased by a 32-byte value that can exceed the group order.
  const material = Buffer.from(hkdfSync("sha256", secret, SALT, INFO, 48));
  const scalar = (BigInt("0x" + material.toString("hex")) % (P256_ORDER - 1n)) + 1n;
  const d = Buffer.from(scalar.toString(16).padStart(64, "0"), "hex");

  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(d);
  const point = ecdh.getPublicKey(); // 0x04 || X || Y
  const x = point.subarray(1, 33);
  const y = point.subarray(33, 65);
  const kid = b64url(createHash("sha256").update(x).update(y).digest()).slice(0, 22);

  return {
    keys: [
      {
        kty: "EC",
        crv: "P-256",
        alg: "ES256",
        use: "sig",
        kid,
        x: b64url(x),
        y: b64url(y),
        d: b64url(d),
      },
    ],
  };
}

/** The `export` line to eval, or nothing when this deployment did not opt in. */
function exportLines(env) {
  if (env.OAUTH_JWKS_FROM_AUTH_SECRET !== "true") return [];
  if ((env.OAUTH_JWKS || "").trim()) return [];
  return [`export OAUTH_JWKS='${JSON.stringify(deriveJwks(env.AUTH_SECRET))}'`];
}

if (require.main === module) {
  try {
    const lines = exportLines(process.env);
    if (lines.length) console.log(lines.join("\n"));
  } catch (error) {
    console.error(`derive-oauth-jwks: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { deriveJwks, exportLines };
