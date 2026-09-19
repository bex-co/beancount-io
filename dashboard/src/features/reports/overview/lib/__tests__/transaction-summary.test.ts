import { describe, expect, it } from "vitest";
import { DirectiveType, type JournalTransaction } from "@/common/types/journal";
import { summarizeTransaction } from "../transaction-summary";

function transaction(
  postings: JournalTransaction["postings"],
  flag = "*",
): JournalTransaction {
  return {
    directive_type: DirectiveType.TRANSACTION,
    entry_hash: "hash",
    date: "2026-07-01",
    flag,
    postings,
    tags: [],
    links: [],
  };
}

function posting(account: string, number: string, currency = "USD") {
  return { account, units: { number, currency } };
}

const base = {
  accountFilter: "",
  preferredCurrency: "USD",
  incomeRoot: "Income",
  expensesRoot: "Expenses",
};

describe("summarizeTransaction", () => {
  it("shows expenses as money out", () => {
    const summary = summarizeTransaction({
      ...base,
      transaction: transaction([
        posting("Assets:Checking", "-45"),
        posting("Expenses:Food", "45"),
      ]),
    });
    expect(summary.kind).toBe("expense");
    expect(summary.amounts).toEqual([{ currency: "USD", value: -45 }]);
  });

  it("shows income as money in", () => {
    const summary = summarizeTransaction({
      ...base,
      transaction: transaction([
        posting("Assets:Checking", "1000"),
        posting("Income:Salary", "-1000"),
      ]),
    });
    expect(summary.kind).toBe("income");
    expect(summary.amounts).toEqual([{ currency: "USD", value: 1000 }]);
  });

  it("uses the selected account subtree when one is active", () => {
    const summary = summarizeTransaction({
      ...base,
      accountFilter: "Assets:Bank",
      transaction: transaction([
        posting("Assets:Bank:Checking", "250"),
        posting("Income:Salary", "-250"),
      ]),
    });
    expect(summary.amounts).toEqual([{ currency: "USD", value: 250 }]);
    expect(summary.accounts).toEqual(["Income:Salary"]);
  });

  it("recognizes a simple same-currency transfer", () => {
    const summary = summarizeTransaction({
      ...base,
      transaction: transaction([
        posting("Assets:Checking", "-300"),
        posting("Assets:Savings", "300"),
      ]),
    });
    expect(summary.kind).toBe("transfer");
    expect(summary.amounts).toEqual([{ currency: "USD", value: 300 }]);
  });

  it("does not invent one amount for an ambiguous multi-currency entry", () => {
    const summary = summarizeTransaction({
      ...base,
      transaction: transaction([
        posting("Assets:USD", "-100", "USD"),
        posting("Assets:EUR", "90", "EUR"),
      ]),
    });
    expect(summary.kind).toBe("mixed");
    expect(summary.amounts).toEqual([]);
  });
  describe("entries with both income and expense postings", () => {
    /** The public example ledger's Hoogle payroll, main.bean:5544. */
    const payroll = transaction([
      posting("Assets:US:BofA:Checking", "2550.60"),
      posting("Income:US:Hoogle:Salary", "-4639.70"),
      posting("Expenses:Health:Dental:Insurance", "150.70"),
      posting("Expenses:Taxes:Y2017:US:Federal", "1938.40"),
      posting("Assets:US:Hoogle:Vacation", "5", "VACHR"),
      posting("Income:US:Hoogle:Vacation", "-5", "VACHR"),
    ]);

    it("does not report a salary as its deductions", () => {
      const summary = summarizeTransaction({ ...base, transaction: payroll });
      // 150.70 + 1938.40 = 2089.10 — the number this used to show, which is
      // neither the gross salary nor the cash received.
      expect(summary.kind).toBe("mixed");
      expect(summary.amounts).toEqual([]);
      expect(
        summary.amounts.some((amount) => Math.abs(amount.value) === 2089.1),
      ).toBe(false);
    });

    it("keeps the exact selected-account total when a filter is active", () => {
      const summary = summarizeTransaction({
        ...base,
        accountFilter: "Assets:US:BofA:Checking",
        transaction: payroll,
      });
      expect(summary.amounts).toEqual([{ currency: "USD", value: 2550.6 }]);
    });

    it("does not report a sale as its commission", () => {
      // The stock-example sale: a capital gain and a 4.95 commission.
      const summary = summarizeTransaction({
        ...base,
        transaction: transaction([
          posting("Assets:Brokerage:ACME", "-40", "ACME"),
          posting("Assets:Brokerage:Cash", "3670.00"),
          posting("Assets:Brokerage:Cash", "-4.95"),
          posting("Expenses:Financial:Commissions", "4.95"),
          posting("Income:Investment:CapitalGains", "-286.00"),
        ]),
      });
      expect(summary.kind).toBe("mixed");
      expect(summary.amounts).toEqual([]);
    });

    it("keeps the cash total for that sale under an account filter", () => {
      const summary = summarizeTransaction({
        ...base,
        accountFilter: "Assets:Brokerage:Cash",
        transaction: transaction([
          posting("Assets:Brokerage:ACME", "-40", "ACME"),
          posting("Assets:Brokerage:Cash", "3670.00"),
          posting("Assets:Brokerage:Cash", "-4.95"),
          posting("Expenses:Financial:Commissions", "4.95"),
          posting("Income:Investment:CapitalGains", "-286.00"),
        ]),
      });
      expect(summary.amounts).toEqual([{ currency: "USD", value: 3665.05 }]);
    });

    it("leaves a pure expense and a pure income alone", () => {
      const expense = summarizeTransaction({
        ...base,
        transaction: transaction([
          posting("Assets:Checking", "-33.71"),
          posting("Expenses:Food:Restaurant", "33.71"),
        ]),
      });
      expect(expense.kind).toBe("expense");
      expect(expense.amounts).toEqual([{ currency: "USD", value: -33.71 }]);

      const income = summarizeTransaction({
        ...base,
        transaction: transaction([
          posting("Assets:Checking", "1000"),
          posting("Income:Consulting", "-1000"),
        ]),
      });
      expect(income.kind).toBe("income");
      expect(income.amounts).toEqual([{ currency: "USD", value: 1000 }]);
    });
  });
  describe("account filters the search box accepts", () => {
    /** The public example ledger's bank fee: Checking -4, Fees +4. */
    const bankFee = transaction([
      posting("Assets:US:BofA:Checking", "-4"),
      posting("Expenses:Financial:Fees", "4"),
    ]);

    const payroll = transaction([
      posting("Assets:US:BofA:Checking", "2550.60"),
      posting("Income:US:Hoogle:Salary", "-4639.70"),
      posting("Expenses:Taxes:Y2017:US:Federal", "2089.10"),
    ]);

    it("matches a bare account component, as the ledger does", () => {
      // Typing `Checking` returns these transactions; the summary has to agree
      // about which posting was selected, or the row loses its amount.
      expect(
        summarizeTransaction({
          ...base,
          accountFilter: "Checking",
          transaction: bankFee,
        }).amounts,
      ).toEqual([{ currency: "USD", value: -4 }]);
      expect(
        summarizeTransaction({
          ...base,
          accountFilter: "Checking",
          transaction: payroll,
        }).amounts,
      ).toEqual([{ currency: "USD", value: 2550.6 }]);
    });

    it("gives the full path the same answer as the component", () => {
      const byComponent = summarizeTransaction({
        ...base,
        accountFilter: "Checking",
        transaction: payroll,
      });
      const byFullPath = summarizeTransaction({
        ...base,
        accountFilter: "Assets:US:BofA:Checking",
        transaction: payroll,
      });
      expect(byComponent.amounts).toEqual(byFullPath.amounts);
    });

    it("keeps an exact subtree selection", () => {
      const nested = transaction([
        posting("Assets:US:BofA:Checking", "-10"),
        posting("Assets:US:BofA:Checking:Sub", "-5"),
        posting("Expenses:Food", "15"),
      ]);
      // Both Checking postings, and nothing else.
      expect(
        summarizeTransaction({
          ...base,
          accountFilter: "Assets:US:BofA:Checking",
          transaction: nested,
        }).amounts,
      ).toEqual([{ currency: "USD", value: -15 }]);
    });

    it("accepts a case-insensitive pattern", () => {
      expect(
        summarizeTransaction({
          ...base,
          accountFilter: "checking",
          transaction: bankFee,
        }).amounts,
      ).toEqual([{ currency: "USD", value: -4 }]);
    });

    it("falls back to literal equality for a pattern that cannot compile", () => {
      const literal = transaction([
        posting("Assets:Weird[", "-7"),
        posting("Expenses:Food", "7"),
      ]);
      expect(
        summarizeTransaction({
          ...base,
          accountFilter: "Assets:Weird[",
          transaction: literal,
        }).amounts,
      ).toEqual([{ currency: "USD", value: -7 }]);
    });

    it("selects nothing when no posting matches", () => {
      expect(
        summarizeTransaction({
          ...base,
          accountFilter: "Liabilities:Mortgage",
          transaction: bankFee,
        }).amounts,
      ).toEqual([]);
    });

    it("never lets an unrelated posting into the total", () => {
      // Matching every posting would net the transaction to zero.
      const summary = summarizeTransaction({
        ...base,
        accountFilter: "Checking",
        transaction: bankFee,
      });
      expect(summary.amounts).not.toEqual([{ currency: "USD", value: 0 }]);
      expect(summary.accounts).toContain("Expenses:Financial:Fees");
    });
  });
});
