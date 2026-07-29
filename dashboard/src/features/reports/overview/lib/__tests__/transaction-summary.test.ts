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
});
