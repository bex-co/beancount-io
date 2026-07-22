import {
  getSignedTransactionAmount,
  formatSignedAmount,
} from "../select-transaction-amount";
import {
  DirectiveType,
  JournalDirectiveType,
} from "../../../transactions-screen/types";

function txn(
  postings: Array<{ account: string; number: string; currency?: string }>,
): JournalDirectiveType {
  return {
    entry_hash: "t1",
    date: "2026-07-01",
    directive_type: DirectiveType.TRANSACTION,
    flag: "*",
    payee: null,
    narration: null,
    tags: [],
    links: [],
    postings: postings.map((posting) => ({
      account: posting.account,
      units: { number: posting.number, currency: posting.currency ?? "USD" },
    })),
  } as unknown as JournalDirectiveType;
}

describe("getSignedTransactionAmount", () => {
  it("returns the negative net for spending (money leaving assets)", () => {
    const entry = txn([
      { account: "Expenses:Coffee", number: "4.50" },
      { account: "Assets:Cash", number: "-4.50" },
    ]);
    expect(getSignedTransactionAmount(entry, "USD")).toBe(-4.5);
  });

  it("returns a positive net for income (money entering assets)", () => {
    const entry = txn([
      { account: "Income:Salary", number: "-1000" },
      { account: "Assets:Bank", number: "1000" },
    ]);
    expect(getSignedTransactionAmount(entry, "USD")).toBe(1000);
  });

  it("nets liabilities alongside assets", () => {
    const entry = txn([
      { account: "Expenses:Shopping", number: "200" },
      { account: "Liabilities:Card", number: "-200" },
    ]);
    expect(getSignedTransactionAmount(entry, "USD")).toBe(-200);
  });

  it("falls back to negated expenses when there is no asset/liability leg", () => {
    const entry = txn([
      { account: "Expenses:Food", number: "15" },
      { account: "Expenses:Tax", number: "5" },
    ]);
    expect(getSignedTransactionAmount(entry, "USD")).toBe(-20);
  });

  it("only considers postings in the active currency", () => {
    const entry = txn([
      { account: "Assets:Cash", number: "-4.50", currency: "USD" },
      { account: "Assets:Euro", number: "-100", currency: "EUR" },
      { account: "Expenses:Coffee", number: "4.50", currency: "USD" },
    ]);
    expect(getSignedTransactionAmount(entry, "USD")).toBe(-4.5);
  });

  it("returns null when no postings match the currency", () => {
    const entry = txn([
      { account: "Assets:Euro", number: "-100", currency: "EUR" },
    ]);
    expect(getSignedTransactionAmount(entry, "USD")).toBe(null);
  });

  it("returns null for non-transaction directives", () => {
    const balance = {
      entry_hash: "b1",
      date: "2026-07-01",
      directive_type: DirectiveType.BALANCE,
      account: "Assets:Cash",
    } as unknown as JournalDirectiveType;
    expect(getSignedTransactionAmount(balance, "USD")).toBe(null);
  });
});

describe("formatSignedAmount", () => {
  it("prefixes a minus sign for negative amounts", () => {
    expect(formatSignedAmount(-4.5, "$")).toBe("-$4.50");
  });

  it("prefixes a plus sign for positive amounts", () => {
    expect(formatSignedAmount(1000, "$")).toBe("+$1000.00");
  });

  it("uses no sign for zero", () => {
    expect(formatSignedAmount(0, "$")).toBe("$0.00");
  });
});
