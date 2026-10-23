import { describe, expect, it, vi } from "vitest";
import type { RouterContext } from "@/common/types/router-context";
import {
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

function loaderInput(query: (options: QueryOptions) => Promise<unknown>) {
  return {
    params: { ledgerOwner: "open_ledger", ledgerName: "example" },
    context: { client: { query } } as unknown as RouterContext,
    deps: { account: "", filter: "", time: "2025" },
    abortController: new AbortController(),
    preload: false,
    cause: "enter" as const,
    location: {} as never,
  };
}

describe("cashFlowLoader", () => {
  const cashFlowCall = (query: ReturnType<typeof vi.fn>) =>
    (query.mock.calls as [QueryOptions][]).find(
      ([options]) => options.query === GetLedgerCashFlowDocument,
    )![0];

  it("requests the cash flow query with the destination loader deps", async () => {
    const query = vi.fn((_options: QueryOptions) =>
      Promise.resolve({ data: {} }),
    );

    await cashFlowLoader(loaderInput(query));

    // The ledger read first, for its root names, then the report.
    expect(query.mock.calls.map(([options]) => options.query)).toEqual([
      GetLedgerDocument,
      GetLedgerCashFlowDocument,
    ]);
    expect(query.mock.calls[0]![0].variables).toEqual({
      ledgerId: "open_ledger/example",
    });
    expect(cashFlowCall(query)).toEqual({
      query: GetLedgerCashFlowDocument,
      variables: {
        ledgerId: "open_ledger/example",
        account: "",
        filter: "",
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

  it("reads the ledger's renamed roots (w4/1022)", async () => {
    const query = vi.fn((options: QueryOptions) =>
      Promise.resolve(
        options.query === GetLedgerDocument
          ? {
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
            }
          : { data: {} },
      ),
    );

    await cashFlowLoader(loaderInput(query));

    expect(cashFlowCall(query).variables).toMatchObject({
      incomeRoot: "Revenus",
      expensesRoot: "Charges",
      assetsRoot: "Actifs",
      liabilitiesRoot: "Dettes",
      equityRoot: "Capital",
    });
  });

  it("prefetches the ledger's stored report conversion", async () => {
    cookies.set("beancount.reportConversion.open_ledger%2Fexample", "units");
    const query = vi.fn((_options: QueryOptions) =>
      Promise.resolve({ data: {} }),
    );

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
