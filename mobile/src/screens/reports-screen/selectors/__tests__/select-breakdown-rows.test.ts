import { AccountNode } from "@/components/account-list/select-account-list";
import { topNWithOther, OTHER_ACCOUNT } from "../select-breakdown-rows";

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
});
