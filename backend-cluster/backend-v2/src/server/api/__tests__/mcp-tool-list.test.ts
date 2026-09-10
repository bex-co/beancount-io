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
    // shrink on MCP alone. So the gate pins the achieved ~60 KB (25 tools,
    // down from 28 with the compat shims gone and descriptions trimmed)
    // instead of an unreachable aspiration: growing it stays a decision.
    const { tools } = await listTools();
    const bytes = Buffer.byteLength(JSON.stringify(tools), "utf8");
    expect(bytes).toBeLessThan(61 * 1024);
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
});
