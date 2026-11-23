import { LedgerFinanceService } from "../ledger-finance-service";
import { authorizeLedger } from "@/features/ledger/utils/authorize-ledger";
import { AUTHORIZATION_ACTIONS } from "@/server/api/authorization/authorization-contract";
import type { Identity } from "@/server/api/identity";
import { BadUserInputError } from "@/shared/errors";

// Same seam as the data-service suite: authorizeLedger's own contract has
// its own suite; here it is mocked so these cases need no owner,
// collaborator, or Fava simulation.
jest.mock("@/features/ledger/utils/authorize-ledger", () => ({
  ...jest.requireActual("@/features/ledger/utils/authorize-ledger"),
  authorizeLedger: jest.fn(),
}));

const mockReports = {
  getLedgerOptions: jest.fn(),
  getLedgerPostingsPerAccount: jest.fn(),
  getLedgerCurrencies: jest.fn(),
  getLedgerCommodities: jest.fn(),
};
const mockShell = {
  queryShellPost: jest.fn(),
};
const mockJournal = {
  getJournal: jest.fn(),
  getAccountJournal: jest.fn(),
};
const mockFavaApiClient = {
  reports: mockReports,
  shell: mockShell,
  journal: mockJournal,
};
const mockFavaClientFactory = {
  getPublicApiClient: jest.fn().mockResolvedValue(mockFavaApiClient),
};

const LEDGER_ID = "testowner/testledger";
const USER_ID = "user-123";
const IDENTITY: Identity = {
  userId: USER_ID,
  method: "oauth",
  scopes: new Set(),
};

const ok = <T>(data: T) => ({ data: { success: true, data } });

const COLUMNS = [
  "account",
  "currency",
  "cost_currency",
  "units",
  "book_value",
].map((name) => ({ name, dtype: "str" }));

const PRICE_COLUMNS = ["date", "currency", "amount", "quote"].map((name) => ({
  name,
  dtype: "str",
}));

/** The detail query's columns as the engine answers them: one row per lot. */
const LOT_COLUMNS = [
  "account",
  "currency",
  "cost_currency",
  "cost_number",
  "cost_date",
  "cost_label",
  "units",
  "book_value",
].map((name) => ({ name, dtype: "str" }));

let detailColumns = COLUMNS;

const table = (rows: unknown[][]) => ({
  result: { types: detailColumns, rows },
});

/** The shell answers the detail query and the price-directive query apart (w1/229). */
const answerShell = (
  rows: unknown[][],
  prices: unknown[][] = [],
  priceCurrencies: unknown[][] = [],
) =>
  mockShell.queryShellPost.mockImplementation(
    async (_owner: string, _name: string, { query }: { query: string }) =>
      query.includes("FROM prices")
        ? ok({ result: { types: PRICE_COLUMNS, rows: prices } })
        : query.includes("currency(price)")
          ? ok({
              result: {
                types: [{ name: "price_currency", dtype: "str" }],
                rows: priceCurrencies,
              },
            })
          : ok(table(rows)),
  );

