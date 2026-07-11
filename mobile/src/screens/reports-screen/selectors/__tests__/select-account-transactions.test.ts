import { selectAccountTransactions } from "../select-account-transactions";
import {
  DirectiveType,
  JournalDirectiveType,
} from "../../../journal-screen/types";

// Build a Transaction directive with a set of postings.
function txn(
  date: string,
  postings: { account: string; number: string; currency?: string }[],
  hash?: string,
): JournalDirectiveType {
  return {
    entry_hash: hash ?? `${date}-${postings.length}`,
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

describe("selectAccountTransactions", () => {
  it("returns an empty list for empty input", () => {
    expect(selectAccountTransactions([], "Income", "3M")).toEqual([]);
  });

  it("keeps only Expenses postings for the Expenses prefix", () => {
    const entries = [
      txn("2026-07-02", [{ account: "Expenses:Food", number: "40" }], "exp"),
      txn("2026-07-03", [{ account: "Income:Salary", number: "-1000" }], "inc"),
    ];
    expect(
      selectAccountTransactions(entries, "Expenses", "ALL").map(
        (e) => e.entry_hash,
      ),
    ).toEqual(["exp"]);
  });

  it("keeps only Income postings for the Income prefix", () => {
    const entries = [
      txn("2026-07-02", [{ account: "Expenses:Food", number: "40" }], "exp"),
      txn("2026-07-03", [{ account: "Income:Salary", number: "-1000" }], "inc"),
    ];
    expect(
      selectAccountTransactions(entries, "Income", "ALL").map(
        (e) => e.entry_hash,
      ),
    ).toEqual(["inc"]);
  });

  it("skips non-transaction directives even when their account matches", () => {
    const balance = {
      entry_hash: "b1",
      date: "2026-07-01",
      directive_type: DirectiveType.BALANCE,
      account: "Income:Salary",
    } as unknown as JournalDirectiveType;
    expect(selectAccountTransactions([balance], "Income", "ALL")).toEqual([]);
  });

  it("sorts newest first", () => {
    const entries = [
      txn("2026-05-10", [{ account: "Income:Salary", number: "10" }], "old"),
      txn("2026-07-20", [{ account: "Income:Salary", number: "20" }], "new"),
      txn("2026-06-15", [{ account: "Income:Salary", number: "30" }], "mid"),
    ];
    expect(
      selectAccountTransactions(entries, "Income", "ALL").map(
        (e) => e.entry_hash,
      ),
    ).toEqual(["new", "mid", "old"]);
  });

  it("respects the time-range window anchored to the latest matching month", () => {
    // Latest match is 2026-07 → 3M window is 2026-05..2026-07.
    const entries = [
      txn("2026-04-10", [{ account: "Income:Salary", number: "1" }], "apr"),
      txn("2026-05-01", [{ account: "Income:Salary", number: "2" }], "may"),
      txn("2026-06-15", [{ account: "Income:Salary", number: "3" }], "jun"),
      txn("2026-07-20", [{ account: "Income:Salary", number: "4" }], "jul"),
    ];
    expect(
      selectAccountTransactions(entries, "Income", "3M").map(
        (e) => e.entry_hash,
      ),
    ).toEqual(["jul", "jun", "may"]);
  });

  it("YTD anchors to January of the latest matching year", () => {
    const entries = [
      txn("2025-12-31", [{ account: "Income:Salary", number: "1" }], "prev"),
      txn("2026-01-05", [{ account: "Income:Salary", number: "2" }], "jan"),
      txn("2026-07-20", [{ account: "Income:Salary", number: "3" }], "jul"),
    ];
    expect(
      selectAccountTransactions(entries, "Income", "YTD").map(
        (e) => e.entry_hash,
      ),
    ).toEqual(["jul", "jan"]);
  });

  it("ALL ignores the window and returns every matching transaction", () => {
    const entries = [
      txn("2024-01-01", [{ account: "Expenses:Food", number: "1" }], "a"),
      txn("2026-07-20", [{ account: "Expenses:Food", number: "2" }], "b"),
    ];
    expect(
      selectAccountTransactions(entries, "Expenses", "ALL").map(
        (e) => e.entry_hash,
      ),
    ).toEqual(["b", "a"]);
  });

  it("wraps the window into the previous year when the latest month is January", () => {
    // Latest match is 2026-01 → 3M window is 2025-11..2026-01.
    const entries = [
      txn("2025-10-15", [{ account: "Income:Salary", number: "1" }], "oct"),
      txn("2025-11-01", [{ account: "Income:Salary", number: "2" }], "nov"),
      txn("2025-12-15", [{ account: "Income:Salary", number: "3" }], "dec"),
      txn("2026-01-20", [{ account: "Income:Salary", number: "4" }], "jan"),
    ];
    expect(
      selectAccountTransactions(entries, "Income", "3M").map(
        (e) => e.entry_hash,
      ),
    ).toEqual(["jan", "dec", "nov"]);
  });

  it("caps the result at the given limit", () => {
    const entries = [
      txn("2026-07-01", [{ account: "Expenses:Food", number: "1" }], "a"),
      txn("2026-07-02", [{ account: "Expenses:Food", number: "2" }], "b"),
      txn("2026-07-03", [{ account: "Expenses:Food", number: "3" }], "c"),
    ];
    expect(
      selectAccountTransactions(entries, "Expenses", "ALL", 2).map(
        (e) => e.entry_hash,
      ),
    ).toEqual(["c", "b"]);
  });
});
