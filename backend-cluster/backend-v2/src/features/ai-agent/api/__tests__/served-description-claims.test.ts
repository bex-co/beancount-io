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

// w23/236. `entries-count` leaves out managed price feed directives (the plan
// limit reads it, ADR 015 §9) while `listLedgerEntries` and BQL count them, so
// its Price figure is lower on a ledger with a feed. The description is where an
// agent reconciling the two totals learns why.
it("says entries-count leaves out managed price feeds", () => {
  const template = [...served.templates.values()].find((t) =>
    t.includes("/entries-count"),
  )!;
  expect(template).toContain("Managed price feed directives");
  expect(template).toContain("are not counted");
  expect(template).toContain("the plan limit reads this count");
  expect(template).toContain("listLedgerEntries and BQL do include them");
});

// w23/239. The plaintext journal holds transactions, balance assertions and
// pads only; an agent that takes "journal text" for a copy of the ledger loses
// its prices, commodities, events and closes. The MCP resource says what the
// export is, and the other journal reads do not claim it.
it("says the plaintext journal is not a copy of the ledger", () => {
  const read = (path: string) =>
    [...served.templates.values()].find((t) => t.includes(`/${path}{`))!;
  const plaintext = read("plaintext-journal");
  expect(plaintext).toContain("transactions, balance assertions and pads only");
  expect(plaintext).toContain("not a copy of the ledger");
  expect(read("journal")).not.toContain("pads only");
});

// w23/241. The `private` argument of createLedger and updateLedger is where a
// client's tool list says what `false` does; "readable by anyone" left out that
// the ledger's whole commit history, with each author's name and email, goes
// public with it.
it("says making a ledger public exposes its commit history", () => {
  for (const name of ["createLedger", "updateLedger"]) {
    const tool = served.tools.get(name)!;
    expect(tool).toContain("full commit history");
    expect(tool).toContain("author name and email");
    expect(tool).not.toContain("readable by anyone.");
  }
});
