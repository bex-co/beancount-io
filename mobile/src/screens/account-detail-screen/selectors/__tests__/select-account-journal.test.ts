import {
  AccountJournalItem,
  AccountJournalRow,
  accountJournalItemKey,
  accountJournalItemKeys,
  accountJournalPageOverlapped,
  hasMoreAccountJournal,
  mergeAccountJournalItems,
  selectAccountJournalRows,
  groupAccountJournalRowsToSections,
  directiveTypeLabelKey,
  formatOtherChanges,
} from "../select-account-journal";
import { en } from "../../../../translations/en";

/** Build a display row directly (used by groupAccountJournalRowsToSections tests). */
function row(
  date: string,
  title: string,
  change: number,
  balance: number,
  flag?: string,
): AccountJournalRow {
  return {
    key: `${date}-${title}`,
    date,
    title,
    change,
    balance,
    flag,
    postings: [],
  };
}

/**
 * Build a journal item; `entry` fields default to a hashed transaction. `entry`
 * is an opaque JSON scalar at the API boundary, so tests pass richer shapes
 * (e.g. `postings`) than its generated type admits.
 */
function item(
  entry: Record<string, unknown>,
  change: Record<string, number | string> = { USD: -5 },
  balance: Record<string, number | string> = { USD: 95 },
): AccountJournalItem {
  return { entry, change, balance } as unknown as AccountJournalItem;
}

