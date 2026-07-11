import {
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
  nodes: Array<{ label: string; children: TestChild[] }>,
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
          account: node.label,
          balance: 0,
          balance_children: {},
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
        ],
      },
    ]);
    const result = selectAccountTree("USD", "assets", data);
    expect(result.length).toBe(1);
    const bank = result[0];
    // Parent shows the rolled-up total (not the sum we recompute).
    expect(bank.name).toBe("Bank");
    expect(bank.value).toBe(28100);
    // Children are the breakdown, leaf-named and sorted desc.
    expect(bank.children.map((c) => c.name)).toEqual(["Checking", "Savings"]);
    expect(bank.children.map((c) => c.value)).toEqual([18100, 10000]);
  });

  it("recurses to build deeper levels (3+ deep)", () => {
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
    expect(result[0].name).toBe("US");
    expect(result[0].children[0].name).toBe("BofA");
    expect(result[0].children[0].children[0].name).toBe("Checking");
    expect(result[0].children[0].children[0].value).toBe(5000);
    expect(result[0].children[0].children[0].children).toEqual([]);
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

  it("uses absolute values for negative liability balances at every level", () => {
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
        ],
      },
    ]);
    const result = selectAccountTree("USD", "liabilities", data);
    expect(result[0].name).toBe("Cards");
    expect(result[0].value).toBe(2450);
    expect(result[0].children.map((c) => c.name)).toEqual(["Visa", "Amex"]);
    expect(result[0].children.map((c) => c.value)).toEqual([2000, 450]);
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
    expect(result.map((n) => n.name)).toEqual(["Bank"]);
    expect(result[0].children.map((c) => c.name)).toEqual(["Checking"]);
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
    ]);
    const result = selectAccountTreeFromRoot("USD", root);
    expect(result.length).toBe(1);
    const salary = result[0];
    expect(salary.name).toBe("Salary");
    expect(salary.value).toBe(5000);
    expect(salary.children.map((c) => c.name)).toEqual(["Base", "Bonus"]);
    expect(salary.children.map((c) => c.value)).toEqual([3500, 1500]);
  });

  it("uses absolute values for negative income (credit-normal) balances at every level", () => {
    const root = createIncomeRoot("Income", [
      {
        account: "Income:Salary",
        balanceChildren: { USD: -5000 },
        children: [
          { account: "Income:Salary:Base", balanceChildren: { USD: -3500 } },
          { account: "Income:Salary:Bonus", balanceChildren: { USD: -1500 } },
        ],
      },
    ]);
    const result = selectAccountTreeFromRoot("USD", root);
    expect(result[0].name).toBe("Salary");
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
    expect(result.map((n) => n.name)).toEqual(["Salary"]);
    expect(result[0].children.map((c) => c.name)).toEqual(["Base"]);
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