describe("LedgerFinanceService.getHoldings", () => {
  let service: LedgerFinanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    detailColumns = COLUMNS;
    (authorizeLedger as jest.Mock).mockResolvedValue({
      ledgerRepoId: 1,
      ownerUserId: USER_ID,
    });
    service = new LedgerFinanceService(mockFavaClientFactory as any, {} as any);
    mockReports.getLedgerOptions.mockResolvedValue(
      ok({ operating_currency: ["USD"] }),
    );
  });

  const holdingsRows = () => [
    ["Assets:Broker:AAPL", "AAPL", "USD", { AAPL: "10" }, { USD: "1500.00" }],
  ];
  const quotes = [
    ["2026-10-01", "AAPL", { USD: "180.00" }],
    ["2026-10-01", "USD", { EUR: "0.92" }],
  ];

  it("authorizes as a reports read and composes groups", async () => {
    answerShell(holdingsRows(), quotes);

    const result = await service.getHoldings({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      conversion: "units",
    });

    expect(authorizeLedger).toHaveBeenCalledWith(
      IDENTITY,
      LEDGER_ID,
      AUTHORIZATION_ACTIONS.LEDGER_REPORTS_READ,
      expect.anything(),
    );
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({
      account: "Assets:Broker:AAPL",
      commodity: "AAPL",
      units: { number: "10", currency: "AAPL" },
      market_value: { number: "1800", currency: "USD" },
    });
    expect(result.valuation).toBe("complete");
    // The engine is asked for units and cost only: its market values and
    // quotes include prices implied by `@` annotations, which no statement
    // uses (w1/229); the price directives are read in a second query.
    expect(mockShell.queryShellPost).toHaveBeenCalledWith(
      "testowner",
      "testledger",
      { query: expect.not.stringContaining("getprice") },
    );
    expect(mockShell.queryShellPost).toHaveBeenCalledWith(
      "testowner",
      "testledger",
      {
        query:
          "SELECT date, currency, amount, currency(amount) AS quote FROM prices ORDER BY date",
      },
    );
  });

  // w1/253: shares bought with a price but no cost were dropped as if they
  // were cash; cash is told apart by its commodity instead.
  it("keeps uncosted shares and leaves uncosted cash out", async () => {
    answerShell(
      [
        ["Assets:Bank", "USD", null, { USD: "8250" }, { USD: "8250" }],
        ["Assets:Mixed", "AAPL", null, { AAPL: "2" }, { AAPL: "2" }],
        ["Assets:Mixed", "AAPL", "USD", { AAPL: "5" }, { USD: "750" }],
        ["Assets:Plain", "AAPL", null, { AAPL: "3" }, { AAPL: "3" }],
      ],
      [["2024-03-01", "AAPL", { USD: "170" }]],
      [[null], ["USD"]],
    );

    const result = await service.getHoldings({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
    });

    expect(
      result.groups.map((group) => [
        group.account,
        group.units.number,
        group.market_value,
        group.cost_basis,
      ]),
    ).toEqual([
      ["Assets:Mixed", "7", { number: "1190", currency: "USD" }, null],
      ["Assets:Plain", "3", { number: "510", currency: "USD" }, null],
    ]);
    expect(result.totals).toEqual({
      cost_basis: {},
      market_value: { USD: "1700" },
    });
    expect(result.cost_basis_complete).toBe(false);
    expect(mockShell.queryShellPost).toHaveBeenCalledWith(
      "testowner",
      "testledger",
      { query: "SELECT DISTINCT currency(price) AS price_currency" },
    );
  });

  // w1/229: a lot with no `price` directive is valued at cost, whatever the
  // engine would have implied from a sale's `@` annotation.
  it("values a lot with no price directive at cost", async () => {
    answerShell(holdingsRows(), []);

    const result = await service.getHoldings({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      conversion: "units",
    });

    expect(result.valuation).toBe("partial");
    expect(result.missing_prices).toEqual([{ from: "AAPL", to: "USD" }]);
    expect(result.groups[0]).toMatchObject({
      market_value: { number: "1500", currency: "USD" },
      price: null,
    });
  });

  it("defaults conversion to one operating currency", async () => {
    answerShell(holdingsRows(), quotes);

    const result = await service.getHoldings({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
    });

    // USD-held lots skip the conversion per row.
    expect(result.groups[0]!.cost_basis?.currency).toBe("USD");
  });

  it("quotes an explicit target through the conversion leg", async () => {
    answerShell(holdingsRows(), quotes);
    // EUR is named only as a price quote, which counts (w1/204).
    mockReports.getLedgerCurrencies.mockResolvedValue(ok(["USD", "AAPL"]));
    mockReports.getLedgerCommodities.mockResolvedValue(
      ok([{ base: "USD", quote: "EUR", prices: [] }]),
    );

    const result = await service.getHoldings({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      conversion: "EUR",
    });

    expect(result.groups[0]).toMatchObject({
      cost_basis: { number: "1380", currency: "EUR" },
      market_value: { number: "1656", currency: "EUR" },
    });
  });

  // w1/290: the w1/288 QA ledger's detail rows. 10 VT bought at 100 USD and
  // 10 at 90 EUR, VT quoted at 110 USD and EUR at 1.2 USD, no VT quote in
  // EUR. `bea report holdings` values the EUR lot at the USD quote: one
  // 20 VT holding worth 2,200 USD, complete. Routed through its cost
  // currency the lot was valued at cost, 2,180 USD and partial, on REST,
  // GraphQL and MCP alike, which all answer from this method.
  it("values a lot at its quote in the operating currency, as bea does", async () => {
    answerShell(
      [
        ["Assets:BrokerA", "VT", "EUR", { VT: "10" }, { EUR: "900" }],
        ["Assets:BrokerA", "VT", "USD", { VT: "10" }, { USD: "1000" }],
        ["Assets:Cash", "USD", null, { USD: "9000" }, { USD: "9000" }],
        ["Assets:EurCash", "EUR", null, { EUR: "9100" }, { EUR: "9100" }],
        ["Equity:Opening", "EUR", null, { EUR: "-10000" }, { EUR: "-10000" }],
        ["Equity:Opening", "USD", null, { USD: "-10000" }, { USD: "-10000" }],
      ],
      [
        ["2024-03-01", "VT", { USD: "110" }],
        ["2024-03-01", "EUR", { USD: "1.2" }],
      ],
      [[null]],
    );

    const result = await service.getHoldings({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
    });

    expect(result.groups).toEqual([
      {
        account: "Assets:BrokerA",
        commodity: "VT",
        units: { number: "20", currency: "VT" },
        average_cost: { number: "104", currency: "USD" },
        cost_basis: { number: "2080", currency: "USD" },
        market_value: { number: "2200", currency: "USD" },
        price: { number: "110", currency: "USD" },
      },
    ]);
    expect(result.totals).toEqual({
      cost_basis: { USD: "2080" },
      market_value: { USD: "2200" },
    });
    expect(result.valuation).toBe("complete");
    expect(result.missing_prices).toEqual([]);
  });

  // w1/292: the engine's rows for a synthetic ledger, compared side by side
  // with `bea report holdings` on the same ledger. HOOL is held long in one
  // account and short in another, netting to zero; DEAD is a delisted share
  // quoted at 0 USD after 40 USD; VT was bought in EUR and in GBP with no USD
  // quote, its GBP quote the later one. bea keeps the HOOL group with no
  // average cost, values DEAD at nothing, and shows VT at the GBP lot's
  // quote. The hosted answer dropped HOOL, valued DEAD at 400 USD and showed
  // VT at the EUR lot's quote, on REST, GraphQL and MCP alike.
  it("answers holdings as bea does on zero quotes, zero units and merged quotes", async () => {
    detailColumns = LOT_COLUMNS;
    const lot = (
      account: string,
      commodity: string,
      held: string,
      cost: string,
      units: string,
      basis: string,
    ) => [
      account,
      commodity,
      held,
      cost,
      "2024-01-03",
      null,
      { [commodity]: units },
      { [held]: basis },
    ];
    answerShell(
      [
        [
          "Assets:Cash",
          "USD",
          null,
          null,
          null,
          null,
          { USD: "9" },
          { USD: "9" },
        ],
        lot("Assets:Broker", "DEAD", "USD", "50", "10", "500"),
        lot("Assets:Broker", "VT", "EUR", "90", "10", "900"),
        lot("Assets:Broker", "VT", "GBP", "80", "10", "800"),
        lot("Assets:Long", "HOOL", "USD", "100", "2", "200"),
        // A lot bought and sold again: no units left.
        ["Assets:Long", "HOOL", "USD", "90", "2024-01-02", null, {}, {}],
        lot("Assets:Short", "HOOL", "USD", "120", "-2", "-240"),
      ],
      [
        ["2024-03-01", "VT", { EUR: "100" }, "EUR"],
        ["2024-06-01", "DEAD", { USD: "40" }, "USD"],
        ["2024-06-01", "EUR", { USD: "1.10" }, "USD"],
        ["2024-06-01", "GBP", { USD: "1.30" }, "USD"],
        ["2024-06-01", "HOOL", { USD: "150" }, "USD"],
        ["2024-06-01", "VT", { GBP: "85" }, "GBP"],
        ["2025-01-01", "DEAD", {}, "USD"],
      ],
      [[null]],
    );

    const result = await service.getHoldings({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      groupBy: "commodity",
    });

    expect(mockShell.queryShellPost).toHaveBeenCalledWith(
      "testowner",
      "testledger",
      {
        query: expect.stringContaining(
          "GROUP BY account, currency, cost_currency, cost_number, cost_date, cost_label",
        ),
      },
    );
    expect(result.groups).toEqual([
      {
        accounts: ["Assets:Broker"],
        commodity: "DEAD",
        units: { number: "10", currency: "DEAD" },
        average_cost: { number: "50", currency: "USD" },
        cost_basis: { number: "500", currency: "USD" },
        market_value: { number: "0", currency: "USD" },
        price: { number: "0", currency: "USD" },
      },
      {
        accounts: ["Assets:Long", "Assets:Short"],
        commodity: "HOOL",
        units: { number: "0", currency: "HOOL" },
        average_cost: null,
        cost_basis: { number: "-40", currency: "USD" },
        market_value: { number: "0", currency: "USD" },
        price: { number: "150", currency: "USD" },
      },
      {
        accounts: ["Assets:Broker"],
        commodity: "VT",
        units: { number: "20", currency: "VT" },
        average_cost: { number: "101.5", currency: "USD" },
        cost_basis: { number: "2030", currency: "USD" },
        market_value: { number: "2205", currency: "USD" },
        price: { number: "110.5", currency: "USD" },
      },
    ]);
    expect(result.totals).toEqual({
      cost_basis: { USD: "2490" },
      market_value: { USD: "2205" },
    });
    expect(result.valuation).toBe("complete");
    expect(result.missing_prices).toEqual([]);
  });

  // w1/204: interpolated into the price lookup, an unknown target found no
  // price and answered valuation "partial" as if it were real.
  it.each(["bogus", "usd", "EUR"])(
    "refuses %p, which the ledger never names, before querying",
    async (conversion) => {
      mockReports.getLedgerCurrencies.mockResolvedValue(ok(["USD", "AAPL"]));
      mockReports.getLedgerCommodities.mockResolvedValue(
        ok([{ base: "AAPL", quote: "USD", prices: [] }]),
      );
      const refusal = await service
        .getHoldings({ ledgerId: LEDGER_ID, identity: IDENTITY, conversion })
        .catch((error: unknown) => error);
      expect(refusal).toBeInstanceOf(BadUserInputError);
      expect((refusal as Error).message).toBe(
        `Unsupported conversion "${conversion}": pass "units" or a currency in this ledger (AAPL, USD).`,
      );
      expect(mockShell.queryShellPost).not.toHaveBeenCalled();
    },
  );

  it("passes account and grouping through to the composer", async () => {
    answerShell(holdingsRows(), quotes);

    const result = await service.getHoldings({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      conversion: "units",
      account: "Assets:Other",
      groupBy: "commodity",
    });

    expect(result.group_by).toBe("commodity");
    expect(result.groups).toEqual([]);
  });

  it("refuses a non-table shell answer", async () => {
    mockShell.queryShellPost.mockResolvedValue(
      ok({ result: { contents: "empty\n" } }),
    );

    await expect(
      service.getHoldings({ ledgerId: LEDGER_ID, identity: IDENTITY }),
    ).rejects.toThrow("Holdings query returned no table");
  });

  it("refuses an uncompilable account pattern before touching Fava", async () => {
    await expect(
      service.getHoldings({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        account: "([",
      }),
    ).rejects.toThrow("Invalid account filter '(['");
    expect(mockReports.getLedgerOptions).not.toHaveBeenCalled();
  });
});

