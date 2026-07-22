import {
  CATEGORY_SIGN,
  selectAccountTreeFromRoot,
} from "../select-account-list";

// SerializableTreeNode shape: camelCase balanceChildren, JSON-typed children.
// selectAccountTreeFromRoot normalizes it into the AccountNode[] the Accounts
// tab and the Reports breakdowns render.
type IncomeChild = {
  account: string;
  balanceChildren: Record<string, number | string>;
  children?: IncomeChild[];
};

type SerializableNode = {
  account: string;
  balanceChildren: Record<string, number | string>;
  children: SerializableNode[];
  hasTxns: boolean;
};

function createIncomeRoot(
  account: string,
  children: IncomeChild[],
): SerializableNode {
  const toChild = (child: IncomeChild): SerializableNode => ({
    account: child.account,
    balanceChildren: child.balanceChildren,
    children: (child.children ?? []).map(toChild),
    hasTxns: true,
  });
  return {
    account,
    balanceChildren: {},
    children: children.map(toChild),
    hasTxns: true,
  };
}

describe("account tree shaping", () => {
  it("folds a chain of single children carrying one balance into one row", () => {
    const root = createIncomeRoot("Liabilities", [
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
    ]);
    const result = selectAccountTreeFromRoot("USD", root);
    // Four levels restating one balance collapse to a single row, keeping the
    // deepest account so drilling in opens the one holding the postings.
    expect(result.map((n) => n.name)).toEqual(["US:Chase:Slate"]);
    expect(result[0].account).toBe("Liabilities:US:Chase:Slate");
    expect(result[0].value).toBe(-902.36);
    expect(result[0].children).toEqual([]);
  });

  it("drops a lone top-level account its children fully explain", () => {
    // Everything sits under Assets:US — a level that only restates the category
    // total, so its segment moves onto the rows beneath instead of taking a row.
    const root = createIncomeRoot("Assets", [
      {
        account: "Assets:US",
        balanceChildren: { USD: 2677.28 },
        children: [
          {
            account: "Assets:US:BofA",
            balanceChildren: { USD: 3313.42 },
            children: [
              {
                account: "Assets:US:BofA:Checking",
                balanceChildren: { USD: 3313.42 },
              },
            ],
          },
          {
            account: "Assets:US:Vanguard",
            balanceChildren: { USD: -1320.17 },
            children: [
              {
                account: "Assets:US:Vanguard:Cash",
                balanceChildren: { USD: -1320.17 },
              },
            ],
          },
          {
            account: "Assets:US:ETrade",
            balanceChildren: { USD: 684.03 },
            children: [
              {
                account: "Assets:US:ETrade:Cash",
                balanceChildren: { USD: 684.03 },
              },
            ],
          },
        ],
      },
    ]);
    const result = selectAccountTreeFromRoot("USD", root);
    expect(result.map((n) => n.name)).toEqual([
      "US:BofA:Checking",
      "US:Vanguard:Cash",
      "US:ETrade:Cash",
    ]);
    // Sorted by magnitude, so the large negative sits second rather than last.
    expect(result.map((n) => n.value)).toEqual([3313.42, -1320.17, 684.03]);
    // And the rows reconcile with the category total they break down.
    const sum = result.reduce((total, node) => total + node.value, 0);
    expect(Math.abs(sum - 2677.28) < 0.005).toBe(true);
  });

  it("keeps a parent that holds postings of its own", () => {
    // Bank rolls up 28,100 over a lone Checking of 18,100 — the extra 10,000
    // exists nowhere else, so folding the two would lose it.
    const root = createIncomeRoot("Assets", [
      {
        account: "Assets:Bank",
        balanceChildren: { USD: 28100 },
        children: [
          { account: "Assets:Bank:Checking", balanceChildren: { USD: 18100 } },
        ],
      },
    ]);
    const result = selectAccountTreeFromRoot("USD", root);
    expect(result[0].name).toBe("Bank");
    expect(result[0].value).toBe(28100);
    expect(result[0].children.map((c) => c.value)).toEqual([18100]);
  });

  it("keeps a negative sub-account negative instead of flipping it positive", () => {
    const root = createIncomeRoot("Assets", [
      { account: "Assets:Checking", balanceChildren: { USD: 3313.42 } },
      // Margin-negative cash after buying funds — real, and not a liability.
      { account: "Assets:Margin", balanceChildren: { USD: -1320.17 } },
    ]);
    const result = selectAccountTreeFromRoot("USD", root);
    expect(result.map((n) => n.name)).toEqual(["Checking", "Margin"]);
    expect(result.map((n) => n.value)).toEqual([3313.42, -1320.17]);
  });
});

