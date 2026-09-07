import "reflect-metadata";

jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { startV1TestServer } from "@/server/rest/__tests__/v1-test-server";
import type { AppLayers } from "@/foundation/composition";
import { UriTemplate } from "@modelcontextprotocol/sdk/shared/uriTemplate.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import { ANALYSIS_READS } from "@/features/ledger/api/rest/v1/analysis-handler";
import { MCP_TOOLS } from "../mcp-tools";
import { RESOURCE_SCHEME } from "../mcp-resources";
import { ForbiddenError } from "@/shared/errors";
import type { AppConfig } from "@/config/config";
import type { McpRequestContext } from "../mcp-context";

const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const LEDGER = "alice/main";

/** Each method echoes its own name, so a mixed-up wiring shows as a wrong value. */
const fakeServices = () => ({
  ledgerData: {
    getDocuments: jest.fn().mockResolvedValue(["documents"]),
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
    getOverview: jest.fn().mockResolvedValue(["overview"]),
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

function ctx(services: ReturnType<typeof fakeServices>): McpRequestContext {
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
  } as unknown as McpRequestContext;
}

async function connect(toolCtx: McpRequestContext) {
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
  account: "Expenses:Food & Drink",
  filter: "#travel + #café",
  time: "2026-01",
  interval: "month",
  conversion: "USD",
  payee: "Whole Foods",
  narration: "groceries",
  entryHash: "abc123",
  accountName: "Expenses:Groceries",
};

const queryFor = (read: (typeof ANALYSIS_READS)[number]) =>
  Object.fromEntries(
    Object.keys(read.query.shape).map((key) => [key, SAMPLE_QUERY[key]]),
  );

const uriFor = (read: (typeof ANALYSIS_READS)[number]) => {
  const path = new UriTemplate(
    `${RESOURCE_SCHEME}://alice/main/${read.segment}${read.uriPath}`,
  ).expand(SAMPLE_QUERY);
  const query = Object.fromEntries(
    Object.entries(queryFor(read)).filter(
      ([key]) => !read.uriPath.includes(`{${key}}`),
    ),
  );
  return Object.keys(query).length
    ? `${path}?${new URLSearchParams(query)}`
    : path;
};

/**
 * w3/m7 — the ten analysis reads on REST and MCP.
 *
 * As in m6, the property under test is that the two surfaces resolve through
 * the same service call. Each fake returns a value naming its own method, so a
 * template wired to the wrong read fails loudly instead of returning
 * plausible-looking data.
 */
describe("ledger analysis reads", () => {
  it("ports twelve analysis reads", () => {
    expect(ANALYSIS_READS).toHaveLength(12);
  });

  it.each(ANALYSIS_READS)(
    "$segment resolves through the same service call on both surfaces",
    async (read) => {
      const services = fakeServices();
      const context = ctx(services);
      const rest = await startV1TestServer(
        { services } as unknown as AppLayers,
        config,
        { apiKeys: false },
      );
      rest.setIdentity(context.identity);
      const { client, close } = await connect(context);
      try {
        const response = await fetch(
          `${rest.url}/api-gateway/v1/ledgers/alice/main/${read.segment}?${new URLSearchParams(queryFor(read))}`,
        );
        expect(response.status).toBe(200);
        const viaRest: unknown = await response.json();
        const restCalls = Object.values(services)
          .flatMap((group) => Object.values(group))
          .filter(jest.isMockFunction)
          .map((fn) => fn.mock.calls.slice());
        Object.values(services)
          .flatMap((group) => Object.values(group))
          .filter(jest.isMockFunction)
          .forEach((fn) => fn.mockClear());
        const result = await client.readResource({ uri: uriFor(read) });
        const content = result.contents[0];
        if (!("text" in content))
          throw new Error(`${read.segment} returned a blob`);
        expect(JSON.parse(String(content.text))).toEqual(viaRest);
        const mcpCalls = Object.values(services)
          .flatMap((group) => Object.values(group))
          .filter(jest.isMockFunction)
          .map((fn) => fn.mock.calls.slice());
        expect(mcpCalls).toEqual(restCalls);
      } finally {
        await close();
        await rest.close();
      }
    },
  );

  it("publishes a template carrying each read's parameters", async () => {
    const { client, close } = await connect(ctx(fakeServices()));

    const { resourceTemplates } = await client.listResourceTemplates();
    const uris = resourceTemplates.map((t) => t.uriTemplate);

    for (const read of ANALYSIS_READS) {
      const optional = Object.keys(read.query.shape).filter(
        (name) => !read.uriPath.includes(`{${name}}`),
      );
      expect(uris).toContain(
        `${RESOURCE_SCHEME}://{owner}/{name}/${read.segment}${read.uriPath}${optional.length ? `{?${optional.join(",")}}` : ""}`,
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

describe("report query validation", () => {
  it.each(["account=one&account=two", "owner=bob", "unknown=value"])(
    "refuses %s before reading",
    async (query) => {
      const services = fakeServices();
      const { client, close } = await connect(ctx(services));
      try {
        await expect(
          client.readResource({
            uri: `beancount://alice/main/trial-balance?${query}`,
          }),
        ).rejects.toThrow();
        expect(services.ledgerFinance.getTrialBalance).not.toHaveBeenCalled();
      } finally {
        await close();
      }
    },
  );
});
