import type { DirectiveJson } from "@rustledger/wasm";
import { BadUserInputError } from "@/shared/errors";
import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { parseLedgerFiles } from "@/foundation/rustledger";
import { LedgerDataService } from "../ledger-data-service";
import { LedgerFinanceService } from "../ledger-finance-service";

/**
 * w23/156: unknown `conversion` codes refuse instead of degrading to
 * units figures downstream. The known set comes from the FULL snapshot,
 * so a filter that hides a commodity must not make it refuse.
 */
jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));
jest.mock("@/foundation/rustledger", () => ({
  ...jest.requireActual("@/foundation/rustledger"),
  parseLedgerFiles: jest.fn(),
}));

type Posting = Extract<DirectiveJson, { type: "transaction" }>["postings"][0];
const params = { ledgerId: "synthetic/company", userId: "synthetic-user" };
const factory = { getPublicApiClient: jest.fn().mockResolvedValue({}) };

const open = (account: string): DirectiveJson => ({
  type: "open",
  date: "2024-01-01",
  account,
  currencies: [],
});
const txn = (date: string, postings: Posting[]): DirectiveJson => ({
  type: "transaction",
  date,
  flag: "*",
  narration: "QA",
  tags: [],
  links: [],
  postings,
});
const units = (account: string, number: string, currency: string): Posting => ({
  account,
  units: { number, currency },
});

function configure(directives: DirectiveJson[], operatingCurrencies = ["USD"]) {
  jest.mocked(loadCachedFileMapForRepo).mockResolvedValue({
    files: {
      "main.bean": operatingCurrencies
        .map((currency) => `option "operating_currency" "${currency}"\n`)
        .join(""),
    },
    entryPoint: "main.bean",
    repoPaths: ["main.bean"],
    sourceFiles: ["main.bean"],
    managedPrices: [],
    managedPricePaths: [],
    ref: "HEAD",
  });
  jest.mocked(parseLedgerFiles).mockResolvedValue({
    valid: true,
    errors: [],
    options: { operating_currencies: operatingCurrencies, title: null },
    directives,
    directiveCount: directives.length,
  });
}

const finance = () => new LedgerFinanceService(factory as never, {} as never);
const data = () => new LedgerDataService(factory as never, {} as never);

const LEDGER: DirectiveJson[] = [
  ...["Assets:Usd", "Assets:Eur", "Equity:Open"].map(open),
  txn("2024-01-02", [
    units("Assets:Usd", "1000", "USD"),
    units("Equity:Open", "-1000", "USD"),
  ]),
  txn("2024-01-03", [
    units("Assets:Eur", "100", "EUR"),
    units("Equity:Open", "-100", "EUR"),
  ]),
];

describe("report conversion validation", () => {
  beforeEach(() => configure(LEDGER));

  it.each(["getBalanceSheet", "getTrialBalance"] as const)(
    "%s refuses an unknown conversion",
    async (method) => {
      await expect(
        finance()[method]({ ...params, conversion: "BOGUS" }),
      ).rejects.toThrow(BadUserInputError);
      await expect(
        finance()[method]({ ...params, conversion: "BOGUS" }),
      ).rejects.toThrow('Unsupported conversion "BOGUS"');
    },
  );

  it("refuses a wrong-case code even when the currency exists", async () => {
    await expect(
      finance().getBalanceSheet({ ...params, conversion: "usd" }),
    ).rejects.toThrow(BadUserInputError);
  });

  it("accepts a mode and a known currency", async () => {
    await expect(
      finance().getBalanceSheet({ ...params, conversion: "units" }),
    ).resolves.toBeDefined();
    await expect(
      finance().getBalanceSheet({ ...params, conversion: "EUR" }),
    ).resolves.toBeDefined();
  });

  it("accepts a currency the account filter hides from the stream", async () => {
    // EUR survives only in the filtered-out txn; validating the filtered
    // stream would refuse a convertible target.
    await expect(
      finance().getBalanceSheet({
        ...params,
        account: "Assets:Usd",
        conversion: "EUR",
      }),
    ).resolves.toBeDefined();
  });

  it.each([
    "getOverview",
    "getIncomeStatement",
    "getBalanceSheet",
    "getTrialBalance",
  ] as const)(
    "%s accepts a second operating currency absent from directives",
    async (method) => {
      configure(LEDGER.slice(0, -1), ["USD", "EUR"]);

      await expect(
        finance()[method]({ ...params, conversion: "EUR" }),
      ).resolves.toBeDefined();
    },
  );

  it.each(["getAccountReport", "getIntervalTotals"] as const)(
    "%s accepts a second operating currency absent from directives",
    async (method) => {
      configure(LEDGER.slice(0, -1), ["USD", "EUR"]);

      await expect(
        data()[method]({
          ...params,
          accountName: "Assets:Usd",
          conversion: "EUR",
        }),
      ).resolves.toBeDefined();
    },
  );

  it("keeps unpriced units in their held currency for a declared target", async () => {
    configure(LEDGER.slice(0, -1), ["USD", "EUR"]);
    const report = await finance().getBalanceSheet({
      ...params,
      conversion: "EUR",
    });
    expect(report.assets_hierarchy_data.balance_children).toEqual({
      USD: "1000",
    });
  });
});
