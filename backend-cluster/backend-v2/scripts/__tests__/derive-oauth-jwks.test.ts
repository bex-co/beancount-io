import { createPublicKey, createSign, createVerify } from "node:crypto";
import { getJwks } from "@/config/jwks";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { deriveJwks, exportLines } = require("../derive-oauth-jwks.js");

// A self-hosted stack gets its OAuth signing key from AUTH_SECRET. What has to
// hold: it is a key the backend actually accepts, it is stable across restarts,
// it is not shared between deployments, and nothing happens unless asked.

describe("deriveJwks", () => {
  it("is accepted by the backend's own production parser", () => {
    const jwks = deriveJwks("a-long-random-auth-secret");
    expect(getJwks("production", JSON.stringify(jwks)).keys).toHaveLength(1);
  });

  it("is stable: the same secret gives the same key", () => {
    expect(deriveJwks("same-secret")).toEqual(deriveJwks("same-secret"));
  });

  it("is not shared: another secret gives another key and key id", () => {
    const a = deriveJwks("secret-one").keys[0];
    const b = deriveJwks("secret-two").keys[0];
    expect(a.d).not.toBe(b.d);
    expect(a.kid).not.toBe(b.kid);
  });

  it("signs a token its public half verifies, and another key's half does not", () => {
    const { keys } = deriveJwks("signing-secret");
    const { d: _private, ...publicHalf } = keys[0];
    const message = "header.payload";
    const signature = createSign("SHA256")
      .update(message)
      .sign({ key: keys[0], format: "jwk", dsaEncoding: "ieee-p1363" });
    const verifyWith = (jwk: object) =>
      createVerify("SHA256")
        .update(message)
        .verify(
          { key: createPublicKey({ key: jwk as never, format: "jwk" }), dsaEncoding: "ieee-p1363" },
          signature,
        );
    expect(verifyWith(publicHalf)).toBe(true);
    const { d: _other, ...otherPublic } = deriveJwks("another-secret").keys[0];
    expect(verifyWith(otherPublic)).toBe(false);
  });

  it.each([undefined, "", "   "])("refuses to derive from %p", (secret) => {
    expect(() => deriveJwks(secret)).toThrow(/AUTH_SECRET/);
  });
});

describe("exportLines", () => {
  const optedIn = { OAUTH_JWKS_FROM_AUTH_SECRET: "true", AUTH_SECRET: "s3cret" };

  it("does nothing unless the deployment opts in", () => {
    expect(exportLines({ AUTH_SECRET: "s3cret" })).toEqual([]);
    expect(
      exportLines({ ...optedIn, OAUTH_JWKS_FROM_AUTH_SECRET: "1" }),
    ).toEqual([]);
  });

  it("keeps a key the operator supplied", () => {
    expect(exportLines({ ...optedIn, OAUTH_JWKS: '{"keys":[]}' })).toEqual([]);
  });

  it("prints one eval-able line carrying the derived key", () => {
    const [line] = exportLines(optedIn);
    expect(line).toMatch(/^export OAUTH_JWKS='\{.*\}'$/);
    const json = line.slice("export OAUTH_JWKS='".length, -1);
    expect(JSON.parse(json)).toEqual(deriveJwks("s3cret"));
  });

  it("fails when opted in without a secret instead of running without OAuth", () => {
    expect(() =>
      exportLines({ OAUTH_JWKS_FROM_AUTH_SECRET: "true" }),
    ).toThrow(/AUTH_SECRET/);
  });
});
