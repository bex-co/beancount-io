import {
  formatDisplayDate,
  formatAmount,
  getSectionTotal,
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

const makePosting = (account: string, number: string, currency = "USD") => ({
  account,
  units: { number, currency },
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
// getSectionTotal
// ---------------------------------------------------------------------------

describe("getSectionTotal", () => {
  it("returns $0.00 when there are no entries", () => {
    expect(getSectionTotal([])).toBe("$0.00");
  });

  it("returns $0.00 when all transactions are pending (flag !)", () => {
    const tx = makeTransaction({
      flag: "!",
      postings: [
        makePosting("Assets:Checking", "7000.00"),
        makePosting("Income:Goldman", "-7000.00"),
      ],
    });
    expect(getSectionTotal([tx])).toBe("$0.00");
  });

  it("returns $0.00 when no postings hit Assets or Liabilities accounts", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Expenses:Food", "100.00"),
        makePosting("Income:Salary", "-100.00"),
      ],
    });
    expect(getSectionTotal([tx])).toBe("$0.00");
  });

  it("returns positive total with + prefix for net inflow to assets", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Assets:Checking", "330.19"),
        makePosting("Income:Stripe", "-330.19"),
      ],
    });
    expect(getSectionTotal([tx])).toBe("+$330.19");
  });

  it("returns negative total with - prefix for net outflow from assets", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Expenses:Food", "100.00"),
        makePosting("Assets:Checking", "-100.00"),
      ],
    });
    expect(getSectionTotal([tx])).toBe("-$100.00");
  });

  it("sums cleared transactions and ignores pending ones", () => {
    const cleared = makeTransaction({
      flag: "*",
      postings: [
        makePosting("Assets:Checking", "330.19"),
        makePosting("Income:Stripe", "-330.19"),
      ],
    });
    const pending = makeTransaction({
      flag: "!",
      postings: [
        makePosting("Assets:Goldman", "7000.00"),
        makePosting("Income:Goldman", "-7000.00"),
      ],
    });
    expect(getSectionTotal([cleared, pending])).toBe("+$330.19");
  });

  it("nets income and expenses across multiple cleared transactions", () => {
    const income = makeTransaction({
      postings: [
        makePosting("Assets:Checking", "330.19"),
        makePosting("Income:Stripe", "-330.19"),
      ],
    });
    const expense = makeTransaction({
      postings: [
        makePosting("Expenses:SaaS", "100.00"),
        makePosting("Assets:Checking", "-100.00"),
      ],
    });
    // net = 330.19 - 100 = 230.19
    expect(getSectionTotal([income, expense])).toBe("+$230.19");
  });

  it("includes Liabilities postings in the net", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Expenses:Travel", "500.00"),
        makePosting("Liabilities:CreditCard", "-500.00"),
      ],
    });
    expect(getSectionTotal([tx])).toBe("-$500.00");
  });

  it("returns $0.00 for non-transaction directives", () => {
    expect(getSectionTotal([makeOpen("Assets:Checking")])).toBe("$0.00");
    expect(getSectionTotal([makeClose("Assets:Checking")])).toBe("$0.00");
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
});
