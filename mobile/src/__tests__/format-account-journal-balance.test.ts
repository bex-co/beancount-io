import {
  formatAccountJournalBalance,
  formatAccountJournalChange,
} from "../screens/account-detail-screen/utils/format-account-journal-balance";

describe("formatAccountJournalBalance", () => {
  it("keeps the minus on a negative running balance", () => {
    expect(formatAccountJournalBalance(-0.02, "USD")).toBe("-$0.02");
  });

  it("formats positive balances without a plus prefix", () => {
    expect(formatAccountJournalBalance(150, "USD")).toBe("$150.00");
  });

  it("formats zero without a sign", () => {
    expect(formatAccountJournalBalance(0, "USD")).toBe("$0.00");
  });

  it("falls back to a currency code for unknown commodities", () => {
    expect(formatAccountJournalBalance(-12.5, "MUSD")).toBe("-12.50 MUSD");
  });

  it("preserves three-decimal recorded scale for journal balances", () => {
    expect(formatAccountJournalBalance(930.904, "MUSD", 3)).toBe(
      "930.904 MUSD",
    );
  });
});

describe("formatAccountJournalChange", () => {
  it("prefixes a plus on gains at recorded scale", () => {
    expect(formatAccountJournalChange(423.284, "MUSD", 3)).toBe(
      "+423.284 MUSD",
    );
  });
});
