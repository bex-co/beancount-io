import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { ANALYSIS_READS } from "@/features/ledger/api/rest/v1/analysis-handler";
import { MCP_TOOLS } from "../mcp-tools";
import { RESOURCE_SCHEME } from "../mcp-resources";
import { ForbiddenError } from "@/shared/errors";
import type { AppConfig } from "@/config/config";
import type { ToolContext } from "../../tools/types";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const LEDGER = "alice/main";

/** Each method echoes its own name, so a mixed-up wiring shows as a wrong value. */
const fakeServices = () => ({
  ledgerData: {
    getIntervalTotals: jest.fn().mockResolvedValue(["intervalTotals"]),
    getAccountReport: jest.fn().mockResolvedValue(["accountReport"]),
    getAccountLastEntries: jest.fn().mockResolvedValue(["accountLastEntries"]),
    getEntriesCountPerType: jest.fn().mockResolvedValue(["entriesCount"]),
    getPayeeTransactions: jest.fn().mockResolvedValue(["payeeTransactions"]),
    getNarrationTransactions: jest
      .fn()
      .mockResolvedValue(["narrationTransactions"]),
    getPayeeAccounts: jest.fn().mockResolvedValue(["payeeAccounts"]),
  },
  ledgerFinance: {
    getTrialBalance: jest.fn().mockResolvedValue(["trialBalance"]),
  },
  ledgerJournal: { getContext: jest.fn().mockResolvedValue(["entryContext"]) },
  ledgerAccount: {
    getAccountDirectives: jest.fn().mockResolvedValue(["accountDirectives"]),
  },
  ledgerShell: {},
  ledgerRepo: {},
  apiKey: {},
});

function ctx(services: ReturnType<typeof fakeServices>): ToolContext {
  return {
    services,
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

/** Enough of a query to satisfy the reads that require an argument. */
const SAMPLE_QUERY: Record<string, string> = {
  payee: "Whole Foods",
  narration: "groceries",
  entryHash: "abc123",
  accountName: "Expenses:Groceries",
};

/**
 * Fill the template's path parameter, if it has one.
 *
 * Only required parameters are on MCP at all — optional filters are REST-only,
 * because the SDK's template matcher cannot express them (see
 * `mcp-resources.ts`). So this substitutes exactly what the template declares.
 */
const uriFor = (read: (typeof ANALYSIS_READS)[number]) => {
  const path = read.uriPath.replace(
    /\{(\w+)\}/g,
    (_, key: string) => SAMPLE_QUERY[key] ?? "",
  );
  return `${RESOURCE_SCHEME}://alice/main/${read.segment}${path}`;
};

/** What the MCP side will actually receive, so REST is driven with the same. */
const mcpQueryFor = (read: (typeof ANALYSIS_READS)[number]) =>
  Object.fromEntries(
    [...read.uriPath.matchAll(/\{(\w+)\}/g)].map(([, key]) => [
      key,
      SAMPLE_QUERY[key],
    ]),
  );

/**
 * w3/m7 — the ten analysis reads on REST and MCP.
 *
 * As in m6, the property under test is that the two surfaces resolve through
 * the same service call. Each fake returns a value naming its own method, so a
 * template wired to the wrong read fails loudly instead of returning
 * plausible-looking data.
 */
describe("ledger analysis reads", () => {
  it("ports exactly ten reads", () => {
    expect(ANALYSIS_READS).toHaveLength(10);
  });

  it.each(ANALYSIS_READS)(
    "$segment resolves through the same service call on both surfaces",
    async (read) => {
      const viaRest = await read.fetch(fakeServices() as never, {
        ledgerId: LEDGER,
        identity: undefined,
        query: mcpQueryFor(read),
      });

      const { client, close } = await connect(ctx(fakeServices()));
      const result = await client.readResource({ uri: uriFor(read) });
      const content = result.contents[0];
      if (!("text" in content))
        throw new Error(`${read.segment} returned a blob`);
      await close();

      expect(JSON.parse(String(content.text))).toEqual(viaRest);
    },
  );

  it("publishes a template carrying each read's parameters", async () => {
    const { client, close } = await connect(ctx(fakeServices()));

    const { resourceTemplates } = await client.listResourceTemplates();
    const uris = resourceTemplates.map((t) => t.uriTemplate);

    for (const read of ANALYSIS_READS) {
      expect(uris).toContain(
        `${RESOURCE_SCHEME}://{owner}/{name}/${read.segment}${read.uriPath}`,
      );
    }
    await close();
  });

  it("still does not grow the tool list", async () => {
    const { client, close } = await connect(ctx(fakeServices()));
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(MCP_TOOLS.length);
    await close();
  });

  it("refuses an analysis read once access is revoked", async () => {
    const services = fakeServices();
    services.ledgerFinance.getTrialBalance.mockRejectedValue(
      new ForbiddenError("You no longer have access to this ledger"),
    );
    const { client, close } = await connect(ctx(services));

    await expect(
      client.readResource({
        uri: `${RESOURCE_SCHEME}://alice/main/trial-balance`,
      }),
    ).rejects.toThrow(/no longer have access/i);
    await close();
  });
});

/**
 * Regression: `accountName` used to be defaulted *before* `...query` was
 * spread, so a caller omitting it sent `undefined` to a service expecting a
 * string. `JSON.stringify` hides the difference, which is why this asserts the
 * argument the service actually received.
 */
describe("optional account narrowing", () => {
  it.each(["interval-totals", "account-report"])(
    "%s defaults accountName rather than passing undefined",
    async (segment) => {
      const services = fakeServices();
      const read = ANALYSIS_READS.find((r) => r.segment === segment)!;

      await read.fetch(services as never, {
        ledgerId: LEDGER,
        identity: undefined,
        query: { accountName: undefined },
      });

      const call =
        segment === "interval-totals"
          ? services.ledgerData.getIntervalTotals
          : services.ledgerData.getAccountReport;
      expect(call).toHaveBeenCalledWith(
        expect.objectContaining({ accountName: "" }),
      );
    },
  );
});
