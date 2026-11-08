import {
  createPublicKey,
  createSign,
  createVerify,
  generateKeyPairSync,
} from "node:crypto";
import { deriveSigningJwks, getJwks, getOptionalJwks } from "./index";

const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const privateEcJwks = JSON.stringify({
  keys: [
    {
      ...privateKey.export({ format: "jwk" }),
      kid: "rotated-1",
      alg: "ES256",
      use: "sig",
    },
  ],
});

describe("getJwks", () => {
  it("uses a process-local ephemeral non-production key for tests", () => {
    const jwks = getJwks("test");

    expect(jwks.keys).toHaveLength(1);
    expect(jwks.keys[0].kid).toBe("development-ephemeral");
    expect(jwks.keys[0].d).toBeTruthy();
  });

  it("loads a production private JWKS from the deployment secret", () => {
    expect(getJwks("production", privateEcJwks)).toEqual(
      JSON.parse(privateEcJwks),
    );
  });

  it("leaves OAuth unavailable instead of throwing when production has no key", () => {
    expect(getOptionalJwks("production", undefined)).toEqual({
      jwks: undefined,
      unavailableReason: "OAUTH_JWKS is required in production",
    });
  });

  it.each([undefined, "", "   "])(
    "rejects missing production signing material",
    (value) => {
      expect(() => getJwks("production", value)).toThrow(
        "OAUTH_JWKS is required in production",
      );
    },
  );

  it("rejects malformed production JSON", () => {
    expect(() => getJwks("production", "{nope")).toThrow(
      "OAUTH_JWKS must be valid JSON",
    );
  });

  it.each([
    JSON.stringify({}),
    JSON.stringify({ keys: [] }),
    JSON.stringify({ keys: [{ kty: "EC", kid: "public-only" }] }),
    JSON.stringify({ keys: [{ kty: "oct", kid: "symmetric", d: "secret" }] }),
    JSON.stringify({
      keys: [
        {
          kty: "EC",
          crv: "P-256",
          alg: "ES256",
          kid: "malformed",
          d: "not-a-key",
        },
      ],
    }),
  ])("rejects a production JWKS without a private asymmetric key", (value) => {
    expect(() => getJwks("production", value)).toThrow(
      "OAUTH_JWKS must contain at least one valid private P-256 ES256 signing key with a unique kid",
    );
  });

  it("rejects duplicate production key ids", () => {
    const key = JSON.parse(privateEcJwks).keys[0];

    expect(() =>
      getJwks("production", JSON.stringify({ keys: [key, key] })),
    ).toThrow("OAUTH_JWKS key ids must be unique");
  });
});

// A deployment that cannot generate a P-256 key document (a one-click platform
// deploy) takes its OAuth signing key from AUTH_SECRET. What has to hold: the
// backend's own parser accepts it, it is stable across restarts, it is not shared
// between deployments, and nothing happens unless the deployment asked.
describe("deriveSigningJwks", () => {
  it("produces a key the production parser accepts", () => {
    const jwks = deriveSigningJwks("a-long-random-auth-secret");
    expect(getJwks("production", JSON.stringify(jwks)).keys).toHaveLength(1);
  });

  it("is stable: the same secret gives the same key", () => {
    expect(deriveSigningJwks("same-secret")).toEqual(
      deriveSigningJwks("same-secret"),
    );
  });

  // The derivation constants are the key's identity. If this fails, a change
  // altered every derived key and signs every OAuth client out.
  it("derives the key it always has for a known secret", () => {
    expect(deriveSigningJwks("known-answer-secret").keys[0].kid).toBe(
      "xBhl6R6L6ey2zEHj-3R3M0",
    );
  });

  it("is not shared: another secret gives another key and key id", () => {
    const a = deriveSigningJwks("secret-one").keys[0];
    const b = deriveSigningJwks("secret-two").keys[0];
    expect(a.d).not.toBe(b.d);
    expect(a.kid).not.toBe(b.kid);
  });

  it("signs a token its public half verifies, and another key's half does not", () => {
    const { keys } = deriveSigningJwks("signing-secret");
    const { d: _private, ...publicHalf } = keys[0];
    const message = "header.payload";
    const signature = createSign("SHA256")
      .update(message)
      .sign({ key: keys[0], format: "jwk", dsaEncoding: "ieee-p1363" });
    const verifiesWith = (jwk: object) =>
      createVerify("SHA256")
        .update(message)
        .verify(
          {
            key: createPublicKey({ key: jwk as never, format: "jwk" }),
            dsaEncoding: "ieee-p1363",
          },
          signature,
        );
    expect(verifiesWith(publicHalf)).toBe(true);
    const { d: _other, ...otherPublic } = deriveSigningJwks("another").keys[0];
    expect(verifiesWith(otherPublic)).toBe(false);
  });

  it.each([undefined, "", "   "])("refuses to derive from %p", (secret) => {
    expect(() => deriveSigningJwks(secret)).toThrow(/AUTH_SECRET/);
  });
});

describe("getJwks with a derived key", () => {
  const optedIn = { fromAuthSecret: true, authSecret: "s3cret" };

  it("derives only when the deployment opted in", () => {
    expect(getJwks("production", undefined, optedIn)).toEqual(
      deriveSigningJwks("s3cret"),
    );
    // Not opted in: fails closed, as a managed deployment that lost its key must.
    expect(() =>
      getJwks("production", undefined, {
        fromAuthSecret: false,
        authSecret: "s3cret",
      }),
    ).toThrow("OAUTH_JWKS is required in production");
  });

  it("keeps a key the operator supplied", () => {
    expect(getJwks("production", privateEcJwks, optedIn).keys[0].kid).toBe(
      "rotated-1",
    );
  });

  it("leaves OAuth unavailable, with the reason, when opted in without a secret", () => {
    const result = getOptionalJwks("production", undefined, {
      fromAuthSecret: true,
      authSecret: undefined,
    });
    expect(result.jwks).toBeUndefined();
    expect(result.unavailableReason).toMatch(/AUTH_SECRET/);
  });

  it("reads the opt-in and the secret from the environment by default", () => {
    const saved = { ...process.env };
    try {
      delete process.env.OAUTH_JWKS;
      process.env.OAUTH_JWKS_FROM_AUTH_SECRET = "true";
      process.env.AUTH_SECRET = "from-the-environment";
      expect(getJwks("production")).toEqual(
        deriveSigningJwks("from-the-environment"),
      );
      process.env.OAUTH_JWKS_FROM_AUTH_SECRET = "1";
      expect(() => getJwks("production")).toThrow();
    } finally {
      process.env = saved;
    }
  });
});
