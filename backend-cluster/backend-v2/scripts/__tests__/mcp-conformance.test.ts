import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

const resolveIdentityMock = jest.fn();
jest.mock("@/server/api/identity", () => ({
  ...jest.requireActual("@/server/api/identity"),
  resolveIdentity: (...args: unknown[]) => resolveIdentityMock(...args),
}));

import http from "node:http";
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import Router from "@koa/router";
import { setMcpRoute } from "@/features/ai-agent/api/mcp-route";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { restErrorMiddleware } from "@/server/rest/error-middleware";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { Identity } from "@/server/api/identity";
import { CHECKS } from "../mcp-conformance";

const [
  checkUnauthenticated,
  checkDiscovery,
  checkMethodRefusal,
  checkToolsList,
  checkScopeRefusal,
  checkErrorMasking,
  checkAdvertisedPath,
  checkOptionalUserId,
  checkDiscoveryWorkload,
  checkResultShape,
  checkPkceS256,
  checkIssParameter,
  checkRegistrationEndpoint,
  checkPublicClientAuth,
  checkResourceMatches,
  checkCimd,
] = CHECKS;

const ledgerScoped: Identity = {
  userId: "usr_1",
  method: "apikey",
  scopes: new Set(["ledger.read", "ledger.write"]),
  tokenId: "tok_1",
  ledgerScope: "alice/main",
};

const readOnly: Identity = { ...ledgerScoped, scopes: new Set(["ledger.read"]) };

let server: http.Server;
let baseUrl: string;

/**
 * The real route on a real socket, because the checks are HTTP-level
 * assertions: a 405 that never closes its response passes every assertion a
 * fabricated context can make.
 */
