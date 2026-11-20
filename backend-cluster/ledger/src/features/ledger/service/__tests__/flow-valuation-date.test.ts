import BigNumber from "bignumber.js";
import type { DirectiveJson } from "@rustledger/wasm";
import type { SerializableTreeNodePublic } from "@/foundation/ledger-api-types";
import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { parseLedgerFiles } from "@/foundation/rustledger";
import { LedgerFinanceService } from "../ledger-finance-service";

/**
 * w1/m49: under a currency conversion the income statement valued its trees
 * at the as-of rate and its interval rows at each interval's end. With EUR at
 * 1.00 USD for January's trip and 2.00 USD for February's, the trees read
 * Travel 400 USD above monthly rows of 100 + 200, and a yearly row read 400.
 * Every income and expenses posting is now valued on its own date, in the
 * trees and the rows alike, as `bea` does.
 */
jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));
jest.mock("@/foundation/rustledger", () => ({
  ...jest.requireActual("@/foundation/rustledger"),
  parseLedgerFiles: jest.fn(),
}));

type Tree = SerializableTreeNodePublic;
type Posting = Extract<DirectiveJson, { type: "transaction" }>["postings"][0];
const params = { ledgerId: "synthetic/travel", userId: "synthetic-user" };
const factory = { getPublicApiClient: jest.fn().mockResolvedValue({}) };

const open = (account: string): DirectiveJson => ({
  type: "open",
  date: "2026-01-01",
  account,
  currencies: [],
});
const txn = (date: string, postings: Posting[]): DirectiveJson => ({
  type: "transaction",
  date,
  flag: "*",
  narration: "synthetic",
  tags: [],
  links: [],
  postings,
});
const units = (account: string, number: string, currency: string): Posting => ({
  account,
  units: { number, currency },
});
const price = (
  date: string,
  currency: string,
  number: string,
): DirectiveJson => ({
  type: "price",
  date,
  currency,
  amount: { number, currency: "USD" },
});
const trip = (date: string): DirectiveJson =>
  txn(date, [
    units("Expenses:Travel", "100.00", "EUR"),
    units("Assets:Euro", "-100.00", "EUR"),
  ]);

/** w1/336's repro: EUR at 1.00 USD for the first trip, 2.00 USD for the second. */
const TRAVEL: DirectiveJson[] = [
  ...["Assets:Euro", "Expenses:Travel", "Equity:Opening"].map(open),
  price("2026-01-01", "EUR", "1.00"),
  txn("2026-01-02", [
    units("Assets:Euro", "1000.00", "EUR"),
    units("Equity:Opening", "-1000.00", "EUR"),
  ]),
  trip("2026-01-15"),
  price("2026-02-01", "EUR", "2.00"),
  trip("2026-02-15"),
];

/** The same trips with a rate that never moves: a working control. */
const STEADY = TRAVEL.filter(
  (directive) => directive.type !== "price" || directive.date !== "2026-02-01",
);

/** A gift of shares held at cost, quoted 500 on its day and 600 by the end. */
const CHARITY: DirectiveJson[] = [
  ...["Assets:Broker", "Assets:Cash", "Expenses:Charity", "Equity:Opening"].map(
    open,
  ),
  txn("2026-01-02", [
    units("Assets:Cash", "4000", "USD"),
    units("Equity:Opening", "-4000", "USD"),
  ]),
  txn("2026-01-03", [
    {
      ...units("Assets:Broker", "10", "VOO"),
      cost: { number: { kind: "per_unit", value: "400" }, currency: "USD" },
    },
    units("Assets:Cash", "-4000", "USD"),
  ]),
  price("2026-02-01", "VOO", "500"),
  txn("2026-02-10", [
    {
      ...units("Expenses:Charity", "5", "VOO"),
      cost: { number: { kind: "per_unit", value: "400" }, currency: "USD" },
    },
    {
      ...units("Assets:Broker", "-5", "VOO"),
      cost: { number: { kind: "per_unit", value: "400" }, currency: "USD" },
    },
  ]),
  price("2026-03-01", "VOO", "600"),
];

function configure(directives: DirectiveJson[]) {
  jest.mocked(loadCachedFileMapForRepo).mockResolvedValue({
    files: { "main.bean": 'option "operating_currency" "USD"\n' },
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
    options: { operating_currencies: ["USD"], title: null },
    directives,
    directiveCount: directives.length,
  });
}

const finance = () => new LedgerFinanceService(factory as never, {} as never);

function balanceOf(node: Tree, account: string): Record<string, string> {
  if (node.account === account) return node.balance_children;
  for (const child of node.children) {
    const found = balanceOf(child, account);
    if (Object.keys(found).length > 0) return found;
  }
  return {};
}

/** Each row's amount in `currency`, as exact numbers. */
const amounts = (
  rows: Array<{ balance: Record<string, string> }>,
  currency: string,
) => rows.map((row) => new BigNumber(row.balance[currency] ?? "0").toNumber());

const total = (rows: Array<{ balance: Record<string, string> }>) =>
  amounts(rows, "USD").reduce((left, right) => left + right, 0);

beforeEach(() => jest.clearAllMocks());

