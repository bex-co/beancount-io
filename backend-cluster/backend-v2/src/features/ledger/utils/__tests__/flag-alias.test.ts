import { BadUserInputError } from "@/shared/errors";
import {
  ALLOW_INVALID_NAMES,
  DRY_RUN_NAMES,
  resolveFlagAlias,
} from "../flag-alias";

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

// w23/m9/t003: the same rule covers the commit-despite-errors flag.
describe("resolveFlagAlias with ALLOW_INVALID_NAMES", () => {
  it("accepts either spelling, off when both are missing", () => {
    expect(resolveFlagAlias({ primary: true }, ALLOW_INVALID_NAMES)).toBe(true);
    expect(resolveFlagAlias({ legacy: true }, ALLOW_INVALID_NAMES)).toBe(true);
    expect(resolveFlagAlias({}, ALLOW_INVALID_NAMES)).toBe(false);
  });

  it("refuses a split pair naming both spellings", () => {
    expect(() =>
      resolveFlagAlias({ primary: true, legacy: false }, ALLOW_INVALID_NAMES),
    ).toThrow(BadUserInputError);
    expect(() =>
      resolveFlagAlias({ primary: false, legacy: true }, ALLOW_INVALID_NAMES),
    ).toThrow(/allow_invalid.*allowInvalid/);
  });
});
