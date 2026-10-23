/**
 * w23/070: REST answered a bearer token it refused — issued for MCP, expired,
 * malformed — with "send `Authorization: Bearer <token>`", the header the
 * caller had just sent, so an agent retried it instead of switching
 * credentials. GraphQL said "Authentication required" the same way.
 */
import { SignJWT, exportJWK, generateKeyPair, type CryptoKey } from "jose";
import type { AppConfig } from "@/config/config";
import type { AppLayers, DatabaseLayer } from "@/foundation/composition";
import { credentialRejection } from "@/server/api/identity";
import { createContext } from "@/server/graphql/context";
import { authenticatedMiddleware } from "@/server/graphql/authenticated";
import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";

const ISSUER = "https://beancount.io";
const MCP_TOKEN = /issued for the MCP endpoint/;
const REFUSED = /not accepted: it is expired, revoked, malformed/;
const ABSENT = "This endpoint requires a credential";

let privateKey: CryptoKey;
let config: AppConfig;
const tokens: Record<string, string> = {};

const mint = (audience: string, expiresAt: string | number = "1h") =>
  new SignJWT({ scope: "ledger.read" })
    .setProtectedHeader({ alg: "ES256", kid: "test-key" })
    .setIssuer(ISSUER)
    .setSubject("usr_qa")
    .setIssuedAt()
    .setAudience(audience)
    .setExpirationTime(expiresAt)
    .sign(privateKey);

beforeAll(async () => {
  const pair = await generateKeyPair("ES256", { extractable: true });
  privateKey = pair.privateKey;
  const pub = await exportJWK(pair.publicKey);
  pub.kid = "test-key";
  pub.alg = "ES256";
  config = {
    api: { scopeEnforcement: "enforce" },
    oauth: { issuer: ISSUER, jwks: { keys: [pub] } },
  } as unknown as AppConfig;
  tokens.mcp = await mint(`${ISSUER}/api-gateway/mcp`);
  tokens.expired = await mint(
    `${ISSUER}/v1`,
    Math.floor(Date.now() / 1000) - 60,
  );
});

// Each credential a caller can send, and how its refusal must read.
const cases = () =>
  [
    [
      "an MCP-audience token",
      { authorization: `Bearer ${tokens.mcp}` },
      MCP_TOKEN,
    ],
    [
      "an expired token",
      { authorization: `Bearer ${tokens.expired}` },
      REFUSED,
    ],
    [
      "a malformed bearer",
      { authorization: "Bearer garbage.token.value" },
      REFUSED,
    ],
    ["an unknown API key", { "x-api-key": "bcio_not_a_real_key" }, REFUSED],
  ] as const;

describe("credentialRejection", () => {
  it("names nothing for a request with no credential header", async () => {
    expect(await credentialRejection({ headers: {} }, config)).toBeUndefined();
    // A browser's expired session keeps its sign-in refusal.
    expect(
      await credentialRejection({ headers: { cookie: "token=stale" } }, config),
    ).toBeUndefined();
  });

  it("tells each refused credential apart from a missing one", async () => {
    for (const [, headers, message] of cases()) {
      expect(await credentialRejection({ headers }, config)).toMatch(message);
    }
  });
});

describe("REST", () => {
  it("answers each refused credential with its own 401", async () => {
    const rest = await startV1TestServer({} as AppLayers, config, {
      ledger: true,
      apiKeys: false,
      social: false,
      accountReads: false,
      configuration: false,
    });
    const years = (headers: Record<string, string>) =>
      fetch(`${rest.url}/api-gateway/v1/ledgers/alice/main/years`, {
        headers,
      }).then(async (response) => ({
        status: response.status,
        body: (await response.json()) as {
          error: { code: string; message: string };
        },
      }));
    try {
      const absent = await years({});
      expect(absent.status).toBe(401);
      expect(absent.body.error.message).toContain(ABSENT);
      for (const [, headers, message] of cases()) {
        const refused = await years(headers);
        expect(refused.status).toBe(401);
        expect(refused.body.error).toMatchObject({ code: "UNAUTHENTICATED" });
        expect(refused.body.error.message).toMatch(message);
      }
    } finally {
      await rest.close();
    }
  });
});

describe("GraphQL", () => {
  const database = {
    db: {},
    models: {
      jwt: { verify: async () => null },
      apiKey: { findByDigest: async () => undefined },
      user: { getById: async () => undefined },
    },
  } as unknown as DatabaseLayer;
  const refusal = async (headers: Record<string, string>) => {
    const context = await createContext({ headers }, database, config);
    const messages: string[] = [];
    for (const refuse of [
      () => context.getCurrentIdentity(),
      () => authenticatedMiddleware({ context } as never, async () => {}),
    ]) {
      try {
        await refuse();
      } catch (error) {
        messages.push((error as Error).message);
      }
    }
    return messages;
  };

  it("keeps its sign-in refusals for a request with no credential", async () => {
    expect(await refusal({})).toEqual([
      "Authentication required",
      "Access denied! Please login to continue!",
    ]);
  });

  it("refuses each credential with REST's wording", async () => {
    for (const [, headers, message] of cases()) {
      const messages = await refusal(headers);
      expect(messages).toHaveLength(2);
      for (const text of messages) expect(text).toMatch(message);
    }
  });
});
