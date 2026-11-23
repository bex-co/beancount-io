import { afterEach, describe, expect, it, vi } from "vitest";
import type { RouterContext } from "@/common/types/router-context";
import {
  GetLedgerAccountMetaDocument,
  GetLedgerDocument,
  GetLedgerFileDocument,
  GetLedgerJournalDocument,
  GetLedgerOverviewDocument,
  GetLedgerOverviewValuationDocument,
} from "@/graphql/definitions";
import { overviewLoader } from "../loader";

type QueryOptions = { query: unknown; variables?: Record<string, unknown> };

function loaderInput(
  query: (options: QueryOptions) => Promise<unknown>,
  month?: string,
) {
  return {
    params: { ledgerOwner: "open_ledger", ledgerName: "example" },
    context: { client: { query } } as unknown as RouterContext,
    deps: {
      account: "Assets:Checking",
      filter: "",
      time: "2025",
      month,
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

// The reads the page renders from: flows at cost, balances at market, and the
// newest transactions, which say where the ledger's data ends.
const PRIMARY = [
  GetLedgerOverviewDocument,
  GetLedgerOverviewValuationDocument,
  GetLedgerJournalDocument,
];

describe("overviewLoader", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("resolves once the primary reads are cached even while README and metadata are still loading", async () => {
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
        {
          // The same variables Recent activity reads, so it is a cache hit.
          query: GetLedgerJournalDocument,
          variables: {
            ledgerId: "open_ledger/example",
            query: {
              account: "Assets:Checking",
              filter: undefined,
              time: "2025",
              directiveTypes: ["Transaction"],
              offset: 0,
              limit: 8,
            },
          },
        },
      ]),
    );
    expect(requested).toHaveLength(5);
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
    expect(order.indexOf(GetLedgerJournalDocument)).toBe(4);
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
      if (options.query === GetLedgerOverviewValuationDocument) {
        return Promise.reject(new Error("prices failed to load"));
      }
      return PRIMARY.includes(options.query as never)
        ? Promise.resolve({ data: {} })
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

    // A server render still carries every primary read.
    expect(query).toHaveBeenCalledTimes(4);
    expect(query.mock.calls.map(([options]) => options.query)).toEqual([
      GetLedgerDocument,
      ...PRIMARY,
    ]);
  });

  it("uses destination loader deps rather than a global URL snapshot", async () => {
    vi.stubEnv("SSR", false);
    const query = vi.fn(() => Promise.resolve({ data: {} }));
    const input = loaderInput(query);
    input.deps = {
      account: "",
      filter: "payee:Rent",
      time: "2025-10",
      month: undefined,
    };

    await overviewLoader(input);

    for (const document of PRIMARY) {
      const call = query.mock.calls.find(
        ([options]) => options.query === document,
      );
      const variables = call?.[0].variables as Record<string, unknown>;
      // The journal read nests its filters under `query`.
      expect(variables.query ?? variables).toMatchObject({
        filter: "payee:Rent",
        time: "2025-10",
      });
    }
  });
});

describe("overviewLoader, the opening month's balances", () => {
  const interval = (date: string, amount: string) => ({
    date,
    balance: { USD: amount },
    accountBalances: {},
  });
  const flows = {
    data: {
      getLedgerOverview: {
        incomeIntervalData: [
          interval("2025-08-31", "-9000"),
          interval("2025-09-30", "-9400"),
          interval("2025-10-31", "-4600"),
        ],
        expensesIntervalData: [
          interval("2025-08-31", "7800"),
          interval("2025-09-30", "7500"),
          interval("2025-10-31", "2400"),
        ],
      },
    },
  };
  // The newest entry: the data stops on 11 October.
  const newest = {
    data: { getLedgerJournal: { data: [{ date: "2025-10-11" }] } },
  };
  const publicLedger = {
    data: {
      getLedger: {
        private: false,
        permissions: { admin: false, pull: true, push: false },
      },
    },
  };
  const monthRead = {
    query: GetLedgerOverviewValuationDocument,
    variables: {
      ledgerId: "open_ledger/example",
      account: "",
      filter: "",
      time: "2025-09",
      interval: "monthly",
    },
  };

  function serve(monthBalances: () => Promise<unknown>) {
    return vi.fn((options: QueryOptions) => {
      if (options.query === GetLedgerOverviewDocument)
        return Promise.resolve(flows);
      if (options.query === GetLedgerJournalDocument)
        return Promise.resolve(newest);
      if (options.query === GetLedgerDocument)
        return Promise.resolve(publicLedger);
      if (options.query === GetLedgerOverviewValuationDocument)
        return options.variables?.time === "2025-09"
          ? monthBalances()
          : Promise.resolve({ data: {} });
      return pending();
    });
  }

  function unfiltered(
    query: (options: QueryOptions) => Promise<unknown>,
    month?: string,
  ) {
    const input = loaderInput(query, month);
    input.deps = { account: "", filter: "", time: "", month };
    return input;
  }

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("reads the balances at the close of a month before the data's last, as the page will", async () => {
    vi.stubEnv("SSR", true);
    // A year after the ledger stopped part-way through October, a public
    // reader opens on September: Financial position shows its close, and
    // a server render must already hold those rows.
    vi.useFakeTimers({ now: new Date(2026, 10, 16, 12), toFake: ["Date"] });
    const query = serve(() => Promise.resolve({ data: {} }));

    await overviewLoader(unfiltered(query));

    expect(query.mock.calls.map(([options]) => options)).toContainEqual(
      monthRead,
    );
  });

  it.each([
    ["2025-08", "2025-08"],
    ["2024-01", "2025-09"],
  ])(
    "prefetches the selected balances for month=%s on the server",
    async (month, expected) => {
      vi.stubEnv("SSR", true);
      vi.useFakeTimers({ now: new Date(2026, 10, 16, 12), toFake: ["Date"] });
      const query = serve(() => Promise.resolve({ data: {} }));

      await overviewLoader(unfiltered(query, month));

      const valuations = query.mock.calls
        .map(([options]) => options)
        .filter(
          (options) => options.query === GetLedgerOverviewValuationDocument,
        );
      expect(valuations.map((options) => options.variables?.time)).toEqual([
        "",
        expected,
      ]);
    },
  );

  it("waits for that read, so the rows never render as placeholders", async () => {
    vi.stubEnv("SSR", false);
    vi.useFakeTimers({ now: new Date(2026, 10, 16, 12), toFake: ["Date"] });
    const query = serve(pending);

    const settled = vi.fn();
    void overviewLoader(unfiltered(query)).then(settled);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(query.mock.calls.map(([options]) => options)).toContainEqual(
      monthRead,
    );
    expect(settled).not.toHaveBeenCalled();
  });

  it("reads nothing more when the page opens on the month the data ends in", async () => {
    vi.stubEnv("SSR", false);
    // Mid-October: the running month is the page's month, whose balances
    // are the page's own read.
    vi.useFakeTimers({ now: new Date(2025, 9, 20, 12), toFake: ["Date"] });
    const query = serve(() => Promise.resolve({ data: {} }));

    await overviewLoader(unfiltered(query));

    expect(
      query.mock.calls.filter(
        ([options]) => options.query === GetLedgerOverviewValuationDocument,
      ),
    ).toHaveLength(1);
  });
});
