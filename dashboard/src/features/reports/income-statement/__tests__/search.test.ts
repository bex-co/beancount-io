import { describe, expect, it } from "vitest";
import { incomeStatementSearchSchema } from "../search";

/** The chart and its bar mode come from the URL; anything else is ignored. */
describe("incomeStatementSearchSchema (w4/998)", () => {
  it("keeps a known view and bar mode", () => {
    expect(
      incomeStatementSearchSchema.parse({ view: "expenses", mode: "single" }),
    ).toEqual({ view: "expenses", mode: "single" });
  });

  it("drops unknown or malformed values, leaving the defaults", () => {
    expect(
      incomeStatementSearchSchema.parse({ view: "pie", mode: ["single"] }),
    ).toEqual({ view: undefined, mode: undefined });
    expect(incomeStatementSearchSchema.parse({})).toEqual({
      view: undefined,
      mode: undefined,
    });
  });
});
