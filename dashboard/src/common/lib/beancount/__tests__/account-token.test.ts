import { describe, expect, it } from "vitest";
import { isCompleteAccountToken } from "../account-token";
import { buildOpenAccountSchema } from "../open-account-schema";

describe("isCompleteAccountToken", () => {
  it.each([
    "Assets:QaSyntaxDraft",
    "Assets:Emergency-Fund",
    "Assets:401K",
    "Assets:Épargne",
  ])("accepts %s", (account) => {
    expect(isCompleteAccountToken(account)).toBe(true);
  });

  it.each([
    "Assets:",
    "Assets::Cash",
    "Assets:Emergency Fund",
    "Assets:Emergency USD",
    "Assets:checking",
    "Checking",
    "",
  ])("rejects %s", (account) => {
    expect(isCompleteAccountToken(account)).toBe(false);
  });
});

describe("buildOpenAccountSchema", () => {
  const prefixes = ["Assets", "Liabilities", "Equity", "Income", "Expenses"];
  const schema = buildOpenAccountSchema(prefixes, {
    required: "required",
    mustStartWith: "prefix",
    invalid: "invalid",
  });

  it("blocks malformed tokens before a mutation can be prepared", () => {
    expect(
      schema.safeParse({ date: new Date(), account: "Assets:" }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        date: new Date(),
        account: "Assets:Emergency Fund",
      }).error?.issues[0]?.message,
    ).toBe("invalid");
  });

  it("keeps the configured-prefix rule and accepts valid names", () => {
    expect(
      schema.safeParse({ date: new Date(), account: "Checking" }).error
        ?.issues[0]?.message,
    ).toBe("prefix");
    expect(
      schema.safeParse({
        date: new Date(),
        account: "Assets:QaSyntaxDraft",
      }).success,
    ).toBe(true);
  });

  it("allows correcting a rejected value into a valid account", () => {
    expect(
      schema.safeParse({ date: new Date(), account: "Assets::Cash" }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        date: new Date(),
        account: "Assets:Emergency-Fund",
      }).success,
    ).toBe(true);
  });
});
