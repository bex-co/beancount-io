import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import type { AppConfig } from "@/config/config";
import type { Identity } from "@/server/api/identity";
import type { McpRequestContext } from "../mcp-context";

/**
 * w23/057. w5/039 refused unknown top-level arguments; one level down they
 * were still dropped, so `readLedgerFiles` with `startLine` returned the
 * whole file and a misspelt account imported against the default account.
 * (`sourceAccount` was the original example; w23/m8/t003 made it a real
 * alias, so the case uses a still-unknown key.)
 */
const identity: Identity = {
  userId: "usr_alice",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
  ledgerScope: "alice/main",
};

async function fixture() {
  const getFilesContent = jest.fn(async () => [
    { path: "main.bean", content: "; one\n; two\n; three\n", sha: "s1" },
  ]);
  const server = assembleMcpRegistry(
    {
      identity,
      services: { ledgerRepo: { getFilesContent } },
    } as unknown as McpRequestContext,
    { api: { scopeEnforcement: "enforce" } } as AppConfig,
  );
  const client = new Client({ name: "nested-unknown", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    getFilesContent,
    call: (name: string, args: Record<string, unknown>) =>
      client.callTool({ name, arguments: args }),
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

describe("an unknown key inside a tool argument", () => {
  it.each([
    [
      "readLedgerFiles",
      { files: [{ path: "main.bean", startLine: 2, endLine: 3 }] },
      'files.0: Unrecognized keys: "startLine", "endLine"',
    ],
    [
      "importStagedBankTransactions",
      {
        transactions: [
          {
            transaction_id: "t1",
            target_account: "Expenses:Food",
            // A misspelling of the optional `source_account`.
            sourceAcct: "Assets:Checking",
          },
        ],
      },
      'transactions.0: Unrecognized key: "sourceAcct"',
    ],
  ])("is refused on %s, naming its path", async (name, args, message) => {
    const f = await fixture();
    try {
      const result = await f.call(name, args);
      expect(result.isError).toBe(true);
      expect(result.structuredContent).toMatchObject({
        error: { code: "BAD_USER_INPUT", message },
      });
      expect(f.getFilesContent).not.toHaveBeenCalled();
    } finally {
      await f.close();
    }
  });

  it("leaves the snake_case spelling working", async () => {
    const f = await fixture();
    try {
      const result = await f.call("readLedgerFiles", {
        files: [{ path: "main.bean", start_line: 2, end_line: 3 }],
      });
      expect(result.isError).toBeFalsy();
      expect(
        (result.structuredContent as { result: { content: string }[] })
          .result[0],
      ).toMatchObject({
        content: "; two\n; three\n",
        startLine: 2,
        endLine: 3,
      });
    } finally {
      await f.close();
    }
  });
});
