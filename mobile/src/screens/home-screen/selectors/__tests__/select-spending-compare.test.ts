import { selectSpendingCompare } from "../select-spending-compare";
import {
  DirectiveType,
  JournalDirectiveType,
} from "../../../journal-screen/types";

// Build a Transaction directive with a set of postings.
function txn(
  date: string,
  postings: Array<{ account: string; number: string; currency?: string }>,
): JournalDirectiveType {
  return {
    entry_hash: `${date}-${postings.length}`,
    date,
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

// A fixed reference date in July 2026 (local time, month index 6).
const REF = new Date(2026, 6, 15);

describe("selectSpendingCompare", () => {
  it("returns zeros for empty input", () => {
    const result = selectSpendingCompare([], "USD", REF);
    expect(result.thisMonth).toBe(0);
    expect(result.lastMonth).toBe(0);
    expect(result.thisMonthKey).toBe("2026-07");
    expect(result.lastMonthKey).toBe("2026-06");
  });

  it("splits expense spending between this month and last month", () => {
    const entries = [
      txn("2026-07-02", [
        { account: "Expenses:Food", number: "40" },
        { account: "Assets:Cash", number: "-40" },
      ]),
      txn("2026-07-20", [
        { account: "Expenses:Rent", number: "60" },
        { account: "Assets:Cash", number: "-60" },
      ]),
      txn("2026-06-10", [
        { account: "Expenses:Food", number: "25" },
        { account: "Assets:Cash", number: "-25" },
      ]),
    ];
    const result = selectSpendingCompare(entries, "USD", REF);
    expect(result.thisMonth).toBe(100);
    expect(result.lastMonth).toBe(25);
  });

  it("ignores months outside the current and previous month", () => {
    const entries = [
      txn("2026-05-15", [{ account: "Expenses:Food", number: "500" }]),
      txn("2026-07-01", [{ account: "Expenses:Food", number: "10" }]),
    ];
    const result = selectSpendingCompare(entries, "USD", REF);
    expect(result.thisMonth).toBe(10);
    expect(result.lastMonth).toBe(0);
  });

  it("only counts Expenses postings, not asset/income legs", () => {
    const entries = [
      txn("2026-07-05", [
        { account: "Expenses:Food", number: "30" },
        { account: "Assets:Checking", number: "-30" },
      ]),
      txn("2026-07-06", [
        { account: "Income:Salary", number: "-1000" },
        { account: "Assets:Checking", number: "1000" },
      ]),
    ];
    const result = selectSpendingCompare(entries, "USD", REF);
    expect(result.thisMonth).toBe(30);
  });

  it("only sums postings in the active currency", () => {
    const entries = [
      txn("2026-07-05", [
        { account: "Expenses:Food", number: "30", currency: "USD" },
        { account: "Expenses:Travel", number: "100", currency: "EUR" },
      ]),
    ];
    const result = selectSpendingCompare(entries, "USD", REF);
    expect(result.thisMonth).toBe(30);
  });

  it("wraps to the previous year when the reference month is January", () => {
    const jan = new Date(2026, 0, 10); // Jan 2026
    const entries = [
      txn("2026-01-05", [{ account: "Expenses:Food", number: "10" }]),
      txn("2025-12-31", [{ account: "Expenses:Food", number: "20" }]),
    ];
    const result = selectSpendingCompare(entries, "USD", jan);
    expect(result.thisMonthKey).toBe("2026-01");
    expect(result.lastMonthKey).toBe("2025-12");
    expect(result.thisMonth).toBe(10);
    expect(result.lastMonth).toBe(20);
  });

  it("skips non-transaction directives", () => {
    const balance = {
      entry_hash: "b1",
      date: "2026-07-01",
      directive_type: DirectiveType.BALANCE,
      account: "Assets:Cash",
    } as unknown as JournalDirectiveType;
    const result = selectSpendingCompare([balance], "USD", REF);
    expect(result.thisMonth).toBe(0);
  });
});