describe("accountJournalItemKey", () => {
  it("is built on the beancount entry hash", () => {
    const a = item({ entry_hash: "abc", date: "2025-01-01" });
    expect(JSON.parse(accountJournalItemKey(a))[0]).toBe("abc");
  });

  // w21/419: two identical entries share a hash; their running balances differ.
  it("tells identical twins apart by their running balance", () => {
    const first = item(
      { entry_hash: "twin", date: "2025-01-01" },
      { USD: -4.5 },
      { USD: 95.5 },
    );
    const second = item(
      { entry_hash: "twin", date: "2025-01-01" },
      { USD: -4.5 },
      { USD: 91 },
    );
    expect(accountJournalItemKey(first)).not.toBe(
      accountJournalItemKey(second),
    );
    // A page that repeats a row (a shifted offset) still carries its own pair.
    const repeat = item(
      { entry_hash: "twin", date: "2025-01-01" },
      { USD: -4.5 },
      { USD: 95.5 },
    );
    expect(accountJournalItemKey(first)).toBe(accountJournalItemKey(repeat));
  });

  it("merges a page holding the second twin without calling it an overlap", () => {
    const first = item(
      { entry_hash: "twin", date: "2025-01-01" },
      { USD: -4.5 },
      { USD: 95.5 },
    );
    const second = item(
      { entry_hash: "twin", date: "2025-01-01" },
      { USD: -4.5 },
      { USD: 91 },
    );
    const merged = mergeAccountJournalItems([first], [second]);
    expect(merged.length).toBe(2);
    expect(accountJournalPageOverlapped({ incoming: 1, added: 1 })).toBe(false);
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

  it("stops after an empty page even when loaded < total", () => {
    // Stale/wrong totals must not keep fetchMore spinning on empty windows.
    expect(hasMoreAccountJournal(20, 55, { incoming: 0, added: 0 })).toBe(
      false,
    );
  });

  it("stops after a fully-deduped page so offset=loaded cannot loop", () => {
    // Merge dropped every row (overlap/race). loaded stays 20, total 40 —
    // without this guard, the next fetch uses offset 20 forever.
    expect(hasMoreAccountJournal(20, 40, { incoming: 20, added: 0 })).toBe(
      false,
    );
  });

  it("keeps paging when a page added at least one unique row", () => {
    expect(hasMoreAccountJournal(35, 55, { incoming: 20, added: 15 })).toBe(
      true,
    );
  });
});

describe("selectAccountJournalRows", () => {
  it("maps description, date, change and running balance in the active currency", () => {
    const rowItem = item(
      { entry_hash: "a", date: "2025-01-02", payee: "Blue Bottle" },
      { USD: -4.5 },
      { USD: 120.5 },
    );
    const rows = selectAccountJournalRows("USD", [rowItem]);
    expect(rows).toEqual([
      {
        key: accountJournalItemKey(rowItem),
        title: "Blue Bottle",
        date: "2025-01-02",
        flag: undefined,
        payee: "Blue Bottle",
        postings: [],
        directiveType: undefined,
        detail: undefined,
        change: -4.5,
        balance: 120.5,
        moneyScale: 1,
      },
    ]);
  });

  it("carries recorded scale from decimal strings for operating-currency rows", () => {
    const [row] = selectAccountJournalRows("MUSD", [
      item(
        { entry_hash: "m", date: "2026-06-29", payee: "Cash move" },
        { MUSD: "423.284" },
        { MUSD: "930.904" },
      ),
    ]);
    expect(row.moneyScale).toBe(3);
    expect(row.change).toBe(423.284);
    expect(row.balance).toBe(930.904);
  });

  // Note w2/047: a Balance directive's change map is empty, so its key falls
  // back to USD; the running balance must not borrow that key.
  it("keeps a non-USD running balance on a zero-change row", () => {
    const rows = selectAccountJournalRows("MRMB", [
      item(
        {
          entry_hash: "bd7f4d5235521be0c380ee15fef0a38e",
          date: "2026-06-30",
          directive_type: "Balance",
        },
        {},
        { MRMB: -532257 },
      ),
      item(
        { entry_hash: "9f04e0e3", date: "2026-06-29", payee: "Padding" },
        { MRMB: -2021 },
        { MRMB: -532257 },
      ),
    ]);
    expect(rows[0].change).toBe(0);
    expect(rows[0].balance).toBe(-532257);
    expect(rows[1].change).toBe(-2021);
    expect(rows[1].balance).toBe(-532257);

    const [balanceDay] = groupAccountJournalRowsToSections([rows[0]], "MRMB");
    // Shown at the digits the ledger recorded (none here), as the real row is
    // (w21/601).
    const [zeroDay] = groupAccountJournalRowsToSections(
      [{ ...row("2026-06-30", "Balance", 0, 0), moneyScale: 0 }],
      "MRMB",
    );
    expect(balanceDay.totalChange).toBe(zeroDay.totalChange);
  });

  it("keeps a non-USD running balance when the change map is sparse", () => {
    const [row] = selectAccountJournalRows("MSEK", [
      item(
        { entry_hash: "z", date: "2026-05-01", payee: "Zero-net transfer" },
        { EUR: 0 },
        { MSEK: "1200.5" },
      ),
    ]);
    expect(row.change).toBe(0);
    expect(row.balance).toBe(1200.5);
  });

  it("reads each map in the active currency only (w21/058)", () => {
    const [usdBalance] = selectAccountJournalRows("MRMB", [
      item(
        { entry_hash: "u1", date: "2026-07-01", directive_type: "Balance" },
        {},
        { USD: "55911000000.00" },
      ),
    ]);
    expect(usdBalance.change).toBe(0);
    expect(usdBalance.balance).toBe(0);

    const [usdChange] = selectAccountJournalRows("MRMB", [
      item(
        { entry_hash: "u2", date: "2026-07-02", payee: "Mixed" },
        { USD: -7 },
        { MRMB: -40 },
      ),
    ]);
    // The running total stays in MRMB; the USD movement is shown beside it
    // rather than read as a zero (w21/100).
    expect(usdChange.change).toBe(0);
    expect(usdChange.balance).toBe(-40);
    expect(usdChange.otherChanges).toEqual([
      { currency: "USD", number: -7, scale: 0 },
    ]);
  });

  it("takes the wider recorded scale from a zero-change row's balance", () => {
    const [row] = selectAccountJournalRows("MUSD", [
      item(
        { entry_hash: "s", date: "2026-06-30", directive_type: "Balance" },
        {},
        { MUSD: "-930.904" },
      ),
    ]);
    expect(row.change).toBe(0);
    expect(row.balance).toBe(-930.904);
    expect(row.moneyScale).toBe(3);
  });

  it("collects posting accounts and amounts for the row icon", () => {
    const [row] = selectAccountJournalRows("USD", [
      item({
        entry_hash: "a",
        payee: "Blue Bottle",
        postings: [
          { account: "Expenses:Food:Coffee", units: { number: "4.5" } },
          { account: "Assets:Bank:Checking", units: { number: "-4.5" } },
        ],
      }),
    ]);
    expect(row.postings).toEqual([
      { account: "Expenses:Food:Coffee", amount: 4.5 },
      { account: "Assets:Bank:Checking", amount: -4.5 },
    ]);
  });

  it("keeps the posting account when its amount is missing", () => {
    const [row] = selectAccountJournalRows("USD", [
      item({
        entry_hash: "a",
        postings: [{ account: "Expenses:Food:Coffee" }],
      }),
    ]);
    expect(row.postings).toEqual([
      { account: "Expenses:Food:Coffee", amount: undefined },
    ]);
  });

  it("falls back to the directive's own account when there are no postings", () => {
    const [withAccount, withNothing] = selectAccountJournalRows("USD", [
      item({
        entry_hash: "a",
        directive_type: "Open",
        account: "Assets:Bank:Checking",
      }),
      item({ entry_hash: "b", directive_type: "Price", currency: "RGAGX" }),
    ]);
    expect(withAccount.postings).toEqual([{ account: "Assets:Bank:Checking" }]);
    expect(withNothing.postings).toEqual([]);
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
    expect(groupAccountJournalRowsToSections([], "USD")).toEqual([]);
  });

  it("groups rows on the same date into one section", () => {
    const sections = groupAccountJournalRowsToSections(
      [
        row("2025-01-02", "Coffee", -4.5, 95.5),
        row("2025-01-02", "Lunch", -12, 83.5),
      ],
      "USD",
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
      "USD",
    );
    expect(sections.length).toBe(2);
    expect(sections[0].isoDate).toBe("2025-01-01");
    expect(sections[1].isoDate).toBe("2025-01-02");
  });

  it("formats the section total as a signed currency string", () => {
    const [positive] = groupAccountJournalRowsToSections(
      [row("2025-01-01", "Salary", 1000, 1000)],
      "USD",
    );
    expect(positive.totalChange).toBe("+$1,000.00");

    const [negative] = groupAccountJournalRowsToSections(
      [row("2025-01-02", "Coffee", -4.5, 95.5)],
      "USD",
    );
    expect(negative.totalChange).toBe("-$4.50");

    const [zero] = groupAccountJournalRowsToSections(
      [row("2025-01-03", "Balance", 0, 95.5)],
      "USD",
    );
    expect(zero.totalChange).toBe("$0.00");
  });

  it("sums changes across all rows in a section for the total", () => {
    const [section] = groupAccountJournalRowsToSections(
      [
        row("2025-01-02", "Coffee", -4.5, 95.5),
        row("2025-01-02", "Lunch", -12, 83.5),
      ],
      "USD",
    );
    expect(section.totalChange).toBe("-$16.50");
  });

  it("formats a human-readable displayDate from the isoDate", () => {
    const [section] = groupAccountJournalRowsToSections(
      [row("2025-03-15", "Coffee", -4.5, 95.5)],
      "USD",
    );
    expect(section.displayDate).toBe("March 15, 2025");
  });

  it("falls back to the raw isoDate when parsing fails", () => {
    const [section] = groupAccountJournalRowsToSections(
      [row("not-a-date", "X", 0, 0)],
      "USD",
    );
    expect(section.displayDate).toBe("not-a-date");
  });
});

describe("directive types on account-journal rows (note 178)", () => {
  // The bug: `title` falls back payee → narration → account → directive_type, so
  // an Open / Balance / Pad instruction on the account rendered as the bare
  // account name — indistinguishable from a transaction. The type now travels
  // with the row so the row can label it, and the title is unchanged.
  it("carries the directive type alongside the existing title", () => {
    const [open, balance, pad] = selectAccountJournalRows("USD", [
      item({
        entry_hash: "o",
        directive_type: "Open",
        account: "Assets:Bank:Checking",
      }),
      item({
        entry_hash: "b",
        directive_type: "Balance",
        account: "Assets:Bank:Checking",
      }),
      item({
        entry_hash: "p",
        directive_type: "Pad",
        account: "Assets:Bank:Checking",
      }),
    ]);
    expect([
      open.directiveType,
      balance.directiveType,
      pad.directiveType,
    ]).toEqual(["Open", "Balance", "Pad"]);
    // The account identity still shows — the type is a label, not a replacement.
    expect(open.title).toBe("Assets:Bank:Checking");
    expect(balance.title).toBe("Assets:Bank:Checking");
    expect(pad.title).toBe("Assets:Bank:Checking");
  });

  it("marks a transaction's type too, so the row can choose not to label it", () => {
    const [row] = selectAccountJournalRows("USD", [
      item({
        entry_hash: "t",
        directive_type: "Transaction",
        payee: "Blue Bottle",
      }),
    ]);
    expect(row.directiveType).toBe("Transaction");
    expect(directiveTypeLabelKey(row.directiveType)).toBe(null);
  });

  it("leaves the type undefined when the entry has none", () => {
    const [row] = selectAccountJournalRows("USD", [
      item({ entry_hash: "x", payee: "Blue Bottle" }),
    ]);
    expect(row.directiveType).toBe(undefined);
    expect(directiveTypeLabelKey(row.directiveType)).toBe(null);
  });

  it("maps each labelled directive type to its translation key", () => {
    expect(directiveTypeLabelKey("Open")).toBe("open");
    expect(directiveTypeLabelKey("Close")).toBe("close");
    expect(directiveTypeLabelKey("Balance")).toBe("balance");
    expect(directiveTypeLabelKey("Pad")).toBe("pad");
    expect(directiveTypeLabelKey("Note")).toBe("note");
    expect(directiveTypeLabelKey("Document")).toBe("document");
    expect(directiveTypeLabelKey("Price")).toBe("price");
    expect(directiveTypeLabelKey("Custom")).toBe("custom");
  });

  it("only returns keys the English base actually defines", () => {
    const keys = [
      "Open",
      "Close",
      "Balance",
      "Pad",
      "Note",
      "Document",
      "Price",
      "Custom",
    ].map(directiveTypeLabelKey);
    const missing = keys.filter((key) => key !== null && !(key in en));
    expect(missing.join(", ")).toBe("");
  });

  it("has no label for types without a translation key", () => {
    // Commodity and Event have no label key; a badge reading the raw key would
    // render the key itself.
    expect(directiveTypeLabelKey("Commodity")).toBe(null);
    expect(directiveTypeLabelKey("Event")).toBe(null);
  });
});

describe("account-journal rows in a commodity's units", () => {
  const RGAGX = "Assets:US:Vanguard:RGAGX";
  // A purchase in the Beancount example ledger, read with `conversion: "units"`.
  const purchase = (hash: string, units: string, balance: string) =>
    item(
      {
        entry_hash: hash,
        date: "2017-08-14",
        postings: [
          {
            account: RGAGX,
            units: { number: units, currency: "RGAGX" },
            cost: { number: "81.40", currency: "USD" },
          },
          {
            account: "Assets:US:Vanguard:Cash",
            units: { number: "-150.02", currency: "USD" },
          },
        ],
      },
      { RGAGX: units },
      { RGAGX: balance },
    );
  const purchases = [
    purchase("a", "1.843", "597.748"),
    purchase("b", "3.685", "595.905"),
  ];
  const near = (actual: number | null | undefined, expected: number) =>
    Math.abs((actual ?? NaN) - expected) < 1e-9;

  it("reads each change and running balance in the commodity, with its cost", () => {
    const rows = selectAccountJournalRows("USD", purchases, {
      account: RGAGX,
      currency: "RGAGX",
    });
    expect(rows.map((r) => [r.change, r.balance])).toEqual([
      [1.843, 597.748],
      [3.685, 595.905],
    ]);
    expect(rows[0].units?.currency).toBe("RGAGX");
    expect(rows[0].units?.scale).toBe(3);
    // Only the posting to the account costs anything, not the cash leg.
    expect(near(rows[0].units?.cost, 150.0202)).toBe(true);
    expect(near(rows[1].units?.cost, 299.959)).toBe(true);
  });

  it("counts postings to sub-accounts, as the journal includes them", () => {
    const [row] = selectAccountJournalRows("USD", [purchases[0]], {
      account: "Assets:US:Vanguard",
      currency: "RGAGX",
    });
    expect(near(row.units?.cost, 150.0202)).toBe(true);
  });

  it("costs a sale across lots bought at different prices, lot by lot", () => {
    // Selling 3 shares reduces two lots: 2 bought at 80 USD, 1 at 90 USD.
    // Averaging the lots would give 255; the at-cost journal gives 250.
    const [row] = selectAccountJournalRows(
      "USD",
      [
        item(
          {
            entry_hash: "s",
            postings: [
              {
                account: RGAGX,
                units: { number: "-2", currency: "RGAGX" },
                cost: { number: "80", currency: "USD" },
              },
              {
                account: RGAGX,
                units: { number: "-1", currency: "RGAGX" },
                cost: { number: "90", currency: "USD" },
              },
              {
                account: "Assets:US:Vanguard:Cash",
                units: { number: "285", currency: "USD" },
              },
            ],
          },
          { RGAGX: "-3" },
          { RGAGX: "594.748" },
        ),
      ],
      { account: RGAGX, currency: "RGAGX" },
    );
    expect([row.change, row.balance]).toEqual([-3, 594.748]);
    expect(near(row.units?.cost, -250)).toBe(true);
  });

  // w21/422: -10 VTI {200} for +5 VOO {400} summed to $0.00.
  it("costs only the shown commodity's leg of an exchange", () => {
    const exchange = (shown: string) =>
      selectAccountJournalRows(
        "USD",
        [
          item(
            {
              entry_hash: "x",
              postings: [
                {
                  account: "Assets:Brokerage",
                  units: { number: "-10", currency: "VTI" },
                  cost: { number: "200", currency: "USD" },
                },
                {
                  account: "Assets:Brokerage",
                  units: { number: "5", currency: "VOO" },
                  cost: { number: "400", currency: "USD" },
                },
              ],
            },
            { VTI: "-10", VOO: "5" },
            { VTI: "0", VOO: "5" },
          ),
        ],
        { account: "Assets:Brokerage", currency: shown },
      )[0];
    expect(near(exchange("VOO").units?.cost, 2000)).toBe(true);
    expect(near(exchange("VTI").units?.cost, -2000)).toBe(true);
  });

  it("gives no cost to a commodity whose postings carry none", () => {
    const [row] = selectAccountJournalRows(
      "USD",
      [
        item(
          {
            entry_hash: "v",
            postings: [
              {
                account: "Assets:US:Hoogle:Vacation",
                units: { number: "5", currency: "VACHR" },
                cost: null,
              },
            ],
          },
          { VACHR: "5" },
          { VACHR: "-13" },
        ),
      ],
      { account: "Assets:US:Hoogle:Vacation", currency: "VACHR" },
    );
    expect([row.change, row.balance]).toEqual([5, -13]);
    expect(row.units?.cost).toBe(null);
  });

  it("totals a day's changes in the commodity at its widest scale", () => {
    const rows = selectAccountJournalRows("USD", purchases, {
      account: RGAGX,
      currency: "RGAGX",
    });
    const [section] = groupAccountJournalRowsToSections(rows, "USD");
    expect(section.totalChange).toBe("+5.528 RGAGX");
  });
});

// w21/050: Note, Balance and Document rows read only "Assets:Cash · Note",
// with the note's text, the asserted amount and the file nowhere in the app.
describe("selectAccountJournalRows: what a directive says", () => {
  const directive = (entry: Record<string, unknown>) =>
    selectAccountJournalRows("USD", [
      item(
        {
          entry_hash: String(entry.directive_type),
          date: "2026-10-11",
          account: "Assets:Cash",
          ...entry,
        },
        {},
        { USD: "49.75" },
      ),
    ])[0]!.detail;

  it("carries a note's text", () => {
    expect(
      directive({
        directive_type: "Note",
        comment: 'qa-20261020 note "quoted" text',
      }),
    ).toEqual({ kind: "note", text: 'qa-20261020 note "quoted" text' });
  });

  it("carries a document's file", () => {
    expect(
      directive({
        directive_type: "Document",
        filename: "qa-20261020/receipt.pdf",
      }),
    ).toEqual({ kind: "document", text: "qa-20261020/receipt.pdf" });
  });

  it("carries a balance assertion's amount, and how far a failed one was off", () => {
    expect(
      directive({
        directive_type: "Balance",
        amount: { number: "49.75", currency: "USD" },
        diff_amount: null,
      }),
    ).toEqual({ kind: "balance", amount: "49.75 USD", offBy: null });
    expect(
      directive({
        directive_type: "Balance",
        amount: { number: "50.00", currency: "USD" },
        diff_amount: { number: "-0.25", currency: "USD" },
      }),
    ).toEqual({ kind: "balance", amount: "50.00 USD", offBy: "-0.25 USD" });
  });

  // w21/744: an assertion that passed within its `~ 0.05` read as a silent
  // 0.03 mismatch against the 49.72 balance beneath it.
  it("writes an assertion's explicit tolerance, as Beancount does", () => {
    expect(
      directive({
        directive_type: "Balance",
        amount: { number: "49.75", currency: "USD" },
        tolerance: "0.05",
        diff_amount: null,
      }),
    ).toEqual({ kind: "balance", amount: "49.75 ~ 0.05 USD", offBy: null });
    expect(
      directive({
        directive_type: "Balance",
        amount: { number: "49.75", currency: "USD" },
        tolerance: null,
        diff_amount: null,
      }),
    ).toEqual({ kind: "balance", amount: "49.75 USD", offBy: null });
  });

  // w21/212: two "QA REPEAT" rows differed only by amount here, while
  // Transactions told them apart by their narrations.
  it("shows a transaction's narration under its payee, as Transactions does", () => {
    expect(
      directive({
        directive_type: "Transaction",
        payee: "QA REPEAT",
        narration: "Bus pass September",
      }),
    ).toEqual({ kind: "narration", text: "Bus pass September" });
  });

  it("adds nothing when the narration repeats or replaces the payee", () => {
    expect(directive({ directive_type: "Transaction", payee: "Cafe" })).toBe(
      undefined,
    );
    expect(
      directive({
        directive_type: "Transaction",
        payee: "Cafe",
        narration: "Cafe",
      }),
    ).toBe(undefined);
    expect(
      directive({ directive_type: "Transaction", narration: "Lunch" }),
    ).toBe(undefined);
  });

  it("words the failed difference in every locale", () => {
    expect(en.balanceOffBy).toBe("Off by {{amount}}");
  });
});

// w21/072: a head entry added while paging shifted page 2 down a row; dedup
// dropped the repeat and the new entry was never fetched.
describe("paging past an entry added at the head", () => {
  const hashes = (n: number, from = 0) =>
    Array.from({ length: n }, (_, i) => item({ entry_hash: `e${from + i}` }));

  it("flags the overlapping page so the screen refetches", () => {
    const loaded = hashes(50);
    // "new" now sits at the top, so offset 50 starts at the old 50th row.
    const page2 = hashes(50, 49);
    const merged = mergeAccountJournalItems(loaded, page2);
    const page = {
      incoming: page2.length,
      added: merged.length - loaded.length,
    };
    expect(accountJournalPageOverlapped(page)).toBe(true);
    expect(accountJournalPageOverlapped({ incoming: 50, added: 50 })).toBe(
      false,
    );
    expect(accountJournalPageOverlapped({ incoming: 0, added: 0 })).toBe(false);
  });

  it("is refetched by the screen", () => {
    const source = require("fs").readFileSync(
      require("path").join(__dirname, "..", "..", "account-detail-screen.tsx"),
      "utf8",
    ) as string;
    expect(
      source.includes("listMoved = accountJournalPageOverlapped(page);"),
    ).toBe(true);
    expect(
      source.includes("void journalRefetch().catch(() => undefined);"),
    ).toBe(true);
  });
});

// w21/100: a 500 EUR deposit to a USD-read account showed "$0.00" on its row
// and day, as if nothing moved.
describe("a movement only in another currency", () => {
  const rows = selectAccountJournalRows("USD", [
    item(
      { entry_hash: "eur", date: "2026-08-06", payee: "QA WISE EUR" },
      { EUR: "500.00" },
      { USD: "1000.00", EUR: "500.00" },
    ),
    item(
      { entry_hash: "usd", date: "2026-08-05", payee: "QA WISE USD" },
      { USD: "1000.00" },
      { USD: "1000.00" },
    ),
  ]);

  it("shows the row's own amount, not a zero", () => {
    expect(rows[0].change).toBe(0);
    expect(formatOtherChanges(rows[0].otherChanges!)).toBe("+500.00 EUR");
    // The running balance stays in the account's currency.
    expect(rows[0].balance).toBe(1000);
    // USD rows are unchanged.
    expect(rows[1].otherChanges).toBe(undefined);
  });

  it("shows the day's own amount, not $0.00", () => {
    const sections = groupAccountJournalRowsToSections(rows, "USD");
    expect(sections[0].totalChange).toBe("+500.00 EUR");
    expect(sections[1].totalChange).toBe("+$1,000.00");
  });

  it("is rendered with a not-in-total note", () => {
    const source = require("fs").readFileSync(
      require("path").join(
        __dirname,
        "..",
        "..",
        "components",
        "account-entry-row.tsx",
      ),
      "utf8",
    ) as string;
    expect(source.includes("? formatOtherChanges(otherChanges)")).toBe(true);
    expect(source.includes('t("valuationNotInTotalTag")')).toBe(true);
  });
});

// w21/421: an FX conversion moves two currencies; only the shown one was drawn.
describe("a movement in the shown currency and another", () => {
  const rows = selectAccountJournalRows("USD", [
    item(
      { entry_hash: "fx", date: "2026-08-06", payee: "Wise" },
      { USD: "-110.00", EUR: "100.00" },
      { USD: "890.00", EUR: "100.00" },
    ),
  ]);

  it("keeps the shown change and names the other leg", () => {
    expect(rows[0].change).toBe(-110);
    expect(formatOtherChanges(rows[0].otherChanges!)).toBe("+100.00 EUR");
  });

  it("names the other leg in the day's total", () => {
    expect(groupAccountJournalRowsToSections(rows, "USD")[0].totalChange).toBe(
      "-$110.00 · +100.00 EUR",
    );
  });

  it("reads the units view the same way", () => {
    const [swap] = selectAccountJournalRows(
      "USD",
      [
        item(
          { entry_hash: "sw", date: "2026-08-07", payee: "Swap" },
          { VOO: "5", VTI: "-10" },
          { VOO: "5" },
        ),
      ],
      { currency: "VOO" } as never,
    );
    expect(swap.change).toBe(5);
    expect(formatOtherChanges(swap.otherChanges!)).toBe("-10 VTI");
  });
});

// w21/163: float residue signed a day that nets to zero.
describe("a day that nets to zero", () => {
  it("reads an unsigned zero, not -$0.00 or +$0.00", () => {
    const expenses = groupAccountJournalRowsToSections(
      [
        row("2026-08-30", "QA GROCER", -12.3, 0),
        row("2026-08-30", "QA GROCER", 8.2, 12.3),
        row("2026-08-30", "QA GROCER", 4.1, 4.1),
      ],
      "USD",
    );
    expect(expenses[0].totalChange).toBe("$0.00");
    const cash = groupAccountJournalRowsToSections(
      [
        row("2026-08-30", "QA GROCER", 12.3, 0),
        row("2026-08-30", "QA GROCER", -8.2, 0),
        row("2026-08-30", "QA GROCER", -4.1, 0),
      ],
      "USD",
    );
    expect(cash[0].totalChange).toBe("$0.00");
  });

  it("still signs a real day total", () => {
    const [day] = groupAccountJournalRowsToSections(
      [row("2026-08-30", "A", 4.1, 0), row("2026-08-30", "B", 8.2, 0)],
      "USD",
    );
    expect(day.totalChange).toBe("+$12.30");
  });
});

// w21/207: buying a commodity at cost left the account's dollars at 9-10
// decimals ("+$7,422.647539491") from the buy onward, though its Accounts row
// read $8,427.65.
describe("money precision in an account that holds a commodity", () => {
  const buy = item(
    {
      date: "2026-08-04",
      directive_type: "Transaction",
      narration: "QA EXCH BUY",
      postings: [
        {
          account: "Assets:Exch",
          units: { number: "0.12345678", currency: "QABTC" },
          cost: { number: "60123.45", currency: "USD" },
        },
        {
          account: "Assets:Checking",
          units: { number: "-7422.65", currency: "USD" },
        },
      ],
    },
    { USD: "7422.647539491" },
    { USD: "8422.647539491" },
  );
  const deposit = item(
    {
      date: "2026-08-03",
      directive_type: "Transaction",
      postings: [
        {
          account: "Assets:Exch",
          units: { number: "1000.00", currency: "USD" },
        },
      ],
    },
    { USD: "1000.00" },
    { USD: "1000.00" },
  );
  const later = item(
    {
      date: "2026-09-01",
      directive_type: "Transaction",
      postings: [
        { account: "Assets:Exch", units: { number: "5.00", currency: "USD" } },
      ],
    },
    { USD: "5.00" },
    { USD: "8427.647539491" },
  );

  it("reads a converted figure at the scale the ledger recorded in the currency", () => {
    const rows = selectAccountJournalRows("USD", [deposit, buy, later]);
    expect(rows.map((r) => r.moneyScale)).toEqual([2, 2, 2]);
    const sections = groupAccountJournalRowsToSections(rows, "USD");
    expect(sections.map((s) => s.totalChange)).toEqual([
      "+$1,000.00",
      "+$7,422.65",
      "+$5.00",
    ]);
  });

  it("keeps a sub-cent amount the ledger really recorded", () => {
    const tax = item(
      {
        date: "2026-08-05",
        directive_type: "Transaction",
        postings: [
          {
            account: "Assets:Exch",
            units: { number: "0.005", currency: "USD" },
          },
        ],
      },
      { USD: "0.005" },
      { USD: "0.005" },
    );
    const [only] = selectAccountJournalRows("USD", [tax]);
    expect(only.moneyScale).toBe(3);
  });
});

// w21/241: a transaction with no payee or narration was titled with the
// English directive type, so the row's translated fallback never ran.
describe("the title of a bare transaction", () => {
  const titleOf = (entry: Record<string, unknown>) =>
    selectAccountJournalRows("USD", [item(entry)])[0].title;

  it("is left empty for the row's translated fallback", () => {
    expect(titleOf({ date: "2026-10-01", directive_type: "Transaction" })).toBe(
      "",
    );
    expect(
      titleOf({
        date: "2026-10-01",
        directive_type: "Transaction",
        payee: "",
        narration: "",
      }),
    ).toBe("");
  });

  it("still names a transaction by its payee, else its narration", () => {
    expect(
      titleOf({ directive_type: "Transaction", payee: "Cafe", narration: "x" }),
    ).toBe("Cafe");
    expect(titleOf({ directive_type: "Transaction", narration: "Lunch" })).toBe(
      "Lunch",
    );
  });

  // w21/667: a payee of spaces is truthy, so the row was titled with a space.
  it("takes the narration when the payee is only spaces", () => {
    const [row] = selectAccountJournalRows("USD", [
      item({
        date: "2026-10-15",
        directive_type: "Transaction",
        payee: " ",
        narration: " qa Coffee ",
      }),
    ]);
    expect(row.title).toBe("qa Coffee");
    expect(row.payee).toBe("qa Coffee");
    expect(
      titleOf({ directive_type: "Transaction", payee: " ", narration: " " }),
    ).toBe("");
  });

  it("keeps naming other directives by their account or type", () => {
    expect(titleOf({ directive_type: "Open", account: "Assets:Cash" })).toBe(
      "Assets:Cash",
    );
    expect(titleOf({ directive_type: "Balance" })).toBe("Balance");
  });

  it("is translated by the rows that show it", () => {
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const read = (...parts: string[]) =>
      fs
        .readFileSync(path.join(__dirname, "..", "..", "..", ...parts), "utf8")
        .replace(/\s+/g, "");
    expect(
      read(
        "account-detail-screen",
        "components",
        "account-entry-row.tsx",
      ).includes('consttitle=row.title||t("transaction");'),
    ).toBe(true);
    expect(
      read("transactions-screen", "entry-row", "index.tsx").includes(
        "constname=entryRowTitle(entry)??untitledLabel;",
      ),
    ).toBe(true);
  });
});

// w21/613: a transfer between two children of a parent nets to no change, so
// identical twins share the whole key; the second was dropped as a repeat and the
// list reloaded from page 1 on every scroll.
describe("identical twins on a parent account", () => {
  const twin = () =>
    item({ entry_hash: "twin", date: "2025-01-01" }, {}, { USD: 100 });

  it("appends a twin on the next page when the total has not moved", () => {
    const merged = mergeAccountJournalItems([twin()], [twin()], {
      loaded: 2,
      page: 2,
    });
    expect(merged.length).toBe(2);
    expect(accountJournalPageOverlapped({ incoming: 1, added: 1 })).toBe(false);
  });

  it("still drops a repeat when the total moved under the user", () => {
    const merged = mergeAccountJournalItems([twin()], [twin()], {
      loaded: 2,
      page: 3,
    });
    expect(merged.length).toBe(1);
  });

  it("gives twins different row keys", () => {
    const keys = accountJournalItemKeys([twin(), twin(), twin()]);
    expect(new Set(keys).size).toBe(3);
    expect(keys[0]).toBe(accountJournalItemKey(twin()));
    const rows = selectAccountJournalRows("USD", [twin(), twin()]);
    expect(rows[0].key === rows[1].key).toBe(false);
  });
});

// w21/741: the Budget tab's `custom "budget"` directive names the account, so
// the journal carries it: a blank "Custom" row of $0.00, in English, under a
// "$0.00" day, on the account and every parent.
describe("an account journal's Custom directives", () => {
  const budget = item(
    {
      entry_hash: "budget",
      date: "2026-10-01",
      directive_type: "Custom",
      type: "budget",
      values: [
        { type: "account", value: "Expenses:Food" },
        { type: "string", value: "monthly" },
      ],
    },
    {},
    { USD: 4133.49 },
  );
  const grocery = item(
    {
      entry_hash: "grocery",
      date: "2026-10-01",
      directive_type: "Transaction",
      narration: "Groceries",
      postings: [
        { account: "Expenses:Food", units: { number: "42", currency: "USD" } },
      ],
    },
    { USD: 42 },
    { USD: 4133.49 },
  );

  it("are left out, and so is a day that holds nothing else", () => {
    const rows = selectAccountJournalRows("USD", [budget, grocery]);
    expect(rows.map((row) => row.title)).toEqual(["Groceries"]);
    expect(
      groupAccountJournalRowsToSections(
        selectAccountJournalRows("USD", [budget]),
        "USD",
      ),
    ).toEqual([]);
  });

  it("keep the other rows' keys, which the screen looks entries up by", () => {
    const keys = accountJournalItemKeys([budget, grocery]);
    expect(
      selectAccountJournalRows("USD", [budget, grocery]).map((row) => row.key),
    ).toEqual([keys[1]]);
  });
});

// w21/782: an 18-decimal holding went through a float on this screen and read
// "1.234567890123460000 QAETH" where Accounts read "1.234567890123456789".
describe("an amount a double cannot hold", () => {
  const eth = "1.234567890123456789";
  const rows = selectAccountJournalRows(
    "USD",
    [
      item(
        { entry_hash: "x", date: "2026-10-05", directive_type: "Transaction" },
        { QAETH: eth },
        { QAETH: eth },
      ),
    ],
    { account: "Assets:Qa20261020Eth", currency: "QAETH" },
  );

  it("keeps the ledger's digits on the row", () => {
    expect([rows[0].changeExact, rows[0].balanceExact]).toEqual([eth, eth]);
  });

  it("totals the day in them", () => {
    const [day] = groupAccountJournalRowsToSections(
      [
        ...rows,
        { ...rows[0], key: "second", change: 1, changeExact: undefined },
      ],
      "USD",
    );
    expect(day.totalChange).toBe("+2.234567890123456789 QAETH");
    expect(groupAccountJournalRowsToSections(rows, "USD")[0].totalChange).toBe(
      `+${eth} QAETH`,
    );
  });

  it("names another currency's leg, and sums it, in them", () => {
    const [leg] = selectAccountJournalRows("USD", [
      item(
        { entry_hash: "y", date: "2026-10-05", directive_type: "Transaction" },
        { USD: "0", ETH: "0.123456789123456789" },
        { USD: "0" },
      ),
    ]);
    expect(formatOtherChanges(leg.otherChanges ?? [])).toBe(
      "+0.123456789123456789 ETH",
    );
    const [day] = groupAccountJournalRowsToSections([leg, leg], "USD");
    expect(day.totalChange).toBe("+0.246913578246913578 ETH");
  });

  it("leaves an ordinary amount to its figure", () => {
    const [plain] = selectAccountJournalRows(
      "USD",
      [
        item(
          { entry_hash: "z", date: "2026-10-05" },
          { BTC: "0.5" },
          { BTC: "1" },
        ),
      ],
      { account: "Assets:Btc", currency: "BTC" },
    );
    expect([plain.changeExact, plain.balanceExact]).toEqual([
      undefined,
      undefined,
    ]);
  });
});
