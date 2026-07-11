import { selectRangedAccountTree } from "../select-ranged-account-tree";

// Backend `accountBalances` shape: { account: { currency: amount } }.
type AcctBal = Record<string, Record<string, number | string>>;
type Point = { date: string; accountBalances: AcctBal };

const point = (date: string, accounts: AcctBal): Point => ({
  date,
  accountBalances: accounts,
});

describe("selectRangedAccountTree", () => {
  it("returns an empty tree when points are missing or empty", () => {
    expect(selectRangedAccountTree("USD", undefined, "6M")).toEqual({
      tree: [],
      total: 0,
    });
    expect(selectRangedAccountTree("USD", [], "6M")).toEqual({
      tree: [],
      total: 0,
    });
  });

  it("returns an empty tree when currency is empty", () => {
    const result = selectRangedAccountTree("", [point("2024-01", {})], "ALL");
    expect(result).toEqual({ tree: [], total: 0 });
  });

  it("lists top-level accounts sorted by balance for ALL range, total = sum", () => {
    const result = selectRangedAccountTree(
      "USD",
      [
        point("2024-03-01", {
          "Income:Interest": { USD: 120 },
          "Income:Salary": { USD: 5000 },
          "Income:Consulting": { USD: 1800 },
        }),
      ],
      "ALL",
    );
    expect(result.tree.map((n) => n.name)).toEqual([
      "Salary",
      "Consulting",
      "Interest",
    ]);
    expect(result.tree.map((n) => n.value)).toEqual([5000, 1800, 120]);
    expect(result.total).toBe(6920);
  });

  it("windows to the latest month for 1M, anchored to the latest point", () => {
    const result = selectRangedAccountTree(
      "USD",
      [
        point("2024-01-01", { "Income:Salary": { USD: 1000 } }),
        point("2024-02-01", { "Income:Salary": { USD: 2000 } }),
        point("2024-03-01", { "Income:Salary": { USD: 3000 } }),
      ],
      "1M",
    );
    // Only the latest (March) point is inside a 1-month window.
    expect(result.tree.map((n) => n.value)).toEqual([3000]);
    expect(result.total).toBe(3000);
  });

  it("sums across the whole window for 3M and ALL", () => {
    const points = [
      point("2024-01-01", { "Income:Salary": { USD: 1000 } }),
      point("2024-02-01", { "Income:Salary": { USD: 2000 } }),
      point("2024-03-01", { "Income:Salary": { USD: 3000 } }),
    ];
    expect(selectRangedAccountTree("USD", points, "3M").total).toBe(6000);
    expect(selectRangedAccountTree("USD", points, "ALL").total).toBe(6000);
  });

  it("nests sub-accounts under their parent using leaf names", () => {
    const result = selectRangedAccountTree(
      "USD",
      [
        point("2024-03-01", {
          "Income:Salary:Base": { USD: 3500 },
          "Income:Salary:Bonus": { USD: 1500 },
          "Income:Consulting": { USD: 1000 },
        }),
      ],
      "ALL",
    );
    expect(result.tree.map((n) => n.name)).toEqual(["Salary", "Consulting"]);
    const salary = result.tree[0];
    expect(salary.value).toBe(5000);
    expect(salary.children.map((c) => c.name)).toEqual(["Base", "Bonus"]);
    expect(salary.children.map((c) => c.value)).toEqual([3500, 1500]);
    expect(result.total).toBe(6000);
  });

  it("uses absolute values for negative (credit-normal) income balances", () => {
    const result = selectRangedAccountTree(
      "USD",
      [
        point("2024-03-01", {
          "Income:Salary:Base": { USD: -3500 },
          "Income:Salary:Bonus": { USD: -1500 },
          "Income:Consulting": { USD: -1000 },
        }),
      ],
      "ALL",
    );
    expect(result.tree.map((n) => n.name)).toEqual(["Salary", "Consulting"]);
    // Salary rolls up its two negative leaves, shown as a positive magnitude.
    expect(result.tree[0].value).toBe(5000);
    expect(result.tree[0].children.map((c) => c.value)).toEqual([3500, 1500]);
    expect(result.tree[1].value).toBe(1000);
    expect(result.total).toBe(6000);
  });

  it("does not double-count when an account and its sub-account both appear", () => {
    // Backend sometimes reports both a parent total and its leaf; only the leaf
    // (trie-leaf) sum should count.
    const result = selectRangedAccountTree(
      "USD",
      [
        point("2024-03-01", {
          "Income:Salary": { USD: -5000 }, // parent total
          "Income:Salary:Bonus": { USD: -1500 }, // leaf
        }),
      ],
      "ALL",
    );
    // Salary's value is the leaf rollup (1500), not 5000 + 1500.
    expect(result.tree[0].name).toBe("Salary");
    expect(result.tree[0].value).toBe(1500);
    expect(result.total).toBe(1500);
  });

  it("resolves the active currency and falls back to USD", () => {
    const result = selectRangedAccountTree(
      "CNY",
      [
        point("2024-03-01", {
          "Income:Salary": { CNY: 6500 },
          "Income:UsdJob": { USD: 1000 },
        }),
      ],
      "ALL",
    );
    expect(result.tree.map((n) => n.name)).toEqual(["Salary", "UsdJob"]);
    expect(result.tree.map((n) => n.value)).toEqual([6500, 1000]);
    expect(result.total).toBe(7500);
  });

  it("parses string balances", () => {
    const result = selectRangedAccountTree(
      "USD",
      [point("2024-03-01", { "Income:Salary": { USD: "1234.50" } })],
      "ALL",
    );
    expect(result.tree[0].value).toBe(1234.5);
    expect(result.total).toBe(1234.5);
  });
});
