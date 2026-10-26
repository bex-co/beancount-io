import { BadUserInputError } from "@/shared/errors";
import { DRY_RUN_NAMES, resolveFlagAlias } from "../flag-alias";

// w23/m9/t002: the one preview-flag spelling rule.
describe("resolveFlagAlias", () => {
  it("accepts either spelling", () => {
    expect(resolveFlagAlias({ primary: true }, DRY_RUN_NAMES)).toBe(true);
    expect(resolveFlagAlias({ legacy: true }, DRY_RUN_NAMES)).toBe(true);
  });

  it("is off when both spellings are missing", () => {
    expect(resolveFlagAlias({}, DRY_RUN_NAMES)).toBe(false);
  });

  it("treats explicit null as missing", () => {
    expect(
      resolveFlagAlias({ primary: null, legacy: null }, DRY_RUN_NAMES),
    ).toBe(false);
    expect(
      resolveFlagAlias({ primary: null, legacy: true }, DRY_RUN_NAMES),
    ).toBe(true);
  });

  it("accepts both spellings when they agree", () => {
    expect(
      resolveFlagAlias({ primary: true, legacy: true }, DRY_RUN_NAMES),
    ).toBe(true);
    expect(
      resolveFlagAlias({ primary: false, legacy: false }, DRY_RUN_NAMES),
    ).toBe(false);
  });

  it("refuses one true and one false instead of guessing", () => {
    expect(() =>
      resolveFlagAlias({ primary: true, legacy: false }, DRY_RUN_NAMES),
    ).toThrow(BadUserInputError);
    expect(() =>
      resolveFlagAlias({ primary: false, legacy: true }, DRY_RUN_NAMES),
    ).toThrow(BadUserInputError);
  });

  it("names both spellings in the refusal", () => {
    expect(() =>
      resolveFlagAlias({ primary: true, legacy: false }, DRY_RUN_NAMES),
    ).toThrow(/dry_run.*dryRun/);
  });
});
