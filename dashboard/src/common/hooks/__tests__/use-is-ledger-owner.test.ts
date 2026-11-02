import { describe, expect, it } from "vitest";
import { isLedgerOwnerName } from "../use-is-ledger-owner";

describe("isLedgerOwnerName", () => {
  it("matches the owner whatever the case, as usernames do", () => {
    expect(isLedgerOwnerName("Bob", "bob")).toBe(true);
    expect(isLedgerOwnerName("bob", "bob")).toBe(true);
  });

  it("is false for anyone else, or before the profile loads", () => {
    expect(isLedgerOwnerName("bob", "alice")).toBe(false);
    expect(isLedgerOwnerName("bob", null)).toBe(false);
    expect(isLedgerOwnerName(undefined, undefined)).toBe(false);
  });
});
