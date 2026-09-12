import { AccountNode } from "@/components/account-list/select-account-list";
import {
  breakdownRowAccessibilityValue,
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
      "$1,234.00, 43% of total",
    );
  });

  it("rounds the share exactly as the visible % label does", () => {
    expect(breakdownRowAccessibilityValue("$1.00", 0.4, t)).toBe(
      "$1.00, 0% of total",
    );
    expect(breakdownRowAccessibilityValue("$1.00", 99.5, t)).toBe(
      "$1.00, 100% of total",
    );
  });

  it("speaks only the amount for a sub-account row, which draws no bar", () => {
    expect(breakdownRowAccessibilityValue("-$20.00", null, t)).toBe("-$20.00");
  });
});
