import { describe, expect, it } from "vitest";
import {
  applyTargetAccount,
  countSelectedWithTarget,
} from "../apply-target-account";

const UNCATEGORIZED = "Expenses:Uncategorized";

describe("applyTargetAccount", () => {
  it("fill-blank sets rows without a target and keeps every existing one", () => {
    const targets = new Map([
      ["a", "Expenses:Dining"], // hand-picked
      ["b", "Expenses:Groceries"], // AI Fill suggestion
    ]);

    const result = applyTargetAccount(
      new Set(["a", "b", "c", "d"]),
      targets,
      UNCATEGORIZED,
      "fill-blank",
    );

    expect(Object.fromEntries(result.targets)).toEqual({
      a: "Expenses:Dining",
      b: "Expenses:Groceries",
      c: UNCATEGORIZED,
      d: UNCATEGORIZED,
    });
    expect(result.applied).toBe(2);
  });

  it("treats an empty stored target as blank", () => {
    const result = applyTargetAccount(
      new Set(["a"]),
      new Map([["a", ""]]),
      UNCATEGORIZED,
      "fill-blank",
    );

    expect(result.targets.get("a")).toBe(UNCATEGORIZED);
    expect(result.applied).toBe(1);
  });

  it("overwrite replaces existing targets too", () => {
    const targets = new Map([["a", "Expenses:Dining"]]);

    const result = applyTargetAccount(
      new Set(["a", "b"]),
      targets,
      UNCATEGORIZED,
      "overwrite",
    );

    expect(result.targets.get("a")).toBe(UNCATEGORIZED);
    expect(result.targets.get("b")).toBe(UNCATEGORIZED);
    expect(result.applied).toBe(2);
  });

  it("does not count a row already holding the chosen account as applied", () => {
    const result = applyTargetAccount(
      new Set(["a", "b"]),
      new Map([["a", UNCATEGORIZED]]),
      UNCATEGORIZED,
      "overwrite",
    );

    expect(result.applied).toBe(1);
  });

  it("leaves rows outside the selection exactly as they were", () => {
    const targets = new Map([
      ["selected", "Expenses:Dining"],
      ["other", "Expenses:Travel"],
    ]);

    const result = applyTargetAccount(
      new Set(["selected"]),
      targets,
      UNCATEGORIZED,
      "overwrite",
    );

    expect(result.targets.get("other")).toBe("Expenses:Travel");
    expect(result.targets.has("never-seen")).toBe(false);
    expect(result.targets.size).toBe(2);
  });

  it("acts on every selected id, so a row a filter hides is set too", () => {
    // The helper is handed ids, never the filtered list: the id of a row that
    // is off screen is in the selection like any other.
    const hiddenByFilter = "row-hidden-by-filter";

    const result = applyTargetAccount(
      new Set(["visible-1", "visible-2", hiddenByFilter]),
      new Map(),
      UNCATEGORIZED,
      "fill-blank",
    );

    expect(result.targets.get(hiddenByFilter)).toBe(UNCATEGORIZED);
    expect(result.applied).toBe(3);
  });

  it.each(["", "   "])(
    "an empty account (%j) changes nothing in either mode",
    (account) => {
      const targets = new Map([["a", "Expenses:Dining"]]);

      for (const mode of ["fill-blank", "overwrite"] as const) {
        const result = applyTargetAccount(
          new Set(["a", "b"]),
          targets,
          account,
          mode,
        );

        expect(Object.fromEntries(result.targets)).toEqual({
          a: "Expenses:Dining",
        });
        expect(result.applied).toBe(0);
      }
    },
  );

  it("never mutates the map it was given", () => {
    const targets = new Map([["a", "Expenses:Dining"]]);
    const before = new Map(targets);

    const result = applyTargetAccount(
      new Set(["a", "b"]),
      targets,
      UNCATEGORIZED,
      "overwrite",
    );

    expect(targets).toEqual(before);
    expect(result.targets).not.toBe(targets);
  });

  it("with nothing selected applies nothing", () => {
    const result = applyTargetAccount(
      new Set(),
      new Map([["a", "Expenses:Dining"]]),
      UNCATEGORIZED,
      "overwrite",
    );

    expect(result.applied).toBe(0);
    expect(result.targets.get("a")).toBe("Expenses:Dining");
  });
});

describe("countSelectedWithTarget", () => {
  it("counts only selected rows that already have a target", () => {
    const targets = new Map([
      ["a", "Expenses:Dining"],
      ["b", ""],
      ["outside-selection", "Expenses:Travel"],
    ]);

    expect(countSelectedWithTarget(new Set(["a", "b", "c"]), targets)).toBe(1);
    expect(countSelectedWithTarget(new Set(), targets)).toBe(0);
  });

  it("agrees with what each mode would then change", () => {
    const targets = new Map([
      ["a", "Expenses:Dining"],
      ["b", "Expenses:Groceries"],
    ]);
    const selection = new Set(["a", "b", "c"]);
    const filled = countSelectedWithTarget(selection, targets);

    expect(
      applyTargetAccount(selection, targets, UNCATEGORIZED, "fill-blank")
        .applied,
    ).toBe(selection.size - filled);
    expect(
      applyTargetAccount(selection, targets, UNCATEGORIZED, "overwrite")
        .applied,
    ).toBe(selection.size);
  });
});