describe("income and expenses are valued on their own date (w1/m49)", () => {
  it.each([
    { interval: "month", rows: [100, 200] },
    { interval: "week", rows: [100, 200] },
    { interval: "year", rows: [300] },
  ])(
    "reads 300 USD in the trees and the $interval rows",
    async ({ interval, rows }) => {
      configure(TRAVEL);
      const statement = await finance().getIncomeStatement({
        ...params,
        interval,
      });

      expect(
        balanceOf(statement.expenses_hierarchy_data, "Expenses:Travel"),
      ).toEqual({ USD: "300.0000" });
      // Quiet weeks read nothing; each trip's row is worth its own day's rate.
      expect(amounts(statement.expenses_data, "USD").filter(Boolean)).toEqual(
        rows,
      );
      expect(total(statement.net_profit_data)).toBe(300);
      expect(
        statement.expenses_data
          .map((row) =>
            new BigNumber(
              row.account_balances["Expenses:Travel"]?.USD ?? "0",
            ).toNumber(),
          )
          .filter(Boolean),
      ).toEqual(rows);
    },
  );

  it("gives the overview the same trees and rows", async () => {
    configure(TRAVEL);
    const overview = await finance().getOverview(params);

    expect(balanceOf(overview.expenses_hierarchy_data, "Expenses")).toEqual({
      USD: "300.0000",
    });
    expect(amounts(overview.expenses_interval_data, "USD")).toEqual([100, 200]);
    // Balances keep the as-of rate: 800 EUR at 2.00 USD.
    expect(balanceOf(overview.assets_hierarchy_data, "Assets")).toEqual({
      USD: "1600.0000",
    });
  });

  it("moves the translation into the trial balance's valuation line", async () => {
    configure(TRAVEL);
    const report = await finance().getTrialBalance(params);

    expect(balanceOf(report.expenses_hierarchy_data, "Expenses")).toEqual({
      USD: "300.0000",
    });
    expect(balanceOf(report.assets_hierarchy_data, "Assets")).toEqual({
      USD: "1600.0000",
    });
    expect(balanceOf(report.equity_hierarchy_data, "Equity")).toEqual({
      USD: "-2000.0000",
    });
    expect(
      new BigNumber(report.valuation_adjustment?.USD ?? "NaN").toNumber(),
    ).toBe(100);
  });

  it("values a period's flows the same way, and splits its equity alike", async () => {
    configure(TRAVEL);
    const february = await finance().getIncomeStatement({
      ...params,
      time: "2026-02",
    });
    const report = await finance().getTrialBalance({
      ...params,
      time: "2026-02",
    });

    expect(
      balanceOf(february.expenses_hierarchy_data, "Expenses:Travel"),
    ).toEqual({ USD: "200.0000" });
    expect(balanceOf(report.expenses_hierarchy_data, "Expenses")).toEqual({
      USD: "200.0000",
    });
    // January's trip is an earlier period's earnings, an equity balance at the
    // as-of rate (100 EUR at 2.00), and February's trip was paid at that rate,
    // so nothing is left to translate.
    expect(
      balanceOf(report.equity_hierarchy_data, "Equity:Earnings:Previous"),
    ).toEqual({ USD: "200.0000" });
    expect(report.valuation_adjustment).toEqual({});
  });

  it("reads as before when the rate never moves", async () => {
    configure(STEADY);
    const statement = await finance().getIncomeStatement(params);
    const report = await finance().getTrialBalance(params);

    expect(
      balanceOf(statement.expenses_hierarchy_data, "Expenses:Travel"),
    ).toEqual({ USD: "200.0000" });
    expect(amounts(statement.expenses_data, "USD")).toEqual([100, 100]);
    expect(report.valuation_adjustment).toEqual({});
  });

  it.each(["units", "at_cost"])(
    "leaves %s untouched: 200 EUR above 100 + 100",
    async (conversion) => {
      configure(TRAVEL);
      const statement = await finance().getIncomeStatement({
        ...params,
        conversion,
      });

      expect(
        balanceOf(statement.expenses_hierarchy_data, "Expenses:Travel"),
      ).toEqual({ EUR: "200.00" });
      expect(amounts(statement.expenses_data, "EUR")).toEqual([100, 100]);
    },
  );

  it.each(["USD", "at_value"])(
    "values shares given away at their price on the day, under %s",
    async (conversion) => {
      configure(CHARITY);
      const statement = await finance().getIncomeStatement({
        ...params,
        conversion,
      });

      // 5 VOO at the 2026-02-01 price of 500, not the later 600.
      expect(
        balanceOf(statement.expenses_hierarchy_data, "Expenses:Charity"),
      ).toEqual({ USD: "2500" });
      expect(total(statement.expenses_data)).toBe(2500);
    },
  );

  it("keeps a flow with no price on its day in its own commodity, in the trees and the rows", async () => {
    // The first quote comes after January's trip: no later quote values it.
    configure(TRAVEL.filter((directive) => directive.date !== "2026-01-01"));
    const statement = await finance().getIncomeStatement(params);

    expect(
      balanceOf(statement.expenses_hierarchy_data, "Expenses:Travel"),
    ).toEqual({ EUR: "100.00", USD: "200.0000" });
    expect(statement.expenses_data.map((row) => row.balance)).toEqual([
      { EUR: "100.00" },
      { USD: "200.0000" },
    ]);
  });
});
