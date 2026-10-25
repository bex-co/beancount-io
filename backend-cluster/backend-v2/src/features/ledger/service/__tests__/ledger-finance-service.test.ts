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
};
const mockShell = {
  queryShell: jest.fn(),
};
const mockFavaApiClient = { reports: mockReports, shell: mockShell };
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
});
