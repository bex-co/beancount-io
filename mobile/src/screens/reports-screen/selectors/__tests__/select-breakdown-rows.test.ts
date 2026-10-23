import { AccountNode } from "@/components/account-list/select-account-list";
import {
  breakdownRowAccessibilityValue,
  breakdownShare,
  roundedShares,
  shareBase,
  topNWithOther,
  OTHER_ACCOUNT,
} from "../select-breakdown-rows";
import { en } from "../../../../translations/en";

function node(name: string, value: number): AccountNode {
  return { account: `Expenses:${name}`, name, value, children: [] };
}

describe("topNWithOther", () => {
  it("returns items unchanged when there is at most one extra row", () => {
    const items = [node("Food", 100), node("Rent", 90), node("Fun", 10)];
    // n=2 → 3 items is n+1, so bucketing a single leftover is pointless.
    expect(topNWithOther(items, 2, "Other")).toEqual(items);
  });

  it("folds the tail beyond n into a synthetic Other row", () => {
    const items = [
      node("Food", 100),
      node("Rent", 90),
      node("Transport", 30),
      node("Utilities", 20),
      node("Fun", 5),
    ];
    const result = topNWithOther(items, 2, "Other");
    expect(result.length).toBe(3);
    expect(result.slice(0, 2)).toEqual(items.slice(0, 2));

    const other = result[2];
    expect(other.account).toBe(OTHER_ACCOUNT);
    expect(other.name).toBe("Other");
    expect(other.value).toBe(55); // 30 + 20 + 5
    expect(other.children).toEqual(items.slice(2)); // tail preserved for drill-down
  });

  // w21/371: Travel +500 and Electronics -490 folded to "Other 10.00 · 0%".
  it("folds only spending and keeps a refunded row visible", () => {
    const items = [
      node("A", 100),
      node("B", 90),
      node("Travel", 500),
      node("Meals", 20),
      node("Electronics", -490),
    ];
    const result = topNWithOther(items, 2, "Other");
    expect(result.map((row) => row.name)).toEqual([
      "A",
      "B",
      "Other",
      "Electronics",
    ]);
    expect(result[2].value).toBe(520);
    expect(result[2].children.map((row) => row.name)).toEqual([
      "Travel",
      "Meals",
    ]);
    expect(result[3].value).toBe(-490);
  });

  it("does not bucket a single spending row left beside refunds", () => {
    const items = [
      node("A", 100),
      node("B", 90),
      node("Meals", 20),
      node("Electronics", -490),
    ];
    expect(topNWithOther(items, 2, "Other")).toEqual(items);
  });

  it("returns an empty array unchanged", () => {
    expect(topNWithOther([], 7, "Other")).toEqual([]);
  });

  it("uses a caller-supplied account id for the Other row", () => {
    const items = [
      node("Food", 100),
      node("Rent", 90),
      node("Transport", 30),
      node("Utilities", 20),
    ];
    const result = topNWithOther(items, 2, "Other", "__other_expenses__");
    expect(result[2].account).toBe("__other_expenses__");
    expect(result[2].value).toBe(50);
  });
});

// Interpolates the real English copy, so a renamed key or a dropped token fails
// here rather than shipping "undefined" into a spoken value.
const t = (key: string, params?: Record<string, unknown>) =>
  String((en as unknown as Record<string, string>)[key]).replace(
    /{{(\w+)}}/g,
    (_match, name: string) => String(params?.[name]),
  );

describe("breakdownRowAccessibilityValue", () => {
  it("pairs the amount with the row's share for a top-level category", () => {
    expect(breakdownRowAccessibilityValue("$1,234.00", 42.6, t)).toBe(
      "$1,234.00, 43% of spending",
    );
  });

  it("rounds the share exactly as the visible % label does", () => {
    expect(breakdownRowAccessibilityValue("$1.00", 0.4, t)).toBe(
      "$1.00, 0% of spending",
    );
    expect(breakdownRowAccessibilityValue("$1.00", 99.5, t)).toBe(
      "$1.00, 100% of spending",
    );
  });

  it("speaks only the amount for a sub-account row, which draws no bar", () => {
    expect(breakdownRowAccessibilityValue("-$20.00", null, t)).toBe("-$20.00");
  });
});

// w21/039: a lone -$250.00 clawback read "0%" of its section.
describe("breakdownShare", () => {
  it("states a positive row's share of a positive section", () => {
    expect(breakdownShare(25, 100)).toBe(25);
    expect(breakdownShare(150, 100)).toBe(100);
  });

  it("has no share for a section that nets to zero or below", () => {
    expect(breakdownShare(-250, -250)).toBe(null);
    expect(breakdownShare(10, 0)).toBe(null);
  });

  it("has no share for a refunded row in an otherwise positive section", () => {
    expect(breakdownShare(-40, 100)).toBe(null);
    expect(breakdownShare(140, 100)).toBe(100);
  });

  it("speaks only the amount when there is no share", () => {
    expect(
      breakdownRowAccessibilityValue("-$250.00", breakdownShare(-250, -250), t),
    ).toBe("-$250.00");
  });
});

