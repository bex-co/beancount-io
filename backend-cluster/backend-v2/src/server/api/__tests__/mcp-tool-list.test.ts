import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({
  createACP: () => ({}),
}));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "../composition-root";
import { MCP_TOOLS } from "@/features/ai-agent/api/mcp-tools";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";
import type { AppConfig } from "@/config/config";
import type { Identity } from "../identity";

/**
 * The lean, use-ordered tool list (w2/m27:t005).
 *
 * `tools/list` is paid on every agent session (~12k tokens at the audit's
 * 47 KB), so its order and size are asserted here rather than hoped for:
 * reads first, destructive last, and the whole listing under 25 KB.
 */

const config = { api: { scopeEnforcement: "shadow" } } as AppConfig;

const identity: Identity = {
  userId: "user-123",
  method: "apikey",
  scopes: new Set(["ledger.read", "ledger.write", "ledger.admin"]),
  tokenId: "tok_1",
};

async function listTools() {
  const ctx = { identity } as unknown as McpRequestContext;
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const server = assembleMcpRegistry(ctx, config);
  await server.connect(serverTransport);
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(clientTransport);
  try {
    return await client.listTools();
  } finally {
    await client.close();
    await server.close();
  }
}

describe("MCP tool list", () => {
  it("starts with the read tools agents reach for first", () => {
    expect(MCP_TOOLS.slice(0, 5).map((tool) => tool.name)).toEqual([
      "runBqlQuery",
      "runBqlQueryStructured",
      "listLedgers",
      "checkLedger",
      "getLedgerContext",
    ]);
    for (const tool of MCP_TOOLS.slice(0, 5)) {
      expect(tool.annotations.readOnlyHint).toBe(true);
    }
  });

  it("keeps tools/list lean", async () => {
    // w2/m27 aimed for 25 KB but measured the real floor first: output
    // schemas alone are ~29 KB and ADR 0008 D8 requires them published, and
    // even deleting every output schema leaves ~33 KB — the nine directive
    // shapes behind addLedgerEntries are the shared REST contract and cannot
    // shrink on MCP alone. So the gate pins the achieved size (25 tools, down
    // from 28 with the compat shims gone and descriptions trimmed) instead of
    // an unreachable aspiration: growing it stays a decision.
    //
    // It grew from 61 KB to 63 KB when w4/069 restored `manageApiKeys`'s
    // advertised input — 1.4 KB, of which 0.4 KB is the ISO 8601 pattern for
    // `expiresAt`. w2/m27:t005 believed it had deleted that regex; what it had
    // actually done was publish the whole schema as `properties: {}`, so the
    // savings it recorded were the bug.
    //
    // 64 KB since w2/m32 added `refreshManagedPrices` (1.5 KB): a refresh is
    // an action, so it cannot be a resource. Its output schema types only the
    // three fields an agent acts on and defers the rest to the resource
    // template, which is what kept the growth to 1.5 KB instead of 2.6 KB.
    const { tools } = await listTools();
    const bytes = Buffer.byteLength(JSON.stringify(tools), "utf8");
    expect(bytes).toBeLessThan(64 * 1024);
  });

  it("publishes all four annotations on every tool", async () => {
    const { tools } = await listTools();
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(typeof tool.annotations?.readOnlyHint).toBe("boolean");
      expect(typeof tool.annotations?.destructiveHint).toBe("boolean");
      expect(typeof tool.annotations?.idempotentHint).toBe("boolean");
      expect(typeof tool.annotations?.openWorldHint).toBe("boolean");
    }
  });

  it("serves no GraphQL/REST compat shim on MCP", async () => {
    const { tools } = await listTools();
    const names = tools.map((tool) => tool.name);
    expect(names).not.toContain("addLegacyEntries");
    expect(names).not.toContain("listApiKeys");
    expect(names).not.toContain("createApiKey");
    expect(names).not.toContain("revokeApiKey");
    expect(names).toContain("manageApiKeys");
  });

  /**
   * A tool's advertised input is the only thing an agent can read before it
   * calls (w4/069). `manageApiKeys` published `{"type":"object",
   * "properties":{}}` for a week because its schema was wrapped in
   * `z.preprocess`, which the SDK's JSON-Schema conversion sees as opaque —
   * the runtime still refused a bad call, so nothing else noticed.
   */
  it("advertises the arguments of every tool that takes some", async () => {
    // The one tool that genuinely takes no arguments; everything else has to
    // publish its fields.
    const noArguments = new Set(["deleteAccount"]);
    const { tools } = await listTools();
    for (const tool of tools) {
      const properties = Object.keys(tool.inputSchema.properties ?? {});
      if (noArguments.has(tool.name)) {
        expect(properties).toEqual([]);
      } else {
        expect({ tool: tool.name, properties }).toEqual({
          tool: tool.name,
          properties: expect.arrayContaining([expect.any(String)]),
        });
      }
    }
  });

  it("publishes manageApiKeys with its operation enum and dated expiry", async () => {
    const { tools } = await listTools();
    const schema = tools.find((tool) => tool.name === "manageApiKeys")!
      .inputSchema as {
      required?: string[];
      properties?: Record<string, { enum?: string[]; format?: string }>;
    };
    expect(schema.required).toEqual(["operation"]);
    expect(schema.properties?.operation?.enum).toEqual([
      "list",
      "create",
      "revoke",
    ]);
    expect(schema.properties?.expiresAt?.format).toBe("date-time");
    // The snake_case spellings stay accepted on input but are not advertised:
    // one spelling per field in `tools/list` is what w2/m27:t005 bought.
    expect(Object.keys(schema.properties ?? {}).sort()).toEqual([
      "expiresAt",
      "id",
      "ledgerScope",
      "name",
      "operation",
      "scopes",
    ]);
  });
});
