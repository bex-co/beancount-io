import { selectAccountTransactions } from "../select-account-transactions";
import { selectStatementAnchorMonth } from "../select-income-expense-chart";
import {
  DirectiveType,
  JournalDirectiveType,
} from "../../../transactions-screen/types";

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
    expect(selectAccountTransactions([], "Income", "3M", "2026-07")).toEqual(
      [],
    );
  });

  it("keeps only Expenses postings for the Expenses prefix", () => {
    const entries = [
      txn("2026-07-02", [{ account: "Expenses:Food", number: "40" }], "exp"),
      txn("2026-07-03", [{ account: "Income:Salary", number: "-1000" }], "inc"),
    ];
    expect(
      selectAccountTransactions(entries, "Expenses", "ALL", null).map(
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
      selectAccountTransactions(entries, "Income", "ALL", null).map(
        (e) => e.entry_hash,
      ),
    ).toEqual(["inc"]);
  });

  it("matches any subtree when given an array of prefixes", () => {
    const entries = [
      txn("2026-07-02", [{ account: "Expenses:Food", number: "40" }], "exp"),
      txn("2026-07-03", [{ account: "Income:Salary", number: "-1000" }], "inc"),
      txn("2026-07-04", [{ account: "Assets:Bank", number: "5" }], "asset"),
    ];
    expect(
      selectAccountTransactions(
        entries,
        ["Income", "Expenses"],
        "ALL",
        null,
      ).map((e) => e.entry_hash),
    ).toEqual(["inc", "exp"]);
  });

  it("skips non-transaction directives even when their account matches", () => {
    const balance = {
      entry_hash: "b1",
      date: "2026-07-01",
      directive_type: DirectiveType.BALANCE,
      account: "Income:Salary",
    } as unknown as JournalDirectiveType;
    expect(selectAccountTransactions([balance], "Income", "ALL", null)).toEqual(
      [],
    );
  });

  it("sorts newest first", () => {
    const entries = [
      txn("2026-05-10", [{ account: "Income:Salary", number: "10" }], "old"),
      txn("2026-07-20", [{ account: "Income:Salary", number: "20" }], "new"),
      txn("2026-06-15", [{ account: "Income:Salary", number: "30" }], "mid"),
    ];
    expect(
      selectAccountTransactions(entries, "Income", "ALL", null).map(
        (e) => e.entry_hash,
      ),
    ).toEqual(["new", "mid", "old"]);
  });

  it("respects the time-range window anchored to the statement month", () => {
    // Anchor is 2026-07 → 3M window is 2026-05..2026-07.
    const entries = [
      txn("2026-04-10", [{ account: "Income:Salary", number: "1" }], "apr"),
      txn("2026-05-01", [{ account: "Income:Salary", number: "2" }], "may"),
      txn("2026-06-15", [{ account: "Income:Salary", number: "3" }], "jun"),
      txn("2026-07-20", [{ account: "Income:Salary", number: "4" }], "jul"),
    ];
    expect(
      selectAccountTransactions(entries, "Income", "3M", "2026-07").map(
        (e) => e.entry_hash,
      ),
    ).toEqual(["jul", "jun", "may"]);
  });

  it("YTD anchors to January of the anchor month's year", () => {
    const entries = [
      txn("2025-12-31", [{ account: "Income:Salary", number: "1" }], "prev"),
      txn("2026-01-05", [{ account: "Income:Salary", number: "2" }], "jan"),
      txn("2026-07-20", [{ account: "Income:Salary", number: "3" }], "jul"),
    ];
    expect(
      selectAccountTransactions(entries, "Income", "YTD", "2026-07").map(
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
      selectAccountTransactions(entries, "Expenses", "ALL", null).map(
        (e) => e.entry_hash,
      ),
    ).toEqual(["b", "a"]);
  });

  it("wraps the window into the previous year when the anchor is January", () => {
    // Anchor is 2026-01 → 3M window is 2025-11..2026-01.
    const entries = [
      txn("2025-10-15", [{ account: "Income:Salary", number: "1" }], "oct"),
      txn("2025-11-01", [{ account: "Income:Salary", number: "2" }], "nov"),
      txn("2025-12-15", [{ account: "Income:Salary", number: "3" }], "dec"),
      txn("2026-01-20", [{ account: "Income:Salary", number: "4" }], "jan"),
    ];
    expect(
      selectAccountTransactions(entries, "Income", "3M", "2026-01").map(
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
      selectAccountTransactions(entries, "Expenses", "ALL", null, 2).map(
        (e) => e.entry_hash,
      ),
    ).toEqual(["c", "b"]);
  });
});

describe("selectAccountTransactions anchoring (note 130)", () => {
  // The bug: the window was anchored to the latest *matching* entry, while the
  // chart anchors to the latest statement month. A newest month whose only
  // activity is a transfer (no Income/Expenses posting) put the list a month —
  // or a whole window — away from the chart above it.
  const transfer = (date: string, hash: string) =>
    txn(
      date,
      [
        { account: "Assets:Bank:A", number: "-100" },
        { account: "Assets:Bank:B", number: "100" },
      ],
      hash,
    );

  it("windows on the statement month, not the latest matching entry", () => {
    const entries = [
      txn("2026-03-10", [{ account: "Expenses:Food", number: "1" }], "mar"),
      txn("2026-04-10", [{ account: "Expenses:Food", number: "2" }], "apr"),
      // July is the statement's newest month but holds only a transfer.
      transfer("2026-07-05", "jul-transfer"),
    ];
    // Anchored to the statement's July, a 3M window is 2026-05..2026-07 — so
    // neither expense is in range. Anchoring to the latest match (April) would
    // have shown both while the chart showed May–July.
    expect(
      selectAccountTransactions(entries, "Expenses", "3M", "2026-07"),
    ).toEqual([]);
    // Widening to 6M (2026-02..2026-07) brings them back, newest first.
    expect(
      selectAccountTransactions(entries, "Expenses", "6M", "2026-07").map(
        (e) => e.entry_hash,
      ),
    ).toEqual(["apr", "mar"]);
  });

  it("crosses a year boundary using the statement anchor", () => {
    const entries = [
      txn("2025-11-20", [{ account: "Expenses:Food", number: "1" }], "nov"),
      txn("2025-12-20", [{ account: "Expenses:Food", number: "2" }], "dec"),
      txn("2026-01-20", [{ account: "Expenses:Food", number: "3" }], "jan"),
    ];
    // Statement ends 2026-02 (a transfer-only month) → 3M is 2025-12..2026-02.
    expect(
      selectAccountTransactions(entries, "Expenses", "3M", "2026-02").map(
        (e) => e.entry_hash,
      ),
    ).toEqual(["jan", "dec"]);
  });

  it("returns nothing while the statement is unresolved", () => {
    const entries = [
      txn("2026-07-20", [{ account: "Expenses:Food", number: "1" }], "jul"),
    ];
    expect(selectAccountTransactions(entries, "Expenses", "3M", null)).toEqual(
      [],
    );
    // ALL never needs an anchor, so it still shows everything.
    expect(
      selectAccountTransactions(entries, "Expenses", "ALL", null).map(
        (e) => e.entry_hash,
      ),
    ).toEqual(["jul"]);
  });

  it("still caps at the limit, newest first, within the anchored window", () => {
    const entries = [
      txn("2026-07-01", [{ account: "Expenses:Food", number: "1" }], "a"),
      txn("2026-07-02", [{ account: "Expenses:Food", number: "2" }], "b"),
      txn("2026-07-03", [{ account: "Expenses:Food", number: "3" }], "c"),
    ];
    expect(
      selectAccountTransactions(entries, "Expenses", "1M", "2026-07", 2).map(
        (e) => e.entry_hash,
      ),
    ).toEqual(["c", "b"]);
  });
});

describe("selectStatementAnchorMonth", () => {
  const point = (date: string) => ({ date, balance: { USD: 1 } });

  it("is null while the statement is unresolved", () => {
    expect(selectStatementAnchorMonth(undefined, null, [])).toBe(null);
  });

  it("takes the latest month across every statement series", () => {
    expect(
      selectStatementAnchorMonth(
        [point("2026-01-31"), point("2026-05-31")],
        [point("2026-07-31")],
        [point("2026-06-30")],
      ),
    ).toBe("2026-07");
  });

  it("ignores holes in the series", () => {
    expect(
      selectStatementAnchorMonth([null, undefined, point("2026-03-31")]),
    ).toBe("2026-03");
  });

  it("compares months lexically across a year boundary", () => {
    expect(
      selectStatementAnchorMonth([point("2026-01-31")], [point("2025-12-31")]),
    ).toBe("2026-01");
  });
});
