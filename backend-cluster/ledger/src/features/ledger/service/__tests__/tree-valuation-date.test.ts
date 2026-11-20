import type { DirectiveJson } from "@rustledger/wasm";
import type { SerializableTreeNodePublic } from "@/foundation/ledger-api-types";
import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { parseLedgerFiles } from "@/foundation/rustledger";
import { LedgerFinanceService } from "../ledger-finance-service";

jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));
jest.mock("@/foundation/rustledger", () => ({
  ...jest.requireActual("@/foundation/rustledger"),
  parseLedgerFiles: jest.fn(),
}));

type Tree = SerializableTreeNodePublic;
type Posting = Extract<DirectiveJson, { type: "transaction" }>["postings"][0];
const params = { ledgerId: "synthetic/brokerage", userId: "synthetic-user" };
const factory = { getPublicApiClient: jest.fn().mockResolvedValue({}) };

const units = (account: string, number: string, currency: string) => ({
  account,
  units: { number, currency },
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
const price = (date: string, number: string): DirectiveJson => ({
  type: "price",
  date,
  currency: "XYZ",
  amount: { number, currency: "USD" },
});

/**
 * 10 XYZ bought at 10 USD, one later given away: XYZ is 12 USD at the end of
 * 2016 and 20 USD from mid-2017, so a 2016 statement and a current one must
 * disagree. Every lot carries a cost, so market value has a currency to use.
 */
const DIRECTIVES: DirectiveJson[] = [
  ...[
    "Assets:Brokerage",
    "Assets:Cash",
    "Equity:Opening",
    "Expenses:Gifts",
  ].map((account): DirectiveJson => ({
    type: "open",
    date: "2016-01-01",
    account,
    currencies: [],
  })),
  transaction("2016-01-01", [
    units("Assets:Cash", "1000", "USD"),
    units("Equity:Opening", "-1000", "USD"),
  ]),
  transaction("2016-03-01", [
    {
      ...units("Assets:Brokerage", "10", "XYZ"),
      cost: { number: { kind: "per_unit", value: "10" }, currency: "USD" },
    },
    units("Assets:Cash", "-100", "USD"),
  ]),
  transaction("2016-09-01", [
    {
      ...units("Expenses:Gifts", "1", "XYZ"),
      cost: { number: { kind: "per_unit", value: "10" }, currency: "USD" },
    },
    {
      ...units("Assets:Brokerage", "-1", "XYZ"),
      cost: { number: { kind: "per_unit", value: "10" }, currency: "USD" },
    },
  ]),
  price("2016-08-31", "11"),
  price("2016-12-31", "12"),
  price("2017-06-30", "20"),
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
    ref: "HEAD",
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

function usd(node: Tree, account: string): string | undefined {
  if (node.account === account) return node.balance_children.USD;
  for (const child of node.children) {
    const found = usd(child, account);
    if (found !== undefined) return found;
  }
  return undefined;
}

describe("tree balances at market value use the period's prices (w3/500)", () => {
  it("values a 2016 balance sheet at the 2016-12-31 price", async () => {
    const report = await finance().getBalanceSheet({
      ...params,
      time: "2016",
      conversion: "at_value",
    });

    expect(usd(report.assets_hierarchy_data, "Assets:Brokerage")).toBe("108");
    expect(usd(report.assets_hierarchy_data, "Assets")).toBe("1008");
    // The dated net-worth point and the tree now agree.
    expect(report.net_worth_data.at(-1)?.balance.USD).toBe("1008");
  });

  it("values the same holdings at the latest price without a time filter", async () => {
    const report = await finance().getBalanceSheet({
      ...params,
      conversion: "at_value",
    });

    expect(usd(report.assets_hierarchy_data, "Assets:Brokerage")).toBe("180");
  });

  it("uses the latest price on or before the period end for a later year", async () => {
    const report = await finance().getBalanceSheet({
      ...params,
      time: "2017",
      conversion: "at_value",
    });

    expect(usd(report.assets_hierarchy_data, "Assets:Brokerage")).toBe("180");
  });

  it("values the trial balance's holdings at the period end, its expenses on their own date", async () => {
    const report = await finance().getTrialBalance({
      ...params,
      time: "2016",
      conversion: "at_value",
    });

    expect(usd(report.assets_hierarchy_data, "Assets:Brokerage")).toBe("108");
    // The gift of 2016-09-01 is worth the 2016-08-31 price (w1/m49).
    expect(usd(report.expenses_hierarchy_data, "Expenses:Gifts")).toBe("11");
  });

  it.each([{ time: "2016" }, { time: undefined }])(
    "values income-statement and overview flows on their own date, time $time",
    async ({ time }) => {
      const statement = await finance().getIncomeStatement({
        ...params,
        time,
        conversion: "at_value",
      });
      const overview = await finance().getOverview({
        ...params,
        time,
        conversion: "at_value",
      });

      expect(usd(statement.expenses_hierarchy_data, "Expenses:Gifts")).toBe(
        "11",
      );
      expect(usd(overview.assets_hierarchy_data, "Assets:Brokerage")).toBe(
        time ? "108" : "180",
      );
      expect(usd(overview.expenses_hierarchy_data, "Expenses:Gifts")).toBe(
        "11",
      );
    },
  );

  it("leaves at-cost trees independent of the period's prices", async () => {
    const report = await finance().getBalanceSheet({
      ...params,
      time: "2016",
      conversion: "at_cost",
    });

    expect(usd(report.assets_hierarchy_data, "Assets:Cash")).toBe("900");
    expect(usd(report.assets_hierarchy_data, "Assets:Brokerage")).toBe("90");
  });
});
