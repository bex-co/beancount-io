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
import type { ToolContext } from "@/features/ai-agent/tools/types";
import { CHECKS } from "../mcp-conformance";

const [
  checkUnauthenticated,
  checkDiscovery,
  checkMethodRefusal,
  checkToolsList,
  checkScopeRefusal,
  checkErrorMasking,
  checkAdvertisedPath,
] = CHECKS;

const ledgerScoped: Identity = {
  userId: "usr_1",
  method: "apikey",
  scopes: new Set(["ledger.read", "ledger.write"]),
  tokenId: "tok_1",
  ledgerScope: "alice/main",
  capabilityExempt: false,
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
      ledgerShell: { queryShellText: async () => "Assets:Cash 100 USD" },
      ledgerRepo: {},
      apiKey: {},
      llm: {},
    },
    workflows: { ledgerReceipt: {} },
  } as unknown as AppLayers;

  const app = new Koa();
  const router = new Router();
  app.use(restErrorMiddleware());
  app.use(bodyParser());
  setMcpRoute(router, layers, config, (ctx: ToolContext) =>
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

  it("check 4 names the ledger-scope requirement when the credential is unpinned", async () => {
    acceptTokens({ unpinned: { ...ledgerScoped, ledgerScope: undefined } });
    const result = await checkToolsList({ baseUrl, token: "unpinned" });
    expect(result.outcome).toBe("fail");
    expect(result.detail).toContain("not bound to a ledger");
  });

  it("check 5 passes when a read-only credential is refused a write", async () => {
    acceptTokens({ ro: readOnly });
    const result = await checkScopeRefusal({ baseUrl, readOnlyToken: "ro" });
    expect(result.outcome).toBe("pass");
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
