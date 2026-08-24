import { generateKeyPairSync } from "node:crypto";
import { getJwks, getOptionalJwks } from "./index";

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