// w21/370: with a refunded category the headline is the net total, and shares
// divided by it added up to 125%.
describe("shares with a refunded category", () => {
  const rows = [{ value: 300 }, { value: 200 }, { value: -100 }];

  it("divide by the positive rows, so they add up to 100%", () => {
    const base = shareBase(rows);
    expect(base).toBe(500);
    expect(breakdownShare(300, base)).toBe(60);
    expect(breakdownShare(200, base)).toBe(40);
    expect(breakdownShare(-100, base)).toBe(null);
  });

  it("have none when no row is positive", () => {
    expect(shareBase([{ value: -250 }])).toBe(0);
    expect(breakdownShare(-250, shareBase([{ value: -250 }]))).toBe(null);
    expect(shareBase([])).toBe(0);
  });

  it("are what the breakdown card divides by", () => {
    const src = require("fs")
      .readFileSync(
        require("path").join(
          __dirname,
          "../../components/category-breakdown.tsx",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(src.includes("constbase=shareBase(items);")).toBe(true);
    expect(src.includes("breakdownShare(node.value,base)")).toBe(true);
  });
});

// w21/372: an empty section said "No accounts", even under a note naming
// activity in another currency.
describe("the empty breakdown", () => {
  const read = (relative: string) =>
    require("fs")
      .readFileSync(require("path").join(__dirname, "../..", relative), "utf8")
      .replace(/\s+/g, "");

  it("says what the period lacks, and stays quiet under a note", () => {
    const card = read("components/category-breakdown.tsx");
    expect(
      card.includes(
        "note?null:(<Textstyle={styles.empty}>{emptyMessage}</Text>)",
      ),
    ).toBe(true);
    expect(card.includes('t("noAccounts")')).toBe(false);
  });

  it("is worded per section on Reports", () => {
    const screen = read("reports-screen.tsx");
    expect(screen.includes('emptyMessage={t("reportsNoExpenses")}')).toBe(true);
    expect(screen.includes('emptyMessage={t("reportsNoIncome")}')).toBe(true);
    expect(en.reportsNoExpenses).toBe("No expenses in this period");
    expect(en.reportsNoIncome).toBe("No income in this period");
  });
});

// w21/373: each row rounded on its own, so three equal categories read 33% three
// times and 96 + 5 read 101.
describe("roundedShares", () => {
  const rows = (...values: number[]) =>
    values.map((value, i) => ({ account: `Expenses:C${i}`, value }));
  const total = (shares: Map<string, number>) =>
    Array.from(shares.values()).reduce((sum, n) => sum + n, 0);

  it("adds up to exactly 100", () => {
    expect(total(roundedShares(rows(100, 100, 100)))).toBe(100);
    expect(total(roundedShares(rows(96.4, 4.6)))).toBe(100);
    expect(total(roundedShares(rows(1, 1, 1, 1, 1, 1, 1)))).toBe(100);
    expect(total(roundedShares(rows(300, 200)))).toBe(100);
  });

  it("gives the extra points to the largest remainders, ties to the first", () => {
    const equal = roundedShares(rows(100, 100, 100));
    expect(equal.get("Expenses:C0")).toBe(34);
    expect(equal.get("Expenses:C1")).toBe(33);
    expect(equal.get("Expenses:C2")).toBe(33);
    const uneven = roundedShares(rows(96.4, 4.6));
    expect(uneven.get("Expenses:C0")).toBe(95);
    expect(uneven.get("Expenses:C1")).toBe(5);
  });

  it("states a plain share as it is, and none for a refunded row", () => {
    const shares = roundedShares(rows(300, 200, -100));
    expect(shares.get("Expenses:C0")).toBe(60);
    expect(shares.get("Expenses:C1")).toBe(40);
    expect(shares.has("Expenses:C2")).toBe(false);
    expect(roundedShares(rows(-250)).size).toBe(0);
    expect(roundedShares([]).size).toBe(0);
  });

  it("is what the card prints and speaks", () => {
    const card = require("fs")
      .readFileSync(
        require("path").join(
          __dirname,
          "../../components/category-breakdown.tsx",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(card.includes("constshares=roundedShares(items);")).toBe(true);
    expect(card.includes('{printed===null?"":`${printed}%`}')).toBe(true);
    expect(
      card.includes(
        "breakdownRowAccessibilityValue(amountText,printed,t,shareOf,)",
      ),
    ).toBe(true);
  });
});

// w21/788: the share is of the positive rows, but "of total" was spoken
// beside a net-refunded headline: Food read "67% of total" under $100.
describe("a row's spoken share", () => {
  it("names spending or earnings, the base it is of", () => {
    const items = [node("Food", 400), node("Shop", 200), node("Tv", -500)];
    const food = roundedShares(items).get("Expenses:Food")!;
    expect(food).toBe(67);
    expect(shareBase(items)).toBe(600);
    expect(breakdownRowAccessibilityValue("$400.00", food, t)).toBe(
      "$400.00, 67% of spending",
    );
    expect(breakdownRowAccessibilityValue("$3,000.00", 75, t, "earnings")).toBe(
      "$3,000.00, 75% of earnings",
    );
  });

  it("is said per section on the Reports screen", () => {
    const screen = require("fs")
      .readFileSync(
        require("path").join(__dirname, "../../reports-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      screen.includes(
        'emptyMessage={t("reportsNoExpenses")}shareOf="spending"',
      ),
    ).toBe(true);
    expect(
      screen.includes('emptyMessage={t("reportsNoIncome")}shareOf="earnings"'),
    ).toBe(true);
  });
});
