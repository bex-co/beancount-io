import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

const resolveIdentityMock = jest.fn();
jest.mock("@/server/api/identity", () => ({
  ...jest.requireActual("@/server/api/identity"),
  resolveIdentity: (...args: unknown[]) => resolveIdentityMock(...args),
}));

import http from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import Koa from "koa";
import Router from "@koa/router";
import { setMcpRoute } from "../mcp-route";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { bodyParserMiddleware } from "@/server/middleware/body-parser-middleware";
import { restErrorMiddleware } from "@/server/rest/error-middleware";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";

/**
 * w23/m33 — the protocol recipe in docs/mcp.md runs exactly as written.
 *
 * "Inspect the protocol with curl" is what a newcomer pastes first. These
 * requests are lifted out of the document itself — the `mcp_post '…'` lines and
 * the standalone `resources/read` block — and sent, in the document's order and
 * with the document's headers, to the real route. Edit a request in the docs
 * and this runs the edit; delete or rename what it calls and this fails.
 */
const config = {
  api: { scopeEnforcement: "shadow" },
  oauth: { issuer: "https://beancount.io" },
} as AppConfig;

const DOC = readFileSync(
  path.resolve(__dirname, "../../../../../docs/mcp.md"),
  "utf8",
);

function curlSection(): string {
  const start = DOC.indexOf("## Inspect the protocol with curl");
  const end = DOC.indexOf("\n## ", start + 5);
  return DOC.slice(start, end);
}

/** The JSON each `mcp_post '…'` line sends, in document order. */
function posts(section: string): Record<string, unknown>[] {
  return [...section.matchAll(/^mcp_post '(\{.*\})'/gm)].map((m) =>
    JSON.parse(m[1]),
  );
}

/** The standalone JSON-RPC request block that follows the pinned-credential sentence. */
function resourceRead(section: string): Record<string, unknown> {
  const after = section.slice(section.indexOf("For a credential pinned to"));
  const block = after.match(/```json\n([\s\S]*?)\n```/);
  if (!block)
    throw new Error("the resources/read example is gone from the docs");
  return JSON.parse(block[1]);
}

let server: http.Server;
let url: string;

beforeAll(async () => {
  const layers = {
    database: {},
    services: {
      ledgerShell: {
        queryShellText: async () => ({
          text: "   account balance\n------- -------\nAssets:Cash 100.00 USD",
          rowCount: 1,
        }),
      },
      ledgerFinance: { getTrialBalance: async () => ["Assets:Cash 100 USD"] },
      ledgerData: {},
      ledgerRepo: {},
      apiKey: {},
      llm: {},
    },
    workflows: { ledgerReceipt: {} },
  } as unknown as AppLayers;
  resolveIdentityMock.mockResolvedValue({
    userId: "usr_1",
    method: "apikey",
    scopes: new Set(["ledger.read"]),
    tokenId: "tok_1",
    // The recipe says it assumes a credential pinned to one ledger, and its
    // resource read names alice/books.
    ledgerScope: "alice/books",
  });
  const app = new Koa();
  const router = new Router();
  app.use(restErrorMiddleware());
  app.use(bodyParserMiddleware());
  setMcpRoute(router, layers, config, (ctx) =>
    assembleMcpRegistry(ctx, config),
  );
  app.use(router.routes()).use(router.allowedMethods());
  server = http.createServer(app.callback());
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api-gateway/mcp`;
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

/** The recipe's `mcp_post`: its headers, its negotiated version, its body. */
async function mcpPost(body: unknown, version: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer test",
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": version,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = text
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice("data: ".length)));
  return { status: res.status, text, message: data[0] };
}

describe("docs/mcp.md: Inspect the protocol with curl (w23/m33)", () => {
  it("the recipe still holds the requests this test replays", () => {
    const methods = posts(curlSection()).map((p) => p.method);
    expect(methods).toEqual([
      "initialize",
      "notifications/initialized",
      "tools/list",
      "resources/templates/list",
      "tools/call",
      "prompts/get",
    ]);
    expect(resourceRead(curlSection()).method).toBe("resources/read");
  });

  it("runs end to end with the headers and negotiated version the docs describe", async () => {
    const [init, ...rest] = posts(curlSection());
    // The first call uses the documented default version.
    const first = await mcpPost(init, "2025-11-25");
    expect(first.status).toBe(200);
    expect(first.message.error).toBeUndefined();
    // "Read `result.protocolVersion` … and set BEANCOUNT_MCP_VERSION to it."
    const negotiated = first.message.result.protocolVersion as string;
    expect(negotiated).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    for (const request of [...rest, resourceRead(curlSection())]) {
      const reply = await mcpPost(request, negotiated);
      if (request.method === "notifications/initialized") {
        // "An accepted notification returns 202 without a body."
        expect(reply.status).toBe(202);
        expect(reply.text).toBe("");
        continue;
      }
      expect({ method: request.method, status: reply.status }).toEqual({
        method: request.method,
        status: 200,
      });
      expect({
        method: request.method,
        error: reply.message.error,
      }).toEqual({ method: request.method, error: undefined });
      if (request.method === "tools/list") {
        expect(
          reply.message.result.tools.map((t: { name: string }) => t.name),
        ).toContain("runBqlQuery");
      }
      if (request.method === "tools/call") {
        expect(reply.message.result.isError).toBeUndefined();
        expect(reply.message.result.structuredContent.ok).toBe(true);
      }
      if (request.method === "prompts/get") {
        // The recipe pipes `.result.messages[0].content.text` through jq.
        expect(reply.message.result.messages[0].content.text).toEqual(
          expect.stringContaining("2026-08"),
        );
      }
      if (request.method === "resources/read") {
        expect(reply.message.result.contents[0].uri).toBe(
          "beancount://alice/books/trial-balance",
        );
      }
    }
  });
});
