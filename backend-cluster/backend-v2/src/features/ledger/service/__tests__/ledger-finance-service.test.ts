import { LedgerFinanceService } from "../ledger-finance-service";
import { authorizeLedger } from "@/features/ledger/utils/authorize-ledger";
import { AUTHORIZATION_ACTIONS } from "@/server/api/authorization/authorization-contract";
import type { Identity } from "@/server/api/identity";

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
};
const mockShell = {
  queryShell: jest.fn(),
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
  "market_value",
  "price",
  "conv_rate",
].map((name) => ({ name, dtype: "str" }));

const table = (rows: unknown[][]) => ({ result: { types: COLUMNS, rows } });

describe("LedgerFinanceService.getHoldings", () => {
  let service: LedgerFinanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    (authorizeLedger as jest.Mock).mockResolvedValue({
      ledgerRepoId: 1,
      ownerUserId: USER_ID,
    });
    service = new LedgerFinanceService(
      mockFavaClientFactory as any,
      {} as any,
    );
    mockReports.getLedgerOptions.mockResolvedValue(
      ok({ operating_currency: ["USD"] }),
    );
  });

  const holdingsRows = () => [
    [
      "Assets:Broker:AAPL",
      "AAPL",
      "USD",
      { AAPL: "10" },
      { USD: "1500.00" },
      { USD: "1800.00" },
      "180.00",
      "0.92",
    ],
  ];

  it("authorizes as a reports read and composes groups", async () => {
    mockShell.queryShell.mockResolvedValue(ok(table(holdingsRows())));

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
    // No conversion leg without a target.
    expect(mockShell.queryShell).toHaveBeenCalledWith(
      "testowner",
      "testledger",
      { query: expect.not.stringContaining("conv_rate") },
    );
  });

  it("defaults conversion to one operating currency", async () => {
    mockShell.queryShell.mockResolvedValue(ok(table(holdingsRows())));

    const result = await service.getHoldings({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
    });

    // The target is resolved before any row is seen, so the leg is always
    // quoted; USD-held lots skip it per row.
    expect(mockShell.queryShell).toHaveBeenCalledWith(
      "testowner",
      "testledger",
      { query: expect.stringContaining('getprice(cost_currency, "USD"') },
    );
    expect(result.groups[0]!.cost_basis.currency).toBe("USD");
  });

  it("quotes an explicit target through the conversion leg", async () => {
    mockShell.queryShell.mockResolvedValue(ok(table(holdingsRows())));

    const result = await service.getHoldings({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      conversion: "EUR",
    });

    expect(mockShell.queryShell).toHaveBeenCalledWith(
      "testowner",
      "testledger",
      { query: expect.stringContaining('getprice(cost_currency, "EUR"') },
    );
    expect(result.groups[0]).toMatchObject({
      cost_basis: { number: "1380", currency: "EUR" },
      market_value: { number: "1656", currency: "EUR" },
    });
  });

  it("passes account and grouping through to the composer", async () => {
    mockShell.queryShell.mockResolvedValue(ok(table(holdingsRows())));

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
    mockShell.queryShell.mockResolvedValue(ok({ result: { contents: "empty\n" } }));

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
    service = new LedgerFinanceService(
      mockFavaClientFactory as any,
      {} as any,
    );
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
      service.getRegister({ ledgerId: LEDGER_ID, identity: IDENTITY, account: "" }),
    ).rejects.toThrow("Register needs an account");
    expect(mockJournal.getAccountJournal).not.toHaveBeenCalled();
  });

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
      service.getRegister({ ledgerId: LEDGER_ID, identity: IDENTITY, account: "e" }),
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
      ok({ items: [], total: 0, account: "Assets:Checking", with_children: true }),
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
    expect(mockJournal.getAccountJournal).toHaveBeenCalledWith(
      "testowner",
      "testledger",
      expect.not.objectContaining({ conversion: expect.anything() }),
    );
  });
});

describe("LedgerFinanceService.getCapitalGains", () => {
  let service: LedgerFinanceService;

  const sale = (date: string) => ({
    date,
    entry_hash: `h-${date}`,
    directive_type: "Transaction",
    flag: "*",
    postings: [
      {
        account: "Assets:Broker",
        units: { number: "-10", currency: "HOOL" },
        cost: { number: "100.00", currency: "USD", date: "2023-01-10" },
        price: { number: "150.00", currency: "USD" },
      },
    ],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (authorizeLedger as jest.Mock).mockResolvedValue({
      ledgerRepoId: 1,
      ownerUserId: USER_ID,
    });
    service = new LedgerFinanceService(
      mockFavaClientFactory as any,
      {} as any,
    );
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
      ok({ items: [sale("2024-03-15")], total: 1, is_empty: false }),
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

  it("pages the journal and forwards time", async () => {
    mockJournal.getJournal
      .mockResolvedValueOnce(
        ok({ items: [sale("2024-03-15")], total: 2, is_empty: false }),
      )
      .mockResolvedValueOnce(
        ok({ items: [sale("2023-03-15")], total: 2, is_empty: false }),
      );

    const result = await service.getCapitalGains({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      time: "2023 - 2024",
    });

    expect(mockJournal.getJournal).toHaveBeenCalledTimes(2);
    expect(mockJournal.getJournal).toHaveBeenCalledWith(
      "testowner",
      "testledger",
      expect.objectContaining({ time: "2023 - 2024" }),
    );
    expect(result.rows.map((row) => row.sold)).toEqual([
      "2023-03-15",
      "2024-03-15",
    ]);
  });
});
