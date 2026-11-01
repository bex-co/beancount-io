import type { DirectiveJson } from "@rustledger/wasm";
import type { SerializableTreeNodePublic } from "@/foundation/ledger-api-types";
import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { parseLedgerFiles } from "@/foundation/rustledger";
import { LedgerDataService } from "../ledger-data-service";
import { LedgerFinanceService } from "../ledger-finance-service";

jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));
jest.mock("@/foundation/rustledger", () => ({
  ...jest.requireActual("@/foundation/rustledger"),
  parseLedgerFiles: jest.fn(),
}));

// `units_by_cost` says, per account, which units are held at a cost in which
// currency and which are held without one — the facts the dashboard and mobile
// valuation disclosures cannot recover from the at_value/at_cost/units maps
// (w4/m58: w4/1031, w21/554, w21/556).

type Tree = SerializableTreeNodePublic;
type Posting = Extract<DirectiveJson, { type: "transaction" }>["postings"][0];
const params = { ledgerId: "synthetic/holdings", userId: "synthetic-user" };
const factory = { getPublicApiClient: jest.fn().mockResolvedValue({}) };

const units = (account: string, number: string, currency: string): Posting => ({
  account,
  units: { number, currency },
});
const atCost = (
  account: string,
  number: string,
  currency: string,
  cost: string,
  costCurrency: string,
): Posting => ({
  ...units(account, number, currency),
  cost: { number: { kind: "per_unit", value: cost }, currency: costCurrency },
});
const transaction = (date: string, postings: Posting[]): DirectiveJson => ({
  type: "transaction",
  date,
  flag: "*",
  narration: "synthetic",
  tags: [],
  links: [],
  postings,
});
const price = (
  date: string,
  currency: string,
  number: string,
  quote: string,
): DirectiveJson => ({
  type: "price",
  date,
  currency,
  amount: { number, currency: quote },
});
const open = (account: string): DirectiveJson => ({
  type: "open",
  date: "2026-01-01",
  account,
  currencies: [],
});

const ACCOUNTS = [
  "Assets:Fund",
  "Assets:Crypto",
  "Assets:Margin",
  "Assets:Mixed",
  "Assets:Sold",
  "Equity:Opening",
];

const DIRECTIVES: DirectiveJson[] = [
  ...ACCOUNTS.map(open),
  // w21/556: EUR cash beside a lot whose cost currency is also EUR.
  transaction("2026-02-01", [
    units("Assets:Fund", "500.00", "EUR"),
    atCost("Assets:Fund", "10", "VTI", "180.00", "EUR"),
    units("Equity:Opening", "-2300.00", "EUR"),
  ]),
  // w21/554: BTC held at a USD cost and also the cost currency of ETH.
  transaction("2026-03-01", [
    atCost("Assets:Crypto", "1", "BTC", "30000.00", "USD"),
    units("Equity:Opening", "-30000.00", "USD"),
  ]),
  transaction("2026-03-02", [
    atCost("Assets:Crypto", "40", "ETH", "0.05", "BTC"),
    units("Equity:Opening", "-2", "BTC"),
  ]),
  // w21/554: margin — a EUR-cost lot beside negative EUR cash.
  transaction("2026-04-01", [
    atCost("Assets:Margin", "10", "VEUR", "50.00", "EUR"),
    units("Assets:Margin", "-400.00", "EUR"),
    units("Equity:Opening", "-100.00", "EUR"),
  ]),
  // One commodity in two cost currencies, then a later purchase the July
  // statement must not see.
  transaction("2026-07-01", [
    atCost("Assets:Mixed", "1", "QAC", "10.00", "EUR"),
    atCost("Assets:Mixed", "2", "QAC", "11.00", "USD"),
    units("Equity:Opening", "-10.00", "EUR"),
    units("Equity:Opening", "-22.00", "USD"),
  ]),
  transaction("2026-08-20", [
    atCost("Assets:Mixed", "3", "QAC", "12.00", "EUR"),
    units("Equity:Opening", "-36.00", "EUR"),
  ]),
  // A lot bought and fully sold nets to zero and must not be reported.
  transaction("2026-05-01", [
    atCost("Assets:Sold", "5", "XYZ", "1.00", "USD"),
    units("Equity:Opening", "-5.00", "USD"),
  ]),
  transaction("2026-06-01", [
    atCost("Assets:Sold", "-5", "XYZ", "1.00", "USD"),
    units("Equity:Opening", "5.00", "USD"),
  ]),
  // Quotes change at_value but must not change units_by_cost.
  price("2026-07-15", "QAC", "20.00", "EUR"),
  price("2026-07-15", "VTI", "200.00", "USD"),
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(loadCachedFileMapForRepo).mockResolvedValue({
    files: { "main.bean": 'option "operating_currency" "USD"\n' },
    entryPoint: "main.bean",
    repoPaths: ["main.bean"],
    sourceFiles: ["main.bean"],
    managedPrices: [],
    managedPricePaths: [],
  });
  jest.mocked(parseLedgerFiles).mockResolvedValue({
    valid: true,
    errors: [],
    options: { operating_currencies: ["USD"], title: null },
    directives: DIRECTIVES,
    directiveCount: DIRECTIVES.length,
  });
});

const finance = () => new LedgerFinanceService(factory as never, {} as never);
const data = () => new LedgerDataService(factory as never, {} as never);

