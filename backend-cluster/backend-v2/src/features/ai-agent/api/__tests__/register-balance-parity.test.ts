import "reflect-metadata";
jest.mock("@ai-sdk/harness/agent", () => ({ HarnessAgent: class {} }));
jest.mock("@ai-sdk/harness-acp", () => ({ createACP: () => ({}) }));

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildSchema } from "type-graphql";
import { graphql } from "graphql";
import { LedgerFinanceQueryResolver } from "@/features/ledger/api/resolvers/ledger-finance-resolver.query";
import { LedgerFinanceService } from "@/features/ledger/service/ledger-finance-service";
import { graphqlScopeMiddleware } from "@/server/graphql/scope-middleware";
import { assembleMcpRegistry } from "@/server/api/composition-root";
import {
  startV1TestServer,
  pinnedReadToken,
} from "@/server/rest/__tests__/v1-test-server";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { McpRequestContext } from "../mcp-context";

jest.mock("@/features/ledger/utils/authorize-ledger", () => ({
  ...jest.requireActual("@/features/ledger/utils/authorize-ledger"),
  authorizeLedger: jest.fn().mockResolvedValue({}),
}));

/**
 * w1/289. A balance row carried the asserted figure as a posting amount, so
 * a check that moves nothing read as a deposit and a failed one looked like
 * a passing one. Every surface now answers the row with no postings, the
 * figure under `asserted`, and a failed check's `diff_amount` (accumulated
 * minus asserted) under `difference`; this stub answers the account journal
 * the way the ledger does, one passing and one failed check.
 */
const config = { api: { scopeEnforcement: "enforce" } } as AppConfig;
const ACCOUNT = "Assets:Checking";
const envelope = (data: unknown) => ({ data: { success: true, data } });

const check = (date: string, asserted: string, diff?: string) => ({
  entry: {
    date,
    entry_hash: `b-${date}`,
    directive_type: "Balance",
    account: ACCOUNT,
    amount: { number: asserted, currency: "USD" },
    diff_amount: diff === undefined ? null : { number: diff, currency: "USD" },
  },
  change: {},
  balance: { USD: "70.00" },
});

async function fixture() {
  const getAccountJournal = jest.fn(async () =>
    envelope({
      // Newest first, as the ledger's account journal answers.
      items: [
        check("2024-01-11", "80.00", "-10.00"),
        check("2024-01-10", "70.00"),
        {
          entry: {
            date: "2024-01-05",
            entry_hash: "t1",
            directive_type: "Transaction",
            flag: "*",
            payee: null,
            narration: "Opening",
            postings: [
              {
                account: ACCOUNT,
                units: { number: "70.00", currency: "USD" },
                cost: null,
              },
            ],
          },
          change: { USD: "70.00" },
          balance: { USD: "70.00" },
        },
      ],
      total: 3,
      account: ACCOUNT,
      with_children: true,
    }),
  );
  const reports = {
    getLedgerOptions: async () =>
      envelope({
        operating_currency: ["USD"],
        name_assets: "Assets",
        name_liabilities: "Liabilities",
        name_equity: "Equity",
        name_income: "Income",
        name_expenses: "Expenses",
      }),
    getLedgerPostingsPerAccount: async () => envelope([{ account: ACCOUNT }]),
  };
  const factory = {
    getPublicApiClient: jest.fn().mockResolvedValue({
      reports,
      journal: {
        getJournal: async () => envelope({ items: [], total: 0 }),
        getAccountJournal,
      },
    }),
  };
  const services = {
    ledgerFinance: new LedgerFinanceService(factory as never, {} as never),
  };
  const resolver = new LedgerFinanceQueryResolver(services.ledgerFinance);
  const schema = await buildSchema({
    resolvers: [LedgerFinanceQueryResolver],
    container: { get: () => resolver },
    globalMiddlewares: [graphqlScopeMiddleware("enforce")],
    validate: true,
  });
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
  const client = new Client({ name: "register-balance-parity", version: "1" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), server.connect(b)]);

  type Row = {
    entry: string;
    postings: unknown[];
    asserted: unknown;
    difference: unknown;
  };
  const pick = (rows: Row[]) =>
    rows.map(({ entry, postings, asserted, difference }) => ({
      entry,
      postings,
      asserted,
      difference,
    }));

  /** Each surface's rows, reduced to the fields a balance check changes. */
  const register = async () => {
    const response = await fetch(
      `${rest.url}/api-gateway/v1/ledgers/alice/main/register?account=${ACCOUNT}`,
    );
    expect(response.status).toBe(200);
    const restRows = pick((await response.json()).rows);
    const resource = await client.readResource({
      uri: `beancount://alice/main/register/${ACCOUNT}`,
    });
    const content = resource.contents[0]!;
    if (!("text" in content)) throw new Error("Expected JSON");
    const mcpRows = pick(JSON.parse(content.text).rows);
    const gql = await graphql({
      schema,
      source: `{ getLedgerRegister(ledgerId: "alice/main", account: "${ACCOUNT}") { rows { entry postings { account } asserted { account number currency } difference { number currency } } } }`,
      contextValue: { identity: pinnedReadToken },
    });
    expect(gql.errors).toBeUndefined();
    const gqlRows = pick(
      (gql.data as { getLedgerRegister: { rows: Row[] } }).getLedgerRegister
        .rows,
    );
    return { rest: restRows, mcp: mcpRows, gql: gqlRows };
  };

  return {
    register,
    close: async () => {
      await client.close();
      await server.close();
      await rest.close();
    },
  };
}

describe("the register's balance assertions", () => {
  it("move nothing and name a failed check alike on REST, MCP and GraphQL", async () => {
    const f = await fixture();
    try {
      const expected = [
        {
          entry: "transaction",
          postings: [expect.objectContaining({ account: ACCOUNT })],
          asserted: null,
          difference: null,
        },
        {
          entry: "balance",
          postings: [],
          asserted: { account: ACCOUNT, number: "70.00", currency: "USD" },
          difference: null,
        },
        {
          entry: "balance",
          postings: [],
          asserted: { account: ACCOUNT, number: "80.00", currency: "USD" },
          difference: { number: "-10.00", currency: "USD" },
        },
      ];
      const { rest, mcp, gql } = await f.register();
      expect(rest).toEqual(expected);
      expect(mcp).toEqual(expected);
      expect(gql).toEqual(expected);
    } finally {
      await f.close();
    }
  });
});
