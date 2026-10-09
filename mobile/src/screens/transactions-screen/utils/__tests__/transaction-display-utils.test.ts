import { amountScale } from "../../../../common/number-utils";
import {
  type EntryAmount,
  formatAmount,
  isMixedPostingsAmount,
  selectTransactionAmount,
  groupToSections,
} from "../transaction-display-utils";
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

/** The selector's amount, failing the test on null or a mixed summary. */
const entryAmount = (tx: JournalTransaction): EntryAmount => {
  const amount = selectTransactionAmount(tx);
  if (!amount || isMixedPostingsAmount(amount)) {
    throw new Error(`expected an amount, got ${JSON.stringify(amount)}`);
  }
  return amount;
};

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

  it("keeps the recorded scale so small crypto amounts survive", () => {
    expect(formatAmount(0.004, "ETH", 3)).toBe("0.004 ETH");
    expect(formatAmount(0.005, "STETH", 3)).toBe("0.005 STETH");
    expect(formatAmount(0.00000001, "BTC", 8)).toBe("0.00000001 BTC");
  });

  it("floors at two digits, so a coarser source still pads", () => {
    expect(formatAmount(1234.5, "USD", 1)).toBe("$1,234.50");
    expect(formatAmount(7000, "USD", 0)).toBe("$7,000.00");
  });

  it("clamps an absurd scale instead of throwing on Intl's 20-digit cap", () => {
    expect(formatAmount(1.5, "XYZ", 99)).toBe("1.50 XYZ");
  });
});

// ---------------------------------------------------------------------------
// amountScale
// ---------------------------------------------------------------------------

