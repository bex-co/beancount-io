import { describe, expect, it } from "vitest";
import { buildActivityForest, buildCashAccountForest } from "../statement-tree";
import type { CashAccountSnapshot, CashFlowRow } from "../model";

function row(
  accountPath: string,
  amounts: Record<string, string>,
  roleSource: CashFlowRow["roleSource"] = "heuristic",
): CashFlowRow {
  return {
    accountPath,
    label: accountPath.split(":").pop() || accountPath,
    activity: "operating",
    roleSource,
    amounts,
  };
}

type Forest = ReturnType<typeof buildActivityForest>;

describe("buildActivityForest", () => {
  const rows = [
    row("Expenses:Food:Groceries", { USD: "0.10", EUR: "5.00" }),
    row("Expenses:Food:Restaurants", { USD: "0.20" }),
    row("Expenses:Rent", { USD: "-1500.00" }),
  ];
  const forest = buildActivityForest(rows, "USD");

  it("returns a forest of real accounts — no synthetic section root", () => {
    // No "Expenses" or activity-title node; top level is real accounts.
    expect(forest.map((node) => node.account)).toEqual([
      "Expenses:Rent",
      "Expenses:Food",
    ]);
  });

  it("sums internal nodes with exact decimals, per currency", () => {
    const food = forest.find((child) => child.account === "Expenses:Food")!;
    // 0.10 + 0.20 must not become 0.30000000000000004.
    expect(food.balanceChildren).toEqual({ EUR: "5.00", USD: "0.30" });
    expect(food.balance).toEqual({ EUR: "5.00", USD: "0.30" });

    const childPaths = (food.children as unknown as Forest).map(
      (child) => child.account,
    );
    expect(childPaths).toEqual([
      "Expenses:Food:Restaurants",
      "Expenses:Food:Groceries",
    ]);
  });

  it("sorts nodes at every level by descending primary-currency magnitude", () => {
    // |−1500| > |0.30| at the top level…
    expect(forest[0].account).toBe("Expenses:Rent");
    expect(forest[1].account).toBe("Expenses:Food");
    // …and |0.20| > |0.10| within Food.
    const foodChildren = forest[1].children as unknown as Forest;
    expect(foodChildren[0].account).toBe("Expenses:Food:Restaurants");
    expect(foodChildren[1].account).toBe("Expenses:Food:Groceries");
  });

  it("keeps leaf amounts on the leaf nodes", () => {
    expect(forest[0].balanceChildren).toEqual({ USD: "-1500.00" });
    const groceries = (forest[1].children as unknown as Forest)[1];
    expect(groceries.balanceChildren).toEqual({ USD: "0.10", EUR: "5.00" });
    expect(groceries.children).toEqual([]);
  });

  it("handles rows one segment below the root", () => {
    const forest = buildActivityForest(
      [row("Income:Salary", { USD: "5000.00" })],
      "USD",
    );
    expect(forest).toHaveLength(1);
    expect(forest[0].account).toBe("Income:Salary");
    expect(forest[0].balanceChildren).toEqual({ USD: "5000.00" });
  });

  it("keeps same-named accounts under different roots distinct", () => {
    // Income:Rent and Expenses:Rent share a segment name but are different
    // accounts; keying by full path must not merge them.
    const forest = buildActivityForest(
      [
        row("Income:Rent", { USD: "900.00" }),
        row("Expenses:Rent", { USD: "-1500.00" }),
      ],
      "USD",
    );
    expect(forest.map((node) => [node.account, node.balanceChildren])).toEqual([
      ["Expenses:Rent", { USD: "-1500.00" }],
      ["Income:Rent", { USD: "900.00" }],
    ]);
  });

  it("never nests an account under a parent from another root", () => {
    const forest = buildActivityForest(
      [
        row("Assets:Bank:CD", { USD: "-2000.00" }),
        row("Liabilities:Bank:Loan", { USD: "5000.00" }),
      ],
      "USD",
    );
    const byAccount = Object.fromEntries(
      forest.map((node) => [
        node.account,
        (node.children as unknown as Forest).map((child) => child.account),
      ]),
    );
    expect(byAccount).toEqual({
      "Assets:Bank": ["Assets:Bank:CD"],
      "Liabilities:Bank": ["Liabilities:Bank:Loan"],
    });
  });

  it("returns an empty forest for an empty section", () => {
    expect(buildActivityForest([], "USD")).toEqual([]);
  });

  it("carries each row's role source onto its leaf node", () => {
    const forest = buildActivityForest(
      [
        row("Income:Salary", { USD: "5000.00" }, "declared"),
        row("Expenses:Rent", { USD: "-1500.00" }),
      ],
      "USD",
    );
    const byAccount = Object.fromEntries(
      forest.map((child) => [child.account, child.roleSource]),
    );

    expect(byAccount["Income:Salary"]).toBe("declared");
    expect(byAccount["Expenses:Rent"]).toBe("heuristic");
  });

  it("leaves internal nodes without a role source", () => {
    const forest = buildActivityForest(
      [row("Expenses:Food:Groceries", { USD: "0.10" }, "declared")],
      "USD",
    );
    const food = forest[0];
    expect(food.account).toBe("Expenses:Food");
    expect(food.roleSource).toBeUndefined();
    const groceries = (food.children as unknown as Forest)[0];
    expect(groceries.roleSource).toBe("declared");
  });
});

describe("buildCashAccountForest", () => {
  const snapshots: CashAccountSnapshot[] = [
    {
      account: "Assets:Bank:Checking",
      balance: { USD: "1000.00" },
      roleSource: "declared",
    },
    {
      account: "Assets:Bank:Savings",
      balance: { USD: "2500.00", EUR: "100.00" },
      roleSource: "heuristic",
    },
  ];

  it("lists the real cash accounts, sorted by descending primary magnitude", () => {
    const forest = buildCashAccountForest(snapshots, "USD");
    expect(forest.map((node) => node.account)).toEqual([
      "Assets:Bank:Savings",
      "Assets:Bank:Checking",
    ]);
    expect(forest[0].balanceChildren).toEqual({
      USD: "2500.00",
      EUR: "100.00",
    });
    expect(forest[1].balanceChildren).toEqual({ USD: "1000.00" });
  });

  it("threads each snapshot's role source onto its node", () => {
    const forest = buildCashAccountForest(snapshots, "USD");
    expect(forest[0].roleSource).toBe("heuristic");
    expect(forest[1].roleSource).toBe("declared");
  });

  it("returns an empty forest when there are no cash accounts", () => {
    expect(buildCashAccountForest([], "USD")).toEqual([]);
  });
});
