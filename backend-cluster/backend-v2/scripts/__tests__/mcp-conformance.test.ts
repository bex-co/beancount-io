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
import { corsMiddleware } from "@/server/middleware/cors-middleware";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CHECKS, resolveTokens } from "../mcp-conformance";

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
  checkOutputSchemaConformance,
  checkBrowserDiscovery,
] = CHECKS;

const ledgerScoped: Identity = {
  userId: "usr_1",
  method: "apikey",
  scopes: new Set(["ledger.read", "ledger.write"]),
  tokenId: "tok_1",
  ledgerScope: "alice/main",
};

const readOnly: Identity = { ...ledgerScoped, scopes: new Set(["ledger.read"]) };

/** What the stubbed ledger-entry service answers an append preview with. */
let appendPreviewErrors: Record<string, unknown>[] = [];

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
      ledgerEntry: {
        appendDirectiveText: async () => ({
          message: "Would append 1 directive",
          dryRun: true,
          count: 1,
          diff: [],
          appendedUnsorted: [],
          wrote: [],
          entryHashes: [],
          errorsBefore: 0,
          errorsAfter: appendPreviewErrors.length,
          newErrors: appendPreviewErrors,
          valid: appendPreviewErrors.length === 0,
        }),
      },
      apiKey: {},
      llm: {},
    },
    workflows: { ledgerReceipt: {} },
  } as unknown as AppLayers;

  const app = new Koa();
  const router = new Router();
  app.use(corsMiddleware());
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
  appendPreviewErrors = [];
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

  it("check 3 passes when GET, DELETE, OPTIONS and PUT are refused and complete", async () => {
    acceptTokens({ good: ledgerScoped });
    const result = await checkMethodRefusal({ baseUrl, token: "good" });
    expect(result.outcome).toBe("pass");
  });

  it("check 18 passes when the 401 exposes WWW-Authenticate to a browser origin", async () => {
    const result = await checkBrowserDiscovery({ baseUrl });
    expect(result.outcome).toBe("pass");
  });

  it("check 18 fails when WWW-Authenticate is set but not exposed", async () => {
    // A bare server: the header is on the 401, but nothing lists it for
    // cross-origin readers — what every deployment looked like before w23/m32.
    const bare = http.createServer((_req, res) => {
      res.writeHead(401, { "WWW-Authenticate": 'Bearer resource_metadata="x"' });
      res.end("{}");
    });
    await new Promise<void>((r) => bare.listen(0, "127.0.0.1", r));
    const { port } = bare.address() as { port: number };
    try {
      const result = await checkBrowserDiscovery({
        baseUrl: `http://127.0.0.1:${port}`,
      });
      expect(result.outcome).toBe("fail");
      expect(result.detail).toContain("cannot read WWW-Authenticate");
    } finally {
      await new Promise<void>((r) => bare.close(() => r()));
    }
  });

  it("check 3 fails when an unsupported method advertises methods it refuses", async () => {
    acceptTokens({ good: ledgerScoped });
    const liar = http.createServer((req, res) => {
      res.writeHead(405, { Allow: req.method === "OPTIONS" ? "POST, GET" : "POST" });
      res.end("{}");
    });
    await new Promise<void>((r) => liar.listen(0, "127.0.0.1", r));
    const { port } = liar.address() as { port: number };
    try {
      const result = await checkMethodRefusal({
        baseUrl: `http://127.0.0.1:${port}`,
        token: "good",
      });
      expect(result.outcome).toBe("fail");
      expect(result.detail).toContain("OPTIONS");
    } finally {
      await new Promise<void>((r) => liar.close(() => r()));
    }
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

  it("check 17 passes when a preview's new errors carry the code the schema publishes", async () => {
    acceptTokens({ good: ledgerScoped });
    appendPreviewErrors = [
      { message: "Account was never opened", source: "main.bean:1", code: "E1001" },
    ];
    const result = await checkOutputSchemaConformance({ baseUrl, token: "good" });
    expect(result.outcome).toBe("pass");
    expect(result.detail).toContain("appendLedgerText");
  });

  it("check 17 fails when a result carries a key its published schema forbids", async () => {
    acceptTokens({ good: ledgerScoped });
    // `severity` is not on the published item, which is additionalProperties:
    // false — the shape of w23/230, so a validating client would reject it.
    appendPreviewErrors = [
      { message: "Account was never opened", source: "main.bean:1", severity: "error" },
    ];
    const result = await checkOutputSchemaConformance({ baseUrl, token: "good" });
    expect(result.outcome).toBe("fail");
    expect(result.detail).toContain("appendLedgerText");
    expect(result.detail).toMatch(/does not match its published outputSchema/);
  });

  it("check 17 compares only the read when the credential cannot write", async () => {
    acceptTokens({ ro: readOnly });
    const result = await checkOutputSchemaConformance({
      baseUrl,
      readOnlyToken: "ro",
    });
    expect(result.outcome).toBe("pass");
    expect(result.detail).toContain("runBqlQuery");
    expect(result.detail).not.toContain("appendLedgerText");
  });

  it("check 17 sends --ledger with each call, so an unpinned credential can be exercised", async () => {
    acceptTokens({ good: ledgerScoped });
    // The credential is pinned to alice/main; naming another ledger is
    // refused, which proves the flag reached the call rather than being dropped.
    const other = await checkOutputSchemaConformance({
      baseUrl,
      token: "good",
      ledger: "bob/other",
    });
    expect(other.outcome).toBe("skip");
    const own = await checkOutputSchemaConformance({
      baseUrl,
      token: "good",
      ledger: "alice/main",
    });
    expect(own.outcome).toBe("pass");
  });

  it("check 17 skips rather than fails without a credential", async () => {
    const result = await checkOutputSchemaConformance({ baseUrl });
    expect(result.outcome).toBe("skip");
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

// w1/188: a token on argv breaks the QA contract, so QA ran anonymously and
// skipped every authenticated check. The credentials resolve like qa-mcp.mjs's.
describe("resolveTokens", () => {
  let dir: string;
  let envFile: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mcp-conformance-"));
    envFile = join(dir, ".env");
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("reads both credentials from the repository .env", () => {
    writeFileSync(
      envFile,
      "QA_MCP_TOKEN=bcio_file_rw\nQA_MCP_READ_ONLY_TOKEN=bcio_file_ro\n",
    );
    expect(resolveTokens({}, {}, envFile)).toEqual({
      token: "bcio_file_rw",
      readOnlyToken: "bcio_file_ro",
    });
  });

  it("prefers the .env over the environment, per credential", () => {
    writeFileSync(envFile, "QA_MCP_TOKEN=bcio_file_rw\n");
    expect(
      resolveTokens(
        {},
        {
          QA_MCP_TOKEN: "bcio_env_rw",
          QA_MCP_READ_ONLY_TOKEN: "bcio_env_ro",
        },
        envFile,
      ),
    ).toEqual({ token: "bcio_file_rw", readOnlyToken: "bcio_env_ro" });
  });

  it("falls back to BEANCOUNT_MCP_TOKEN and to the environment without a file", () => {
    expect(
      resolveTokens({}, { BEANCOUNT_MCP_TOKEN: "bcio_env_alias" }, envFile),
    ).toEqual({ token: "bcio_env_alias", readOnlyToken: undefined });
  });

  it("lets an explicit flag win over both", () => {
    writeFileSync(envFile, "QA_MCP_TOKEN=bcio_file_rw\n");
    expect(
      resolveTokens(
        { token: "bcio_flag_rw", readOnlyToken: "bcio_flag_ro" },
        { QA_MCP_READ_ONLY_TOKEN: "bcio_env_ro" },
        envFile,
      ),
    ).toEqual({ token: "bcio_flag_rw", readOnlyToken: "bcio_flag_ro" });
  });

  it("leaves both unset when nothing names one", () => {
    writeFileSync(envFile, "UNRELATED=1\n");
    expect(resolveTokens({}, {}, envFile)).toEqual({
      token: undefined,
      readOnlyToken: undefined,
    });
  });
});
