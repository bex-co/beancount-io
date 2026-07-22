import {
  formatDisplayDate,
  formatAmount,
  selectTransactionAmount,
  groupToSections,
} from "../journal-display-utils";
import {
  DirectiveType,
  JournalTransaction,
  JournalOpen,
  JournalClose,
} from "../../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeTransaction = (
  overrides: Partial<JournalTransaction> = {},
): JournalTransaction => ({
  entry_hash: "abc123",
  date: "2026-07-01",
  directive_type: DirectiveType.TRANSACTION,
  flag: "*",
  payee: "Stripe",
  narration: "Payment",
  postings: [],
  tags: [],
  links: [],
  ...overrides,
});

const makePosting = (
  account: string,
  number: string,
  currency = "USD",
  cost?: { number: string; currency: string },
) => ({
  account,
  units: { number, currency },
  ...(cost ? { cost: { ...cost, date: "2026-07-01" } } : {}),
});

const makeOpen = (account: string, currencies?: string[]): JournalOpen => ({
  entry_hash: "open1",
  date: "2026-01-01",
  directive_type: DirectiveType.OPEN,
  account,
  currencies: currencies ?? null,
});

const makeClose = (account: string): JournalClose => ({
  entry_hash: "close1",
  date: "2026-06-01",
  directive_type: DirectiveType.CLOSE,
  account,
});

// ---------------------------------------------------------------------------
// formatDisplayDate
// ---------------------------------------------------------------------------

describe("formatDisplayDate", () => {
  it("formats a standard ISO date to long locale string", () => {
    expect(formatDisplayDate("2026-07-06")).toBe("July 6, 2026");
  });

  it("formats the first of a month without padding artefacts", () => {
    expect(formatDisplayDate("2026-01-01")).toBe("January 1, 2026");
  });

  it("handles end-of-year dates correctly", () => {
    expect(formatDisplayDate("2025-12-31")).toBe("December 31, 2025");
  });

  it("returns the raw string when the input is not a valid date", () => {
    expect(formatDisplayDate("not-a-date")).toBe("not-a-date");
  });
});

// ---------------------------------------------------------------------------
// formatAmount
// ---------------------------------------------------------------------------

describe("formatAmount", () => {
  it("formats USD with dollar sign and two decimal places", () => {
    expect(formatAmount(7000, "USD")).toBe("$7,000.00");
  });

  it("formats small USD amounts", () => {
    expect(formatAmount(0.5, "USD")).toBe("$0.50");
  });

  it("formats large USD amounts with thousands separator", () => {
    expect(formatAmount(1234567.89, "USD")).toBe("$1,234,567.89");
  });

  it("uses absolute value so negatives display the same as positives", () => {
    expect(formatAmount(-330.19, "USD")).toBe("$330.19");
    expect(formatAmount(330.19, "USD")).toBe("$330.19");
  });

  it("formats non-USD currencies with amount then currency code", () => {
    expect(formatAmount(100, "EUR")).toBe("100.00 EUR");
    expect(formatAmount(50.5, "GBP")).toBe("50.50 GBP");
  });
});

// ---------------------------------------------------------------------------
// selectTransactionAmount
// ---------------------------------------------------------------------------

describe("selectTransactionAmount", () => {
  it("returns null when the transaction has no postings", () => {
    expect(selectTransactionAmount(makeTransaction())).toBe(null);
  });

  it("nets same-currency cash postings, keeping the sign", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Assets:Checking", "330.19"),
        makePosting("Income:Stripe", "-330.19"),
      ],
    });
    expect(selectTransactionAmount(tx)).toEqual({
      text: "$330.19",
      value: 330.19,
      currency: "USD",
    });
  });

  it("reports outflows as a negative value with unsigned text", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Expenses:Food", "100.00"),
        makePosting("Assets:Checking", "-100.00"),
      ],
    });
    expect(selectTransactionAmount(tx)).toEqual({
      text: "$100.00",
      value: -100,
      currency: "USD",
    });
  });

  it("includes Liabilities postings in the cash net", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Expenses:Travel", "500.00"),
        makePosting("Liabilities:CreditCard", "-500.00"),
      ],
    });
    expect(selectTransactionAmount(tx)?.value).toBe(-500);
  });

  it("nets several postings in the same currency", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Assets:Checking", "300.00"),
        makePosting("Assets:Savings", "-100.00"),
        makePosting("Income:Stripe", "-200.00"),
      ],
    });
    expect(selectTransactionAmount(tx)?.value).toBe(200);
  });

  it("never adds across currencies: a fund buy reports the cash leg", () => {
    // Assets:…:RGAGX +355.63 RGAGX {8.93 USD} / Assets:…:Cash -3177.39 USD.
    // Summing both legs would yield -2821.76 of no currency at all.
    const tx = makeTransaction({
      postings: [
        makePosting("Assets:Vanguard:RGAGX", "355.63", "RGAGX", {
          number: "8.93",
          currency: "USD",
        }),
        makePosting("Assets:Vanguard:Cash", "-3177.39"),
      ],
    });
    expect(selectTransactionAmount(tx)).toEqual({
      text: "$3,177.39",
      value: -3177.39,
      currency: "USD",
    });
  });

  it("prefers the cost currency even when the commodity leg is larger", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Assets:Broker:AAPL", "9000", "AAPL", {
          number: "0.5",
          currency: "EUR",
        }),
        makePosting("Assets:Broker:Cash", "-4500.00", "EUR"),
      ],
    });
    expect(selectTransactionAmount(tx)).toEqual({
      text: "4,500.00 EUR",
      value: -4500,
      currency: "EUR",
    });
  });

  it("falls back to the largest bucket when no leg quotes a cost", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Assets:Wallet:BTC", "0.25", "BTC"),
        makePosting("Assets:Checking", "-12000.00"),
      ],
    });
    expect(selectTransactionAmount(tx)?.currency).toBe("USD");
  });

  it("falls back to the largest single posting when no cash accounts exist", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Expenses:Food", "30.00"),
        makePosting("Income:Gifts", "-30.00"),
      ],
    });
    // Netting would read $0.00 — an Income → Expenses entry still moved $30.
    expect(selectTransactionAmount(tx)?.value).toBe(30);
  });

  it("skips postings whose amount is not a finite number", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Assets:Checking", "not-a-number"),
        makePosting("Assets:Savings", "-42.00"),
      ],
    });
    expect(selectTransactionAmount(tx)?.value).toBe(-42);
  });

  it("returns null when no posting has a usable amount", () => {
    const tx = makeTransaction({
      postings: [makePosting("Assets:Checking", "not-a-number")],
    });
    expect(selectTransactionAmount(tx)).toBe(null);
  });

  it("does not special-case pending transactions", () => {
    const tx = makeTransaction({
      flag: "!",
      postings: [
        makePosting("Assets:Checking", "7000.00"),
        makePosting("Income:Goldman", "-7000.00"),
      ],
    });
    expect(selectTransactionAmount(tx)?.value).toBe(7000);
  });
});