describe("selectAccountTreeFromRoot", () => {
  it("returns an empty list when root is undefined or null", () => {
    expect(selectAccountTreeFromRoot("USD", undefined)).toEqual([]);
    expect(selectAccountTreeFromRoot("USD", null)).toEqual([]);
  });

  it("returns an empty list when currency is empty", () => {
    const root = createIncomeRoot("Income", [
      { account: "Income:Salary", balanceChildren: { USD: 5000 } },
    ]);
    expect(selectAccountTreeFromRoot("", root)).toEqual([]);
  });

  it("returns an empty list when the root has no children", () => {
    const root = createIncomeRoot("Income", []);
    expect(selectAccountTreeFromRoot("USD", root)).toEqual([]);
  });

  it("lists top-level accounts sorted by balance, stripping the category segment", () => {
    const root = createIncomeRoot("Income", [
      { account: "Income:Interest", balanceChildren: { USD: 120 } },
      { account: "Income:Salary", balanceChildren: { USD: 5000 } },
      { account: "Income:Consulting", balanceChildren: { USD: 1800 } },
    ]);
    const result = selectAccountTreeFromRoot("USD", root);
    expect(result.map((n) => n.name)).toEqual([
      "Salary",
      "Consulting",
      "Interest",
    ]);
    expect(result.map((n) => n.value)).toEqual([5000, 1800, 120]);
  });

  it("nests sub-accounts under their parent, using leaf names, sorted by balance", () => {
    const root = createIncomeRoot("Income", [
      {
        account: "Income:Salary",
        balanceChildren: { USD: 5000 },
        children: [
          { account: "Income:Salary:Bonus", balanceChildren: { USD: 1500 } },
          { account: "Income:Salary:Base", balanceChildren: { USD: 3500 } },
        ],
      },
      { account: "Income:Interest", balanceChildren: { USD: 120 } },
    ]);
    const result = selectAccountTreeFromRoot("USD", root);
    expect(result.map((n) => n.name)).toEqual(["Salary", "Interest"]);
    const salary = result[0];
    expect(salary.value).toBe(5000);
    expect(salary.children.map((c) => c.name)).toEqual(["Base", "Bonus"]);
    expect(salary.children.map((c) => c.value)).toEqual([3500, 1500]);
  });

  it("leaves the ledger's own signs alone by default", () => {
    // What the Accounts tab wants: credit-normal income stays negative, so the
    // five categories still sum to zero and mobile agrees with the web dashboard.
    const root = createIncomeRoot("Income", [
      { account: "Income:Salary", balanceChildren: { USD: -5000 } },
      { account: "Income:Interest", balanceChildren: { USD: -120 } },
    ]);
    const result = selectAccountTreeFromRoot("USD", root);
    expect(result.map((n) => n.name)).toEqual(["Salary", "Interest"]);
    expect(result.map((n) => n.value)).toEqual([-5000, -120]);
  });

  it("negates credit-normal income at every level when asked to", () => {
    const root = createIncomeRoot("Income", [
      {
        account: "Income:Salary",
        balanceChildren: { USD: -5000 },
        children: [
          { account: "Income:Salary:Base", balanceChildren: { USD: -3500 } },
          { account: "Income:Salary:Bonus", balanceChildren: { USD: -1500 } },
        ],
      },
      { account: "Income:Interest", balanceChildren: { USD: -120 } },
    ]);
    const result = selectAccountTreeFromRoot("USD", root, CATEGORY_SIGN.income);
    expect(result.map((n) => n.name)).toEqual(["Salary", "Interest"]);
    expect(result[0].value).toBe(5000);
    expect(result[0].children.map((c) => c.name)).toEqual(["Base", "Bonus"]);
    expect(result[0].children.map((c) => c.value)).toEqual([3500, 1500]);
  });

  it("omits zero-balance accounts at both levels", () => {
    const root = createIncomeRoot("Income", [
      { account: "Income:Empty", balanceChildren: { USD: 0 } },
      {
        account: "Income:Salary",
        balanceChildren: { USD: 5000 },
        children: [
          { account: "Income:Salary:Base", balanceChildren: { USD: 5000 } },
          { account: "Income:Salary:Old", balanceChildren: { USD: 0 } },
        ],
      },
    ]);
    const result = selectAccountTreeFromRoot("USD", root);
    // Old is dropped, leaving Base as Salary's only child on the same $5,000, so
    // the two fold into a single row.
    expect(result.map((n) => n.name)).toEqual(["Salary:Base"]);
    expect(result[0].children).toEqual([]);
  });

  it("parses string balances and falls back to USD when the currency is missing", () => {
    const root = createIncomeRoot("Income", [
      { account: "Income:Salary", balanceChildren: { USD: "5000.50" } },
      { account: "Income:Euro", balanceChildren: { EUR: 900 } },
    ]);
    const result = selectAccountTreeFromRoot("CNY", root);
    expect(result.map((n) => n.name)).toEqual(["Salary"]);
    expect(result[0].value).toBe(5000.5);
  });
});