beforeAll(async () => {
  const config = {
    api: { scopeEnforcement: "enforce" },
    oauth: { issuer: "http://127.0.0.1:0" },
  } as AppConfig;

  const layers = {
    database: {},
    services: {
      // The count accompanies the rendered text from the same query result.
      ledgerShell: {
        queryShellText: async () => ({
          text: [
            "   account         balance",
            "------------ -------------",
            "Assets:Cash     100.00 USD",
          ].join("\n"),
          rowCount: 1,
        }),
      },
      ledgerData: { getSourceFiles: async () => ["main.bean"] },
      ledgerRepo: {
        changeFiles: async ({ identity }: { identity: Identity }) => {
          if (!identity.scopes.has("ledger.write")) {
            throw new Error('This operation requires the "ledger.write" scope');
          }
        },
      },
      apiKey: {},
      llm: {},
    },
    workflows: { ledgerReceipt: {} },
  } as unknown as AppLayers;

  const app = new Koa();
  const router = new Router();
  app.use(restErrorMiddleware());
  app.use(bodyParser());
  setMcpRoute(router, layers, config, (ctx) =>
    assembleMcpRegistry(ctx, config),
  );
  app.use(router.routes()).use(router.allowedMethods());
  server = http.createServer(app.callback());
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as { port: number };
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

beforeEach(() => {
  resolveIdentityMock.mockReset();
  // Default: anonymous. Checks that need a credential opt in below.
  resolveIdentityMock.mockResolvedValue(undefined);
});

/** Honour the credential the check actually sent, so scopes differ per token. */
function acceptTokens(map: Record<string, Identity>) {
  resolveIdentityMock.mockImplementation(async (ctx: { get: (h: string) => string }) => {
    const auth = ctx.get?.("authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    return map[token];
  });
}

jest.setTimeout(60000);

describe("MCP conformance checks", () => {
  it("check 1 passes when the endpoint refuses anonymously with a pointer", async () => {
    const result = await checkUnauthenticated({ baseUrl });
    expect(result.outcome).toBe("pass");
    expect(result.detail).toContain(".well-known/oauth-protected-resource");
  });

  it("check 3 passes when GET and DELETE are refused and complete", async () => {
    acceptTokens({ good: ledgerScoped });
    const result = await checkMethodRefusal({ baseUrl, token: "good" });
    expect(result.outcome).toBe("pass");
  });

  it("check 4 passes and reports every tool publishing an outputSchema", async () => {
    acceptTokens({ good: ledgerScoped });
    const result = await checkToolsList({ baseUrl, token: "good" });
    expect(result.outcome).toBe("pass");
    expect(result.detail).toMatch(/\d+ tools, all publishing an outputSchema/);
  });

  it("check 4 initializes and discovers tools with an unpinned credential", async () => {
    acceptTokens({ unpinned: { ...ledgerScoped, ledgerScope: undefined } });
    const result = await checkToolsList({ baseUrl, token: "unpinned" });
    expect(result.outcome).toBe("pass");
    expect(result.detail).toMatch(/\d+ tools, all publishing an outputSchema/);
  });

  it("check 5 passes when a read-only credential is refused a write", async () => {
    acceptTokens({ ro: readOnly });
    const result = await checkScopeRefusal({ baseUrl, readOnlyToken: "ro" });
    expect(result.outcome).toBe("pass");
  });

  it("check 5 reports the machine code the refusal carried", async () => {
    acceptTokens({ ro: readOnly });
    // w2/m28:t003 — the check now requires `{code, hint}`, not just prose, so
    // a server that regressed to the bare-text dialect fails it.
    const result = await checkScopeRefusal({ baseUrl, readOnlyToken: "ro" });
    expect(result.outcome).toBe("pass");
    expect(result.detail).toMatch(/code [A-Z_]+/);
  });

  it("check 10 passes when a BQL result leads with its row count", async () => {
    acceptTokens({ good: ledgerScoped });
    const result = await checkResultShape({ baseUrl, token: "good" });
    expect(result.outcome).toBe("pass");
    expect(result.detail).toContain("1 row");
  });

  it("check 10 skips rather than fails without a credential", async () => {
    const result = await checkResultShape({ baseUrl });
    expect(result.outcome).toBe("skip");
  });

  it("check 6 passes when nothing internal leaks to an unknown credential", async () => {
    const result = await checkErrorMasking({ baseUrl });
    expect(result.outcome).toBe("pass");
  });

  it("check 7 passes when the canonical path reaches MCP", async () => {
    const result = await checkAdvertisedPath({ baseUrl });
    expect(result.outcome).toBe("pass");
    expect(result.detail).toContain("/api-gateway/mcp: reaches MCP");
  });

  it("check 8 passes when feature-flags reads without userId", async () => {
    acceptTokens({ good: ledgerScoped });
    const result = await checkOptionalUserId({ baseUrl, token: "good" });
    expect(result.outcome).toBe("pass");
    expect(result.detail).toContain("without userId");
  });

  it("check 8 skips with a reason when no credential is supplied", async () => {
    const result = await checkOptionalUserId({ baseUrl });
    expect(result.outcome).toBe("skip");
    expect(result.detail).toMatch(/needs --/);
  });

  it("check 9 passes with instructions, hero tools, and concrete resources", async () => {
    acceptTokens({ good: ledgerScoped });
    const result = await checkDiscoveryWorkload({ baseUrl, token: "good" });
    expect(result.outcome).toBe("pass");
    expect(result.detail).toMatch(/no retired names/);
  });

  it("check 9 skips with a reason when no credential is supplied", async () => {
    const result = await checkDiscoveryWorkload({ baseUrl });
    expect(result.outcome).toBe("skip");
    expect(result.detail).toMatch(/needs --/);
  });

  /**
   * A skip must never read as a pass. The whole point of the distinction is
   * that an operator can tell "this check did not run" from "this check
   * confirmed something".
   */
  it.each([
    ["3 method-refusal", checkMethodRefusal],
    ["4 tools-list", checkToolsList],
    ["5 refusal-dialect", checkScopeRefusal],
  ])("%s skips with a reason when no credential is supplied", async (_id, check) => {
    const result = await check({ baseUrl });
    expect(result.outcome).toBe("skip");
    expect(result.detail).toMatch(/needs --/);
  });

  it("check 2 fails, naming the unreachable document, when discovery does not resolve", async () => {
    // This server serves no /.well-known — exactly the production shape where
    // the 401 is correct and the URL it names is not.
    const result = await checkDiscovery({ baseUrl });
    expect(result.outcome).toBe("fail");
    expect(result.detail).toContain("oauth-protected-resource");
  });
});

/**
 * Checks 11–15 read only discovery documents, so a stub that serves the chain a
 * host follows — 401 pointer, protected resource, authorization-server
 * metadata — is the whole surface. Each case breaks exactly one field.
 */
describe("MCP conformance: what hosts gate on (ADR 019 D8)", () => {
  const GOOD = {
    code_challenge_methods_supported: ["S256"],
    authorization_response_iss_parameter_supported: true,
    registration_endpoint: "REG",
    token_endpoint_auth_methods_supported: ["client_secret_basic", "none"],
    client_id_metadata_document_supported: true,
  };
  let stub: http.Server;
  let stubUrl: string;
  let serverMeta: Record<string, unknown>;
  let resourceOverride: unknown;
  let issuerPath: string;
  let pointer: boolean;
  let hits: string[];

  beforeAll(async () => {
    stub = http.createServer((req, res) => {
      const url = req.url ?? "";
      hits.push(url);
      const json = (body: unknown) => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(body));
      };
      if (url === "/api-gateway/mcp") {
        res.writeHead(401, pointer
          ? { "www-authenticate": `Bearer resource_metadata="${stubUrl}/.well-known/oauth-protected-resource"` }
          : {});
        return res.end();
      }
      if (url === "/.well-known/oauth-protected-resource") {
        return json({
          resource: resourceOverride ?? `${stubUrl}/api-gateway/mcp`,
          authorization_servers: [`${stubUrl}${issuerPath}`],
        });
      }
      if (url === `/.well-known/oauth-authorization-server${issuerPath}`) {
        return json(serverMeta);
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((r) => stub.listen(0, "127.0.0.1", r));
    stubUrl = `http://127.0.0.1:${(stub.address() as { port: number }).port}`;
  });
  afterAll(() => new Promise<void>((r) => stub.close(() => r())));
  beforeEach(() => {
    serverMeta = { ...GOOD };
    resourceOverride = undefined;
    issuerPath = "";
    pointer = true;
    hits = [];
  });

  const all = [
    checkPkceS256,
    checkIssParameter,
    checkRegistrationEndpoint,
    checkPublicClientAuth,
    checkResourceMatches,
    checkCimd,
  ];

  // An issuer under a path prefix is found by RFC 8414 path insertion.
  it.each(["", "/auth"])("passes every check against complete metadata (issuer path %j)", async (path) => {
    issuerPath = path;
    for (const check of all) {
      expect((await check({ baseUrl: stubUrl })).outcome).toBe("pass");
    }
  });

  it("discovers the metadata once for a whole run", async () => {
    // `main` hands every check the same options object.
    const run = { baseUrl: stubUrl };
    for (const check of all) {
      expect((await check(run)).outcome).toBe("pass");
    }
    expect(hits).toEqual([
      "/api-gateway/mcp",
      "/.well-known/oauth-protected-resource",
      "/.well-known/oauth-authorization-server",
    ]);
  });

  it.each([
    ["11 pkce-s256", () => checkPkceS256, { code_challenge_methods_supported: ["plain"] }, /every OAuth host/],
    ["12 iss-parameter", () => checkIssParameter, { authorization_response_iss_parameter_supported: false }, /ChatGPT/],
    ["13 registration-endpoint", () => checkRegistrationEndpoint, { registration_endpoint: undefined }, /Cursor/],
    ["14 public-client-auth", () => checkPublicClientAuth, { token_endpoint_auth_methods_supported: ["client_secret_basic"] }, /Claude/],
    ["16 cimd", () => checkCimd, { client_id_metadata_document_supported: undefined }, /register.*per connection/],
  ])("%s fails, naming the hosts it locks out, when its field is wrong", async (_id, check, patch, hosts) => {
    serverMeta = { ...GOOD, ...patch };
    const result = await check()({ baseUrl: stubUrl });
    expect(result.outcome).toBe("fail");
    expect(result.detail).toMatch(hosts);
  });

  it("15 resource-matches fails when the resource names another URL", async () => {
    resourceOverride = "https://elsewhere.example/api-gateway/mcp";
    const result = await checkResourceMatches({ baseUrl: stubUrl });
    expect(result.outcome).toBe("fail");
    expect(result.detail).toContain("elsewhere.example");
  });

  it("skips rather than fails when the endpoint offers no pointer to follow", async () => {
    pointer = false;
    for (const check of all) {
      const result = await check({ baseUrl: stubUrl });
      expect(result.outcome).toBe("skip");
      expect(result.detail).toMatch(/check 1/);
    }
  });
});