describe("amountScale", () => {
  it("counts the recorded fraction digits", () => {
    expect(amountScale("0.004")).toBe(3);
    expect(amountScale("-0.00500")).toBe(5);
    expect(amountScale("12.34")).toBe(2);
  });

  it("reports zero for an integer string", () => {
    expect(amountScale("7000")).toBe(0);
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
    expect(entryAmount(tx).value).toBe(-500);
  });

  it("nets several postings in the same currency", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Assets:Checking", "300.00"),
        makePosting("Assets:Savings", "-100.00"),
        makePosting("Income:Stripe", "-200.00"),
      ],
    });
    expect(entryAmount(tx).value).toBe(200);
  });

  it("shows how much moved in a transfer between a liability and a bank account", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Assets:Bank:Checking", "6931.48"),
        makePosting("Liabilities:US:Chase:Slate", "-6931.48"),
      ],
    });
    expect(selectTransactionAmount(tx)).toEqual({
      text: "$6,931.48",
      value: 0,
      currency: "USD",
    });
  });

  it("shows how much moved in a transfer between two bank accounts", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Assets:Checking", "-250.00"),
        makePosting("Assets:Savings", "250.00"),
      ],
    });
    expect(selectTransactionAmount(tx)).toEqual({
      text: "$250.00",
      value: 0,
      currency: "USD",
    });
  });

  it("keeps a transfer's recorded precision", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Assets:Exchange", "-0.00012345", "BTC"),
        makePosting("Assets:Wallet", "0.00012345", "BTC"),
      ],
    });
    expect(entryAmount(tx).text).toBe("0.00012345 BTC");
  });

  it("still reports a genuinely zero single cash posting as zero", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Assets:Checking", "0.00"),
        makePosting("Income:Adjustment", "0.00"),
      ],
    });
    expect(selectTransactionAmount(tx)).toEqual({
      text: "$0.00",
      value: 0,
      currency: "USD",
    });
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
    expect(entryAmount(tx).currency).toBe("USD");
  });

  it("falls back to the largest single posting when no cash accounts exist", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Expenses:Food", "30.00"),
        makePosting("Income:Gifts", "-30.00"),
      ],
    });
    // Netting would read $0.00 — an Income → Expenses entry still moved $30.
    expect(entryAmount(tx).value).toBe(30);
  });

  it("skips postings whose amount is not a finite number", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Assets:Checking", "not-a-number"),
        makePosting("Assets:Savings", "-42.00"),
      ],
    });
    expect(entryAmount(tx).value).toBe(-42);
  });

  it("returns null when no posting has a usable amount", () => {
    const tx = makeTransaction({
      postings: [makePosting("Assets:Checking", "not-a-number")],
    });
    expect(selectTransactionAmount(tx)).toBe(null);
  });

  it("keeps a sub-cent crypto reward visible instead of rounding to zero", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Assets:Crypto:ETH", "0.004", "ETH"),
        makePosting("Income:Crypto:Rewards", "-0.004", "ETH"),
      ],
    });
    expect(selectTransactionAmount(tx)).toEqual({
      text: "0.004 ETH",
      value: 0.004,
      currency: "ETH",
    });
  });

  it("does not round a staking reward up to a cent either", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Assets:Crypto:Lido", "0.005", "STETH"),
        makePosting("Income:Crypto:Staking", "-0.005", "STETH"),
      ],
    });
    expect(entryAmount(tx).text).toBe("0.005 STETH");
  });

  it("still shows USD at cent precision", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Expenses:Food", "12.3"),
        makePosting("Assets:Checking", "-12.3"),
      ],
    });
    expect(entryAmount(tx).text).toBe("$12.30");
  });

  it("prints an unsigned magnitude for a negative crypto outflow", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Expenses:Fees", "0.0012", "ETH"),
        makePosting("Assets:Crypto:ETH", "-0.0012", "ETH"),
      ],
    });
    expect(selectTransactionAmount(tx)).toEqual({
      text: "0.0012 ETH",
      value: -0.0012,
      currency: "ETH",
    });
  });

  it("shows an exact zero as zero, padded to two digits", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Assets:Crypto:ETH", "0.000", "ETH"),
        makePosting("Assets:Crypto:Cold", "0.000", "ETH"),
      ],
    });
    expect(selectTransactionAmount(tx)).toEqual({
      text: "0.00 ETH",
      value: 0,
      currency: "ETH",
    });
  });

  it("aggregates same-currency legs at the finest recorded scale", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Assets:Crypto:ETH", "1.00", "ETH"),
        makePosting("Assets:Crypto:Cold", "0.004", "ETH"),
        makePosting("Income:Crypto", "-1.004", "ETH"),
      ],
    });
    expect(entryAmount(tx).text).toBe("1.004 ETH");
  });

  it("does not special-case pending transactions", () => {
    const tx = makeTransaction({
      flag: "!",
      postings: [
        makePosting("Assets:Checking", "7000.00"),
        makePosting("Income:Goldman", "-7000.00"),
      ],
    });
    expect(entryAmount(tx).value).toBe(7000);
  });

  // The public real-estate example: the sale's USD bucket held
  // CapitalImprovements, AccumDepreciation and Checking, and summed to an
  // unexplained +422,294; the financed purchase added the 80,000 down payment
  // to the 320,000 mortgage and read -400,000.
  it("reports a disposal settled through several accounts as mixed", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Assets:RealEstate:Property", "-1", "PROP123MAIN", {
          number: "400000",
          currency: "USD",
        }),
        makePosting("Assets:RealEstate:CapitalImprovements", "-6000"),
        makePosting("Assets:RealEstate:AccumDepreciation", "19394"),
        makePosting("Assets:Bank:Checking", "408900"),
        makePosting("Income:RealEstate:DepreciationRecapture", "-19394"),
        makePosting("Income:CapitalGains:LongTerm", "-2900"),
      ],
    });
    expect(selectTransactionAmount(tx)).toEqual({ mixed: true });
  });

  it("reports a purchase paid in cash and borrowing as mixed", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Assets:RealEstate:Property", "1", "PROP123MAIN", {
          number: "400000",
          currency: "USD",
        }),
        makePosting("Assets:Bank:Checking", "-80000"),
        makePosting("Liabilities:Mortgage", "-320000"),
      ],
    });
    expect(selectTransactionAmount(tx)).toEqual({ mixed: true });
  });

  it("keeps a sale's proceeds net of a fee in the same cash account", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Assets:Broker:AAPL", "-5", "AAPL", {
          number: "150",
          currency: "USD",
        }),
        makePosting("Assets:Broker:Cash", "910.00"),
        makePosting("Assets:Broker:Cash", "-4.95"),
        makePosting("Expenses:Fees", "4.95"),
        makePosting("Income:CapitalGains", "-160.00"),
      ],
    });
    expect(selectTransactionAmount(tx)).toEqual({
      text: "$905.05",
      value: 905.05,
      currency: "USD",
    });
  });

  it("keeps a purchase's cost plus fee from the same cash account", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Assets:Crypto:BTC", "0.1", "BTC", {
          number: "75637.80",
          currency: "USD",
        }),
        makePosting("Assets:Crypto:Cash", "-7563.78"),
        makePosting("Assets:Crypto:Cash", "-11.35"),
        makePosting("Expenses:Fees", "11.35"),
      ],
    });
    expect(selectTransactionAmount(tx)).toEqual({
      text: "$7,575.13",
      value: -7575.13,
      currency: "USD",
    });
  });

  it("still nets several cash accounts when no commodity is traded", () => {
    const tx = makeTransaction({
      postings: [
        makePosting("Assets:Checking", "2000.00"),
        makePosting("Assets:Retirement:401k", "500.00"),
        makePosting("Income:Salary", "-2500.00"),
      ],
    });
    expect(selectTransactionAmount(tx)).toEqual({
      text: "$2,500.00",
      value: 2500,
      currency: "USD",
    });
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