describe("LedgerFinanceService.getRegister", () => {
  let service: LedgerFinanceService;

  const txnItem = (date: string) => ({
    entry: {
      date,
      entry_hash: `h-${date}`,
      directive_type: "Transaction",
      flag: "*",
      payee: "Store",
      narration: "Goods",
      postings: [
        {
          account: "Assets:Checking",
          units: { number: "-10.00", currency: "USD" },
          cost: null,
        },
        {
          account: "Expenses:Food",
          units: { number: "10.00", currency: "USD" },
          cost: null,
        },
      ],
    },
    change: { USD: "-10.00" },
    balance: { USD: "90.00" },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (authorizeLedger as jest.Mock).mockResolvedValue({
      ledgerRepoId: 1,
      ownerUserId: USER_ID,
    });
    service = new LedgerFinanceService(mockFavaClientFactory as any, {} as any);
    mockReports.getLedgerOptions.mockResolvedValue(
      ok({
        operating_currency: ["USD"],
        name_assets: "Assets",
        name_liabilities: "Liabilities",
        name_equity: "Equity",
        name_income: "Income",
        name_expenses: "Expenses",
      }),
    );
    mockReports.getLedgerPostingsPerAccount.mockResolvedValue(
      ok([
        { account: "Assets:Checking", count: 2 },
        { account: "Expenses:Food", count: 1 },
      ]),
    );
    mockJournal.getJournal.mockResolvedValue(
      ok({ items: [], total: 0, is_empty: true }),
    );
  });

  it("resolves the root and maps rows oldest-first", async () => {
    mockJournal.getAccountJournal.mockResolvedValue(
      ok({
        items: [txnItem("2024-02-01"), txnItem("2024-01-01")],
        total: 2,
        account: "Assets:Checking",
        with_children: true,
      }),
    );

    const result = await service.getRegister({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      account: "Assets:Checking",
    });

    expect(authorizeLedger).toHaveBeenCalledWith(
      IDENTITY,
      LEDGER_ID,
      AUTHORIZATION_ACTIONS.LEDGER_REPORTS_READ,
      expect.anything(),
    );
    expect(mockJournal.getAccountJournal).toHaveBeenCalledWith(
      "testowner",
      "testledger",
      expect.objectContaining({
        account: "Assets:Checking",
        with_children: true,
        conversion: "USD",
        limit: 1000,
        offset: 0,
      }),
    );
    expect(result.account).toBe("Assets:Checking");
    expect(result.rows.map((row) => row.date)).toEqual([
      "2024-01-01",
      "2024-02-01",
    ]);
    // Only the subtree posting rides along.
    expect(result.rows[0]!.postings).toEqual([
      {
        account: "Assets:Checking",
        amount: { number: "-10.00", currency: "USD" },
        cost: null,
      },
    ]);
  });

  it("requires an account", async () => {
    await expect(
      service.getRegister({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        account: "",
      }),
    ).rejects.toThrow("Register needs an account");
    expect(mockJournal.getAccountJournal).not.toHaveBeenCalled();
  });

  // w31/041: whitespace-only account must be refused identically to "" without
  // touching the ledger service.
  it.each(["", "  ", "\t", "\n"])(
    "refuses blank account %p with BAD_USER_INPUT before touching Fava",
    async (account) => {
      const refusal = await service
        .getRegister({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          account,
        })
        .catch((error: unknown) => error);

      expect(refusal).toBeInstanceOf(BadUserInputError);
      expect((refusal as BadUserInputError).metadata).toEqual({
        field: "account",
      });
      expect((refusal as Error).message).toContain("Register needs an account");
      expect(authorizeLedger).not.toHaveBeenCalled();
      expect(mockFavaClientFactory.getPublicApiClient).not.toHaveBeenCalled();
      expect(mockReports.getLedgerOptions).not.toHaveBeenCalled();
      expect(mockReports.getLedgerPostingsPerAccount).not.toHaveBeenCalled();
      expect(mockJournal.getAccountJournal).not.toHaveBeenCalled();
    },
  );

  it("refuses an uncompilable account pattern before touching Fava", async () => {
    await expect(
      service.getRegister({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        account: "([",
      }),
    ).rejects.toThrow("Invalid account filter '(['");
    expect(mockJournal.getAccountJournal).not.toHaveBeenCalled();
  });

  it("refuses a pattern spanning several trees", async () => {
    await expect(
      service.getRegister({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        account: "e",
      }),
    ).rejects.toThrow("Register needs one account; 'e' matches several");
    expect(mockJournal.getAccountJournal).not.toHaveBeenCalled();
  });

  it("answers null with no rows when nothing matches", async () => {
    const result = await service.getRegister({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      account: "Assets:Nope",
    });

    expect(result).toEqual({ account: null, rows: [] });
    expect(mockJournal.getAccountJournal).not.toHaveBeenCalled();
  });

  it("answers null when the resolved root has no rows", async () => {
    mockReports.getLedgerPostingsPerAccount.mockResolvedValue(
      ok([{ account: "Assets:Checking", count: 1 }]),
    );
    mockJournal.getAccountJournal.mockResolvedValue(
      ok({
        items: [],
        total: 0,
        account: "Assets:Checking",
        with_children: true,
      }),
    );

    const result = await service.getRegister({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      account: "Assets:Checking",
    });

    expect(result).toEqual({ account: null, rows: [] });
  });

  it("pages the journal to the total", async () => {
    mockJournal.getAccountJournal
      .mockResolvedValueOnce(
        ok({
          items: [txnItem("2024-02-01")],
          total: 2,
          account: "Assets:Checking",
          with_children: true,
        }),
      )
      .mockResolvedValueOnce(
        ok({
          items: [txnItem("2024-01-01")],
          total: 2,
          account: "Assets:Checking",
          with_children: true,
        }),
      );

    const result = await service.getRegister({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      account: "Assets:Checking",
    });

    expect(mockJournal.getAccountJournal).toHaveBeenCalledTimes(2);
    expect(result.rows.map((row) => row.date)).toEqual([
      "2024-01-01",
      "2024-02-01",
    ]);
  });

  it("forwards time to every source and omits conversion without one target", async () => {
    mockReports.getLedgerOptions.mockResolvedValue(
      ok({
        operating_currency: ["USD", "EUR"],
        name_assets: "Assets",
        name_liabilities: "Liabilities",
        name_equity: "Equity",
        name_income: "Income",
        name_expenses: "Expenses",
      }),
    );
    mockJournal.getAccountJournal.mockResolvedValue(
      ok({
        items: [txnItem("2024-01-01")],
        total: 1,
        account: "Assets:Checking",
        with_children: true,
      }),
    );

    await service.getRegister({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      account: "Assets:Checking",
      time: "2024",
    });

    expect(mockReports.getLedgerPostingsPerAccount).toHaveBeenCalledWith(
      "testowner",
      "testledger",
      { time: "2024" },
    );
    expect(mockJournal.getJournal).toHaveBeenCalledWith(
      "testowner",
      "testledger",
      expect.objectContaining({ time: "2024" }),
    );
    expect(mockJournal.getAccountJournal).toHaveBeenCalledWith(
      "testowner",
      "testledger",
      expect.objectContaining({ time: "2024" }),
    );
    // Unconverted is sent as `units`: omitted, the ledger fell back to
    // `at_cost` and the register answered cost totals (w1/204).
    expect(mockJournal.getAccountJournal).toHaveBeenCalledWith(
      "testowner",
      "testledger",
      expect.objectContaining({ conversion: "units" }),
    );
  });

  it("sends an explicit units as units, not as no conversion", async () => {
    mockReports.getLedgerOptions.mockResolvedValue(
      ok({
        operating_currency: ["USD"],
        name_assets: "Assets",
        name_liabilities: "Liabilities",
        name_equity: "Equity",
        name_income: "Income",
        name_expenses: "Expenses",
      }),
    );
    mockJournal.getAccountJournal.mockResolvedValue(
      ok({
        items: [txnItem("2024-01-01")],
        total: 1,
        account: "Assets:Checking",
        with_children: true,
      }),
    );
    for (const [conversion, sent] of [
      ["units", "units"],
      ["Units", "units"],
      ["at_cost", "at_cost"],
    ]) {
      await service.getRegister({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        account: "Assets:Checking",
        conversion,
      });
      expect(mockJournal.getAccountJournal).toHaveBeenLastCalledWith(
        "testowner",
        "testledger",
        expect.objectContaining({ conversion: sent }),
      );
    }
  });

  // w31/039: an early return when no account matches or the time window is
  // empty must still reject invalid conversions instead of returning empty.
  it.each(["BOGUS", "usd", "EUR"])(
    "refuses unknown conversion %p even when no account matches",
    async (conversion) => {
      mockReports.getLedgerCurrencies.mockResolvedValue(ok(["USD"]));
      mockReports.getLedgerCommodities.mockResolvedValue(ok([]));

      const refusal = await service
        .getRegister({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          account: "Assets:NoSuchAcct",
          conversion,
        })
        .catch((error: unknown) => error);

      expect(refusal).toBeInstanceOf(BadUserInputError);
      expect((refusal as Error).message).toBe(
        `Unsupported conversion "${conversion}": pass "units", "at_cost", "at_value", "units_by_cost", or a currency in this ledger (USD).`,
      );
      expect(mockJournal.getAccountJournal).not.toHaveBeenCalled();
    },
  );

  it.each(["BOGUS", "USD,EUR"])(
    "refuses invalid conversion %p on an existing account with an empty time window",
    async (conversion) => {
      mockReports.getLedgerPostingsPerAccount.mockResolvedValue(ok([]));
      mockReports.getLedgerCurrencies.mockResolvedValue(ok(["USD"]));
      mockReports.getLedgerCommodities.mockResolvedValue(ok([]));

      await expect(
        service.getRegister({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          account: "Assets:Checking",
          time: "1999",
          conversion,
        }),
      ).rejects.toBeInstanceOf(BadUserInputError);
      expect(mockJournal.getAccountJournal).not.toHaveBeenCalled();
    },
  );

  it.each(["units", "at_cost", "at_value", "units_by_cost", "USD", "CAD"])(
    "still answers null with no rows for valid conversion %p when nothing matches",
    async (conversion) => {
      mockReports.getLedgerCurrencies.mockResolvedValue(ok(["USD", "CAD"]));
      mockReports.getLedgerCommodities.mockResolvedValue(ok([]));

      const result = await service.getRegister({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        account: "Assets:NoSuchAcct",
        conversion,
      });

      expect(result).toEqual({ account: null, rows: [] });
      expect(mockJournal.getAccountJournal).not.toHaveBeenCalled();
    },
  );
});

