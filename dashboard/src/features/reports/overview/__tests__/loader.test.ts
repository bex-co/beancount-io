import { afterEach, describe, expect, it, vi } from "vitest";
import type { RouterContext } from "@/common/types/router-context";
import {
  GetLedgerAccountMetaDocument,
  GetLedgerFileDocument,
  GetLedgerOverviewDocument,
} from "@/graphql/definitions";
import { overviewLoader } from "../loader";

vi.mock("@/common/lib/ledger-search-params", () => ({
  getLedgerSearchParams: () => ({
    account: "Assets:Checking",
    filter: undefined,
    time: "2025",
  }),
}));

type QueryOptions = { query: unknown; variables?: Record<string, unknown> };

function loaderInput(query: (options: QueryOptions) => Promise<unknown>) {
  return {
    params: { ledgerOwner: "open_ledger", ledgerName: "example" },
    context: { client: { query } } as unknown as RouterContext,
  } as Parameters<typeof overviewLoader>[0];
}

function pending() {
  return new Promise<never>(() => {});
}

describe("overviewLoader", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves once the overview is cached even while README and metadata are still loading", async () => {
    vi.stubEnv("SSR", false);
    const query = vi.fn((options: QueryOptions) =>
      options.query === GetLedgerOverviewDocument
        ? Promise.resolve({ data: { getLedgerOverview: {} } })
        : pending(),
    );

    await expect(overviewLoader(loaderInput(query))).resolves.toBeUndefined();

    const requested = query.mock.calls.map(([options]) => options);
    expect(requested).toEqual(
      expect.arrayContaining([
        {
          query: GetLedgerFileDocument,
          variables: { ledgerId: "open_ledger/example", path: "README.md" },
        },
        {
          query: GetLedgerAccountMetaDocument,
          variables: { ledgerId: "open_ledger/example" },
        },
        {
          query: GetLedgerOverviewDocument,
          variables: {
            ledgerId: "open_ledger/example",
            account: "Assets:Checking",
            filter: undefined,
            time: "2025",
            interval: "monthly",
            conversion: "at_cost",
          },
        },
      ]),
    );
    expect(requested).toHaveLength(3);
  });

  it("starts the optional panels before awaiting the overview", async () => {
    vi.stubEnv("SSR", false);
    const order: unknown[] = [];
    const query = vi.fn((options: QueryOptions) => {
      order.push(options.query);
      return options.query === GetLedgerOverviewDocument
        ? Promise.resolve({ data: {} })
        : pending();
    });

    await overviewLoader(loaderInput(query));

    expect(order.indexOf(GetLedgerOverviewDocument)).toBe(2);
  });

  it("leaves an overview failure to the page's own error state", async () => {
    vi.stubEnv("SSR", false);
    const query = vi.fn((options: QueryOptions) =>
      options.query === GetLedgerOverviewDocument
        ? Promise.reject(new Error("ledger failed to load"))
        : pending(),
    );

    await expect(overviewLoader(loaderInput(query))).resolves.toBeUndefined();
  });

  it("does not start README or metadata during SSR", async () => {
    vi.stubEnv("SSR", true);
    const query = vi.fn(() => Promise.resolve({ data: {} }));

    await overviewLoader(loaderInput(query));

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toMatchObject({
      query: GetLedgerOverviewDocument,
    });
  });
});
