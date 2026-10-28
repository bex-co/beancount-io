import { BadUserInputError } from "@/shared/errors";
import {
  resolveFilterAccount,
  resolveGroupBy,
  resolveWithChildren,
} from "../query-param-alias";

// w23/m10/t002: the one filter-param spelling rule.
describe("resolveFilterAccount", () => {
  it("accepts either spelling", () => {
    expect(resolveFilterAccount({ primary: "Assets:Cash" })).toBe(
      "Assets:Cash",
    );
    expect(resolveFilterAccount({ legacy: "Assets:Cash" })).toBe("Assets:Cash");
  });

  it("is missing when both spellings are missing", () => {
    expect(resolveFilterAccount({})).toBeUndefined();
    expect(
      resolveFilterAccount({ primary: null, legacy: null }),
    ).toBeUndefined();
  });

  it("accepts both spellings when they agree", () => {
    expect(
      resolveFilterAccount({ primary: "Assets:Cash", legacy: "Assets:Cash" }),
    ).toBe("Assets:Cash");
  });

  it("refuses two different accounts instead of guessing", () => {
    expect(() =>
      resolveFilterAccount({
        primary: "Assets:Cash",
        legacy: "Expenses:Food",
      }),
    ).toThrow(BadUserInputError);
    expect(() =>
      resolveFilterAccount({
        primary: "Assets:Cash",
        legacy: "Expenses:Food",
      }),
    ).toThrow(/filter_account.*filterAccount.*two different accounts/);
  });
});

// w23/m10/t003: the tristate children twin — both missing stays missing.
describe("resolveWithChildren", () => {
  it("accepts either spelling", () => {
    expect(resolveWithChildren({ primary: false })).toBe(false);
    expect(resolveWithChildren({ legacy: false })).toBe(false);
  });

  it("stays missing when both spellings are missing", () => {
    expect(resolveWithChildren({})).toBeUndefined();
    expect(
      resolveWithChildren({ primary: null, legacy: null }),
    ).toBeUndefined();
  });

  it("accepts both spellings when they agree", () => {
    expect(resolveWithChildren({ primary: false, legacy: false })).toBe(false);
  });

  it("refuses one true and one false instead of guessing", () => {
    expect(() => resolveWithChildren({ primary: true, legacy: false })).toThrow(
      BadUserInputError,
    );
    expect(() => resolveWithChildren({ primary: false, legacy: true })).toThrow(
      /with_children.*withChildren/,
    );
  });
});

// w23/144: the holdings grouping twin — the read echoes group_by.
describe("resolveGroupBy", () => {
  it("accepts either spelling", () => {
    expect(resolveGroupBy({ primary: "commodity" })).toBe("commodity");
    expect(resolveGroupBy({ legacy: "commodity" })).toBe("commodity");
  });

  it("stays missing when both spellings are missing", () => {
    expect(resolveGroupBy({})).toBeUndefined();
    expect(resolveGroupBy({ primary: null, legacy: null })).toBeUndefined();
  });

  it("accepts both spellings when they agree", () => {
    expect(
      resolveGroupBy({ primary: "account", legacy: "account" }),
    ).toBe("account");
  });

  it("refuses two different groupings instead of guessing", () => {
    expect(() =>
      resolveGroupBy({ primary: "commodity", legacy: "account" }),
    ).toThrow(BadUserInputError);
    expect(() =>
      resolveGroupBy({ primary: "commodity", legacy: "account" }),
    ).toThrow(/group_by.*groupBy.*two different groupings/);
  });
});
