import {
  selectAccountCategories,
  selectAccountTree,
  selectAccountTreeFromRoot,
} from "../select-account-list";
import { AccountHierarchyQuery } from "@/generated-graphql/graphql";

type TestChild = {
  account: string;
  balance_children: Record<string, number | string>;
  children?: TestChild[];
};

function createHierarchy(
  nodes: Array<{
    label: string;
    children: TestChild[];
    /** The category's own rolled-up total, as the backend reports it. */
    total?: Record<string, number | string>;
    /**
     * The category's root account name. Defaults to the label, which is what the
     * backend normally reports; pass "" to simulate a hierarchy that omits it.
     */
    account?: string;
  }>,
): AccountHierarchyQuery {
  const toChild = (child: TestChild): unknown => ({
    account: child.account,
    balance: 0,
    balance_children: child.balance_children,
    children: (child.children ?? []).map(toChild),
  });
  return {
    accountHierarchy: {
      success: true,
      data: nodes.map((node) => ({
        type: "account",
        label: node.label,
        data: {
          account: node.account ?? node.label,
          balance: 0,
          balance_children: node.total ?? {},
          children: node.children.map(toChild),
        },
      })),
    },
  } as unknown as AccountHierarchyQuery;
}

describe("selectAccountTree", () => {
  it("returns an empty list when data is undefined", () => {
    expect(selectAccountTree("USD", "assets", undefined)).toEqual([]);
  });

  it("returns an empty list when currency is empty", () => {
    const data = createHierarchy([
      {
        label: "Assets",
        children: [{ account: "Assets:Cash", balance_children: { USD: 10 } }],
      },
    ]);
    expect(selectAccountTree("", "assets", data)).toEqual([]);
  });

  it("returns an empty list when the label node is missing", () => {
    const data = createHierarchy([
      {
        label: "Liabilities",
        children: [
          { account: "Liabilities:Card", balance_children: { USD: -5 } },
        ],
      },
    ]);
    expect(selectAccountTree("USD", "assets", data)).toEqual([]);
  });

  it("lists top-level accounts sorted by balance, stripping the category segment", () => {
    const data = createHierarchy([
      {
        label: "Assets",
        children: [
          { account: "Assets:Cash", balance_children: { USD: 300 } },
          { account: "Assets:Bank", balance_children: { USD: 1200 } },
          { account: "Assets:Investments", balance_children: { USD: 800 } },
        ],
      },
    ]);
    const result = selectAccountTree("USD", "assets", data);
    expect(result.map((n) => n.name)).toEqual(["Bank", "Investments", "Cash"]);
    expect(result.map((n) => n.value)).toEqual([1200, 800, 300]);
    // No sub-accounts → empty children arrays.
    expect(result.every((n) => n.children.length === 0)).toBe(true);
  });

  it("nests sub-accounts under their parent, using leaf names, sorted by balance", () => {
    const data = createHierarchy([
      {
        label: "Assets",
        children: [
          {
            account: "Assets:Bank",
            balance_children: { USD: 28100 },
            children: [
              {
                account: "Assets:Bank:Checking",
                balance_children: { USD: 18100 },
              },
              {
                account: "Assets:Bank:Savings",
                balance_children: { USD: 10000 },
              },
            ],
          },
          { account: "Assets:Cash", balance_children: { USD: 500 } },
        ],
      },
    ]);
    const result = selectAccountTree("USD", "assets", data);
    expect(result.map((n) => n.name)).toEqual(["Bank", "Cash"]);
    const bank = result[0];
    // Parent shows the rolled-up total (not the sum we recompute).
    expect(bank.value).toBe(28100);
    // Children are the breakdown, leaf-named and sorted desc.
    expect(bank.children.map((c) => c.name)).toEqual(["Checking", "Savings"]);
    expect(bank.children.map((c) => c.value)).toEqual([18100, 10000]);
  });

  it("folds a chain of single children carrying one balance into one row", () => {
    const data = createHierarchy([
      {
        label: "Assets",
        children: [
          {
            account: "Assets:US",
            balance_children: { USD: 5000 },
            children: [
              {
                account: "Assets:US:BofA",
                balance_children: { USD: 5000 },
                children: [
                  {
                    account: "Assets:US:BofA:Checking",
                    balance_children: { USD: 5000 },
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
    const result = selectAccountTree("USD", "assets", data);
    // Three levels restating $5,000 collapse to one row; the account stays the
    // deepest one, so drilling in opens the account that holds the postings.
    expect(result.map((n) => n.name)).toEqual(["US:BofA:Checking"]);
    expect(result[0].account).toBe("Assets:US:BofA:Checking");
    expect(result[0].value).toBe(5000);
    expect(result[0].children).toEqual([]);
  });

  it("drops a lone top-level account its children fully explain", () => {
    // Everything sits under Assets:US — a level that only restates the category
    // total, so its segment moves onto the rows beneath instead of taking a row.
    const data = createHierarchy([
      {
        label: "Assets",
        children: [
          {
            account: "Assets:US",
            balance_children: { USD: 2677.28 },
            children: [
              {
                account: "Assets:US:BofA",
                balance_children: { USD: 3313.42 },
                children: [
                  {
                    account: "Assets:US:BofA:Checking",
                    balance_children: { USD: 3313.42 },
                  },
                ],
              },
              {
                account: "Assets:US:Vanguard",
                balance_children: { USD: -1320.17 },
                children: [
                  {
                    account: "Assets:US:Vanguard:Cash",
                    balance_children: { USD: -1320.17 },
                  },
                ],
              },
              {
                account: "Assets:US:ETrade",
                balance_children: { USD: 684.03 },
                children: [
                  {
                    account: "Assets:US:ETrade:Cash",
                    balance_children: { USD: 684.03 },
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
    const result = selectAccountTree("USD", "assets", data);
    expect(result.map((n) => n.name)).toEqual([
      "US:BofA:Checking",
      "US:Vanguard:Cash",
      "US:ETrade:Cash",
    ]);
    // Sorted by magnitude, so the large negative sits second rather than last.
    expect(result.map((n) => n.value)).toEqual([3313.42, -1320.17, 684.03]);
    // And the rows reconcile with the category total they're a breakdown of.
    const sum = result.reduce((total, node) => total + node.value, 0);
    expect(Math.abs(sum - 2677.28) < 0.005).toBe(true);
  });

  it("keeps a negative sub-account negative instead of flipping it positive", () => {
    const data = createHierarchy([
      {
        label: "Assets",
        children: [
          { account: "Assets:Checking", balance_children: { USD: 3313.42 } },
          // Margin-negative cash after buying funds — real, and not a liability.
          { account: "Assets:Margin", balance_children: { USD: -1320.17 } },
        ],
      },
    ]);
    const result = selectAccountTree("USD", "assets", data);
    expect(result.map((n) => n.name)).toEqual(["Checking", "Margin"]);
    expect(result.map((n) => n.value)).toEqual([3313.42, -1320.17]);
  });

  it("keeps the parent's rolled-up total even when children don't fully sum to it", () => {
    // Parent has its own direct balance beyond its children (28100 vs 18100).
    const data = createHierarchy([
      {
        label: "Assets",
        children: [
          {
            account: "Assets:Bank",
            balance_children: { USD: 28100 },
            children: [
              {
                account: "Assets:Bank:Checking",
                balance_children: { USD: 18100 },
              },
            ],
          },
        ],
      },
    ]);
    const result = selectAccountTree("USD", "assets", data);
    expect(result[0].value).toBe(28100);
    expect(result[0].children.map((c) => c.value)).toEqual([18100]);
  });

  it("negates credit-normal liabilities so debt reads positive at every level", () => {
    const data = createHierarchy([
      {
        label: "Liabilities",
        children: [
          {
            account: "Liabilities:Cards",
            balance_children: { USD: -2450 },
            children: [
              {
                account: "Liabilities:Cards:Visa",
                balance_children: { USD: -2000 },
              },
              {
                account: "Liabilities:Cards:Amex",
                balance_children: { USD: -450 },
              },
            ],
          },
          { account: "Liabilities:Loan", balance_children: { USD: -8000 } },
        ],
      },
    ]);
    const result = selectAccountTree("USD", "liabilities", data);
    expect(result.map((n) => n.name)).toEqual(["Loan", "Cards"]);
    expect(result[1].value).toBe(2450);
    expect(result[1].children.map((c) => c.name)).toEqual(["Visa", "Amex"]);
    expect(result[1].children.map((c) => c.value)).toEqual([2000, 450]);
  });

  it("keeps an overpaid card negative once the category sign is applied", () => {
    const data = createHierarchy([
      {
        label: "Liabilities",
        children: [
          { account: "Liabilities:Visa", balance_children: { USD: -2000 } },
          // Overpaid, so beancount holds it as a debit — the cardholder is owed.
          { account: "Liabilities:Amex", balance_children: { USD: 300 } },
        ],
      },
    ]);
    const result = selectAccountTree("USD", "liabilities", data);
    expect(result.map((n) => n.name)).toEqual(["Visa", "Amex"]);
    expect(result.map((n) => n.value)).toEqual([2000, -300]);
  });

  it("omits zero-balance accounts at both levels", () => {
    const data = createHierarchy([
      {
        label: "Assets",
        children: [
          { account: "Assets:Empty", balance_children: { USD: 0 } },
          {
            account: "Assets:Bank",
            balance_children: { USD: 100 },
            children: [
              {
                account: "Assets:Bank:Checking",
                balance_children: { USD: 100 },
              },
              { account: "Assets:Bank:Closed", balance_children: { USD: 0 } },
            ],
          },
        ],
      },
    ]);
    const result = selectAccountTree("USD", "assets", data);
    // Closed is dropped, leaving Checking as Bank's only child and carrying the
    // same $100, so the two fold into one row.
    expect(result.map((n) => n.name)).toEqual(["Bank:Checking"]);
    expect(result[0].children).toEqual([]);
  });

  it("parses string balances and falls back to USD when the currency is missing", () => {
    const data = createHierarchy([
      {
        label: "Assets",
        children: [
          { account: "Assets:Cash", balance_children: { USD: "150.75" } },
          { account: "Assets:Euro", balance_children: { EUR: 900 } },
        ],
      },
    ]);
    const result = selectAccountTree("CNY", "assets", data);
    expect(result.map((n) => n.name)).toEqual(["Cash"]);
    expect(result[0].value).toBe(150.75);
  });

  it("matches the label case-insensitively", () => {
    const data = createHierarchy([
      {
        label: "ASSETS",
        children: [{ account: "Assets:Cash", balance_children: { USD: 42 } }],
      },
    ]);
    expect(selectAccountTree("USD", "assets", data).map((n) => n.name)).toEqual(
      ["Cash"],
    );
  });
});

// IncomeStatement SerializableTreeNode shape: camelCase balanceChildren,
// JSON-typed children. selectAccountTreeFromRoot normalizes it into the same
// AccountNode[] the Accounts tab / home Assets page render.
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

  it("negates credit-normal income at every level for the income category", () => {
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
    const result = selectAccountTreeFromRoot("USD", root, "income");
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

describe("selectAccountCategories", () => {
  it("returns nothing without data or a currency", () => {
    expect(selectAccountCategories("USD", undefined)).toEqual([]);
    expect(
      selectAccountCategories(
        "",
        createHierarchy([{ label: "Assets", children: [] }]),
      ),
    ).toEqual([]);
  });

  it("orders the five categories conventionally and signs each total", () => {
    const data = createHierarchy([
      // Deliberately out of order — the selector imposes the ordering.
      {
        label: "Expenses",
        total: { USD: 9726.72 },
        children: [
          { account: "Expenses:Food", balance_children: { USD: 9726.72 } },
        ],
      },
      {
        label: "Liabilities",
        total: { USD: -902.36 },
        children: [
          { account: "Liabilities:Visa", balance_children: { USD: -902.36 } },
        ],
      },
      {
        label: "Assets",
        total: { USD: 2677.28 },
        children: [
          { account: "Assets:Cash", balance_children: { USD: 2677.28 } },
        ],
      },
      {
        label: "Income",
        total: { USD: -12404 },
        children: [
          { account: "Income:Salary", balance_children: { USD: -12404 } },
        ],
      },
      {
        label: "Equity",
        total: { USD: 3579.64 },
        children: [
          { account: "Equity:Opening", balance_children: { USD: 3579.64 } },
        ],
      },
    ]);
    const result = selectAccountCategories("USD", data);
    expect(result.map((c) => c.key)).toEqual([
      "assets",
      "liabilities",
      "equity",
      "income",
      "expenses",
    ]);
    // Liabilities and Income flip to read positive; Equity flips the other way.
    expect(result.map((c) => c.value)).toEqual([
      2677.28, 902.36, -3579.64, 12404, 9726.72,
    ]);
  });

  it("carries the ledger's own root account for drilling in", () => {
    const data = createHierarchy([
      {
        label: "Assets",
        total: { USD: 100 },
        children: [{ account: "Assets:Cash", balance_children: { USD: 100 } }],
      },
    ]);
    expect(selectAccountCategories("USD", data)[0].account).toBe("Assets");
  });

  it("honors a renamed root instead of guessing one from the key", () => {
    // beancount's `option "name_assets" "Activa"` — capitalizing the category key
    // would drill into an "Assets" account this ledger doesn't have.
    const data = createHierarchy([
      {
        label: "Assets",
        account: "Activa",
        total: { USD: 100 },
        children: [{ account: "Activa:Cash", balance_children: { USD: 100 } }],
      },
    ]);
    expect(selectAccountCategories("USD", data)[0].account).toBe("Activa");
  });

  it("falls back to the label, then to empty, when no account is named", () => {
    const data = createHierarchy([
      {
        label: "Assets",
        account: "",
        total: { USD: 100 },
        children: [{ account: "Assets:Cash", balance_children: { USD: 100 } }],
      },
    ]);
    expect(selectAccountCategories("USD", data)[0].account).toBe("Assets");
  });

  it("drops categories the ledger doesn't use", () => {
    const data = createHierarchy([
      {
        label: "Assets",
        total: { USD: 100 },
        children: [{ account: "Assets:Cash", balance_children: { USD: 100 } }],
      },
      { label: "Equity", total: { USD: 0 }, children: [] },
    ]);
    expect(selectAccountCategories("USD", data).map((c) => c.key)).toEqual([
      "assets",
    ]);
  });

  it("carries the compressed account tree for each category", () => {
    const data = createHierarchy([
      {
        label: "Liabilities",
        total: { USD: -902.36 },
        children: [
          {
            account: "Liabilities:US",
            balance_children: { USD: -902.36 },
            children: [
              {
                account: "Liabilities:US:Chase",
                balance_children: { USD: -902.36 },
                children: [
                  {
                    account: "Liabilities:US:Chase:Slate",
                    balance_children: { USD: -902.36 },
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
    const [liabilities] = selectAccountCategories("USD", data);
    expect(liabilities.value).toBe(902.36);
    // Four levels restating one balance become a single row under the category.
    expect(liabilities.children.map((n) => n.name)).toEqual(["US:Chase:Slate"]);
    expect(liabilities.children[0].account).toBe("Liabilities:US:Chase:Slate");
    expect(liabilities.children[0].value).toBe(902.36);
  });
});
