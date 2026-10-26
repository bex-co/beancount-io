import { describe, expect, it, vi } from "vitest";
import type { RouterContext } from "@/common/types/router-context";
import type { ChartInterval } from "@/common/types/chart";
import {
  GetLedgerCashFlowAccountsDocument,
  GetLedgerCashFlowDocument,
  GetLedgerDocument,
} from "@/graphql/definitions";
import { cashFlowLoader } from "../loader";

const { cookies } = vi.hoisted(() => ({ cookies: new Map<string, string>() }));
vi.mock("@/common/hooks/use-cookie-storage-state/cookie", () => ({
  getCookie: (key: string) => cookies.get(key),
  setCookie: vi.fn(),
  removeCookie: vi.fn(),
}));

type QueryOptions = { query: unknown; variables?: Record<string, unknown> };

function loaderInput(
  query: (options: QueryOptions) => Promise<unknown>,
  interval: ChartInterval = "monthly",
) {
  return {
    params: { ledgerOwner: "open_ledger", ledgerName: "example" },
    context: { client: { query } } as unknown as RouterContext,
    deps: { account: "", filter: "", time: "2025", interval },
    abortController: new AbortController(),
    preload: false,
    cause: "enter" as const,
    location: {} as never,
  };
}

/** Account directives as the membership read returns them. */
const directives = (...accounts: string[]) => ({
  data: {
    getLedgerAccountDirectives: accounts.map((account) => ({
      account,
      meta: null,
    })),
  },
});

/** Answers the ledger, membership and report reads. */
function reads(
  accounts = directives("Assets:Bank:Checking", "Liabilities:Card"),
  ledger: unknown = { data: {} },
) {
  return vi.fn((options: QueryOptions) =>
    Promise.resolve(
      options.query === GetLedgerDocument
        ? ledger
        : options.query === GetLedgerCashFlowAccountsDocument
          ? accounts
          : { data: {} },
    ),
  );
}

describe("cashFlowLoader", () => {
  const cashFlowCall = (query: ReturnType<typeof vi.fn>) =>
    (query.mock.calls as [QueryOptions][]).find(
      ([options]) => options.query === GetLedgerCashFlowDocument,
    )![0];

  it("requests the cash flow query with the destination loader deps", async () => {
    const query = reads();

    await cashFlowLoader(loaderInput(query));

    // The ledger read (root names) and cash membership first, then the report.
    expect(query.mock.calls.map(([options]) => options.query)).toEqual([
      GetLedgerDocument,
      GetLedgerCashFlowAccountsDocument,
      GetLedgerCashFlowDocument,
    ]);
    expect(query.mock.calls[0]![0].variables).toEqual({
      ledgerId: "open_ledger/example",
    });
    expect(query.mock.calls[1]![0].variables).toEqual({
      ledgerId: "open_ledger/example",
    });
    expect(cashFlowCall(query)).toEqual({
      query: GetLedgerCashFlowDocument,
      variables: {
        ledgerId: "open_ledger/example",
        account: "",
        filter: "",
        activityFilter: 'any(account:"^Assets:Bank:Checking$")',
        time: "2025",
        interval: "monthly",
        conversion: "at_cost",
        incomeRoot: "Income",
        expensesRoot: "Expenses",
        assetsRoot: "Assets",
        liabilitiesRoot: "Liabilities",
        equityRoot: "Equity",
      },
    });
  });

  it("prefetches the interval the URL selected (w4/m57)", async () => {
    const query = reads();

    await cashFlowLoader(loaderInput(query, "weekly"));

    expect(cashFlowCall(query).variables).toMatchObject({ interval: "weekly" });
  });

  it("reads the ledger's renamed roots (w4/1022)", async () => {
    const query = reads(directives("Actifs:Bank:Checking", "Actifs:Fund"), {
      data: {
        getLedger: {
          options: {
            nameAssets: "Actifs",
            nameLiabilities: "Dettes",
            nameEquity: "Capital",
            nameIncome: "Revenus",
            nameExpenses: "Charges",
          },
        },
      },
    });

    await cashFlowLoader(loaderInput(query));

    expect(cashFlowCall(query).variables).toMatchObject({
      incomeRoot: "Revenus",
      expensesRoot: "Charges",
      assetsRoot: "Actifs",
      liabilitiesRoot: "Dettes",
      equityRoot: "Capital",
      // The renamed asset root's cash account, by the same heuristics.
      activityFilter: 'any(account:"^Actifs:Bank:Checking$")',
    });
  });

  it("narrows the reader's filter to cash transactions, keeping it for closing balances (w4/m56)", async () => {
    const query = reads(
      directives("Assets:US:BofA:Checking", "Assets:US:ETrade:Cash"),
    );
    const input = loaderInput(query);
    input.deps.filter = "#trip, #home";

    await cashFlowLoader(input);

    expect(cashFlowCall(query).variables).toMatchObject({
      filter: "#trip, #home",
      activityFilter:
        '(#trip, #home) any(account:"^Assets:US:BofA:Checking$", account:"^Assets:US:ETrade:Cash$")',
    });
  });

  it("makes no activity read when cash membership could not be read (w4/m56)", async () => {
    const query = vi.fn((options: QueryOptions) =>
      options.query === GetLedgerCashFlowAccountsDocument
        ? Promise.reject(new Error("network"))
        : Promise.resolve({ data: {} }),
    );

    await expect(cashFlowLoader(loaderInput(query))).resolves.toBeUndefined();
    // Never an unfiltered read standing in for the eligible one.
    expect(
      query.mock.calls.some(
        ([options]) => options.query === GetLedgerCashFlowDocument,
      ),
    ).toBe(false);
  });

  it("prefetches the ledger's stored report conversion", async () => {
    cookies.set("beancount.reportConversion.open_ledger%2Fexample", "units");
    const query = reads();

    try {
      await cashFlowLoader(loaderInput(query));
    } finally {
      cookies.clear();
    }

    expect(cashFlowCall(query)).toMatchObject({
      variables: { conversion: "units" },
    });
  });

  it("leaves a query failure to the page's own error state", async () => {
    // A rejection here would reach the route ErrorBoundary, which is keyed by
    // pathname only — it would keep showing the stale error after the user
    // corrects the offending filter search param. The page's useQuery re-reports
    // it instead, and that does recover on a search-param change.
    const query = vi.fn(() =>
      Promise.reject(new Error("invalid filter expression")),
    );

    await expect(cashFlowLoader(loaderInput(query))).resolves.toBeUndefined();
  });
});
