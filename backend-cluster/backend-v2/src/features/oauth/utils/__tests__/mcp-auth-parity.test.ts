/**
 * w1/m18 replaced MCP's private token parser with the shared identity gate.
 * That is only safe if the gate accepts everything the old parser accepted:
 * every live MCP credential was minted under the old contract, and a narrowing
 * would log those clients out with no way for them to tell why.
 *
 * The old contract, verbatim from `resolveOidcToken` at the previous commit:
 *
 *   jwtVerify(token, jwks, { issuer })            // signature + issuer only
 *   if (!payload.sub || !payload["ledger_id"]) return null;
 *
 * No audience check, no algorithm constraint, no scope requirement. This suite
 * holds the new path to that same acceptance set, so a future tightening has to
 * be a deliberate edit here rather than a side effect somewhere else.
 */
import { SignJWT, exportJWK, generateKeyPair, type CryptoKey } from "jose";
import type { AppConfig } from "@/config/config";

const ISSUER = "https://beancount.io";

let mockLocalJwks: { keys: object[] };
let privateKey: CryptoKey;

jest.mock("jose", () => {
  const actual = jest.requireActual("jose");
  return {
    ...actual,
    createRemoteJWKSet: () => actual.createLocalJWKSet(mockLocalJwks),
  };
});

import { resolveOidcIdentity } from "../oidc-verify";

beforeAll(async () => {
  const pair = await generateKeyPair("ES256", { extractable: true });
  privateKey = pair.privateKey;
  const pub = await exportJWK(pair.publicKey);
  pub.kid = "test-key";
  pub.alg = "ES256";
  mockLocalJwks = { keys: [pub] };
});

const config = { oauth: { issuer: ISSUER } } as unknown as AppConfig;

function mint(
  claims: Record<string, unknown>,
  opts: { audience?: string; issuer?: string } = {},
): Promise<string> {
  const jwt = new SignJWT(claims)
    .setProtectedHeader({ alg: "ES256", kid: "test-key" })
    .setIssuer(opts.issuer ?? ISSUER)
    .setSubject((claims.sub as string) ?? "user-1")
    .setIssuedAt()
    .setExpirationTime("1h");
  // The old contract never required an audience, so neither may this suite.
  return opts.audience
    ? jwt.setAudience(opts.audience).sign(privateKey)
    : jwt.sign(privateKey);
}

describe("MCP auth parity — the gate accepts everything the old parser did", () => {
  it.each([
    ["the audience the provider mints", `${ISSUER}/api-gateway/mcp`],
    ["the audience of the eventual rename", `${ISSUER}/v1`],
    ["an audience nobody anticipated", "https://other.example/x"],
  ])("accepts a ledger-pinned token with %s", async (_label, audience) => {
    const identity = await resolveOidcIdentity(
      await mint(
        { sub: "user-1:ada/personal", ledger_id: "ada/personal" },
        { audience },
      ),
      config,
    );
    expect(identity).toMatchObject({
      userId: "user-1",
      ledgerId: "ada/personal",
    });
  });

  it("accepts a token carrying no audience claim at all", async () => {
    const identity = await resolveOidcIdentity(
      await mint({ sub: "user-1:ada/personal", ledger_id: "ada/personal" }),
      config,
    );
    expect(identity?.userId).toBe("user-1");
  });

  it("accepts a token with no scope claim (no live MCP token has one)", async () => {
    const identity = await resolveOidcIdentity(
      await mint({ sub: "user-1:ada/personal", ledger_id: "ada/personal" }),
      config,
    );
    expect(identity?.scopes).toEqual([]);
  });

  it("still refuses a token from another issuer, as before", async () => {
    const identity = await resolveOidcIdentity(
      await mint(
        { sub: "user-1", ledger_id: "ada/personal" },
        { issuer: "https://evil.example" },
      ),
      config,
    );
    expect(identity).toBeNull();
  });
});
