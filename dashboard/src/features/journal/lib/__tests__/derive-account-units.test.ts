import { describe, it, expect } from "vitest";
import {
  deriveAccountUnits,
  accountMatchesJournalSelection,
} from "@/features/journal/lib/derive-account-units";
import type {
  JournalBalance,
  JournalTransaction,
} from "@/common/types/journal";

function txn(postings: JournalTransaction["postings"]): JournalTransaction {
  return {
    entry_hash: "h1",
    directive_type: "Transaction",
    date: "2017-08-27",
    flag: "*",
    payee: null,
    narration: "Buy shares of GLD",
    postings,
    tags: [],
    links: [],
    meta: {},
  };
}

describe("accountMatchesJournalSelection", () => {
  it("matches the account exactly", () => {
    expect(
      accountMatchesJournalSelection(
        "Assets:US:ETrade:GLD",
        "Assets:US:ETrade:GLD",
        true,
      ),
    ).toBe(true);
  });

  it("matches children only when withChildren is true", () => {
    expect(
      accountMatchesJournalSelection(
        "Assets:US:ETrade:GLD",
        "Assets:US:ETrade",
        true,
      ),
    ).toBe(true);
    expect(
      accountMatchesJournalSelection(
        "Assets:US:ETrade:GLD",
        "Assets:US:ETrade",
        false,
      ),
    ).toBe(false);
  });
});

describe("deriveAccountUnits", () => {
  it("sums units for the selected account from postings", () => {
    const directive = txn([
      {
        account: "Assets:US:ETrade:GLD",
        units: { number: "10", currency: "GLD" },
        cost: null,
        price: null,
        flag: null,
        meta: {},
      },
      {
        account: "Assets:US:ETrade:Cash",
        units: { number: "-2433.36", currency: "USD" },
        cost: null,
        price: null,
        flag: null,
        meta: {},
      },
      {
        account: "Income:US:ETrade:PnL",
        units: { number: "0", currency: "USD" },
        cost: null,
        price: null,
        flag: null,
        meta: {},
      },
    ]);

    expect(deriveAccountUnits(directive, "Assets:US:ETrade:GLD")).toEqual({
      GLD: "10",
    });
  });

  it("aggregates multiple matching postings per currency", () => {
    const directive = txn([
      {
        account: "Assets:Bank:Checking",
        units: { number: "5.50", currency: "USD" },
        cost: null,
        price: null,
        flag: null,
        meta: {},
      },
      {
        account: "Assets:Bank:Checking",
        units: { number: "-1.25", currency: "USD" },
        cost: null,
        price: null,
        flag: null,
        meta: {},
      },
      {
        account: "Expenses:Fees",
        units: { number: "1.25", currency: "USD" },
        cost: null,
        price: null,
        flag: null,
        meta: {},
      },
    ]);

    expect(deriveAccountUnits(directive, "Assets:Bank:Checking")).toEqual({
      USD: "4.25",
    });
  });

  it("renders a zero unit amount honestly", () => {
    const directive = txn([
      {
        account: "Assets:Cash",
        units: { number: "0", currency: "USD" },
        cost: null,
        price: null,
        flag: null,
        meta: {},
      },
      {
        account: "Equity:Opening",
        units: { number: "0", currency: "USD" },
        cost: null,
        price: null,
        flag: null,
        meta: {},
      },
    ]);

    expect(deriveAccountUnits(directive, "Assets:Cash")).toEqual({
      USD: "0",
    });
  });

  it("returns undefined for non-transaction directives", () => {
    const balance: JournalBalance = {
      entry_hash: "b1",
      directive_type: "Balance",
      date: "2017-01-01",
      account: "Assets:US:ETrade:GLD",
      amount: { number: "10", currency: "GLD" },
      diff_amount: null,
      meta: {},
    };

    expect(deriveAccountUnits(balance, "Assets:US:ETrade:GLD")).toBeUndefined();
  });

  it("returns undefined when no posting matches the account", () => {
    const directive = txn([
      {
        account: "Assets:Cash",
        units: { number: "1", currency: "USD" },
        cost: null,
        price: null,
        flag: null,
        meta: {},
      },
    ]);

    expect(
      deriveAccountUnits(directive, "Assets:US:ETrade:GLD"),
    ).toBeUndefined();
  });
});
