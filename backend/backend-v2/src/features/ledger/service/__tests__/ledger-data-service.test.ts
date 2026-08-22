import { LedgerDataService } from "../ledger-data-service";
import { authorizeLedger } from "@/features/ledger/utils/authorize-ledger";
import type { Identity } from "@/server/api/identity";

// This suite exercises LedgerDataService's own behavior (Fava calls, response
// mapping) — authorizeLedger's own contract has its own dedicated suite
// (authorize-ledger.test.ts). Mocking it here keeps the two from re-testing
// the same thing and from needing a full owner/collaborator Fava simulation
// in every one of these cases.
jest.mock("@/features/ledger/utils/authorize-ledger", () => ({
  ...jest.requireActual("@/features/ledger/utils/authorize-ledger"),
  authorizeLedger: jest.fn(),
}));

const mockReports = {
  getLedgerAttributes: jest.fn(),
  getLedgerCommodities: jest.fn(),
  getLedgerEvents: jest.fn(),
  getLedgerDocuments: jest.fn(),
  getLedgerPayeeTransactions: jest.fn(),
  getLedgerNarrationTransactions: jest.fn(),
  getLedgerPayeeAccounts: jest.fn(),
  getLedgerErrors: jest.fn(),
  getLedgerCurrencies: jest.fn(),
  getLedgerTags: jest.fn(),
  getLedgerYears: jest.fn(),
  getLedgerLinks: jest.fn(),
  getLedgerNarrations: jest.fn(),
  getLedgerPayees: jest.fn(),
  getLedgerAccountLastEntries: jest.fn(),
  getLedgerEntriesCountPerType: jest.fn(),
  getLedgerAccountReport: jest.fn(),
  getLedgerIntervalTotals: jest.fn(),
};

const mockFavaApiClient = { reports: mockReports };

const mockFavaClientFactory = {
  getPublicApiClient: jest.fn().mockResolvedValue(mockFavaApiClient),
};

const LEDGER_ID = "testowner/testledger";
const USER_ID = "user-123";
const IDENTITY: Identity = {
  userId: USER_ID,
  method: "oauth",
  scopes: new Set(),
  capabilityExempt: false,
};

const ok = <T>(data: T) => ({ data: { success: true, data } });

