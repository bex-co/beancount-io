import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { VOCABULARY_READS } from "@/features/ledger/api/rest/v1/vocabulary-handler";
import { MCP_TOOLS } from "../mcp-tools";
import { RESOURCE_SCHEME } from "../mcp-resources";
import { ForbiddenError } from "@/shared/errors";
import type { AppConfig } from "@/config/config";
import type { ToolContext } from "../../tools/types";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const LEDGER = "alice/main";

/** One fake per service method, each returning a value unique to that method. */
const fakeLedgerData = () => ({
  getPayees: jest.fn().mockResolvedValue(["Whole Foods"]),
  getNarrations: jest.fn().mockResolvedValue(["groceries"]),
  getCurrencies: jest.fn().mockResolvedValue(["USD", "EUR"]),
  getTags: jest.fn().mockResolvedValue(["#trip"]),
  getLinks: jest.fn().mockResolvedValue(["^invoice-1"]),
  getYears: jest.fn().mockResolvedValue(["2024", "2025"]),
  getCommodities: jest.fn().mockResolvedValue([{ base: "AAPL", quote: "USD" }]),
  getEvents: jest
    .fn()
    .mockResolvedValue([{ type: "location", value: "Berlin" }]),
  getErrors: jest.fn().mockResolvedValue([]),
  getAttributes: jest.fn().mockResolvedValue({ accounts: ["Assets:Cash"] }),
});

function ctx(ledgerData: ReturnType<typeof fakeLedgerData>): ToolContext {
  return {
    services: { ledgerShell: {}, ledgerRepo: {}, apiKey: {}, ledgerData },
    identity: {
      userId: "usr_1",
      method: "oauth",
      scopes: new Set(["ledger.read"]),
      tokenId: "tok_1",
      ledgerScope: LEDGER,
    },
    ledgerId: LEDGER,
    llmService: {},
    ledgerReceiptWorkflow: {},
  } as unknown as ToolContext;
}

async function connect(toolCtx: ToolContext) {
  const server = assembleMcpRegistry(toolCtx, config);
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "1.0.0" });
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

/**
 * w3/m6 — the ten ledger-vocabulary reads on REST and MCP.
 *
 * The property worth testing is not "the resource returns data" but that both
 * surfaces resolve through the *same* service call. A two-surface port is where
 * drift hides, and it hides well: each side has its own tests, both pass, and
 * nothing compares them.
 */
describe("ledger vocabulary reads", () => {
  it("ports exactly ten reads", () => {
    expect(VOCABULARY_READS).toHaveLength(10);
  });

  it.each(VOCABULARY_READS.map((r) => [r.segment, r] as const))(
    "%s resolves through the same service call on both surfaces",
    async (segment, read) => {
      const ledgerData = fakeLedgerData();

      // The REST side calls `read.fetch` directly — it is the route's handler body.
      const viaRest = await read.fetch(ledgerData as never, {
        ledgerId: LEDGER,
        identity: undefined,
      });

      const { client, close } = await connect(ctx(fakeLedgerData()));
      const result = await client.readResource({
        uri: `${RESOURCE_SCHEME}://alice/main/${segment}`,
      });
      // A resource may be text or blob; ours is text, and asserting that is
      // part of the contract rather than a cast to get past the compiler.
      const content = result.contents[0];
      if (!("text" in content)) throw new Error(`${segment} returned a blob`);
      const viaMcp = JSON.parse(String(content.text));
      await close();

      expect(viaMcp).toEqual(viaRest);
    },
  );

  it("publishes a template for every ported read", async () => {
    const { client, close } = await connect(ctx(fakeLedgerData()));

    const { resourceTemplates } = await client.listResourceTemplates();
    const uris = resourceTemplates.map((t) => t.uriTemplate);

    for (const read of VOCABULARY_READS) {
      expect(uris).toContain(
        `${RESOURCE_SCHEME}://{owner}/{name}/${read.segment}`,
      );
    }
    await close();
  });

  it("still does not grow the tool list", async () => {
    const { client, close } = await connect(ctx(fakeLedgerData()));
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(MCP_TOOLS.length);
    await close();
  });

  /**
   * The vocabulary reads go through `ILedgerDataService`, whose own
   * `authorizeLedger` runs on every call. Ten new entry points is ten new
   * chances to bypass it, so the refusal is asserted rather than assumed.
   */
  it("refuses a read once access is revoked", async () => {
    const ledgerData = fakeLedgerData();
    ledgerData.getPayees.mockRejectedValue(
      new ForbiddenError("You no longer have access to this ledger"),
    );
    const { client, close } = await connect(ctx(ledgerData));

    await expect(
      client.readResource({ uri: `${RESOURCE_SCHEME}://alice/main/payees` }),
    ).rejects.toThrow(/no longer have access/i);
    await close();
  });
});
