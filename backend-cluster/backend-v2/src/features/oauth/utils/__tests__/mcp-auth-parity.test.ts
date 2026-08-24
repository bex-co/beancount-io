/** MCP keeps its old resource audience only for the documented refresh-token
 * compatibility window. It never accepts an absent or arbitrary audience. */
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
  return opts.audience
    ? jwt.setAudience(opts.audience).sign(privateKey)
    : jwt.sign(privateKey);
}

describe("MCP audience enforcement", () => {
  it.each([
    ["the transitional legacy audience", `${ISSUER}/api-gateway/mcp`],
    ["the canonical API audience", `${ISSUER}/v1`],
  ])("accepts a ledger-pinned token with %s", async (_label, audience) => {
    const identity = await resolveOidcIdentity(
      await mint(
        { sub: "user-1:ada/personal", ledger_id: "ada/personal" },
        { audience },
      ),
      config,
      "mcp",
    );
    expect(identity).toMatchObject({
      userId: "user-1",
      ledgerId: "ada/personal",
    });
  });

  it.each([undefined, "https://other.example/x"])(
    "rejects a token carrying audience %s",
    async (audience) => {
      const identity = await resolveOidcIdentity(
        await mint(
          { sub: "user-1:ada/personal", ledger_id: "ada/personal" },
          audience ? { audience } : {},
        ),
        config,
        "mcp",
      );
      expect(identity).toBeNull();
    },
  );

  it("accepts an audience-bound token with no scope claim", async () => {
    const identity = await resolveOidcIdentity(
      await mint(
        { sub: "user-1:ada/personal", ledger_id: "ada/personal" },
        { audience: `${ISSUER}/api-gateway/mcp` },
      ),
      config,
      "mcp",
    );
    expect(identity?.scopes).toEqual([]);
  });

  it("still refuses a token from another issuer, as before", async () => {
    const identity = await resolveOidcIdentity(
      await mint(
        { sub: "user-1", ledger_id: "ada/personal" },
        {
          issuer: "https://evil.example",
          audience: `${ISSUER}/api-gateway/mcp`,
        },
      ),
      config,
      "mcp",
    );
    expect(identity).toBeNull();
  });
});
