import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import type { AppConfig } from "@/config/config";
import type { McpRequestContext } from "../mcp-context";

/**
 * w23/m40 — every identifier a tool takes comes from somewhere an agent can
 * find, and the text says where.
 *
 * Hosts such as ChatGPT and Copilot's cloud agent call tools and never read
 * resources, so a tool argument that names an existing object (an entry hash,
 * a bank connection, an uploaded object) has to be in some tool's output, and
 * the argument's own text has to send the agent there (ADR 019 D7). When the
 * bank tools took the row `id` while their text named Plaid's `itemId`, an
 * agent copied the field the text named, got NOT_FOUND, and was sent back to
 * the same field (w1/224). This lists every identifier-shaped argument in
 * `tools/list` with the tool that produces it: a new one fails until it is
 * registered, a producer that is renamed or removed fails, and the argument's
 * description (or its tool's) has to name a producer. The flows an agent
 * actually walks, with each id taken from the previous call's output, are
 * driven in `tools-only-journey.test.ts`.
 */
const config = { api: { scopeEnforcement: "shadow" } } as AppConfig;
const identity = {
  userId: "usr_1",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
  tokenId: "tok_1",
};

type Source = { from: string[]; journey?: true } | { caller: string };

/** `tool.argument` → where an agent gets the value. */
const HANDOFFS: Record<string, Source> = {
  "getEntryContext.entryHash": { from: ["listLedgerEntries"], journey: true },
  // The commit field every write that makes one returns (w23/m42).
  "revertCommit.sha": {
    from: [
      "createLedgerFiles",
      "updateLedgerFiles",
      "deleteLedgerFiles",
      "appendLedgerText",
      "addLedgerEntries",
      "renameLedgerFile",
      "updateEntrySource",
      "deleteEntrySource",
      "deleteEntrySources",
      "insertReceiptTransaction",
    ],
  },
  "updateEntrySource.entryHash": { from: ["listLedgerEntries"] },
  "updateEntrySource.sha256sum": { from: ["getEntryContext"] },
  "deleteEntrySource.entryHash": { from: ["listLedgerEntries"] },
  "deleteEntrySource.sha256sum": { from: ["getEntryContext"] },
  "insertReceiptTransaction.receiptObjectKey": {
    from: ["generateTempAssetUploadUrl"],
  },
  "parseReceipt.objectKey": { from: ["generateTempAssetUploadUrl"] },
  "parseFile.s3ObjectKey": { from: ["generateTempAssetUploadUrl"] },
  "syncBankTransactions.itemId": {
    from: ["listBankConnections"],
    journey: true,
  },
  "reconcileBankAccounts.itemId": { from: ["listBankConnections"] },
  "refreshBankConnection.itemId": { from: ["listBankConnections"] },
  "unlinkBankConnection.itemId": { from: ["listBankConnections"] },
  "mapBankAccount.accountId": { from: ["listBankConnections"], journey: true },
  "setBankAccountCurrency.accountId": { from: ["listBankConnections"] },
  "listStagedBankTransactions.accountId": { from: ["listBankConnections"] },
  ...Object.fromEntries(
    [
      "addLedgerEntries",
      "appendLedgerText",
      "insertReceiptTransaction",
      "createLedger",
    ].map((tool) => [
      `${tool}.requestId`,
      {
        caller:
          "a retry key the caller generates for each write; nothing to discover",
      },
    ]),
  ),
  "discardStagedBankTransactions.transactionIds": {
    from: ["listStagedBankTransactions"],
    journey: true,
  },
};

const ID_SHAPED = /(^|_)(id|ids)$|Ids?$|[Hh]ash$|^sha|[Kk]ey$/;

let tools: Tool[];
let published: ReturnType<typeof idArguments>;
beforeAll(async () => {
  const server = assembleMcpRegistry(
    { identity, services: {}, llmService: {} } as unknown as McpRequestContext,
    config,
  );
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "id-handoff", version: "1.0.0" });
  await Promise.all([client.connect(a), server.connect(b)]);
  tools = (await client.listTools()).tools;
  published = idArguments();
  await client.close();
  await server.close();
});

/** The identifier-shaped arguments, spelled as the tool primarily spells them. */
function idArguments() {
  return tools.flatMap((tool) =>
    Object.entries(tool.inputSchema.properties ?? {})
      .map(([name, schema]) => ({
        name,
        description: (schema as { description?: string }).description ?? "",
      }))
      // An alias spells the same argument another way.
      .filter(
        ({ name, description }) =>
          ID_SHAPED.test(name) && !/^Alias of /.test(description),
      )
      .map(({ name, description }) => ({
        key: `${tool.name}.${name}`,
        tool,
        description,
      })),
  );
}

describe("identifier arguments and where they come from", () => {
  it("registers every identifier-shaped argument tools/list publishes", () => {
    const keys = published.map(({ key }) => key);
    expect(keys.filter((key) => !(key in HANDOFFS))).toEqual([]);
    expect(Object.keys(HANDOFFS).filter((key) => !keys.includes(key))).toEqual(
      [],
    );
  });

  it.each(Object.entries(HANDOFFS))("%s has a real source", (_key, source) => {
    if ("caller" in source) {
      expect(source.caller.length).toBeGreaterThan(20);
      return;
    }
    const names = tools.map((tool) => tool.name);
    for (const producer of source.from) expect(names).toContain(producer);
  });

  it.each(
    Object.entries(HANDOFFS).flatMap(([key, source]) =>
      "from" in source ? [[key, source.from] as const] : [],
    ),
  )("%s names where to get it", (key, producers) => {
    const found = published.find((argument) => argument.key === key)!;
    const text = `${found.description} ${found.tool.description ?? ""}`;
    expect(producers.some((producer) => text.includes(producer))).toBe(true);
  });

  it("drives every flow it marks as a journey", () => {
    const journey = readFileSync(
      path.resolve(__dirname, "tools-only-journey.test.ts"),
      "utf8",
    );
    for (const [key, source] of Object.entries(HANDOFFS)) {
      if ("from" in source && source.journey) {
        expect(journey).toMatch(new RegExp(`call\\("${key.split(".")[0]}"`));
      }
    }
  });
});
