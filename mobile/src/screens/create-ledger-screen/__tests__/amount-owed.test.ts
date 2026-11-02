import fs from "fs";
import path from "path";
import { en } from "../../../translations/en";
import { openingLedgerAmount } from "../setup-presets";

// w21/104: a credit card's balance was entered as a positive opening balance
// and stored that way, and the decimal pad had no minus to type otherwise.
describe("Create Ledger's opening amount for a liability", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "create-ledger-screen.tsx"),
    "utf8",
  );

  it("labels the field as the ledger balance when a Liabilities account is chosen", () => {
    expect(en.createLedgerAmountOwed).toBe("Ledger balance (optional)");
    expect(
      source.includes("const openingAmountLabelKey = isLiabilityOpening"),
    ).toBe(true);
    expect(
      source.includes("accessibilityLabel={t(openingAmountLabelKey)}"),
    ).toBe(true);
  });

  it("offers a keypad that can type a minus", () => {
    expect(source.includes('keyboardType="decimal-pad"')).toBe(false);
    expect(source.includes('"numbers-and-punctuation"')).toBe(true);
  });

  it("hints that liabilities are negative", () => {
    expect(source.includes('t("createLedgerLiabilitySignHint")')).toBe(true);
  });
});

// w21/549: the field takes the ledger's own sign and always sends one.
describe("openingLedgerAmount", () => {
  const card = "Liabilities:CreditCard";

  it("sends an owed liability as a negative", () => {
    expect(openingLedgerAmount("500", card)).toBe("-500");
    expect(openingLedgerAmount("-500", card)).toBe("-500");
    expect(openingLedgerAmount("500,50", card)).toBe("-500.50");
  });

  it("sends a liability in credit as an explicit plus", () => {
    expect(openingLedgerAmount("+50", card)).toBe("+50");
    expect(openingLedgerAmount("+ 50.5", card)).toBe("+50.5");
  });

  it("leaves a zero balance unsigned and an empty field empty", () => {
    expect(openingLedgerAmount("0", card)).toBe("0");
    expect(openingLedgerAmount("  ", card)).toBe("");
  });

  it("keeps an asset as typed, a plus being only a sign", () => {
    expect(openingLedgerAmount("1000", "Assets:Cash")).toBe("1000");
    expect(openingLedgerAmount("+1000", "Assets:Cash")).toBe("1000");
    expect(openingLedgerAmount("-20", "Assets:Cash")).toBe("-20");
  });

  it("refuses what is not an amount", () => {
    expect(openingLedgerAmount("abc", card)).toBe(null);
    expect(openingLedgerAmount("+", card)).toBe(null);
    expect(openingLedgerAmount("+-5", card)).toBe(null);
  });
});