// ---------------------------------------------------------------------------
// groupToSections
// ---------------------------------------------------------------------------

describe("groupToSections", () => {
  it("returns an empty array for no entries", () => {
    expect(groupToSections([], "").length).toBe(0);
  });

  it("groups entries with the same date into one section", () => {
    const a = makeTransaction({ date: "2026-07-01" });
    const b = makeTransaction({ date: "2026-07-01", payee: "Anthropic" });
    const sections = groupToSections([a, b], "");
    expect(sections.length).toBe(1);
    expect(sections[0].data.length).toBe(2);
    expect(sections[0].isoDate).toBe("2026-07-01");
  });

  it("creates separate sections for different dates", () => {
    const a = makeTransaction({ date: "2026-07-01" });
    const b = makeTransaction({ date: "2026-06-30" });
    expect(groupToSections([a, b], "").length).toBe(2);
  });

  it("preserves insertion order (does not re-sort)", () => {
    const a = makeTransaction({ date: "2026-07-01" });
    const b = makeTransaction({ date: "2026-07-06" });
    const sections = groupToSections([a, b], "");
    expect(sections[0].isoDate).toBe("2026-07-01");
    expect(sections[1].isoDate).toBe("2026-07-06");
  });

  it("sets displayDate as the long locale format", () => {
    const sections = groupToSections(
      [makeTransaction({ date: "2026-07-01" })],
      "",
    );
    expect(sections[0].displayDate).toBe("July 1, 2026");
  });

  it("filters by payee when searchQuery is set", () => {
    const stripe = makeTransaction({ payee: "Stripe" });
    const anthropic = makeTransaction({ payee: "Anthropic" });
    const sections = groupToSections([stripe, anthropic], "stripe");
    expect(sections.length).toBe(1);
    expect(sections[0].data[0]).toBe(stripe);
  });

  it("filters by narration (case-insensitive)", () => {
    const tx = makeTransaction({ payee: null, narration: "Monthly SaaS fee" });
    const other = makeTransaction({ payee: "Stripe", narration: "Payment" });
    const sections = groupToSections([tx, other], "saas");
    expect(sections.length).toBe(1);
    expect(sections[0].data[0]).toBe(tx);
  });

  it("filters by posting account", () => {
    const tx = makeTransaction({
      payee: "Transfer",
      postings: [makePosting("Assets:Goldman:Savings", "5000.00")],
    });
    const other = makeTransaction({ payee: "Stripe" });
    const sections = groupToSections([tx, other], "goldman");
    expect(sections.length).toBe(1);
    expect(sections[0].data[0]).toBe(tx);
  });

  it("returns all entries when searchQuery is empty", () => {
    const entries = [
      makeTransaction({ date: "2026-07-01" }),
      makeTransaction({ date: "2026-07-02" }),
      makeTransaction({ date: "2026-07-03" }),
    ];
    expect(groupToSections(entries, "").length).toBe(3);
  });

  it("returns empty array when search matches nothing", () => {
    expect(groupToSections([makeTransaction()], "xyzzy").length).toBe(0);
  });

  it("matches Open/Close directives by directive_type string", () => {
    const open = makeOpen("Assets:Checking");
    const tx = makeTransaction({ payee: "Stripe" });
    const sections = groupToSections([open, tx], "open");
    expect(sections.length).toBe(1);
    expect(sections[0].data[0]).toBe(open);
  });

  it("groups non-transaction directives alongside transactions", () => {
    const close = makeClose("Assets:Checking");
    const tx = makeTransaction({ date: close.date, payee: "Stripe" });
    const sections = groupToSections([close, tx], "");
    expect(sections.length).toBe(1);
    expect(sections[0].data.length).toBe(2);
  });
});
