import fs from "fs";
import path from "path";
import type { BudgetGroup } from "../../budget-screen/selectors/budget-selectors";
import { updateBudgetDates } from "../update-date";
import { budgetInEffectDate } from "../../budget-screen/selectors/budget-selectors";

// w21/623: Update ▸ Date Oct 1 ▸ 300 on a budget whose current entry is dated
// Oct 21 saved, and changed nothing: the newer entry stayed in force.
describe("updateBudgetDates", () => {
  const today = new Date(2026, 9, 22);

  it("limits an Update to the current entry's day or later", () => {
    const { minimum, initial } = updateBudgetDates("2026-10-21", today);
    expect(minimum?.getFullYear()).toBe(2026);
    expect(minimum?.getMonth()).toBe(9);
    expect(minimum?.getDate()).toBe(21);
    expect(initial.getTime()).toBe(today.getTime());
  });

  // w21/909: a budget that has not started had its picker floored on, and
  // started at, its first entry's future date.
  it("starts on today, unlimited, for a budget that has not started", () => {
    const { minimum, initial } = updateBudgetDates("2026-11-01", today);
    expect(minimum).toBe(undefined);
    expect(initial.getTime()).toBe(today.getTime());
  });

  it("still limits an entry dated today", () => {
    const { minimum } = updateBudgetDates("2026-10-22", today);
    expect(minimum?.getDate()).toBe(22);
  });

  it("leaves an Add unlimited", () => {
    const { minimum, initial } = updateBudgetDates(undefined, today);
    expect(minimum).toBe(undefined);
    expect(initial.getTime()).toBe(today.getTime());
    expect(updateBudgetDates("garbage", today).minimum).toBe(undefined);
  });
});

describe("budgetInEffectDate", () => {
  const history = [
    { date: "2026-01-01", entry_hash: "a" },
    { date: "2027-01-01", entry_hash: "b" },
  ];
  const group = (entry_hash: string) =>
    ({ entry_hash, budgetHistory: history }) as unknown as BudgetGroup;

  // w21/661: next year's budget was the floor, so today's couldn't be fixed.
  it("is the entry in effect, not a later one already written down", () => {
    expect(budgetInEffectDate(group("a"))).toBe("2026-01-01");
  });

  it("is the earliest future entry when none is in effect yet", () => {
    const only = { entry_hash: "b", budgetHistory: [history[1]] };
    expect(budgetInEffectDate(only as unknown as BudgetGroup)).toBe(
      "2027-01-01",
    );
  });
});

describe("the Update flow's wiring", () => {
  const read = (...parts: string[]) =>
    fs
      .readFileSync(path.join(__dirname, "..", "..", ...parts), "utf8")
      .replace(/\s+/g, "");

  it("passes the current date in and limits the picker with it", () => {
    expect(
      read("budget-screen", "budget-screen.tsx").includes(
        "currentDate:budgetInEffectDate(group),",
      ),
    ).toBe(true);
    expect(
      read("add-budget-screen", "add-budget-screen.tsx").includes(
        "minimumDate={dates.minimum}",
      ),
    ).toBe(true);
  });
});
