import { describe, expect, it, vi } from "vitest";
import type { RouterContext } from "@/common/types/router-context";
import { GetLedgerCashFlowDocument } from "@/graphql/definitions";
import { cashFlowLoader } from "../loader";

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
  it("requests the cash flow query with the destination loader deps", async () => {
    const query = vi.fn(() => Promise.resolve({ data: {} }));

    await cashFlowLoader(loaderInput(query));

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toEqual({
      query: GetLedgerCashFlowDocument,
      variables: {
        ledgerId: "open_ledger/example",
        account: "",
        filter: "",
        time: "2025",
        interval: "monthly",
        conversion: "at_cost",
      },
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
