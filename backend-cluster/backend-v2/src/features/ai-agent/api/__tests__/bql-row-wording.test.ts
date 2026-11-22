import "reflect-metadata";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import type { AppConfig } from "@/config/config";
import type { McpRequestContext } from "../mcp-context";

/**
 * w6/014. The served schema, instructions and spending playbook said every
 * BQL row is a posting — "LIMIT counts postings" — while a GROUP BY query
 * returns one row per group: five grouped rows stood for 656 postings. What
 * an agent reads must keep the posting caveat for unaggregated queries and
 * say what grouping does.
 */

const config = { api: { scopeEnforcement: "shadow" } } as AppConfig;
const OVERCLAIM = /BQL rows are postings|LIMIT counts postings/;

async function served() {
  const server = assembleMcpRegistry(
    {
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
  const client = new Client({ name: "bql-row-wording", version: "1" });
  await Promise.all([client.connect(a), server.connect(b)]);
  try {
    const { tools } = await client.listTools();
    const prompt = await client.getPrompt({
      name: "spending-report",
      arguments: {},
    });
    return {
      instructions: client.getInstructions() ?? "",
      tools: Object.fromEntries(tools.map((tool) => [tool.name, tool])),
      prompt: prompt.messages
        .map((message) =>
          message.content.type === "text" ? message.content.text : "",
        )
        .join("\n"),
    };
  } finally {
    await client.close();
    await server.close();
  }
}

describe("what an agent is told a BQL row is", () => {
  it("keeps the posting caveat for unaggregated queries and names grouping", async () => {
    const { instructions, tools, prompt } = await served();
    const texts = {
      instructions,
      prompt,
      runBqlQuery: tools.runBqlQuery.description ?? "",
      rowCount: JSON.stringify(tools.runBqlQueryStructured.outputSchema),
    };
    for (const [where, text] of Object.entries(texts)) {
      expect({ where, overclaims: OVERCLAIM.test(text) }).toEqual({
        where,
        overclaims: false,
      });
      expect({ where, grouping: /GROUP BY/.test(text) }).toEqual({
        where,
        grouping: true,
      });
      expect({
        where,
        posting: /per posting|per \*posting\*/.test(text),
      }).toEqual({ where, posting: true });
    }
  });
});
