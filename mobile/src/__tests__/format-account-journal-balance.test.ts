import { formatAccountJournalBalance } from "../screens/account-detail-screen/utils/format-account-journal-balance";

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
});
