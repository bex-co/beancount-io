import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { MCP_TOOLS } from "@/features/ai-agent/api/mcp-tools";
import type { AppConfig } from "@/config/config";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;

/**
 * w1/035: the SDK validated tool arguments before any handler of ours ran and
 * refused in bare prose, so a malformed argument was the one tool failure
 * without `structuredContent`, a code, or a hint. These go through a real
 * client and transport, because the defect lived in dispatch — calling the
 * envelope translator directly would have passed all along.
 */
async function connect(queryShellText = jest.fn()) {
  // Any service touched means domain work ran; a refusal must touch none.
  const touched = jest.fn();
  const ledgerShell = { queryShellText };
  const services = new Proxy(
    { ledgerShell },
    {
      get(target, key) {
        touched(key);
        return (target as Record<PropertyKey, unknown>)[key];
      },
    },
  );
  const server = assembleMcpRegistry(
    {
      services,
      identity: {
        userId: "usr_1",
        method: "api_key",
        scopes: new Set(["ledger.read"]),
        tokenId: "tok_1",
        ledgerScope: "alice/main",
      },
      ledgerId: "alice/main",
    } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "tool-arguments", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    client,
    touched,
    queryShellText,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

describe("MCP tool arguments refused in the coded envelope (w1/035)", () => {
  it.each([
    { name: "runBqlQuery", args: {}, field: "query" },
    { name: "runBqlQueryStructured", args: { query: 42 }, field: "query" },
    { name: "readLedgerFiles", args: {}, field: "files" },
    {
      name: "readLedgerFiles",
      args: { files: [{ path: "main.bean", start_line: 0 }] },
      field: "files.0.start_line",
    },
  ])(
    "$name($args) → BAD_USER_INPUT naming $field, no domain work",
    async ({ name, args, field }) => {
      const f = await connect();
      try {
        const result = await f.client.callTool({ name, arguments: args });

        expect(result.isError).toBe(true);
        const structured = result.structuredContent as {
          ok: boolean;
          error: { code: string; message: string; hint: string };
        };
        expect(structured.ok).toBe(false);
        expect(structured.error.code).toBe("BAD_USER_INPUT");
        expect(structured.error.message.startsWith(`${field}: `)).toBe(true);
        expect(structured.error.hint).not.toBe("");
        // One failure, told the same way in both channels.
        const [text] = result.content as { type: string; text: string }[];
        expect(text.text).toContain(
          `BAD_USER_INPUT: ${structured.error.message}`,
        );
        expect(text.text).not.toContain("MCP error");
        expect(f.touched).not.toHaveBeenCalled();
      } finally {
        await f.close();
      }
    },
  );

  it("a valid call still reaches the service and succeeds", async () => {
    const f = await connect(jest.fn().mockResolvedValue("Assets:Cash 1 USD"));
    try {
      const result = await f.client.callTool({
        name: "runBqlQuery",
        arguments: { query: "BALANCES" },
      });

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toMatchObject({ ok: true });
      expect(f.queryShellText).toHaveBeenCalledTimes(1);
    } finally {
      await f.close();
    }
  });

  it("an unknown tool is NOT_FOUND in the same envelope", async () => {
    const f = await connect();
    try {
      const result = await f.client.callTool({
        name: "noSuchTool",
        arguments: {},
      });

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toMatchObject({
        ok: false,
        error: { code: "NOT_FOUND" },
      });
    } finally {
      await f.close();
    }
  });

  it("tools/list still publishes every tool's full input schema", async () => {
    const f = await connect();
    try {
      const { tools } = await f.client.listTools();
      expect(tools).toHaveLength(MCP_TOOLS.length);
      const bql = tools.find((t) => t.name === "runBqlQuery");
      expect(bql?.inputSchema).toMatchObject({
        type: "object",
        properties: { query: { type: "string" } },
        required: expect.arrayContaining(["query"]),
      });
    } finally {
      await f.close();
    }
  });
});
