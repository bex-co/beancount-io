import {
  AccountJournalItem,
  AccountJournalRow,
  accountJournalItemKey,
  hasMoreAccountJournal,
  mergeAccountJournalItems,
  selectAccountJournalRows,
  groupAccountJournalRowsToSections,
} from "../select-account-journal";

/** Build a display row directly (used by groupAccountJournalRowsToSections tests). */
function row(
  date: string,
  title: string,
  change: number,
  balance: number,
  flag?: string,
): AccountJournalRow {
  return { key: `${date}-${title}`, date, title, change, balance, flag };
}

/** Build a journal item; `entry` fields default to a hashed transaction. */
function item(
  entry: Record<string, number | string>,
  change: Record<string, number | string> = { USD: -5 },
  balance: Record<string, number | string> = { USD: 95 },
): AccountJournalItem {
  return { entry, change, balance } as AccountJournalItem;
}

describe("accountJournalItemKey", () => {
  it("prefers the beancount entry hash", () => {
    const a = item({ entry_hash: "abc", date: "2025-01-01" });
    expect(accountJournalItemKey(a)).toBe("abc");
  });

  it("falls back to a date+change+balance signature without a hash", () => {
    const a = item({ date: "2025-01-01" }, { USD: -5 }, { USD: 95 });
    const b = item({ date: "2025-01-01" }, { USD: -5 }, { USD: 95 });
    const c = item({ date: "2025-01-02" }, { USD: -5 }, { USD: 95 });
    // Same content → same key; different date → different key.
    expect(accountJournalItemKey(a)).toBe(accountJournalItemKey(b));
    expect(accountJournalItemKey(a)).not.toBe(accountJournalItemKey(c));
  });
});

describe("mergeAccountJournalItems", () => {
  it("appends new items in order", () => {
    const page1 = [item({ entry_hash: "a" }), item({ entry_hash: "b" })];
    const page2 = [item({ entry_hash: "c" })];
    const merged = mergeAccountJournalItems(page1, page2);
    expect(merged.map((i) => i.entry.entry_hash)).toEqual(["a", "b", "c"]);
  });

  it("drops duplicates from an overlapping page (no double rows)", () => {
    const page1 = [item({ entry_hash: "a" }), item({ entry_hash: "b" })];
    const overlapping = [item({ entry_hash: "b" }), item({ entry_hash: "c" })];
    const merged = mergeAccountJournalItems(page1, overlapping);
    expect(merged.map((i) => i.entry.entry_hash)).toEqual(["a", "b", "c"]);
  });

  it("returns the existing items unchanged for an empty page", () => {
    const page1 = [item({ entry_hash: "a" })];
    expect(mergeAccountJournalItems(page1, [])).toEqual(page1);
  });
});

describe("hasMoreAccountJournal", () => {
  it("is true while fewer than total are loaded", () => {
    expect(hasMoreAccountJournal(20, 55)).toBe(true);
  });

  it("is false once all are loaded (total-based end of list)", () => {
    expect(hasMoreAccountJournal(55, 55)).toBe(false);
    expect(hasMoreAccountJournal(60, 55)).toBe(false);
  });
});

describe("selectAccountJournalRows", () => {
  it("maps description, date, change and running balance in the active currency", () => {
    const rows = selectAccountJournalRows("USD", [
      item(
        { entry_hash: "a", date: "2025-01-02", payee: "Blue Bottle" },
        { USD: -4.5 },
        { USD: 120.5 },
      ),
    ]);
    expect(rows).toEqual([
      {
        key: "a",
        title: "Blue Bottle",
        date: "2025-01-02",
        flag: undefined,
        change: -4.5,
        balance: 120.5,
      },
    ]);
  });

  it("falls back payee → narration → account → directive_type for the title", () => {
    const [narration, account, type] = selectAccountJournalRows("USD", [
      item({ entry_hash: "n", narration: "Opening balance" }),
      item({ entry_hash: "o", account: "Assets:Bank:Checking" }),
      item({ entry_hash: "p", directive_type: "Balance" }),
    ]);
    expect(narration.title).toBe("Opening balance");
    expect(account.title).toBe("Assets:Bank:Checking");
    expect(type.title).toBe("Balance");
  });

  it("surfaces the pending flag and resolves string amounts", () => {
    const [row] = selectAccountJournalRows("USD", [
      item(
        { entry_hash: "a", payee: "Rent", flag: "!" },
        { USD: "-1200" },
        {
          USD: "-1200",
        },
      ),
    ]);
    expect(row.flag).toBe("!");
    expect(row.change).toBe(-1200);
    expect(row.balance).toBe(-1200);
  });
});

describe("groupAccountJournalRowsToSections", () => {
  it("returns an empty array for empty input", () => {
    expect(groupAccountJournalRowsToSections([], "$")).toEqual([]);
  });

  it("groups rows on the same date into one section", () => {
    const sections = groupAccountJournalRowsToSections(
      [
        row("2025-01-02", "Coffee", -4.5, 95.5),
        row("2025-01-02", "Lunch", -12, 83.5),
      ],
      "$",
    );
    expect(sections.length).toBe(1);
    expect(sections[0].isoDate).toBe("2025-01-02");
    expect(sections[0].data.length).toBe(2);
  });

  it("produces separate sections for different dates", () => {
    const sections = groupAccountJournalRowsToSections(
      [
        row("2025-01-01", "Salary", 1000, 1000),
        row("2025-01-02", "Coffee", -4.5, 995.5),
      ],
      "$",
    );
    expect(sections.length).toBe(2);
    expect(sections[0].isoDate).toBe("2025-01-01");
    expect(sections[1].isoDate).toBe("2025-01-02");
  });

  it("formats the section total as a signed currency string", () => {
    const [positive] = groupAccountJournalRowsToSections(
      [row("2025-01-01", "Salary", 1000, 1000)],
      "$",
    );
    expect(positive.totalChange).toBe("+$1,000.00");

    const [negative] = groupAccountJournalRowsToSections(
      [row("2025-01-02", "Coffee", -4.5, 95.5)],
      "$",
    );
    expect(negative.totalChange).toBe("-$4.50");

    const [zero] = groupAccountJournalRowsToSections(
      [row("2025-01-03", "Balance", 0, 95.5)],
      "$",
    );
    expect(zero.totalChange).toBe("$0.00");
  });

  it("sums changes across all rows in a section for the total", () => {
    const [section] = groupAccountJournalRowsToSections(
      [
        row("2025-01-02", "Coffee", -4.5, 95.5),
        row("2025-01-02", "Lunch", -12, 83.5),
      ],
      "$",
    );
    expect(section.totalChange).toBe("-$16.50");
  });

  it("formats a human-readable displayDate from the isoDate", () => {
    const [section] = groupAccountJournalRowsToSections(
      [row("2025-03-15", "Coffee", -4.5, 95.5)],
      "$",
    );
    expect(section.displayDate).toBe("March 15, 2025");
  });

  it("falls back to the raw isoDate when parsing fails", () => {
    const [section] = groupAccountJournalRowsToSections(
      [row("not-a-date", "X", 0, 0)],
      "$",
    );
    expect(section.displayDate).toBe("not-a-date");
  });
});
