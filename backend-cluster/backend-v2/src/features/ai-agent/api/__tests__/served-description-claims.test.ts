import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import type { AppConfig } from "@/config/config";
import type { McpRequestContext } from "../mcp-context";

/**
 * w1/226. Three served descriptions made claims an agent acted on and lost a
 * call to: a BQL column the engine does not have (`change`; it has `weight`,
 * checked against `@rustledger/wasm` 0.24), a trial balance with debit and
 * credit totals it never returns, and option/plugin directives "added as raw
 * text", which `appendLedgerText` refuses. Read through an SDK client, as a
 * host reads them.
 */
const config = { api: { scopeEnforcement: "shadow" } } as AppConfig;
const identity = {
  userId: "usr_1",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
  tokenId: "tok_1",
};

let served: { tools: Map<string, string>; templates: Map<string, string> };
beforeAll(async () => {
  const server = assembleMcpRegistry(
    { identity, services: {}, llmService: {} } as unknown as McpRequestContext,
    config,
  );
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "served-claims", version: "1.0.0" });
  await Promise.all([client.connect(a), server.connect(b)]);
  const { tools } = await client.listTools();
  const { resourceTemplates } = await client.listResourceTemplates();
  served = {
    tools: new Map(tools.map((tool) => [tool.name, JSON.stringify(tool)])),
    templates: new Map(
      resourceTemplates.map((t) => [t.name, JSON.stringify(t)]),
    ),
  };
  await client.close();
  await server.close();
});

it("lists only BQL columns the engine has", () => {
  const bql = served.tools.get("runBqlQuery")!;
  expect(bql).toContain("cost, weight, balance");
  expect(bql).not.toMatch(/\bchange\b/);
});

it("says where the directives addLedgerEntries excludes go", () => {
  const add = served.tools.get("addLedgerEntries")!;
  expect(add).not.toContain("add them as raw text");
  expect(add).toContain(
    "custom and query are added with appendLedgerText, and option and plugin by editing the main file with updateLedgerFiles",
  );
});

it("describes the trial balance it returns", () => {
  const trial = [...served.templates.values()].find((t) =>
    t.includes("/trial-balance"),
  )!;
  expect(trial).not.toContain("debit and credit totals —");
  expect(trial).toContain("signed trees under the five roots");
});

it("does not call a merged or rejected pull request created", () => {
  for (const name of ["mergePullRequest", "rejectPullRequest"]) {
    expect(served.tools.get(name)).not.toContain("The created PR's");
  }
});
