import fs from "fs";
import path from "path";
import { resolveCurrencyBalance, throughToday } from "../balance-util";

describe("resolveCurrencyBalance", () => {
  it("returns 0 for null/undefined maps", () => {
    expect(resolveCurrencyBalance(null, "USD")).toBe(0);
    expect(resolveCurrencyBalance(undefined, "USD")).toBe(0);
  });

  it("uses the requested currency when present", () => {
    expect(resolveCurrencyBalance({ USD: 100, EUR: 90 }, "EUR")).toBe(90);
  });

  // w21/058: the USD entry used to stand in, then printed with the active
  // currency's symbol.
  it("reads 0, never the USD entry, when the currency is missing", () => {
    expect(resolveCurrencyBalance({ USD: 100, EUR: 90 }, "CNY")).toBe(0);
    expect(resolveCurrencyBalance({ USD: "50.00" }, "EUR")).toBe(0);
    expect(resolveCurrencyBalance({ EUR: "200.00", USD: "50.00" }, "EUR")).toBe(
      200,
    );
    expect(resolveCurrencyBalance({}, "EUR")).toBe(0);
  });

  it("returns 0 when neither the currency nor USD is present", () => {
    expect(resolveCurrencyBalance({ EUR: 90 }, "CNY")).toBe(0);
  });

  it("parses string amounts", () => {
    expect(resolveCurrencyBalance({ USD: "1500.50" }, "USD")).toBe(1500.5);
  });

  it("treats invalid strings as 0", () => {
    expect(resolveCurrencyBalance({ USD: "not-a-number" }, "USD")).toBe(0);
  });

  it("does not fall back for a present zero value (uses the `in` check)", () => {
    expect(resolveCurrencyBalance({ USD: 0, EUR: 90 }, "USD")).toBe(0);
  });

  it("passes through negative numbers", () => {
    expect(resolveCurrencyBalance({ USD: -250.25 }, "USD")).toBe(-250.25);
  });
});

// w21/674: Home's net worth stopped at today while the Accounts tab counted
// next month's entries: $17,108.51 against $15,608.51.
describe("throughToday", () => {
  it("is a range from the earliest year through the named day", () => {
    expect(throughToday("2026-10-22")).toBe("0001 - 2026-10-22");
  });

  it("is what both balance surfaces read the trial balance with", () => {
    const read = (...parts: string[]) =>
      fs
        .readFileSync(path.join(__dirname, "..", "..", ...parts), "utf8")
        .replace(/\s+/g, "");
    const accounts = read("screens", "accounts-screen", "accounts-screen.tsx");
    expect(accounts.includes("useTrialBalance(ledgerId,balanceTime)")).toBe(
      true,
    );
    expect(
      accounts.includes('useTrialBalance(ledgerId,balanceTime,"units")'),
    ).toBe(true);
    const detail = read(
      "screens",
      "account-detail-screen",
      "account-detail-screen.tsx",
    );
    expect(
      detail.includes("useTrialBalance(ledgerId,throughToday(today))"),
    ).toBe(true);
  });
});
