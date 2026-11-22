import "reflect-metadata";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import type { AppConfig } from "@/config/config";
import type { McpRequestContext } from "../mcp-context";

/**
 * w6/013, through the registered tool. `getLedgerContext` with
 * `payeeLimit: 1` answered one top-level payee and every payee again inside
 * `attributes` — in both the structured result and the text an agent reads.
 */

const config = { api: { scopeEnforcement: "shadow" } } as AppConfig;
const payees = ["Bakery", "Grocer", "Landlord", "Utility"];

it("bounds the nested vocabulary in the structured and text results", async () => {
  const attributes = {
    accounts: ["Assets:Cash"],
    tags: [],
    links: [],
    years: ["2025"],
    currencies: ["USD"],
    payees: [...payees],
  };
  const services = {
    ledgerData: {
      getAttributes: jest.fn().mockResolvedValue(attributes),
      getCurrencies: jest.fn().mockResolvedValue(["USD"]),
      getPayees: jest.fn().mockResolvedValue([...payees]),
      getYears: jest.fn().mockResolvedValue(["2025"]),
      getSourceFiles: jest.fn().mockResolvedValue(["main.bean"]),
    },
    ledgerAccount: {
      getAccounts: jest.fn().mockResolvedValue(["Assets:Cash"]),
    },
  };
  const server = assembleMcpRegistry(
    {
      services,
      identity: {
        userId: "usr_1",
        method: "oauth",
        scopes: new Set(["ledger.read"]),
        tokenId: "tok_1",
        ledgerScope: "alice/main",
      },
    } as unknown as McpRequestContext,
    config,
  );
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "context-limit", version: "1" });
  await Promise.all([client.connect(a), server.connect(b)]);
  try {
    const result = await client.callTool({
      name: "getLedgerContext",
      arguments: { payeeLimit: 1 },
    });
    expect(result.isError).toBeFalsy();
    const structured = (
      result.structuredContent as {
        result: {
          attributes: { payees: string[] };
          payees: string[];
          payeeCount: number;
        };
      }
    ).result;
    expect(structured.payees).toEqual(["Bakery"]);
    expect(structured.attributes.payees).toEqual(["Bakery"]);
    expect(structured.payeeCount).toBe(4);
    const text = (result.content as { type: string; text?: string }[])
      .map((part) => part.text ?? "")
      .join("\n");
    expect(text).toContain("Bakery");
    for (const hidden of ["Grocer", "Landlord", "Utility"])
      expect(text).not.toContain(hidden);
    // The service's own document is not trimmed for its next caller.
    expect(attributes.payees).toEqual(payees);
  } finally {
    await client.close();
    await server.close();
  }
});
