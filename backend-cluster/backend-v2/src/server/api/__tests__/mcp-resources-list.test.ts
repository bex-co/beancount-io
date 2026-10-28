import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({
  createACP: () => ({}),
}));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "../composition-root";
import {
  MCP_RESOURCES,
  listLedgerResources,
} from "@/features/ai-agent/api/mcp-resources";
import { JOURNAL_READS } from "@/features/ledger/api/rest/v1/journal-reads";
import type { McpRequestContext } from "@/features/ai-agent/api/mcp-context";
import type { AppConfig } from "@/config/config";
import type { Identity } from "../identity";

/**
 * Concrete `resources/list` for the credential's ledger (w2/m27:t004).
 *
 * Clients that enumerate concrete resources (Claude Code's
 * `ListMcpResourcesTool`, Claude Desktop's picker) saw an empty server.
 * These tests run a real client against the real registry over an in-memory
 * transport: what `ListMcpResourcesTool` shows is what `listResources`
 * returns here.
 */

const config = {
  api: { scopeEnforcement: "shadow" },
} as AppConfig;

const pinned: Identity = {
  userId: "user-123",
  method: "apikey",
  scopes: new Set(["ledger.read"]),
  tokenId: "tok_1",
  ledgerScope: "alice/personal",
};

function toolCtx(overrides: {
  identity: Identity;
  sourceFiles?: string[] | Error;
  ledgers?: Array<{ fullName: string }>;
}) {
  const { identity, sourceFiles = ["main.bean"], ledgers = [] } = overrides;
  return {
    identity,
    services: {
      ledgerData: {
        getSourceFiles:
          sourceFiles instanceof Error
            ? jest.fn().mockRejectedValue(sourceFiles)
            : jest.fn().mockResolvedValue(sourceFiles),
      },
    },
    ledgerWorkflow: {
      listLedgers: jest.fn().mockResolvedValue(ledgers),
    },
  } as unknown as McpRequestContext;
}

async function listUris(ctx: McpRequestContext): Promise<string[]> {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const server = assembleMcpRegistry(ctx, config);
  await server.connect(serverTransport);
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(clientTransport);
  try {
    const { resources } = await client.listResources();
    return resources.map((resource) => resource.uri);
  } finally {
    await client.close();
    await server.close();
  }
}

describe("resources/list over the wire", () => {
  it("lists the ledger's errors, accounts, payees, metadata, and source files", async () => {
    const uris = await listUris(
      toolCtx({ identity: pinned, sourceFiles: ["main.bean", "2024.bean"] }),
    );
    for (const uri of [
      "beancount://alice/personal/errors",
      "beancount://alice/personal/accounts",
      "beancount://alice/personal/payees",
      "beancount://alice/personal/metadata",
      "beancount://alice/personal/source-files",
      "beancount://alice/personal/statements/balance-sheet",
      "beancount://alice/personal/statements/income-statement",
      "beancount://alice/personal/files/main.bean",
      "beancount://alice/personal/files/2024.bean",
    ]) {
      expect(uris).toContain(uri);
    }
  });

  it("enumerates an unpinned credential's own ledgers from the first catalog page", async () => {
    const ctx = toolCtx({
      identity: { ...pinned, ledgerScope: undefined },
      ledgers: [{ fullName: "bob/budget" }],
    });
    const uris = await listUris(ctx);
    expect(uris).toContain("beancount://bob/budget/errors");
    expect(uris).toContain("beancount://bob/budget/files/main.bean");
    expect(ctx.ledgerWorkflow.listLedgers).toHaveBeenCalledWith({
      identity: ctx.identity,
      args: { page: 1, limit: 20 },
    });
  });

  it("never lists another ledger for a pinned credential", async () => {
    const uris = await listUris(toolCtx({ identity: pinned }));
    expect(uris.every((uri) => uri.includes("alice/personal"))).toBe(true);
  });

  it("lists nothing rather than failing when enumeration is refused", async () => {
    const ctx = toolCtx({
      identity: { ...pinned, ledgerScope: undefined },
      ledgers: [],
    });
    (ctx.ledgerWorkflow.listLedgers as jest.Mock).mockRejectedValue(
      new Error("denied"),
    );
    await expect(listUris(ctx)).resolves.toEqual([]);
  });
});

describe("journal template descriptions (w23/142)", () => {
  it("promises subtype filters exactly where the template takes them", () => {
    const SUBTYPE_KEYS = new Set([
      "directiveTypes",
      "transactionSubtypes",
      "documentSubtypes",
      "customSubtypes",
    ]);
    expect(JOURNAL_READS.length).toBeGreaterThan(0);
    for (const read of JOURNAL_READS) {
      const resource = MCP_RESOURCES.find((entry) => entry.name === read.name);
      expect(resource).toBeDefined();
      const takesSubtypes = Object.keys(read.query.shape).some((key) =>
        SUBTYPE_KEYS.has(key),
      );
      expect(
        resource?.description.includes(
          "Subtype filters are JSON-encoded string arrays.",
        ),
      ).toBe(takesSubtypes);
    }
  });

  it("leaves the filterless reads' summaries bare", () => {
    const byName = new Map(
      MCP_RESOURCES.map((entry) => [entry.name, entry.description]),
    );
    expect(byName.get("ledgerSourceFiles")).toBe(
      "List the ledger's source files",
    );
    expect(byName.get("ledgerPlaintextJournal")).toBe(
      "Read Beancount journal text with account, time, and expression filters",
    );
  });
});

describe("listLedgerResources", () => {
  it("caps file entries at 100 source files", async () => {
    const files = Array.from({ length: 150 }, (_, i) => `f${i}.bean`);
    const listed = await listLedgerResources(
      toolCtx({ identity: pinned, sourceFiles: files }),
    );
    expect(
      listed.filter((entry) => entry.template === "ledgerFile"),
    ).toHaveLength(100);
  });

  it("keeps the static entries when source files cannot be read", async () => {
    const listed = await listLedgerResources(
      toolCtx({ identity: pinned, sourceFiles: new Error("revoked") }),
    );
    expect(
      listed.some(
        (entry) => entry.uri === "beancount://alice/personal/errors",
      ),
    ).toBe(true);
    expect(
      listed.filter((entry) => entry.template === "ledgerFile"),
    ).toHaveLength(0);
  });
});
