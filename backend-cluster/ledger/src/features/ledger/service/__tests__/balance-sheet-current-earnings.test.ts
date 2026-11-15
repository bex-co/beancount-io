import type { DirectiveJson } from "@rustledger/wasm";
import type { SerializableTreeNodePublic } from "@/foundation/ledger-api-types";
import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { parseLedgerFiles } from "@/foundation/rustledger";
import { LedgerFinanceService } from "../ledger-finance-service";
import { LedgerJournalService } from "../ledger-journal-service";

jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));
jest.mock("@/foundation/rustledger", () => ({
  ...jest.requireActual("@/foundation/rustledger"),
  parseLedgerFiles: jest.fn(),
}));

type Transaction = Extract<DirectiveJson, { type: "transaction" }>;
type Tree = SerializableTreeNodePublic;
const params = { ledgerId: "synthetic/company", userId: "synthetic-user" };
const factory = { getPublicApiClient: jest.fn().mockResolvedValue({}) };
const loadMock = jest.mocked(loadCachedFileMapForRepo);
const parseMock = jest.mocked(parseLedgerFiles);

function transaction(
  date: string,
  postings: Transaction["postings"],
): Transaction {
  return {
    type: "transaction",
    date,
    flag: "*",
    narration: "Operations",
    tags: [],
    links: [],
    postings,
  };
}

function amount(account: string, number: string) {
  return { account, units: { number, currency: "MUSD" } };
}

function configure(expenses = "17000", custom = false) {
  const equity = custom ? "Capital" : "Equity";
  const income = custom ? "Revenue" : "Income";
  const costs = custom ? "Costs" : "Expenses";
  const source =
    'option "operating_currency" "MUSD"\n' +
    (custom
      ? [
          'option "name_equity" "Capital"',
          'option "name_income" "Revenue"',
          'option "name_expenses" "Costs"',
          'option "account_current_earnings" "Retained:Now"',
        ].join("\n")
      : "");
  const directives: DirectiveJson[] = [
    ...[
      "Assets:Cash",
      "Liabilities:Debt",
      `${equity}:Capital`,
      `${income}:Sales`,
      `${costs}:Operations`,
    ].map((account): DirectiveJson => ({
      type: "open",
      date: "2024-01-01",
      account,
      currencies: ["MUSD"],
    })),
    transaction("2024-12-31", [
      amount("Assets:Cash", "20000"),
      amount("Liabilities:Debt", "-10000"),
      amount(`${equity}:Capital`, "-10000"),
    ]),
    transaction("2025-02-01", [
      amount("Assets:Cash", String(20000 - Number(expenses))),
      amount(`${income}:Sales`, "-20000"),
      amount(`${costs}:Operations`, expenses),
    ]),
  ];
  const files = { "main.bean": source };
  loadMock.mockResolvedValue({
    files,
    entryPoint: "main.bean",
    repoPaths: ["main.bean"],
    sourceFiles: ["main.bean"],
    managedPrices: [],
    managedPricePaths: [],
    ref: "HEAD",
  });
  const snapshot = {
    valid: true,
    errors: [],
    options: { operating_currencies: ["MUSD"], title: null },
    directives,
    directiveCount: directives.length,
  };
  parseMock.mockResolvedValue(snapshot);
  return { directives, files, snapshot };
}

function finance() {
  return new LedgerFinanceService(factory as never, {} as never);
}

function find(node: Tree, account: string): Tree | undefined {
  if (node.account === account) return node;
  for (const child of node.children) {
    const found = find(child, account);
    if (found) return found;
  }
  return undefined;
}

function balance(node: Tree | undefined): number {
  return Number(node?.balance_children.MUSD ?? "0");
}

beforeEach(() => {
  jest.clearAllMocks();
  configure();
});