function node(tree: Tree, account: string): Tree | undefined {
  if (tree.account === account) return tree;
  for (const child of tree.children) {
    const found = node(child, account);
    if (found) return found;
  }
  return undefined;
}

describe("units_by_cost on the balance reads (w4/m58)", () => {
  it("tells EUR cash from a EUR-cost lot (w21/556)", async () => {
    const report = await finance().getBalanceSheet({
      ...params,
      conversion: "units_by_cost",
    });

    expect(node(report.assets_hierarchy_data, "Assets:Fund")?.balance).toEqual({
      "EUR {}": "500.00",
      "VTI {EUR}": "10",
    });
  });

  it("separates a commodity's own lots from its use as another lot's cost currency (w21/554)", async () => {
    const report = await finance().getBalanceSheet({
      ...params,
      conversion: "units_by_cost",
    });
    const assets = report.assets_hierarchy_data;

    expect(node(assets, "Assets:Crypto")?.balance).toEqual({
      "BTC {USD}": "1",
      "ETH {BTC}": "40",
    });
    expect(node(assets, "Assets:Margin")?.balance).toEqual({
      "VEUR {EUR}": "10",
      "EUR {}": "-400.00",
    });
  });

  it("keeps one commodity's cost currencies apart and follows the time filter (w4/1031)", async () => {
    const july = await finance().getBalanceSheet({
      ...params,
      time: "2026-07",
      conversion: "units_by_cost",
    });
    const august = await finance().getBalanceSheet({
      ...params,
      time: "2026-08",
      conversion: "units_by_cost",
    });

    expect(node(july.assets_hierarchy_data, "Assets:Mixed")?.balance).toEqual({
      "QAC {EUR}": "1",
      "QAC {USD}": "2",
    });
    expect(node(august.assets_hierarchy_data, "Assets:Mixed")?.balance).toEqual(
      { "QAC {EUR}": "4", "QAC {USD}": "2" },
    );
  });

  it("rolls lots up to parents and the net-worth series without valuing them", async () => {
    const report = await finance().getBalanceSheet({
      ...params,
      time: "2026-07",
      conversion: "units_by_cost",
    });

    expect(
      node(report.assets_hierarchy_data, "Assets")?.balance_children,
    ).toEqual({
      "EUR {}": "100.00",
      "VTI {EUR}": "10",
      "BTC {USD}": "1",
      "ETH {BTC}": "40",
      "VEUR {EUR}": "10",
      "QAC {EUR}": "1",
      "QAC {USD}": "2",
    });
    expect(report.net_worth_data.at(-1)?.balance).toMatchObject({
      "QAC {EUR}": "1",
      "QAC {USD}": "2",
      "VTI {EUR}": "10",
    });
  });

  it("serves the trial balance, overview and account report alike", async () => {
    const trial = await finance().getTrialBalance({
      ...params,
      conversion: "units_by_cost",
    });
    const overview = await finance().getOverview({
      ...params,
      conversion: "units_by_cost",
    });
    const account = await data().getAccountReport({
      ...params,
      accountName: "Assets:Fund",
      conversion: "units_by_cost",
    });

    expect(node(trial.assets_hierarchy_data, "Assets:Fund")?.balance).toEqual({
      "EUR {}": "500.00",
      "VTI {EUR}": "10",
    });
    expect(
      node(overview.assets_hierarchy_data, "Assets:Fund")?.balance,
    ).toEqual({ "EUR {}": "500.00", "VTI {EUR}": "10" });
    expect(account.account_balance_data.at(-1)?.balance).toEqual({
      "EUR {}": "500.00",
      "VTI {EUR}": "10",
    });
  });

  it("drops a lot that nets to zero", async () => {
    const report = await finance().getBalanceSheet({
      ...params,
      conversion: "units_by_cost",
    });

    expect(
      node(report.assets_hierarchy_data, "Assets:Sold")?.balance ?? {},
    ).toEqual({});
    expect(
      node(report.assets_hierarchy_data, "Assets")?.balance_children,
    ).not.toHaveProperty("XYZ {USD}");
  });

  it("follows the account filter", async () => {
    const report = await finance().getBalanceSheet({
      ...params,
      account: "Assets:Crypto",
      conversion: "units_by_cost",
    });

    expect(
      node(report.assets_hierarchy_data, "Assets")?.balance_children,
    ).toEqual({ "BTC {USD}": "1", "ETH {BTC}": "40" });
  });

  it("keys each interval's change in interval totals", async () => {
    const totals = await data().getIntervalTotals({
      ...params,
      accountName: "Assets:Mixed",
      interval: "month",
      time: "2026-07 - 2026-08",
      conversion: "units_by_cost",
    });

    expect(totals.map(({ date, balance }) => ({ date, balance }))).toEqual([
      { date: "2026-07-31", balance: { "QAC {EUR}": "1", "QAC {USD}": "2" } },
      { date: "2026-08-31", balance: { "QAC {EUR}": "3" } },
    ]);
  });

  it("leaves the existing conversions unchanged", async () => {
    const report = await finance().getBalanceSheet({
      ...params,
      conversion: "units",
    });

    expect(node(report.assets_hierarchy_data, "Assets:Fund")?.balance).toEqual({
      EUR: "500.00",
      VTI: "10",
    });
  });
});
