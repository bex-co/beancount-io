import { describe, expect, it } from "vitest";
import { isCurrencyToken } from "../currency-token";

/** The ledger's commodity rule (w23/033), checked before a write (w2/114). */
describe("isCurrencyToken", () => {
  it.each([
    "USD",
    "EUR",
    "A",
    "VBTLX",
    "BRK.B",
    "MY_FUND",
    "RS'1",
    "X-1",
    "/ESZ24",
    "A".repeat(24),
  ])("accepts %s", (value) => {
    expect(isCurrencyToken(value)).toBe(true);
  });

  it.each([
    "usd",
    "Usd",
    "U$D",
    "",
    " USD",
    "USD ",
    "1USD",
    "-USD",
    "USD-",
    "US D",
    "/6E",
    "A".repeat(25),
  ])("refuses %j", (value) => {
    expect(isCurrencyToken(value)).toBe(false);
  });
});