describe("LedgerFinanceService.getCapitalGains", () => {
  let service: LedgerFinanceService;

  const lot = { number: "100.00", currency: "USD", date: "2023-01-10" };
  const move = (date: string, number: string, price: string | null) => ({
    date,
    entry_hash: `h-${date}`,
    directive_type: "Transaction",
    flag: "*",
    postings: [
      {
        account: "Assets:Broker",
        units: { number, currency: "HOOL" },
        cost: lot,
        price: price === null ? null : { number: price, currency: "USD" },
      },
    ],
  });
  const buy = move("2023-01-10", "20", null);
  const sale = (date: string) => move(date, "-10", "150.00");

  beforeEach(() => {
    jest.clearAllMocks();
    (authorizeLedger as jest.Mock).mockResolvedValue({
      ledgerRepoId: 1,
      ownerUserId: USER_ID,
    });
    service = new LedgerFinanceService(mockFavaClientFactory as any, {} as any);
    mockReports.getLedgerOptions.mockResolvedValue(
      ok({
        operating_currency: ["USD"],
        name_assets: "Assets",
        name_liabilities: "Liabilities",
        name_equity: "Equity",
        name_income: "Income",
        name_expenses: "Expenses",
      }),
    );
  });

  it("composes closed lots from the journal", async () => {
    mockJournal.getJournal.mockResolvedValue(
      ok({ items: [sale("2024-03-15"), buy], total: 2, is_empty: false }),
    );

    const result = await service.getCapitalGains({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
    });

    expect(authorizeLedger).toHaveBeenCalledWith(
      IDENTITY,
      LEDGER_ID,
      AUTHORIZATION_ACTIONS.LEDGER_REPORTS_READ,
      expect.anything(),
    );
    expect(mockJournal.getJournal).toHaveBeenCalledWith(
      "testowner",
      "testledger",
      expect.objectContaining({ limit: 1000, offset: 0 }),
    );
    expect(result.rows).toEqual([
      {
        account: "Assets:Broker",
        commodity: "HOOL",
        acquired: "2023-01-10",
        sold: "2024-03-15",
        held_days: 430,
        long_held: true,
        quantity: { number: "10", currency: "HOOL" },
        proceeds: { number: "1500", currency: "USD" },
        basis: { number: "1000", currency: "USD" },
        gain: { number: "500", currency: "USD" },
      },
    ]);
    expect(result.totals.more_than_one_year).toEqual({ USD: "500" });
  });

  it("refuses bad bounds and patterns before touching Fava", async () => {
    await expect(
      service.getCapitalGains({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        fromDate: "2024-13-01",
      }),
    ).rejects.toThrow("Invalid from-date '2024-13-01'. Use YYYY-MM-DD.");
    await expect(
      service.getCapitalGains({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        account: "([",
      }),
    ).rejects.toThrow("Invalid account filter '(['");
    expect(mockJournal.getJournal).not.toHaveBeenCalled();
    expect(mockReports.getLedgerOptions).not.toHaveBeenCalled();
  });

  it("pages the whole journal and narrows the rows to time's window", async () => {
    // Newest first over two pages; the lot opens before the window.
    const whole = [sale("2024-03-15"), sale("2023-03-15"), buy];
    mockJournal.getJournal.mockImplementation(
      async (_owner: string, _name: string, query: Record<string, unknown>) =>
        query.time === undefined
          ? ok({
              items: whole.slice(
                Number(query.offset),
                Number(query.offset) + 2,
              ),
              total: whole.length,
              is_empty: false,
            })
          : ok({ items: [sale("2024-03-15")], total: 1, is_empty: false }),
    );

    const result = await service.getCapitalGains({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      time: "2024",
    });

    const queries = mockJournal.getJournal.mock.calls.map(([, , query]) => [
      query.time,
      query.offset,
    ]);
    expect(queries).toEqual(
      expect.arrayContaining([
        [undefined, 0],
        [undefined, 2],
        ["2024", 0],
      ]),
    );
    expect(queries).toHaveLength(3);
    expect(result.rows.map((row) => [row.sold, row.basis.number])).toEqual([
      ["2024-03-15", "1000"],
    ]);
  });
});
