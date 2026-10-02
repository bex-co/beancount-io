import { afterEach, describe, expect, it, vi } from "vitest";
import type { RouterContext } from "@/common/types/router-context";
import {
  GetLedgerAccountMetaDocument,
  GetLedgerDocument,
  GetLedgerFileDocument,
  GetLedgerOverviewDocument,
  GetLedgerOverviewValuationDocument,
} from "@/graphql/definitions";
import { overviewLoader } from "../loader";

type QueryOptions = { query: unknown; variables?: Record<string, unknown> };

function loaderInput(query: (options: QueryOptions) => Promise<unknown>) {
  return {
    params: { ledgerOwner: "open_ledger", ledgerName: "example" },
    context: { client: { query } } as unknown as RouterContext,
    deps: {
      account: "Assets:Checking",
      filter: "",
      time: "2025",
    },
    abortController: new AbortController(),
    preload: false,
    cause: "enter" as const,
    location: {} as never,
  };
}

function pending() {
  return new Promise<never>(() => {});
}

// The two reads the page renders from: flows at cost, balances at market.
const PRIMARY = [GetLedgerOverviewDocument, GetLedgerOverviewValuationDocument];

describe("overviewLoader", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves once both primary reads are cached even while README and metadata are still loading", async () => {
    vi.stubEnv("SSR", false);
    const query = vi.fn((options: QueryOptions) =>
      PRIMARY.includes(options.query as never)
        ? Promise.resolve({ data: {} })
        : pending(),
    );

    await expect(overviewLoader(loaderInput(query))).resolves.toEqual({
      readme: undefined,
    });

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
            filter: "",
            time: "2025",
            interval: "monthly",
            conversion: "at_cost",
          },
        },
        {
          // No conversion variable: the document values balances at market.
          query: GetLedgerOverviewValuationDocument,
          variables: {
            ledgerId: "open_ledger/example",
            account: "Assets:Checking",
            filter: "",
            time: "2025",
            interval: "monthly",
          },
        },
      ]),
    );
    expect(requested).toHaveLength(4);
  });

  it("waits for the market read, so no balance renders at cost first", async () => {
    vi.stubEnv("SSR", false);
    const query = vi.fn((options: QueryOptions) =>
      options.query === GetLedgerOverviewDocument
        ? Promise.resolve({ data: {} })
        : pending(),
    );

    const settled = vi.fn();
    void overviewLoader(loaderInput(query)).then(settled);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(settled).not.toHaveBeenCalled();
  });

  it("starts the optional panels before awaiting the overview", async () => {
    vi.stubEnv("SSR", false);
    const order: unknown[] = [];
    const query = vi.fn((options: QueryOptions) => {
      order.push(options.query);
      return PRIMARY.includes(options.query as never)
        ? Promise.resolve({ data: {} })
        : pending();
    });

    await overviewLoader(loaderInput(query));

    expect(order.indexOf(GetLedgerOverviewDocument)).toBe(2);
    expect(order.indexOf(GetLedgerOverviewValuationDocument)).toBe(3);
  });

  it("leaves an overview failure to the page's own error state", async () => {
    vi.stubEnv("SSR", false);
    const query = vi.fn((options: QueryOptions) =>
      PRIMARY.includes(options.query as never)
        ? Promise.reject(new Error("ledger failed to load"))
        : pending(),
    );

    await expect(overviewLoader(loaderInput(query))).resolves.toEqual({
      readme: undefined,
    });
  });

  it("leaves a market-read failure to the balance modules", async () => {
    vi.stubEnv("SSR", false);
    const query = vi.fn((options: QueryOptions) => {
      if (options.query === GetLedgerOverviewDocument) {
        return Promise.resolve({ data: {} });
      }
      return options.query === GetLedgerOverviewValuationDocument
        ? Promise.reject(new Error("prices failed to load"))
        : pending();
    });

    await expect(overviewLoader(loaderInput(query))).resolves.toEqual({
      readme: undefined,
    });
  });

  it("does not start README during SSR unless resolved ledger visibility is public, and leaves metadata optional", async () => {
    vi.stubEnv("SSR", true);
    const query = vi.fn((_options: QueryOptions) =>
      Promise.resolve({ data: {} }),
    );

    await overviewLoader(loaderInput(query));

    // A server render still carries both primary reads.
    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls.map(([options]) => options.query)).toEqual([
      GetLedgerDocument,
      ...PRIMARY,
    ]);
  });

  it("uses destination loader deps rather than a global URL snapshot", async () => {
    vi.stubEnv("SSR", false);
    const query = vi.fn(() => Promise.resolve({ data: {} }));
    const input = loaderInput(query);
    input.deps = { account: "", filter: "payee:Rent", time: "2025-10" };

    await overviewLoader(input);

    for (const document of PRIMARY) {
      const call = query.mock.calls.find(
        ([options]) => options.query === document,
      );
      expect(call?.[0].variables).toMatchObject({
        filter: "payee:Rent",
        time: "2025-10",
      });
    }
  });
});
