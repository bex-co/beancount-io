import { selectTrialBalanceCategories } from "../select-trial-balance";
import { TrialBalanceQuery } from "@/generated-graphql/graphql";

type Child = {
  account: string;
  balanceChildren: Record<string, number | string>;
  children?: Child[];
};

type Root = {
  account: string;
  total: Record<string, number | string>;
  children?: Child[];
};

function createTrialBalance(roots: {
  assets?: Root;
  liabilities?: Root;
  equity?: Root;
  income?: Root;
  expenses?: Root;
}): TrialBalanceQuery {
  const empty = (account: string) => ({
    account,
    balance: {},
    balanceChildren: {},
    children: [],
    hasTxns: false,
  });
  const toNode = (child: Child): unknown => ({
    account: child.account,
    balance: {},
    balanceChildren: child.balanceChildren,
    children: (child.children ?? []).map(toNode),
    hasTxns: true,
  });
  const toRoot = (root: Root | undefined, fallback: string) =>
    root
      ? {
          account: root.account,
          balance: {},
          balanceChildren: root.total,
          children: (root.children ?? []).map(toNode),
          hasTxns: true,
        }
      : empty(fallback);
  return {
    getLedgerTrialBalance: {
      assetsHierarchyData: toRoot(roots.assets, "Assets"),
      liabilitiesHierarchyData: toRoot(roots.liabilities, "Liabilities"),
      equityHierarchyData: toRoot(roots.equity, "Equity"),
      incomeHierarchyData: toRoot(roots.income, "Income"),
      expensesHierarchyData: toRoot(roots.expenses, "Expenses"),
    },
  } as unknown as TrialBalanceQuery;
}

describe("selectTrialBalanceCategories", () => {
  it("returns nothing without data or a currency", () => {
    expect(selectTrialBalanceCategories("USD", undefined)).toEqual([]);
    expect(selectTrialBalanceCategories("", createTrialBalance({}))).toEqual(
      [],
    );
  });

  it("orders the five categories conventionally, keeping the ledger's signs", () => {
    // The real figures from the web dashboard's all-accounts table.
    const data = createTrialBalance({
      assets: {
        account: "Assets",
        total: { USD: "96156.71150", VACHR: "96" },
        children: [
          { account: "Assets:US", balanceChildren: { USD: "96156.71150" } },
        ],
      },
      liabilities: {
        account: "Liabilities",
        total: { USD: -902.36 },
        children: [
          { account: "Liabilities:US", balanceChildren: { USD: -902.36 } },
        ],
      },
      equity: {
        account: "Equity",
        total: { USD: -3919.69 },
        children: [
          { account: "Equity:Opening", balanceChildren: { USD: -3919.69 } },
        ],
      },
      income: {
        account: "Income",
        total: { USD: -323098.97 },
        children: [
          { account: "Income:Salary", balanceChildren: { USD: -323098.97 } },
        ],
      },
      expenses: {
        account: "Expenses",
        total: { USD: 231764.23 },
        children: [
          { account: "Expenses:Food", balanceChildren: { USD: 231764.23 } },
        ],
      },
    });
    const result = selectTrialBalanceCategories("USD", data);
    expect(result.map((c) => c.key)).toEqual([
      "assets",
      "liabilities",
      "equity",
      "income",
      "expenses",
    ]);
    // Credit-normal categories stay negative, as the ledger and the dashboard
    // hold them — which is what makes the five reconcile.
    expect(result.map((c) => c.value)).toEqual([
      96156.7115, -902.36, -3919.69, -323098.97, 231764.23,
    ]);
    const sum = result.reduce((total, c) => total + c.value, 0);
    expect(Math.abs(sum) < 0.1).toBe(true);
  });

  it("ignores commodities that have no value in the active currency", () => {
    // VACHR (vacation hours) can't convert, so it stays under its own key and is
    // left out of the total — exactly what the dashboard shows.
    const data = createTrialBalance({
      assets: {
        account: "Assets",
        total: { USD: 100, VACHR: "96", IRAUSD: "4100.00" },
      },
    });
    expect(selectTrialBalanceCategories("USD", data)[0].value).toBe(100);
  });

  it("carries the ledger's own root account for drilling in", () => {
    const data = createTrialBalance({
      // A ledger that renamed its roots via `option "name_assets"`.
      assets: { account: "Activa", total: { USD: 100 } },
    });
    expect(selectTrialBalanceCategories("USD", data)[0].account).toBe("Activa");
  });

  it("drops categories the ledger doesn't use", () => {
    const data = createTrialBalance({
      assets: { account: "Assets", total: { USD: 100 } },
    });
    expect(selectTrialBalanceCategories("USD", data).map((c) => c.key)).toEqual(
      ["assets"],
    );
  });

  it("compresses each category's account tree", () => {
    const data = createTrialBalance({
      liabilities: {
        account: "Liabilities",
        total: { USD: -902.36 },
        children: [
          {
            account: "Liabilities:US",
            balanceChildren: { USD: -902.36 },
            children: [
              {
                account: "Liabilities:US:Chase",
                balanceChildren: { USD: -902.36 },
                children: [
                  {
                    account: "Liabilities:US:Chase:Slate",
                    balanceChildren: { USD: -902.36 },
                  },
                ],
              },
            ],
          },
        ],
      },
    });
    const [liabilities] = selectTrialBalanceCategories("USD", data);
    expect(liabilities.value).toBe(-902.36);
    expect(liabilities.children.map((n) => n.name)).toEqual(["US:Chase:Slate"]);
    expect(liabilities.children[0].account).toBe("Liabilities:US:Chase:Slate");
  });
});
