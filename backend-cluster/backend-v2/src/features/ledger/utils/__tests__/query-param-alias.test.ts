import { BadUserInputError } from "@/shared/errors";
import { resolveFilterAccount } from "../query-param-alias";

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