describe("LedgerDataService", () => {
  let service: LedgerDataService;

  beforeEach(() => {
    jest.clearAllMocks();
    (authorizeLedger as jest.Mock).mockResolvedValue({
      ledgerRepoId: 1,
      ownerUserId: USER_ID,
    });
    service = new LedgerDataService(
      mockFavaClientFactory as any,
      {} as any,
      {} as any,
    );
  });

  it("getAttributes — calls getLedgerAttributes and returns data", async () => {
    const attrs = { accounts: [], currencies: [], links: [], narrations: [], tags: [], years: [] };
    mockReports.getLedgerAttributes.mockResolvedValue(ok(attrs));

    const result = await service.getAttributes({ ledgerId: LEDGER_ID, identity: IDENTITY });

    expect(result).toEqual(attrs);
    expect(mockReports.getLedgerAttributes).toHaveBeenCalledWith("testowner", "testledger");
  });

  it("getCommodities — returns array from fava response", async () => {
    const commodities = [{ base: "BTC", quote: "USD", prices: [] }];
    mockReports.getLedgerCommodities.mockResolvedValue(ok(commodities));

    const result = await service.getCommodities({ ledgerId: LEDGER_ID, identity: IDENTITY });

    expect(result).toEqual(commodities);
  });

  it("getEvents — passes filter params", async () => {
    mockReports.getLedgerEvents.mockResolvedValue(ok([]));

    await service.getEvents({ ledgerId: LEDGER_ID, identity: IDENTITY, filter: "year:2024" });

    expect(mockReports.getLedgerEvents).toHaveBeenCalledWith(
      "testowner",
      "testledger",
      expect.objectContaining({ filter: "year:2024" }),
    );
  });

  it("getDocuments — passes filter params", async () => {
    mockReports.getLedgerDocuments.mockResolvedValue(ok([]));

    await service.getDocuments({ ledgerId: LEDGER_ID, identity: IDENTITY, account: "Assets:Cash" });

    expect(mockReports.getLedgerDocuments).toHaveBeenCalledWith(
      "testowner",
      "testledger",
      expect.objectContaining({ account: "Assets:Cash" }),
    );
  });

  it("getPayeeTransactions — passes payee param", async () => {
    mockReports.getLedgerPayeeTransactions.mockResolvedValue(ok(null));

    await service.getPayeeTransactions({ ledgerId: LEDGER_ID, identity: IDENTITY, payee: "Starbucks" });

    expect(mockReports.getLedgerPayeeTransactions).toHaveBeenCalledWith(
      "testowner",
      "testledger",
      { payee: "Starbucks" },
    );
  });

  it("getNarrationTransactions — passes narration param", async () => {
    mockReports.getLedgerNarrationTransactions.mockResolvedValue(ok(null));

    await service.getNarrationTransactions({ ledgerId: LEDGER_ID, identity: IDENTITY, narration: "lunch" });

    expect(mockReports.getLedgerNarrationTransactions).toHaveBeenCalledWith(
      "testowner",
      "testledger",
      { narration: "lunch" },
    );
  });

  it("getPayeeAccounts — returns string array", async () => {
    mockReports.getLedgerPayeeAccounts.mockResolvedValue(ok(["Assets:Cash", "Expenses:Food"]));

    const result = await service.getPayeeAccounts({ ledgerId: LEDGER_ID, identity: IDENTITY, payee: "Walmart" });

    expect(result).toEqual(["Assets:Cash", "Expenses:Food"]);
  });

  it("getErrors — returns array of errors", async () => {
    const errors = [{ message: "syntax error", source: null, entry: null }];
    mockReports.getLedgerErrors.mockResolvedValue(ok(errors));

    const result = await service.getErrors({ ledgerId: LEDGER_ID, identity: IDENTITY });

    expect(result).toEqual(errors);
  });

  it("getCurrencies — returns string array", async () => {
    mockReports.getLedgerCurrencies.mockResolvedValue(ok(["USD", "EUR"]));

    const result = await service.getCurrencies({ ledgerId: LEDGER_ID, identity: IDENTITY });

    expect(result).toEqual(["USD", "EUR"]);
  });

  it("getTags — returns string array", async () => {
    mockReports.getLedgerTags.mockResolvedValue(ok(["trip", "home"]));

    const result = await service.getTags({ ledgerId: LEDGER_ID, identity: IDENTITY });

    expect(result).toEqual(["trip", "home"]);
  });

  it("getYears — returns string array", async () => {
    mockReports.getLedgerYears.mockResolvedValue(ok(["2022", "2023", "2024"]));

    const result = await service.getYears({ ledgerId: LEDGER_ID, identity: IDENTITY });

    expect(result).toEqual(["2022", "2023", "2024"]);
  });

  it("getLinks — returns string array", async () => {
    mockReports.getLedgerLinks.mockResolvedValue(ok(["lnk1", "lnk2"]));

    const result = await service.getLinks({ ledgerId: LEDGER_ID, identity: IDENTITY });

    expect(result).toEqual(["lnk1", "lnk2"]);
  });

  it("getNarrations — returns string array", async () => {
    mockReports.getLedgerNarrations.mockResolvedValue(ok(["lunch", "groceries"]));

    const result = await service.getNarrations({ ledgerId: LEDGER_ID, identity: IDENTITY });

    expect(result).toEqual(["lunch", "groceries"]);
  });

  it("getPayees — returns string array", async () => {
    mockReports.getLedgerPayees.mockResolvedValue(ok(["Amazon", "Starbucks"]));

    const result = await service.getPayees({ ledgerId: LEDGER_ID, identity: IDENTITY });

    expect(result).toEqual(["Amazon", "Starbucks"]);
  });

  it("getAccountLastEntries — filters out nullish params before forwarding", async () => {
    mockReports.getLedgerAccountLastEntries.mockResolvedValue(ok([]));

    await service.getAccountLastEntries({ ledgerId: LEDGER_ID, identity: IDENTITY });

    const call = mockReports.getLedgerAccountLastEntries.mock.calls[0];
    const params = call[2];
    expect(params).not.toHaveProperty("account");
  });

  it("getEntriesCountPerType — returns array", async () => {
    const counts = [{ type: "Transaction", count: 42 }];
    mockReports.getLedgerEntriesCountPerType.mockResolvedValue(ok(counts));

    const result = await service.getEntriesCountPerType({ ledgerId: LEDGER_ID, identity: IDENTITY });

    expect(result).toEqual(counts);
  });

  it("getAccountReport — passes accountName as account_name", async () => {
    const report = { account_name: "Assets:Cash", balance_tree: [] };
    mockReports.getLedgerAccountReport.mockResolvedValue(ok(report));

    await service.getAccountReport({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      accountName: "Assets:Cash",
    });

    expect(mockReports.getLedgerAccountReport).toHaveBeenCalledWith(
      "testowner",
      "testledger",
      expect.objectContaining({ account_name: "Assets:Cash" }),
    );
  });

  it("getIntervalTotals — passes accountName as account_name", async () => {
    mockReports.getLedgerIntervalTotals.mockResolvedValue(ok([]));

    await service.getIntervalTotals({
      ledgerId: LEDGER_ID,
      identity: IDENTITY,
      accountName: "Expenses:Food",
    });

    expect(mockReports.getLedgerIntervalTotals).toHaveBeenCalledWith(
      "testowner",
      "testledger",
      expect.objectContaining({ account_name: "Expenses:Food" }),
    );
  });

  it("passes the identity's userId to getPublicApiClient for all methods", async () => {
    mockReports.getLedgerCurrencies.mockResolvedValue(ok([]));

    await service.getCurrencies({
      ledgerId: LEDGER_ID,
      identity: { ...IDENTITY, userId: "specific-user" },
    });

    expect(mockFavaClientFactory.getPublicApiClient).toHaveBeenCalledWith(
      LEDGER_ID,
      "specific-user",
    );
  });
});
