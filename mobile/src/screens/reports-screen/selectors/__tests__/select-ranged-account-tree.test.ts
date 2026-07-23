import { selectRangedAccountTree } from "../select-ranged-account-tree";

// Backend `accountBalances` shape: { account: { currency: amount } }.
type AcctBal = Record<string, Record<string, number | string>>;
type Point = { date: string; accountBalances: AcctBal };

const point = (date: string, accounts: AcctBal): Point => ({
  date,
  accountBalances: accounts,
});

// Income is credit-normal in beancount — the backend reports it negative, and
// the "income" category sign flips it back to a positive figure for display.
describe("selectRangedAccountTree", () => {
  it("returns an empty tree when points are missing or empty", () => {
    expect(selectRangedAccountTree("USD", undefined, "6M", "income")).toEqual({
      tree: [],
      total: 0,
    });
    expect(selectRangedAccountTree("USD", [], "6M", "income")).toEqual({
      tree: [],
      total: 0,
    });
  });

  it("returns an empty tree when currency is empty", () => {
    const result = selectRangedAccountTree(
      "",
      [point("2024-01", {})],
      "ALL",
      "income",
    );
    expect(result).toEqual({ tree: [], total: 0 });
  });

  it("lists top-level accounts sorted by balance for ALL range, total = sum", () => {
    const result = selectRangedAccountTree(
      "USD",
      [
        point("2024-03-01", {
          "Income:Interest": { USD: -120 },
          "Income:Salary": { USD: -5000 },
          "Income:Consulting": { USD: -1800 },
        }),
      ],
      "ALL",
      "income",
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
        point("2024-01-01", { "Income:Salary": { USD: -1000 } }),
        point("2024-02-01", { "Income:Salary": { USD: -2000 } }),
        point("2024-03-01", { "Income:Salary": { USD: -3000 } }),
      ],
      "1M",
      "income",
    );
    // Only the latest (March) point is inside a 1-month window.
    expect(result.tree.map((n) => n.value)).toEqual([3000]);
    expect(result.total).toBe(3000);
  });

  it("sums across the whole window for 3M and ALL", () => {
    const points = [
      point("2024-01-01", { "Income:Salary": { USD: -1000 } }),
      point("2024-02-01", { "Income:Salary": { USD: -2000 } }),
      point("2024-03-01", { "Income:Salary": { USD: -3000 } }),
    ];
    expect(selectRangedAccountTree("USD", points, "3M", "income").total).toBe(
      6000,
    );
    expect(selectRangedAccountTree("USD", points, "ALL", "income").total).toBe(
      6000,
    );
  });

  it("nests sub-accounts under their parent using leaf names", () => {
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
      "income",
    );
    expect(result.tree.map((n) => n.name)).toEqual(["Salary", "Consulting"]);
    const salary = result.tree[0];
    expect(salary.value).toBe(5000);
    expect(salary.children.map((c) => c.name)).toEqual(["Base", "Bonus"]);
    expect(salary.children.map((c) => c.value)).toEqual([3500, 1500]);
    expect(result.total).toBe(6000);
  });

  it("negates credit-normal income so it reads positive", () => {
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
      "income",
    );
    expect(result.tree.map((n) => n.name)).toEqual(["Salary", "Consulting"]);
    expect(result.tree[0].value).toBe(5000);
    expect(result.tree[0].children.map((c) => c.value)).toEqual([3500, 1500]);
    expect(result.tree[1].value).toBe(1000);
    expect(result.total).toBe(6000);
  });

  it("keeps expenses debit-normal and surfaces a refund as negative", () => {
    const result = selectRangedAccountTree(
      "USD",
      [
        point("2024-03-01", {
          "Expenses:Food:Groceries": { USD: 400 },
          // A return credited back to the card: genuinely negative spend.
          "Expenses:Food:Dining": { USD: -60 },
        }),
      ],
      "ALL",
      "expenses",
    );
    // Food is the only top-level expense and its children fully explain it, so
    // its segment moves onto the rows rather than taking one of its own.
    expect(result.tree.map((n) => n.name)).toEqual([
      "Food:Groceries",
      "Food:Dining",
    ]);
    expect(result.tree.map((n) => n.value)).toEqual([400, -60]);
    expect(result.total).toBe(340);
  });

  it("sums an account's own balance together with its sub-accounts'", () => {
    // The backend reports each account's OWN, non-overlapping balance — an
    // account can carry its own direct postings AND appear next to a sub-account
    // (which carries its own). Both must count: Salary's own 5000 plus Bonus 1500.
    const result = selectRangedAccountTree(
      "USD",
      [
        point("2024-03-01", {
          "Income:Salary": { USD: -5000 }, // Salary's own direct postings
          "Income:Salary:Bonus": { USD: -1500 }, // a sub-account's own postings
        }),
      ],
      "ALL",
      "income",
    );
    expect(result.tree[0].name).toBe("Salary");
    expect(result.tree[0].value).toBe(6500);
    expect(result.total).toBe(6500);
  });

  it("counts a parent's own balance even when it has a commodity-only sub-account", () => {
    // The real Taxes/401k case that mismatched the web dashboard: an account with
    // its own USD withholding sitting next to a 401k leg booked in a non-USD
    // commodity (resolves to 0 USD). Summing only trie leaves dropped Federal's
    // own $28k; every account's own balance must be counted.
    const result = selectRangedAccountTree(
      "USD",
      [
        point("2024-03-01", {
          "Expenses:Taxes:Federal": { USD: 28000 }, // own withholding
          "Expenses:Taxes:Federal:PreTax401k": { IRAUSD: 18500 }, // 0 in USD
          "Expenses:Taxes:State": { USD: 9000 },
        }),
      ],
      "ALL",
      "expenses",
    );
    // 28000 (Federal own) + 0 (401k, non-USD) + 9000 (State) = 37000. The leaf-only
    // bug produced 9000 (Federal's own $28k dropped because it had a sub-account).
    expect(result.total).toBe(37000);
  });

  it("resolves the active currency and falls back to USD", () => {
    const result = selectRangedAccountTree(
      "CNY",
      [
        point("2024-03-01", {
          "Income:Salary": { CNY: -6500 },
          "Income:UsdJob": { USD: -1000 },
        }),
      ],
      "ALL",
      "income",
    );
    expect(result.tree.map((n) => n.name)).toEqual(["Salary", "UsdJob"]);
    expect(result.tree.map((n) => n.value)).toEqual([6500, 1000]);
    expect(result.total).toBe(7500);
  });

  it("parses string balances", () => {
    const result = selectRangedAccountTree(
      "USD",
      [point("2024-03-01", { "Income:Salary": { USD: "-1234.50" } })],
      "ALL",
      "income",
    );
    expect(result.tree[0].value).toBe(1234.5);
    expect(result.total).toBe(1234.5);
  });
});
