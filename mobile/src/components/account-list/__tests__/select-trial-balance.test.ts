import {
  selectTrialBalanceCategories,
  selectTrialBalanceDisplays,
} from "../select-trial-balance";
import { selectAccountTreeFromRoot } from "../select-account-list";
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

  it("keeps metadata-only accounts visible before their first posting", () => {
    const data = createTrialBalance({});
    const result = selectTrialBalanceCategories("USD", data, [
      "Assets:Bank:Checking",
    ]);

    expect(result.map((category) => category.key)).toEqual(["assets"]);
    expect(result[0].children).toEqual([
      {
        account: "Assets:Bank:Checking",
        name: "Bank:Checking",
        value: 0,
        children: [],
      },
    ]);
  });

  it("does not duplicate compressed ancestors from metadata", () => {
    const data = createTrialBalance({
      assets: {
        account: "Assets",
        total: { USD: 10 },
        children: [
          {
            account: "Assets:Bank",
            balanceChildren: { USD: 10 },
            children: [
              {
                account: "Assets:Bank:Checking",
                balanceChildren: { USD: 10 },
              },
            ],
          },
        ],
      },
    });
    const [assets] = selectTrialBalanceCategories("USD", data, [
      "Assets:Bank",
      "Assets:Bank:Checking",
    ]);

    expect(assets.children.map((account) => account.account)).toEqual([
      "Assets:Bank:Checking",
    ]);
  });

  it("keeps a zero-balance account the API returns inside its real parent", () => {
    // The regression: a zero leaf was filtered out of the tree and then pushed
    // back on flat at category level, so it escaped the branch that owns it.
    const data = createTrialBalance({
      assets: {
        account: "Assets",
        total: { USD: 15 },
        children: [
          {
            account: "Assets:Bank",
            balanceChildren: { USD: 10 },
            children: [
              { account: "Assets:Bank:Checking", balanceChildren: { USD: 10 } },
              { account: "Assets:Bank:Savings", balanceChildren: { USD: 0 } },
            ],
          },
          // A second top-level branch, so the category's own pass-through skip
          // doesn't flatten Bank's row before we can look at its children.
          { account: "Assets:Cash", balanceChildren: { USD: 5 } },
        ],
      },
    });
    const [assets] = selectTrialBalanceCategories("USD", data, [
      "Assets:Bank:Checking",
      "Assets:Bank:Savings",
    ]);
    expect(assets.children.map((node) => node.account)).toEqual([
      "Assets:Bank",
      "Assets:Cash",
    ]);
    expect(assets.children[0].children.map((node) => node.account)).toEqual([
      "Assets:Bank:Checking",
      "Assets:Bank:Savings",
    ]);
    // Balances are untouched by the inclusion.
    expect(assets.children[0].value).toBe(10);
    expect(assets.children[0].children[1].value).toBe(0);
  });

  it("creates the missing intermediate parent of a metadata-only account", () => {
    const data = createTrialBalance({
      assets: {
        account: "Assets",
        total: { USD: 120 },
        children: [
          {
            account: "Assets:NonCurrent",
            balanceChildren: { USD: 100 },
            children: [
              {
                account: "Assets:NonCurrent:Property",
                balanceChildren: { USD: 100 },
              },
            ],
          },
          { account: "Assets:Current", balanceChildren: { USD: 20 } },
        ],
      },
    });
    const [assets] = selectTrialBalanceCategories("USD", data, [
      "Assets:NonCurrent:Goodwill",
    ]);
    // Goodwill joins the NonCurrent branch rather than becoming a sibling of it.
    expect(assets.children.map((node) => node.account)).toEqual([
      "Assets:NonCurrent",
      "Assets:Current",
    ]);
    expect(assets.children[0].children.map((node) => node.name)).toEqual([
      "Property",
      "Goodwill",
    ]);
  });

  it("does not duplicate an intermediate shared by two metadata accounts", () => {
    const data = createTrialBalance({
      assets: {
        account: "Assets",
        total: { USD: 20 },
        children: [{ account: "Assets:Current", balanceChildren: { USD: 20 } }],
      },
    });
    const [assets] = selectTrialBalanceCategories("USD", data, [
      "Assets:NonCurrent:Goodwill",
      "Assets:NonCurrent:Goodwill",
      "Assets:NonCurrent:Patents",
    ]);
    // One NonCurrent row holding both leaves, each listed once.
    expect(assets.children.map((node) => node.name)).toEqual([
      "Current",
      "NonCurrent",
    ]);
    expect(assets.children[1].children.map((node) => node.name)).toEqual([
      "Goodwill",
      "Patents",
    ]);
  });

  it("compresses a chain that is zero all the way down, like any other chain", () => {
    const data = createTrialBalance({});
    const [assets] = selectTrialBalanceCategories("USD", data, [
      "Assets:NonCurrent:Intangible:Goodwill",
    ]);
    // Single-child chains carrying one balance fold into a row whose label
    // keeps every segment — the same rule `Liabilities:US:Chase:Slate` follows.
    expect(assets.children).toEqual([
      {
        account: "Assets:NonCurrent:Intangible:Goodwill",
        name: "NonCurrent:Intangible:Goodwill",
        value: 0,
        children: [],
      },
    ]);
  });

  it("ignores metadata accounts belonging to another category", () => {
    const data = createTrialBalance({
      assets: { account: "Assets", total: { USD: 100 } },
    });
    const result = selectTrialBalanceCategories("USD", data, [
      "Expenses:Food:Coffee",
    ]);
    const assets = result.find((category) => category.key === "assets");
    const expenses = result.find((category) => category.key === "expenses");
    expect(assets?.children).toEqual([]);
    expect(expenses?.children.map((node) => node.account)).toEqual([
      "Expenses:Food:Coffee",
    ]);
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

// Two Assets accounts of the Beancount example ledger: a fund held at cost and
// vacation hours, which have no cost.
function exampleAssets(
  rgagx: Record<string, string>,
  vacation: Record<string, string>,
  total: Record<string, string>,
): TrialBalanceQuery {
  return createTrialBalance({
    assets: {
      account: "Assets",
      total,
      children: [
        { account: "Assets:Vanguard:RGAGX", balanceChildren: rgagx },
        { account: "Assets:Hoogle:Vacation", balanceChildren: vacation },
      ],
    },
  });
}
const exampleAtCost = exampleAssets(
  { USD: "49049.66613" },
  { VACHR: "-13" },
  { USD: "49049.66613", VACHR: "-13" },
);
const exampleUnits = exampleAssets(
  { RGAGX: "597.748" },
  { VACHR: "-13" },
  { RGAGX: "597.748", VACHR: "-13" },
);

describe("selectTrialBalanceDisplays", () => {
  it("keys the category by its row key and accounts by their full name", () => {
    const displays = selectTrialBalanceDisplays(
      "USD",
      exampleAtCost,
      exampleUnits,
    );
    expect(displays.get("assets")).toEqual({
      kind: "money",
      value: 49049.66613,
      notInTotal: [{ currency: "VACHR", number: -13, scale: 0 }],
    });
    expect(displays.get("Assets:Vanguard:RGAGX")).toEqual({
      kind: "units",
      units: { currency: "RGAGX", number: 597.748, scale: 3 },
      cost: 49049.66613,
    });
    expect(displays.get("Assets:Hoogle:Vacation")).toEqual({
      kind: "units",
      units: { currency: "VACHR", number: -13, scale: 0 },
      cost: null,
    });
  });

  it("still reads an unconverted commodity in units before the units read lands", () => {
    const displays = selectTrialBalanceDisplays("USD", exampleAtCost);
    expect(displays.get("Assets:Hoogle:Vacation")?.kind).toBe("units");
    expect(displays.get("Assets:Vanguard:RGAGX")?.kind).toBe("money");
  });

  it("is empty without the at-cost read", () => {
    expect(
      selectTrialBalanceDisplays("USD", undefined, exampleUnits).size,
    ).toBe(0);
  });
});

describe("selectTrialBalanceCategories with unconverted holdings", () => {
  it("keeps a balance of only unconverted commodities without ledger metadata", () => {
    // Zero in USD, but not empty: the zero-value filter must not drop it.
    const [assets] = selectTrialBalanceCategories("USD", exampleAtCost);
    expect(assets.children.map((node) => node.account)).toEqual([
      "Assets:Vanguard:RGAGX",
      "Assets:Hoogle:Vacation",
    ]);
    expect(assets.value).toBe(49049.66613);
  });

  it("does not fold a parent holding its own unconverted commodities into its child", () => {
    const data = createTrialBalance({
      assets: {
        account: "Assets",
        total: { USD: "505", VACHR: "-13" },
        children: [
          {
            account: "Assets:Hoogle",
            balanceChildren: { USD: "500", VACHR: "-13" },
            children: [
              {
                account: "Assets:Hoogle:Checking",
                balanceChildren: { USD: "500" },
              },
            ],
          },
          { account: "Assets:Cash", balanceChildren: { USD: "5" } },
        ],
      },
    });
    // The Accounts view keeps Hoogle's row, since the VACHR lives there alone.
    const [assets] = selectTrialBalanceCategories("USD", data);
    expect(assets.children.map((node) => node.name)).toEqual([
      "Hoogle",
      "Cash",
    ]);
    expect(assets.children[0].children.map((node) => node.name)).toEqual([
      "Checking",
    ]);
    // A report view compares values only, and folds the chain as before.
    const root = data.getLedgerTrialBalance.assetsHierarchyData;
    expect(
      selectAccountTreeFromRoot("USD", root).map((node) => node.name),
    ).toEqual(["Hoogle:Checking", "Cash"]);
  });
});