describe("balance-sheet current earnings hierarchy and series", () => {
  it.each([undefined, "at_cost", "MUSD"])(
    "reconciles company assets, liabilities and closed equity with conversion %s",
    async (conversion) => {
      const report = await finance().getBalanceSheet({
        ...params,
        time: "2025",
        conversion,
      });
      expect(balance(report.assets_hierarchy_data)).toBe(23000);
      expect(balance(report.liabilities_hierarchy_data)).toBe(-10000);
      expect(balance(report.equity_hierarchy_data)).toBe(-13000);
      expect(report.equity_data.slice(0, 2)).toEqual([
        { date: "2025-01-31", balance: { MUSD: "-10000" } },
        { date: "2025-02-28", balance: { MUSD: "-13000" } },
      ]);
      expect(Number(report.equity_data.at(-1)?.balance.MUSD)).toBe(
        balance(report.equity_hierarchy_data),
      );
      expect(
        balance(find(report.equity_hierarchy_data, "Equity:Earnings:Current")),
      ).toBe(-3000);
      expect(
        balance(report.assets_hierarchy_data) +
          balance(report.liabilities_hierarchy_data) +
          balance(report.equity_hierarchy_data),
      ).toBe(0);
    },
  );

  it.each([
    { interval: "yearly", dates: ["2025-12-31"] },
    {
      interval: "quarterly",
      dates: ["2025-03-31", "2025-06-30", "2025-09-30", "2025-12-31"],
    },
  ])(
    "closes each $interval equity point at its existing interval boundary",
    async ({ interval, dates }) => {
      const report = await finance().getBalanceSheet({
        ...params,
        time: "2025",
        conversion: "at_cost",
        interval,
      });
      expect(report.equity_data).toEqual(
        dates.map((date) => ({ date, balance: { MUSD: "-13000" } })),
      );
      expect(Number(report.equity_data.at(-1)?.balance.MUSD)).toBe(
        balance(report.equity_hierarchy_data),
      );
    },
  );

  it("keeps previous earnings exactly once in the following year", async () => {
    const report = await finance().getBalanceSheet({
      ...params,
      time: "2026",
      conversion: "at_cost",
    });
    expect(balance(report.assets_hierarchy_data)).toBe(23000);
    expect(balance(report.liabilities_hierarchy_data)).toBe(-10000);
    expect(balance(report.equity_hierarchy_data)).toBe(-13000);
    expect(report.equity_data).toHaveLength(12);
    expect(
      report.equity_data.every((point) => point.balance.MUSD === "-13000"),
    ).toBe(true);
    expect(
      balance(find(report.equity_hierarchy_data, "Equity:Earnings:Previous")),
    ).toBe(-3000);
    expect(
      balance(find(report.equity_hierarchy_data, "Equity:Earnings:Current")),
    ).toBe(0);
  });

  it("honors custom equity, income, expense and current-earnings names", async () => {
    configure("17000", true);
    const current = await finance().getBalanceSheet({
      ...params,
      time: "2025",
      conversion: "at_cost",
    });
    expect(current.equity_hierarchy_data.account).toBe("Capital");
    expect(balance(current.equity_hierarchy_data)).toBe(-13000);
    expect(current.equity_data.slice(0, 2)).toEqual([
      { date: "2025-01-31", balance: { MUSD: "-10000" } },
      { date: "2025-02-28", balance: { MUSD: "-13000" } },
    ]);
    expect(Number(current.equity_data.at(-1)?.balance.MUSD)).toBe(
      balance(current.equity_hierarchy_data),
    );
    expect(
      balance(find(current.equity_hierarchy_data, "Capital:Retained:Now")),
    ).toBe(-3000);
    expect(
      find(current.equity_hierarchy_data, "Equity:Earnings:Current"),
    ).toBeUndefined();
    const previous = await finance().getBalanceSheet({
      ...params,
      time: "2026",
      conversion: "at_cost",
    });
    expect(balance(previous.equity_hierarchy_data)).toBe(-13000);
    expect(
      previous.equity_data.every((point) => point.balance.MUSD === "-13000"),
    ).toBe(true);
    expect(
      balance(
        find(previous.equity_hierarchy_data, "Capital:Earnings:Previous"),
      ),
    ).toBe(-3000);
    expect(
      balance(find(previous.equity_hierarchy_data, "Capital:Retained:Now")),
    ).toBe(0);
  });

  it.each([
    {
      name: "loss",
      expenses: "23000",
      assets: 17000,
      equity: -7000,
      current: 3000,
    },
    {
      name: "zero profit",
      expenses: "20000",
      assets: 20000,
      equity: -10000,
      current: 0,
    },
  ])(
    "closes $name with the existing signed accounting convention",
    async ({ expenses, assets, equity, current }) => {
      configure(expenses);
      const report = await finance().getBalanceSheet({
        ...params,
        time: "2025",
        conversion: "at_cost",
      });
      expect(balance(report.assets_hierarchy_data)).toBe(assets);
      expect(balance(report.equity_hierarchy_data)).toBe(equity);
      expect(report.equity_data.slice(0, 2)).toEqual([
        { date: "2025-01-31", balance: { MUSD: "-10000" } },
        { date: "2025-02-28", balance: { MUSD: String(equity) } },
      ]);
      expect(Number(report.equity_data.at(-1)?.balance.MUSD)).toBe(equity);
      expect(
        balance(find(report.equity_hierarchy_data, "Equity:Earnings:Current")),
      ).toBe(current);
      expect(
        balance(report.assets_hierarchy_data) +
          balance(report.liabilities_hierarchy_data) +
          balance(report.equity_hierarchy_data),
      ).toBe(0);
    },
  );

  it.each([undefined, ""])(
    "closes the hierarchy without a time filter %s",
    async (time) => {
      const report = await finance().getBalanceSheet({
        ...params,
        time,
        conversion: "at_cost",
      });
      expect(balance(report.equity_hierarchy_data)).toBe(-13000);
      expect(Number(report.equity_data.at(-1)?.balance.MUSD)).toBe(-13000);
      expect(
        balance(find(report.equity_hierarchy_data, "Equity:Earnings:Current")),
      ).toBe(-3000);
    },
  );

  it("leaves source, snapshots, income, trial balance and journal semantics unchanged", async () => {
    const configured = configure();
    const original = structuredClone(configured);
    const service = finance();
    const journal = new LedgerJournalService(factory as never, {} as never);
    const beforeIncome = await service.getIncomeStatement({
      ...params,
      time: "2025",
      conversion: "at_cost",
    });
    const beforeTrial = await service.getTrialBalance({
      ...params,
      time: "2025",
      conversion: "at_cost",
    });
    const beforeJournal = await journal.getJournal({
      ...params,
      query: { time: "2025", limit: 100 },
    });
    expect(balance(beforeIncome.income_hierarchy_data)).toBe(-20000);
    expect(balance(beforeIncome.expenses_hierarchy_data)).toBe(17000);
    expect(balance(beforeTrial.equity_hierarchy_data)).toBe(-10000);
    expect(balance(beforeTrial.income_hierarchy_data)).toBe(-20000);
    expect(
      beforeJournal.data.filter(
        (entry) => entry.directive_type === "Transaction",
      ),
    ).toHaveLength(1);

    const first = await service.getBalanceSheet({
      ...params,
      time: "2025",
      conversion: "at_cost",
    });
    expect(balance(first.equity_hierarchy_data)).toBe(-13000);
    expect(
      await service.getBalanceSheet({
        ...params,
        time: "2025",
        conversion: "at_cost",
      }),
    ).toEqual(first);
    expect(
      await service.getIncomeStatement({
        ...params,
        time: "2025",
        conversion: "at_cost",
      }),
    ).toEqual(beforeIncome);
    expect(
      await service.getTrialBalance({
        ...params,
        time: "2025",
        conversion: "at_cost",
      }),
    ).toEqual(beforeTrial);
    expect(
      await journal.getJournal({
        ...params,
        query: { time: "2025", limit: 100 },
      }),
    ).toEqual(beforeJournal);
    expect(configured).toEqual(original);
  });

  it("preserves account-filter scope and the matching transaction's counterparts", async () => {
    const report = await finance().getBalanceSheet({
      ...params,
      account: "Income:Sales",
      time: "2025",
      conversion: "at_cost",
    });
    expect(balance(report.assets_hierarchy_data)).toBe(3000);
    expect(balance(report.liabilities_hierarchy_data)).toBe(0);
    expect(balance(report.equity_hierarchy_data)).toBe(-3000);
    expect(report.equity_data.slice(0, 2)).toEqual([
      { date: "2025-01-31", balance: {} },
      { date: "2025-02-28", balance: { MUSD: "-3000" } },
    ]);
    expect(Number(report.equity_data.at(-1)?.balance.MUSD)).toBe(-3000);
    expect(
      balance(find(report.equity_hierarchy_data, "Equity:Earnings:Current")),
    ).toBe(-3000);
    expect(
      find(report.equity_hierarchy_data, "Equity:Capital"),
    ).toBeUndefined();
  });

  it("retains held-at-cost posting values and raw journal details", async () => {
    const configured = configure();
    const cost = {
      number: { kind: "per_unit" as const, value: "3" },
      currency: "MUSD",
      date: "2024-12-31",
      label: "Lot-A",
    };
    const opening = transaction("2024-12-31", [
      {
        account: "Assets:Shares",
        units: { number: "10", currency: "HOOL" },
        cost,
      },
      amount("Equity:Capital", "-30"),
    ]);
    const expense: Transaction = {
      ...transaction("2025-02-01", [
        {
          account: "Assets:Shares",
          units: { number: "-2", currency: "HOOL" },
          cost,
          price: { number: "7", currency: "MUSD" },
          flag: "!",
        },
        {
          account: "Expenses:Bonus",
          units: { number: "2", currency: "HOOL" },
          cost,
          price: { number: "7", currency: "MUSD" },
        },
      ]),
      flag: "!",
      tags: ["bonus"],
      links: ["lot"],
    };
    configured.directives.splice(
      0,
      configured.directives.length,
      opening,
      expense,
    );
    configured.snapshot.directiveCount = 2;
    const original = structuredClone(configured);
    const report = await finance().getBalanceSheet({
      ...params,
      time: "2025",
      conversion: "at_cost",
    });
    expect(balance(report.assets_hierarchy_data)).toBe(24);
    expect(balance(report.equity_hierarchy_data)).toBe(-24);
    expect(report.equity_data.slice(0, 2)).toEqual([
      { date: "2025-01-31", balance: { MUSD: "-30" } },
      { date: "2025-02-28", balance: { MUSD: "-24" } },
    ]);
    expect(Number(report.equity_data.at(-1)?.balance.MUSD)).toBe(
      balance(report.equity_hierarchy_data),
    );
    expect(
      balance(find(report.equity_hierarchy_data, "Equity:Earnings:Current")),
    ).toBe(6);
    const units = await finance().getBalanceSheet({
      ...params,
      time: "2025",
      conversion: "units",
    });
    expect(
      find(units.equity_hierarchy_data, "Equity:Earnings:Current")?.balance,
    ).toEqual({ HOOL: "2" });
    const journal = await new LedgerJournalService(
      factory as never,
      {} as never,
    ).getJournal({ ...params, query: { time: "2025" } });
    expect(journal.data[0]).toMatchObject({
      date: expense.date,
      flag: "!",
      tags: ["bonus"],
      links: ["lot"],
      postings: [
        {
          account: "Assets:Shares",
          units: { number: "-2", currency: "HOOL" },
          price: { number: "7", currency: "MUSD" },
          cost: {
            number: "3",
            currency: "MUSD",
            date: "2024-12-31",
            label: "Lot-A",
          },
          flag: "!",
        },
        {
          account: "Expenses:Bonus",
          units: { number: "2", currency: "HOOL" },
          price: { number: "7", currency: "MUSD" },
          cost: {
            number: "3",
            currency: "MUSD",
            date: "2024-12-31",
            label: "Lot-A",
          },
        },
      ],
    });
    expect(configured).toEqual(original);
  });
});
