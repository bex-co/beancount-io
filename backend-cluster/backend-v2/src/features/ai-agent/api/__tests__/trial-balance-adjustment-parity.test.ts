import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerFinanceQueryResolver } from "@/features/ledger/api/resolvers/ledger-finance-resolver.query";
import { LedgerFinanceService } from "@/features/ledger/service/ledger-finance-service";
import { AuthorizationService } from "@/server/api/authorization";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import {
  startV1TestServer,
  pinnedReadToken,
} from "@/server/rest/__tests__/v1-test-server";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";

/**
 * w1/291: valued at market, a trial balance of holdings nets only through its
 * valuation adjustment line (`bea report trial-balance`'s, w1/287). The ledger
 * service derives it; REST, GraphQL and MCP each return it unchanged, `null`
 * included, alongside the five trees, so an agent on any surface can see the
 * books balance.
 *
 * w1/305: the rounding Beancount's tolerance accepted is its own
 * `rounding_residual` line beside it, as `bea`'s is (w1/304). On w1/304's
 * repro (two 3.333 USD legs against -6.67 USD) every surface returns the
 * 0.004 USD there and a zero (`{}`) valuation adjustment.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const root = (account: string, balance: Record<string, string>) => ({
  account,
  balance: {},
  balance_children: balance,
  children: [],
  has_txns: false,
});
const valued = {
  income_hierarchy_data: root("Income", {}),
  liabilities_hierarchy_data: root("Liabilities", {}),
  equity_hierarchy_data: root("Equity", { USD: "-1000.00" }),
  expenses_hierarchy_data: root("Expenses", {}),
  assets_hierarchy_data: root("Assets", { USD: "1109.0000" }),
  valuation_adjustment: { USD: "-109.0000" } as Record<string, string> | null,
  rounding_residual: {} as Record<string, string> | null,
};
const units = {
  ...valued,
  assets_hierarchy_data: root("Assets", {
    AAPL: "5",
    EUR: "90.00",
    USD: "401.00",
  }),
  valuation_adjustment: null,
  rounding_residual: null,
};
/** w1/304's repro: the split's 0.004 USD is rounding, and nothing is valued. */
const rounded = {
  income_hierarchy_data: root("Income", {}),
  liabilities_hierarchy_data: root("Liabilities", {}),
  equity_hierarchy_data: root("Equity", { USD: "-100.00" }),
  expenses_hierarchy_data: root("Expenses", { USD: "6.666" }),
  assets_hierarchy_data: root("Assets", { USD: "93.33" }),
  valuation_adjustment: {},
  rounding_residual: { USD: "0.004" },
};
const envelope = (data: unknown) => ({ data: { success: true, data } });
let resolver: LedgerFinanceQueryResolver;
let schemaPromise: ReturnType<typeof buildSchema> | undefined;

async function fixture(payload: typeof valued) {
  const auth = new AuthorizationService(
    { check: jest.fn().mockResolvedValue(true) },
    jest.fn(),
  );
  const reports = {
    getLedgerTrialBalance: jest.fn().mockResolvedValue(envelope(payload)),
  };
  const factory = {
    getPublicApiClient: jest.fn().mockResolvedValue({ reports }),
  };
  const services = {
    ledgerFinance: new LedgerFinanceService(factory as never, auth),
  };
  resolver = new LedgerFinanceQueryResolver(services.ledgerFinance);
  schemaPromise ??= buildSchema({
    resolvers: [LedgerFinanceQueryResolver],
    container: { get: () => resolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
  const schema = await schemaPromise;
  const rest = await startV1TestServer(
    { services } as unknown as AppLayers,
    config,
    { apiKeys: false },
  );
  rest.setIdentity(pinnedReadToken);
  const server = assembleMcpRegistry(
    { identity: pinnedReadToken, services } as unknown as McpRequestContext,
    config,
  );
  const client = new Client({ name: "trial-balance-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);
  return {
    reports,
    /** The trial balance's adjustment line and equity root on one surface. */
    read: async (surface: string, query: Record<string, string>) => {
      const search = new URLSearchParams(query).toString();
      if (surface === "rest") {
        const response = await fetch(
          `${rest.url}/api-gateway/v1/ledgers/alice/main/trial-balance?${search}`,
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        return {
          line: body.valuation_adjustment,
          rounding: body.rounding_residual,
          equity: body.equity_hierarchy_data.balance_children,
        };
      }
      if (surface === "mcp") {
        const result = await client.readResource({
          uri: `beancount://alice/main/trial-balance?${search}`,
        });
        const content = result.contents[0];
        if (!("text" in content)) throw new Error("Expected JSON");
        const body = JSON.parse(content.text);
        return {
          line: body.valuation_adjustment,
          rounding: body.rounding_residual,
          equity: body.equity_hierarchy_data.balance_children,
        };
      }
      const args = Object.entries(query)
        .map(([key, value]) => `, ${key}: ${JSON.stringify(value)}`)
        .join("");
      const result = await graphql({
        schema,
        source: `{ getLedgerTrialBalance(ledgerId: "alice/main"${args}) { valuationAdjustment roundingResidual equityHierarchyData { balanceChildren } } }`,
        contextValue: { identity: pinnedReadToken },
      });
      expect(result.errors).toBeUndefined();
      const data = result.data?.getLedgerTrialBalance as {
        valuationAdjustment: unknown;
        roundingResidual: unknown;
        equityHierarchyData: { balanceChildren: unknown };
      };
      return {
        line: data.valuationAdjustment,
        rounding: data.roundingResidual,
        equity: data.equityHierarchyData.balanceChildren,
      };
    },
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe.each(["rest", "gql", "mcp"])("the trial balance via %s", (surface) => {
  it("returns the valuation adjustment beside the trees", async () => {
    const f = await fixture(valued);
    try {
      expect(await f.read(surface, { time: "2024-01" })).toEqual({
        line: { USD: "-109.0000" },
        rounding: {},
        equity: { USD: "-1000.00" },
      });
      expect(f.reports.getLedgerTrialBalance).toHaveBeenCalledWith(
        "alice",
        "main",
        { time: "2024-01" },
      );
    } finally {
      await f.close();
    }
  });

  it("returns null where the ledger service derives no line", async () => {
    const f = await fixture(units);
    try {
      expect(await f.read(surface, { conversion: "units" })).toEqual({
        line: null,
        rounding: null,
        equity: { USD: "-1000.00" },
      });
    } finally {
      await f.close();
    }
  });

  it("returns accepted rounding as its own line beside a zero adjustment (w1/305)", async () => {
    const f = await fixture(rounded);
    try {
      expect(await f.read(surface, { conversion: "at_cost" })).toEqual({
        line: {},
        rounding: { USD: "0.004" },
        equity: { USD: "-100.00" },
      });
      expect(f.reports.getLedgerTrialBalance).toHaveBeenCalledWith(
        "alice",
        "main",
        { conversion: "at_cost" },
      );
    } finally {
      await f.close();
    }
  });
});
