import {
  addPosting,
  buildEntryInput,
  createInitialPostings,
  createRootForPosting,
  createPrefilledPostings,
  defaultPostingAccounts,
  formatExactAmount,
  formatRemainderAmount,
  hasUnparsedAmount,
  isRemainderBalanced,
  lastPostingAutoToggle,
  makePosting,
  parseExactAmount,
  splitAmountSign,
  typedAmountInput,
  postingAmountAccessibility,
  removePosting,
  remainder,
  shouldReseed,
  toggleLastPostingAuto,
  updatePostingAccount,
  updatePostingAmount,
  validatePostings,
} from "../postings-utils";
import { en } from "../../../translations/en";

function posting(
  account: string,
  amountInput: string,
  amount: string | null,
  isAuto = false,
) {
  return makePosting({ account, amountInput, amount, isAuto });
}

// ──────────────────────────────────────────────────────────────────────────────
// parseExactAmount
// ──────────────────────────────────────────────────────────────────────────────

test("parseExactAmount keeps three-decimal values exact", () => {
  expect(parseExactAmount("1.005")).toBe("1.005");
  expect(parseExactAmount("-1.005")).toBe("-1.005");
});

test("parseExactAmount normalizes a single comma decimal separator", () => {
  expect(parseExactAmount("1,25")).toBe("1.25");
  expect(parseExactAmount("-1,25")).toBe("-1.25");
});

test("parseExactAmount rejects incomplete or prefix-only junk", () => {
  expect(parseExactAmount("1.")).toBe(null);
  expect(parseExactAmount("1,25,00")).toBe(null);
  expect(parseExactAmount("abc")).toBe(null);
  expect(parseExactAmount("1.00USD")).toBe(null);
  expect(parseExactAmount("")).toBe(null);
});

// Thousands grouping is read only where it can't be a decimal comma (w21/031).
test("parseExactAmount accepts unambiguous thousands grouping", () => {
  expect(parseExactAmount("1,234.56")).toBe("1234.56");
  expect(parseExactAmount("-12,345.6")).toBe("-12345.6");
  expect(parseExactAmount("1,234,567")).toBe("1234567");
  // One group with no point is still a decimal comma.
  expect(parseExactAmount("1,250")).toBe("1.250");
  expect(parseExactAmount("12,34.5")).toBe(null);
});

// w21/463: amounts written the way each language writes them were refused, and
// the message asked for a format foreign to the language.
test("parseExactAmount reads each locale's own formatting of 1234.56 and -12.5", () => {
  const {
    translationLocales,
  } = require("../../../translations/__tests__/locale-parity");
  for (const locale of translationLocales()) {
    const format = (value: number) =>
      new Intl.NumberFormat(locale, { minimumFractionDigits: 2 }).format(value);
    expect([locale, parseExactAmount(format(1234.56))]).toEqual([
      locale,
      "1234.56",
    ]);
    expect([locale, parseExactAmount(format(-12.5))]).toEqual([
      locale,
      "-12.50",
    ]);
  }
});

test("parseExactAmount normalises the marks and groupings those formats use", () => {
  // Point grouping with a decimal comma, and two point groups.
  expect(parseExactAmount("1.234,56")).toBe("1234.56");
  expect(parseExactAmount("-12.345,6")).toBe("-12345.6");
  expect(parseExactAmount("1.234.567")).toBe("1234567");
  // A bare point stays the decimal, as w21/031 decided.
  expect(parseExactAmount("1.234")).toBe("1.234");
  // Spaces of every width between groups, with and without a decimal comma.
  for (const space of [" ", "\u00a0", "\u202f", "\u2009"]) {
    expect(parseExactAmount(`1${space}234,56`)).toBe("1234.56");
    expect(parseExactAmount(`1${space}234${space}567`)).toBe("1234567");
  }
  // The typographic minus, with or without direction marks.
  expect(parseExactAmount("\u221212.50")).toBe("-12.50");
  expect(parseExactAmount("\u200e\u221212.50")).toBe("-12.50");
  expect(parseExactAmount("\u200f-\u200f12,50")).toBe("-12.50");
  // Groupings that are not threes are still refused.
  expect(parseExactAmount("1 23,45")).toBe(null);
  expect(parseExactAmount("12.34.5")).toBe(null);
  expect(parseExactAmount("1.23,456")).toBe(null);
});

// w21/697: a currency with no minor unit has no decimals for a lone group of
// three to be, so "1,500" JPY was saved as 1.500 JPY.
test("parseExactAmount reads a lone group of three as thousands in a zero-decimal currency", () => {
  expect(parseExactAmount("1,500", 0)).toBe("1500");
  expect(parseExactAmount("1.500", 0)).toBe("1500");
  expect(parseExactAmount("-30,000", 0)).toBe("-30000");
  expect(parseExactAmount("‎−1.500", 0)).toBe("-1500");
  // Groupings the general rules already read, and plain or short decimals.
  expect(parseExactAmount("1,500,000", 0)).toBe("1500000");
  expect(parseExactAmount("1.500.000", 0)).toBe("1500000");
  expect(parseExactAmount("1500", 0)).toBe("1500");
  expect(parseExactAmount("1,5", 0)).toBe("1.5");
  expect(parseExactAmount("1234,567", 0)).toBe("1234.567");
  // Two and three decimal currencies keep the w21/031 decimal comma.
  expect(parseExactAmount("1,500", 2)).toBe("1.500");
  expect(parseExactAmount("1,500", 3)).toBe("1.500");
});

// w21/794: after a lone zero no group of thousands can follow, but "0.500"
// yen read as 500, a thousand times what was typed.
test("parseExactAmount keeps a zero-decimal currency's 0.500 below one", () => {
  expect(parseExactAmount("0.500", 0)).toBe("0.500");
  expect(parseExactAmount("0,750", 0)).toBe("0.750");
  expect(parseExactAmount("-0.500", 0)).toBe("-0.500");
  expect(parseExactAmount("00.500", 0)).toBe("0.500");
  // A group after a non-zero lead is still thousands.
  expect(parseExactAmount("1.500", 0)).toBe("1500");
  expect(parseExactAmount("9,999", 0)).toBe("9999");
});

test("a JPY row typed 1,500 balances its auto leg at -1500", () => {
  const postings = createInitialPostings("Assets:Bank", "Expenses:Food", 0);
  const updated = updatePostingAmount(postings, 0, "1,500", 0);
  expect(updated[0].amount).toBe("1500");
  expect(updated[1].amount).toBe("-1500");
  expect(updated[1].amountInput).toBe("-1500");
  // The same text in USD stays the decimal comma.
  expect(updatePostingAmount(postings, 0, "1,500")[0].amount).toBe("1.500");
});

test("a JPY receipt total of 1.500 prefills 1500", () => {
  const [paid, auto] = createPrefilledPostings(
    "Assets:Bank",
    "Expenses:Food",
    "1.500",
    0,
  );
  expect(paid.amount).toBe("-1500");
  expect(auto.amount).toBe("1500");
});

// An unparsed amount added nothing, so the remainder read as a green balanced
// zero while Done stayed disabled without a reason (w21/031).
test("an unparsed amount is flagged, not counted as balanced", () => {
  const unreadable = posting("Assets:Cash", "1.2.3", null);
  const auto = posting("Expenses:Food", "", null, true);
  expect(hasUnparsedAmount(unreadable)).toBe(true);
  expect(hasUnparsedAmount(auto)).toBe(false);
  expect(validatePostings([unreadable, auto])).toBe("invalidAmount");
  expect(en.multiPostingsAmountFormat.includes("1234.56")).toBe(true);
});

test("the remainder row goes neutral with the format message", () => {
  const fs = require("fs");
  const path = require("path");
  const screen = fs.readFileSync(
    path.join(__dirname, "..", "multi-postings-transaction-screen.tsx"),
    "utf8",
  );
  // From every row, whatever problem validation stops at first (w21/793).
  expect(
    screen.includes(
      "const amountUnreadable = postings.some(hasUnparsedAmount);",
    ),
  ).toBe(true);
  expect(screen.includes('testID="new-transaction-amount-format"')).toBe(true);
});

// ──────────────────────────────────────────────────────────────────────────────
// remainder
// ──────────────────────────────────────────────────────────────────────────────

test("remainder sums exact decimals without float drift", () => {
  const postings = [
    posting("Assets:Checking", "-10.10", "-10.10"),
    posting("Expenses:Food", "10.10", "10.10"),
  ];
  expect(remainder(postings)).toBe("0.00");
  expect(isRemainderBalanced(remainder(postings))).toBe(true);
});

test("remainder handles classic 0.10 + 0.20 without float drift", () => {
  const postings = [
    posting("Assets:Bank", "-0.30", "-0.30"),
    posting("Expenses:Coffee", "0.10", "0.10"),
    posting("Expenses:Snack", "0.20", "0.20", true),
  ];
  expect(isRemainderBalanced(remainder(postings))).toBe(true);
});

test("remainder returns non-zero for unbalanced postings", () => {
  const postings = [
    posting("Assets:Bank", "-100.00", "-100.00"),
    posting("Expenses:Food", "60.00", "60.00"),
  ];
  expect(remainder(postings)).toBe("-40.00");
});

test("1.005 auto-balances to exact -1.005 with zero remainder", () => {
  const postings = [
    posting("Assets:Cash", "0.00", "0.00", false),
    posting("Expenses:Cost", "0.00", "0.00", true),
  ];
  const updated = updatePostingAmount(postings, 0, "1.005");
  expect(updated[0].amount).toBe("1.005");
  expect(updated[1].amount).toBe("-1.005");
  expect(updated[1].amountInput).toBe("-1.005");
  expect(isRemainderBalanced(remainder(updated))).toBe(true);
  expect(validatePostings(updated)).toBe(null);
  const entry = buildEntryInput(updated, {
    date: "2026-09-11",
    payee: "",
    narration: "",
    currency: "MUSD",
  });
  expect(entry.postings[0].amount).toBe("1.005 MUSD");
  expect(entry.postings[1].amount).toBe("-1.005 MUSD");
});

test("comma decimal 1,25 normalizes and balances exactly", () => {
  const postings = [
    posting("Assets:Cash", "0.00", "0.00", false),
    posting("Expenses:Cost", "0.00", "0.00", true),
  ];
  const updated = updatePostingAmount(postings, 0, "1,25");
  expect(updated[0].amount).toBe("1.25");
  expect(updated[1].amount).toBe("-1.25");
  expect(validatePostings(updated)).toBe(null);
});

test("invalid comma junk never silently validates as a prefix", () => {
  const postings = [
    posting("Assets:Cash", "0.00", "0.00", false),
    posting("Expenses:Cost", "0.00", "0.00", true),
  ];
  const updated = updatePostingAmount(postings, 0, "1,25,00");
  expect(updated[0].amount).toBe(null);
  expect(validatePostings(updated)).toBe("invalidAmount");
});

// ──────────────────────────────────────────────────────────────────────────────
// updatePostingAmount + auto-fill
// ──────────────────────────────────────────────────────────────────────────────

test("editing a non-last posting auto-fills the last posting when isAuto=true", () => {
  const postings = [
    posting("Assets:Bank", "0.00", "0.00", false),
    posting("Expenses:Food", "0.00", "0.00", true),
  ];
  const updated = updatePostingAmount(postings, 0, "-50.00");
  const last = updated[1];
  expect(last.amount).toBe("50.00");
  expect(last.amountInput).toBe("50.00");
  expect(last.isAuto).toBe(true);
});

test("editing the last posting manually disables auto tracking", () => {
  const postings = [
    posting("Assets:Bank", "-100.00", "-100.00", false),
    posting("Expenses:Food", "100.00", "100.00", true),
  ];
  const updated = updatePostingAmount(postings, 1, "60.00");
  expect(updated[1].isAuto).toBe(false);
  expect(updated[1].amount).toBe("60.00");
});

test("changing a non-last posting does not affect a manual last posting", () => {
  const postings = [
    posting("Assets:Bank", "-80.00", "-80.00", false),
    posting("Expenses:Food", "60.00", "60.00", false),
  ];
  const updated = updatePostingAmount(postings, 0, "-90.00");
  expect(updated[1].amount).toBe("60.00");
  expect(updated[1].isAuto).toBe(false);
});

test("auto-fill sign correctness: positive sum of others → negative auto", () => {
  const postings = [
    posting("Income:Salary", "3000.00", "3000.00", false),
    posting("Assets:Bank", "0.00", "0.00", true),
  ];
  const updated = updatePostingAmount(postings, 0, "3000.00");
  expect(updated[1].amount).toBe("-3000.00");
  expect(updated[1].amountInput).toBe("-3000.00");
});

// ──────────────────────────────────────────────────────────────────────────────
// toggleLastPostingAuto
// ──────────────────────────────────────────────────────────────────────────────

test("toggleLastPostingAuto flips isAuto on last posting and recomputes", () => {
  let postings = [
    posting("Assets:Bank", "-50.00", "-50.00", false),
    posting("Expenses:Food", "70.00", "70.00", false),
  ];
  postings = toggleLastPostingAuto(postings);
  expect(postings[1].isAuto).toBe(true);
  expect(postings[1].amount).toBe("50.00");
  expect(postings[1].amountInput).toBe("50.00");
});

test("the final row keeps its auto switch after it is turned off", () => {
  expect(lastPostingAutoToggle({ isLast: true, isAuto: true })).toEqual({
    rendered: true,
    selected: true,
  });
  expect(lastPostingAutoToggle({ isLast: true, isAuto: false })).toEqual({
    rendered: true,
    selected: false,
  });
});

test("earlier rows never show the auto switch", () => {
  expect(lastPostingAutoToggle({ isLast: false, isAuto: false })).toEqual({
    rendered: false,
    selected: false,
  });
  expect(lastPostingAutoToggle({ isLast: false, isAuto: true })).toEqual({
    rendered: false,
    selected: false,
  });
});

test("the switch the rendered row offers round-trips through both directions", () => {
  let postings = [
    posting("Assets:Bank", "-50.00", "-50.00", false),
    posting("Expenses:Food", "50.00", "50.00", true),
  ];
  expect(
    lastPostingAutoToggle({ isLast: true, isAuto: postings[1].isAuto })
      .selected,
  ).toBe(true);

  postings = toggleLastPostingAuto(postings);
  const off = lastPostingAutoToggle({
    isLast: true,
    isAuto: postings[1].isAuto,
  });
  expect(off).toEqual({ rendered: true, selected: false });

  postings = updatePostingAmount(postings, 0, "-80.00");
  postings = toggleLastPostingAuto(postings);
  expect(postings[1].isAuto).toBe(true);
  expect(postings[1].amountInput).toBe("80.00");
  expect(
    lastPostingAutoToggle({ isLast: true, isAuto: postings[1].isAuto })
      .selected,
  ).toBe(true);
});

// ──────────────────────────────────────────────────────────────────────────────
// addPosting / removePosting
// ──────────────────────────────────────────────────────────────────────────────

test("addPosting appends an auto posting and clears isAuto on previous last", () => {
  const postings = [
    posting("Assets:Bank", "-100.00", "-100.00", false),
    posting("Expenses:Food", "100.00", "100.00", true),
  ];
  const updated = addPosting(postings);
  expect(updated.length).toBe(3);
  expect(updated[1].isAuto).toBe(false);
  expect(updated[2].isAuto).toBe(true);
});

test("addPosting auto-fills new last posting immediately", () => {
  const postings = [
    posting("Assets:Bank", "-100.00", "-100.00", false),
    posting("Expenses:Food", "100.00", "100.00", false),
  ];
  const updated = addPosting(postings);
  expect(isZeroAmount(updated[2].amount)).toBe(true);
});

function isZeroAmount(amount: string | null): boolean {
  return amount === null || amount === "0" || /^0\.0+$/.test(amount);
}

test("removePosting refuses to go below two postings", () => {
  const postings = [
    posting("A", "-10.00", "-10.00"),
    posting("B", "10.00", "10.00"),
  ];
  const updated = removePosting(postings, 0);
  expect(updated.length).toBe(2);
});

test("removePosting removes a middle posting and keeps auto-fill correct", () => {
  const postings = [
    posting("Assets:Bank", "-100.00", "-100.00", false),
    posting("Expenses:Food", "40.00", "40.00", false),
    posting("Expenses:Transport", "60.00", "60.00", true),
  ];
  const updated = removePosting(postings, 1);
  expect(updated.length).toBe(2);
  expect(updated[1].amount).toBe("100.00");
});

// w21/462: deleting the last row used to overwrite the amount typed above it.
test("removing the last posting keeps the amount typed in the new last one", () => {
  const postings = [
    posting("Assets:Bank", "-100.00", "-100.00", false),
    posting("Expenses:Food", "40.00", "40.00", false),
    posting("Expenses:Transport", "60.00", "60.00", false),
  ];
  const updated = removePosting(postings, 2);
  expect(updated.length).toBe(2);
  expect(updated[1].isAuto).toBe(false);
  expect(updated[1].amountInput).toBe("40.00");
  expect(updated[1].amount).toBe("40.00");
  // The form reports the imbalance rather than quietly balancing it.
  expect(validatePostings(updated)).toBe("unbalanced");
});

test("removing the last posting after Add posting leaves row 2 as typed", () => {
  // Card -30, then Add posting, type 10 on row 2, auto row 3 holds 20.00.
  const postings = [
    posting("Assets:Card", "-30.00", "-30.00", false),
    posting("Expenses:Groceries", "10", "10", false),
    posting("Expenses:Household", "20.00", "20.00", true),
  ];
  const updated = removePosting(postings, 2);
  expect(updated[1].amountInput).toBe("10");
  expect(updated[1].amount).toBe("10");
  expect(validatePostings(updated)).toBe("unbalanced");
});

test("removing the last posting makes an empty or zero new last one auto", () => {
  for (const [input, amount] of [
    ["", null],
    ["0", "0"],
  ] as const) {
    const postings = [
      posting("Assets:Bank", "-100.00", "-100.00", false),
      posting("Expenses:Food", input, amount, false),
      posting("Expenses:Transport", "60.00", "60.00", false),
    ];
    const updated = removePosting(postings, 2);
    expect(updated[1].isAuto).toBe(true);
    expect(updated[1].amount).toBe("100.00");
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// validatePostings
// ──────────────────────────────────────────────────────────────────────────────

test("validatePostings returns null for valid balanced postings", () => {
  const postings = [
    posting("Assets:Bank", "-100.00", "-100.00"),
    posting("Expenses:Food", "100.00", "100.00"),
  ];
  expect(validatePostings(postings)).toBe(null);
});

test("validatePostings returns missingAccount when any posting has no account", () => {
  const postings = [
    posting("", "-50.00", "-50.00"),
    posting("Expenses:Food", "50.00", "50.00"),
  ];
  expect(validatePostings(postings)).toBe("missingAccount");
});

test("validatePostings returns zeroAmount when any posting has zero", () => {
  const postings = [
    posting("Assets:Bank", "0.00", "0.00"),
    posting("Expenses:Food", "0.00", "0.00"),
  ];
  expect(validatePostings(postings)).toBe("zeroAmount");
});

test("validatePostings returns unbalanced when postings do not sum to zero", () => {
  const postings = [
    posting("Assets:Bank", "-100.00", "-100.00"),
    posting("Expenses:Food", "50.00", "50.00"),
  ];
  expect(validatePostings(postings)).toBe("unbalanced");
});

// ──────────────────────────────────────────────────────────────────────────────
// buildEntryInput
// ──────────────────────────────────────────────────────────────────────────────

test("buildEntryInput builds N postings with correct amount strings", () => {
  const postings = [
    posting("Assets:Bank", "-100.00", "-100.00"),
    posting("Expenses:Food", "60.00", "60.00"),
    posting("Expenses:Transport", "40.00", "40.00"),
  ];
  const entry = buildEntryInput(postings, {
    date: "2026-07-09",
    payee: "Supermarket",
    narration: "weekly groceries",
    currency: "USD",
  });

  expect(entry.date).toBe("2026-07-09");
  expect(entry.flag).toBe("*");
  expect(entry.payee).toBe("Supermarket");
  expect(entry.narration).toBe("weekly groceries");
  expect(entry.type).toBe("Transaction");
  expect(entry.postings.length).toBe(3);
  expect(entry.postings[0]).toEqual({
    account: "Assets:Bank",
    amount: "-100.00 USD",
  });
  expect(entry.postings[1]).toEqual({
    account: "Expenses:Food",
    amount: "60.00 USD",
  });
  expect(entry.postings[2]).toEqual({
    account: "Expenses:Transport",
    amount: "40.00 USD",
  });
});

test("buildEntryInput postings sum to zero (balanced)", () => {
  const postings = [
    posting("Assets:Bank", "-100.00", "-100.00"),
    posting("Expenses:Food", "60.00", "60.00"),
    posting("Expenses:Transport", "40.00", "40.00"),
  ];
  const entry = buildEntryInput(postings, {
    date: "2026-07-09",
    payee: "",
    narration: "",
    currency: "USD",
  });
  const reconstructed = entry.postings.map((p) => {
    const amount = parseExactAmount(p.amount.split(" ")[0]);
    return posting(p.account, p.amount.split(" ")[0], amount);
  });
  expect(isRemainderBalanced(remainder(reconstructed))).toBe(true);
});

// ──────────────────────────────────────────────────────────────────────────────
// createPrefilledPostings
// ──────────────────────────────────────────────────────────────────────────────

test("createPrefilledPostings opens balanced with the payment leg negative", () => {
  const postings = createPrefilledPostings(
    "Assets:Checking",
    "Expenses:Groceries",
    "27.35",
  );
  expect(postings.length).toBe(2);
  expect(postings[0].account).toBe("Assets:Checking");
  expect(postings[0].amount).toBe("-27.35");
  expect(postings[1].account).toBe("Expenses:Groceries");
  expect(postings[1].amount).toBe("27.35");
  expect(isRemainderBalanced(remainder(postings))).toBe(true);
  expect(validatePostings(postings)).toBe(null);
});

test("createPrefilledPostings leaves the expense leg auto so later edits refill it", () => {
  const postings = createPrefilledPostings(
    "Assets:Cash",
    "Expenses:Food",
    "10",
  );
  expect(postings[0].isAuto).toBe(false);
  expect(postings[1].isAuto).toBe(true);

  const edited = updatePostingAmount(postings, 0, "-42.50");
  expect(edited[1].amount).toBe("42.50");
  expect(isRemainderBalanced(remainder(edited))).toBe(true);
});

test("createPrefilledPostings formats whole and fractional totals", () => {
  expect(
    createPrefilledPostings("Assets:A", "Expenses:B", "5")[0].amountInput,
  ).toBe("-5.00");
  expect(
    createPrefilledPostings("Assets:A", "Expenses:B", "0.99")[1].amountInput,
  ).toBe("0.99");
});

test("createPrefilledPostings tolerates an unparseable amount", () => {
  const postings = createPrefilledPostings("Assets:A", "Expenses:B", "");
  expect(isZeroAmount(postings[0].amount)).toBe(true);
  expect(isZeroAmount(postings[1].amount)).toBe(true);
  expect(validatePostings(postings)).toBe("zeroAmount");
});

test("updatePostingAccount sets account without touching amounts", () => {
  const postings = [
    posting("Assets:Old", "-50.00", "-50.00"),
    posting("Expenses:Old", "50.00", "50.00"),
  ];
  const updated = updatePostingAccount(postings, 0, "Assets:New");
  expect(updated[0].account).toBe("Assets:New");
  expect(updated[0].amount).toBe("-50.00");
  expect(updated[1].account).toBe("Expenses:Old");
});

test("formatExactAmount preserves three-decimal precision", () => {
  expect(formatExactAmount("1.005")).toBe("1.005");
  expect(formatExactAmount("-1.005")).toBe("-1.005");
  expect(formatExactAmount("1.2")).toBe("1.20");
});

const t = (key: string, params?: Record<string, unknown>) =>
  String((en as unknown as Record<string, string>)[key]).replace(
    /{{(\w+)}}/g,
    (_match, name: string) => String(params?.[name]),
  );

describe("postingAmountAccessibility", () => {
  it("names the field by its account and speaks a positive amount with currency", () => {
    expect(
      postingAmountAccessibility({
        account: "Expenses:Groceries",
        amountInput: "42.50",
        index: 1,
        currency: "USD",
        t,
      }),
    ).toEqual({
      label: "Amount for Expenses:Groceries",
      value: "42.50 USD",
    });
  });

  it("keeps the sign the separate toggle owns, which the field itself hides", () => {
    expect(
      postingAmountAccessibility({
        account: "Assets:Cash",
        amountInput: "-42.50",
        index: 0,
        currency: "EUR",
        t,
      }).value,
    ).toBe("-42.50 EUR");
  });

  it("falls back to a 1-based posting position when no account is picked", () => {
    expect(
      postingAmountAccessibility({
        account: "",
        amountInput: "0.00",
        index: 2,
        currency: "USD",
        t,
      }).label,
    ).toBe("Amount for Posting 3");
  });

  it("reads a blank field as zero rather than as a bare currency code", () => {
    expect(
      postingAmountAccessibility({
        account: "Assets:Cash",
        amountInput: "",
        index: 0,
        currency: "USD",
        t,
      }).value,
    ).toBe("0.00 USD");
  });

  it("tolerates surrounding whitespace around a negative amount", () => {
    expect(
      postingAmountAccessibility({
        account: "Assets:Cash",
        amountInput: " -7.25 ",
        index: 0,
        currency: "USD",
        t,
      }).value,
    ).toBe("-7.25 USD");
  });
});

// w21/075: the decimal pad lets "." come first, and ".5" was refused; a
// sub-cent remainder read "+$0.00" while Done refused it as unbalanced.
describe("leading decimal points and sub-cent remainders", () => {
  it("reads a leading dot as zero point", () => {
    expect(parseExactAmount(".5")).toBe("0.5");
    expect(parseExactAmount(".99")).toBe("0.99");
    expect(parseExactAmount("-.5")).toBe("-0.5");
    expect(parseExactAmount(".")).toBe(null);
    expect(parseExactAmount("-.")).toBe(null);
  });

  // w21/792: where the pad's separator is a comma, ",5" was refused.
  it("reads a leading comma as zero point too", () => {
    expect(parseExactAmount(",5")).toBe("0.5");
    expect(parseExactAmount("-,5")).toBe("-0.5");
    expect(parseExactAmount("\uff0c5")).toBe("0.5");
    expect(parseExactAmount(",123", 0)).toBe(parseExactAmount(".123", 0));
    expect(parseExactAmount(",")).toBe(null);
    expect(parseExactAmount("-,")).toBe(null);
    expect(parseExactAmount(",5,5")).toBe(null);
  });

  it("shows the remainder it refuses", () => {
    const rem = remainder([
      posting("Expenses:Food", "10.004", "10.004"),
      posting("Assets:Cash", "-10", "-10"),
    ]);
    expect(isRemainderBalanced(rem)).toBe(false);
    expect(formatRemainderAmount(rem, "USD")).toBe("+$0.004");
    expect(formatRemainderAmount("-12.5", "USD")).toBe("-$12.50");
  });
});

// w21/103: the recent-use ranking listed a just-closed account first, and New
// Transaction opened on it as FROM.
describe("the accounts a new entry opens with", () => {
  const closed = new Set(["Assets:Bank:Qa20261020Old"]);
  const isOpen = (account: string) => !closed.has(account);

  it("skips a closed asset at the top of the ranking", () => {
    expect(
      defaultPostingAccounts(
        ["Assets:Bank:Qa20261020Old", "Assets:Bank:Checking", "Assets:Cash"],
        ["Expenses:Transport", "Expenses:Food"],
        isOpen,
      ),
    ).toEqual({ source: "Assets:Bank:Checking", target: "Expenses:Transport" });
  });

  it("falls back to another open asset with no open expense", () => {
    expect(
      defaultPostingAccounts(
        ["Assets:Bank:Checking", "Assets:Cash"],
        [],
        isOpen,
      ),
    ).toEqual({ source: "Assets:Bank:Checking", target: "Assets:Cash" });
  });

  it("is what the form seeds, the receipt path included", () => {
    const source = require("fs").readFileSync(
      require("path").join(
        __dirname,
        "..",
        "multi-postings-transaction-screen.tsx",
      ),
      "utf8",
    ) as string;
    expect(
      source.includes("const { source, target } = defaultPostingAccounts("),
    ).toBe(true);
    expect(
      source.includes(
        "prefillSourceAccount && isSeedable(prefillSourceAccount)",
      ),
    ).toBe(true);
    expect(source.includes("closeDatesSettled && assets.length > 0")).toBe(
      true,
    );
  });
});

// w21/110: the first seed came from last session's persisted ranking and
// named an account since removed; the network's ranking never replaced it.
describe("reseeding a new entry's accounts", () => {
  const stale = createInitialPostings(
    "Assets:Bank:Qa20261020Old",
    "Expenses:Transport",
  );
  const fresh = createInitialPostings(
    "Assets:Bank:Checking",
    "Expenses:Food:Groceries",
  );

  it("replaces an untouched stale seed with the fresh one", () => {
    expect(shouldReseed(stale, stale, fresh)).toBe(true);
  });

  it("never overwrites a posting the user changed", () => {
    const edited = updatePostingAccount(stale, 0, "Assets:Cash");
    expect(shouldReseed(edited, stale, fresh)).toBe(false);
    const typed = updatePostingAmount(stale, 0, "12");
    expect(shouldReseed(typed, stale, fresh)).toBe(false);
  });

  it("does nothing when the seed is unchanged", () => {
    const again = createInitialPostings(
      "Assets:Bank:Qa20261020Old",
      "Expenses:Transport",
    );
    expect(shouldReseed(stale, stale, again)).toBe(false);
  });

  it("is what the form reseeds by", () => {
    const source = require("fs").readFileSync(
      require("path").join(
        __dirname,
        "..",
        "multi-postings-transaction-screen.tsx",
      ),
      "utf8",
    ) as string;
    expect(
      source.includes(
        "!shouldReseed(postings, initialDraft.postings, seededPostings)",
      ),
    ).toBe(true);
  });
});

// w21/159: a typed leg seeded as the text "0.00" was typed onto after an iOS
// tap, so "12.50" became "0.0012.50".
describe("a new posting's amount field", () => {
  it("starts empty so the placeholder shows and typing starts the value", () => {
    expect(makePosting().amountInput).toBe("");
    expect(makePosting({ isAuto: false }).amountInput).toBe("");
    const [typed, auto] = createInitialPostings("Assets:Cash", "Expenses:Food");
    expect(typed.amountInput).toBe("");
    expect(typed.amount).toBe(null);
    // The zero auto leg shows no text either (w21/321), though it still counts
    // as a zero amount.
    expect(auto.amountInput).toBe("");
    expect(auto.amount).toBe("0.00");
    // The zero auto leg a new posting turns into a typed one starts empty
    // too; a computed amount is kept.
    expect(addPosting([typed, auto])[1].amountInput).toBe("");
    expect(toggleLastPostingAuto([typed, auto])[1].amountInput).toBe("");
    const owed = updatePostingAmount([typed, auto], 0, "12.50");
    expect(addPosting(owed)[1].amountInput).toBe("-12.50");
  });

  it("balances the auto leg from the first digits typed", () => {
    const postings = updatePostingAmount(
      createInitialPostings("Assets:Cash", "Expenses:Food"),
      0,
      "12.50",
    );
    expect(postings[0].amountInput).toBe("12.50");
    expect(postings[1].amountInput).toBe("-12.50");
  });

  // w21/321: the two paths that still put real "0.00" text into a field.
  it("seeds nothing for a receipt whose total is zero or unreadable", () => {
    for (const total of ["0", "0.00", "", "abc", "-0"]) {
      const [paid, auto] = createPrefilledPostings(
        "Assets:Bank",
        "Expenses:Food",
        total,
      );
      expect(paid.amountInput).toBe("");
      expect(paid.amount).toBe(null);
      expect(auto.amountInput).toBe("");
      expect(hasUnparsedAmount(paid)).toBe(false);
    }
    // A real total is still seeded on the paying leg and balanced.
    const [paid, auto] = createPrefilledPostings(
      "Assets:Bank",
      "Expenses:Food",
      "12.50",
    );
    expect(paid.amountInput).toBe("-12.50");
    expect(auto.amountInput).toBe("12.50");
  });

  it("types 12.50 into a zero leg wherever the caret is", () => {
    const [typed, auto] = createInitialPostings("Assets:Cash", "Expenses:Food");
    // The auto leg has no text to append to, so a tap and a keystroke give
    // exactly what was typed.
    const edited = updatePostingAmount(
      [typed, auto],
      1,
      `${auto.amountInput}12.50`,
    );
    expect(edited[1].amountInput).toBe("12.50");
    expect(edited[1].amount).toBe("12.50");
    const [receiptPaid, receiptAuto] = createPrefilledPostings(
      "Assets:Bank",
      "Expenses:Food",
      "0",
    );
    const typedReceipt = updatePostingAmount(
      [receiptPaid, receiptAuto],
      0,
      `${receiptPaid.amountInput}12.50`,
    );
    expect(typedReceipt[0].amountInput).toBe("12.50");
  });

  it("still reads an untouched leg as a zero amount, not an invalid one", () => {
    const [typed] = createInitialPostings("Assets:Cash", "Expenses:Food");
    expect(hasUnparsedAmount(typed)).toBe(false);
  });
});

// w21/230: a Persian or Arabic keyboard types its own digits and decimal
// separator, and every such amount was refused.
test("parseExactAmount reads Persian, Arabic-Indic and fullwidth digits", () => {
  // Extended Arabic-Indic (Persian): ۱۲٫۵۰
  expect(parseExactAmount("۱۲٫۵۰")).toBe("12.50");
  // Arabic-Indic: ١٢٫٥٠
  expect(parseExactAmount("١٢٫٥٠")).toBe("12.50");
  // Persian digits with an ASCII point, and ASCII digits with the Arabic one.
  expect(parseExactAmount("۱۲.۵۰")).toBe("12.50");
  expect(parseExactAmount("12٫50")).toBe("12.50");
  // Fullwidth: １２.５
  expect(parseExactAmount("１２.５")).toBe("12.5");
  expect(parseExactAmount("１２．５")).toBe("12.5");
});

test("parseExactAmount keeps the sign and thousands grouping of such input", () => {
  expect(parseExactAmount("-۱۲٫۵۰")).toBe("-12.50");
  // ۱٬۲۳۴٫۵۰ with the Arabic thousands separator.
  expect(parseExactAmount("۱٬۲۳۴٫۵۰")).toBe("1234.50");
  // Devanagari ९९
  expect(parseExactAmount("९९")).toBe("99");
});

test("parseExactAmount still refuses what is not a number in any script", () => {
  expect(parseExactAmount("۱۲abc")).toBe(null);
  expect(parseExactAmount("۱٫")).toBe(null);
  expect(parseExactAmount("١٢٫٥٫٠")).toBe(null);
});

// w21/231: every amount was padded to two decimals, so a typed 1500 JPY was
// written to the ledger as "1500.00 JPY".
describe("amounts at the currency's own minor unit", () => {
  const entry = (
    postings: ReturnType<typeof makePosting>[],
    currency: string,
  ) =>
    buildEntryInput(postings, {
      date: "2026-10-21",
      payee: "",
      narration: "",
      currency,
    }).postings;

  it("writes a zero-decimal currency without decimals", () => {
    let postings = createInitialPostings("Assets:Cash", "Expenses:Food", 0);
    postings = updatePostingAmount(postings, 0, "-1500", 0);
    expect(postings[1].amountInput).toBe("1500");
    expect(entry(postings, "JPY")).toEqual([
      { account: "Assets:Cash", amount: "-1500 JPY" },
      { account: "Expenses:Food", amount: "1500 JPY" },
    ]);
  });

  it("writes a three-decimal currency to three places", () => {
    expect(formatExactAmount("12.5", 3)).toBe("12.500");
    let postings = createInitialPostings("Assets:Cash", "Expenses:Food", 3);
    postings = updatePostingAmount(postings, 0, "-12.5", 3);
    expect(entry(postings, "KWD")[1].amount).toBe("12.500 KWD");
  });

  it("leaves two-decimal currencies exactly as they were", () => {
    expect(formatExactAmount("12.5")).toBe("12.50");
    expect(formatExactAmount("12")).toBe("12.00");
    let postings = createInitialPostings("Assets:Cash", "Expenses:Food");
    postings = updatePostingAmount(postings, 0, "-1500");
    expect(entry(postings, "USD")).toEqual([
      { account: "Assets:Cash", amount: "-1500.00 USD" },
      { account: "Expenses:Food", amount: "1500.00 USD" },
    ]);
  });

  it("never truncates a longer typed value", () => {
    expect(formatExactAmount("1500.5", 0)).toBe("1500.5");
    expect(formatExactAmount("1.005", 2)).toBe("1.005");
  });

  it("zero follows the minor unit too", () => {
    expect(formatExactAmount("0", 0)).toBe("0");
    expect(formatExactAmount("0", 2)).toBe("0.00");
    expect(formatExactAmount("0.000", 0)).toBe("0.000");
  });

  it("reads the remainder of a JPY draft without cents", () => {
    expect(formatRemainderAmount("-500", "JPY")).toBe("-¥500");
    expect(formatRemainderAmount("-500", "USD")).toBe("-$500.00");
  });

  it("opens a receipt's prefilled legs at the currency's minor unit", () => {
    const legs = createPrefilledPostings(
      "Assets:Cash",
      "Expenses:Food",
      "1500",
      0,
    );
    expect(legs.map((leg) => leg.amountInput)).toEqual(["-1500", "1500"]);
  });
});

// w21/232: a pasted " -12.50" was saved as negative but shown positive, and
// the sign toggle then wrote a second minus.
describe("an amount pasted with surrounding spaces", () => {
  const start = () => createInitialPostings("Assets:Cash", "Expenses:Food");

  it("is stored without them, so the row's sign matches the parser's", () => {
    const [first, auto] = updatePostingAmount(start(), 0, " -12.50 ");
    expect(first.amountInput).toBe("-12.50");
    expect(first.amount).toBe("-12.50");
    expect(auto.amountInput).toBe("12.50");
  });

  it("flips cleanly with the toggle", () => {
    // What the row does: strip the minus, or prepend one, to the stored text.
    const once = updatePostingAmount(start(), 0, " -12.50")[0].amountInput;
    const flipped = once.startsWith("-") ? once.slice(1) : `-${once}`;
    const next = updatePostingAmount(start(), 0, flipped);
    expect(next[0].amount).toBe("12.50");
    expect(validatePostings(next)).toBe(null);
  });

  it("keeps the row's reading of the sign tied to the parser's normalization", () => {
    const row = require("fs")
      .readFileSync(
        require("path").join(
          __dirname,
          "..",
          "multi-postings-transaction-screen.tsx",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      row.includes(
        "const{negative:isNegative,absolute:absValue}=splitAmountSign(posting.amountInput,);",
      ),
    ).toBe(true);
  });
});

// w21/259: Create from any row's picker prefilled the Assets root, even on the
// expense row.
describe("createRootForPosting", () => {
  it("suggests Assets for a credit and Expenses for a debit", () => {
    const postings = createInitialPostings("Assets:Cash", "Expenses:Food");
    const typed = updatePostingAmount(postings, 0, "-12.50");
    expect(createRootForPosting(typed, 0)).toBe("Assets");
    expect(createRootForPosting(typed, 1)).toBe("Expenses");
  });

  it("follows the row's place while it has no amount", () => {
    const postings = createInitialPostings("Assets:Cash", "Expenses:Food");
    expect(createRootForPosting(postings, 0)).toBe("Assets");
    expect(createRootForPosting(postings, 1)).toBe("Expenses");
    const split = addPosting(postings);
    expect(createRootForPosting(split, 2)).toBe("Expenses");
  });

  it("follows the sign when the first row is the debit", () => {
    const postings = createInitialPostings("Assets:Cash", "Expenses:Food");
    const refund = updatePostingAmount(postings, 0, "20.00");
    expect(createRootForPosting(refund, 0)).toBe("Expenses");
    expect(createRootForPosting(refund, 1)).toBe("Assets");
  });
});

// w21/386: U+066C was mapped to an ASCII comma, which a lone comma reads as a
// decimal mark, so ۱٬۲۳۴ (1,234 as Persian writes it) was saved as 1.234.
test("parseExactAmount reads the Arabic thousands separator as grouping only", () => {
  expect(parseExactAmount("۱٬۲۳۴")).toBe("1234");
  expect(parseExactAmount("١٬٢٣٤")).toBe("1234");
  expect(parseExactAmount("۱٬۲۳۴٬۵۶۷")).toBe("1234567");
  expect(parseExactAmount("-۱٬۲۳۴٫۵۰")).toBe("-1234.50");
  expect(parseExactAmount("۱۲٬۳۴۵")).toBe("12345");
});

test("parseExactAmount refuses a grouping that is not threes", () => {
  expect(parseExactAmount("١٢٬٥٠")).toBe(null);
  expect(parseExactAmount("۱٬۲۳")).toBe(null);
  expect(parseExactAmount("٬۱۲۳")).toBe(null);
  expect(parseExactAmount("۱٬۲۳۴٬")).toBe(null);
  expect(parseExactAmount("۱٬۲۳۴,۵۰")).toBe(null);
});

// w21/666: a pasted U+2212 saved negative but showed a green "+", and the sign
// toggle then wrote a second minus.
describe("splitAmountSign", () => {
  it("reads the typographic minus and direction marks as the parser does", () => {
    for (const typed of [
      "\u221212.50",
      "\u200e-12.50",
      "\u200e\u221212.50",
      " -12.50",
    ]) {
      expect(splitAmountSign(typed)).toEqual({
        negative: true,
        absolute: "12.50",
      });
      expect(parseExactAmount(typed)).toBe("-12.50");
    }
  });

  it("leaves a positive amount whole", () => {
    expect(splitAmountSign(" 12.50 ")).toEqual({
      negative: false,
      absolute: "12.50",
    });
    expect(splitAmountSign("")).toEqual({ negative: false, absolute: "" });
  });
});

// w21/728: clearing a negative amount stored "-", which read as an unparsable
// amount under a field that looked empty and blocked Done.
describe("an amount field emptied of its digits", () => {
  const { signedAmountInput } = require("../postings-utils");

  it("stores nothing, whatever its sign", () => {
    expect(signedAmountInput("", true)).toBe("");
    expect(signedAmountInput("  ", true)).toBe("");
    expect(signedAmountInput("", false)).toBe("");
    expect(signedAmountInput("30", true)).toBe("-30");
    expect(signedAmountInput("30", false)).toBe("30");
  });

  it("reads as a zero amount, as a cleared positive one does", () => {
    const postings = createInitialPostings("Assets:Bank", "Expenses:Food");
    const cleared = updatePostingAmount(
      postings,
      0,
      signedAmountInput("", true),
    );
    expect(validatePostings(cleared)).toBe("zeroAmount");
    // What it stored before.
    expect(validatePostings(updatePostingAmount(postings, 0, "-"))).toBe(
      "invalidAmount",
    );
  });

  it("is what the row stores, keeping the sign for the next digits", () => {
    const screen = require("fs")
      .readFileSync(
        require("path").join(
          __dirname,
          "..",
          "multi-postings-transaction-screen.tsx",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      screen.includes("onChangeAmount(typedAmountInput(input,shownNegative));"),
    ).toBe(true);
    expect(
      screen.includes(
        'constshownNegative=absValue===""?emptyNegative.current:isNegative;',
      ),
    ).toBe(true);
  });
});

// w21/791: "-20" pasted into a negative row was put behind its minus, read
// "--20", and blocked Done.
describe("typedAmountInput", () => {
  const { typedAmountInput, parseExactAmount } = require("../postings-utils");

  it("takes a pasted amount's own sign over the row's", () => {
    for (const pasted of ["-20", " -20", "\u221220", "\u200e-20"]) {
      expect([pasted, typedAmountInput(pasted, true)]).toEqual([pasted, "-20"]);
      expect([pasted, typedAmountInput(pasted, false)]).toEqual([
        pasted,
        "-20",
      ]);
    }
    expect(parseExactAmount(typedAmountInput("-20", true))).toBe("-20");
    expect(typedAmountInput("+20", true)).toBe("20");
  });

  it("keeps the row's sign for digits without one", () => {
    expect(typedAmountInput("20", true)).toBe("-20");
    expect(typedAmountInput("20", false)).toBe("20");
    expect(typedAmountInput("", true)).toBe("");
  });
});

// w21/793: an earlier row with no account hid a later unreadable amount, so
// the form read a green "✓ $0.00" with no format error.
describe("an unreadable amount behind another problem", () => {
  const {
    validatePostings,
    hasUnparsedAmount,
    remainder,
  } = require("../postings-utils");
  const postings = [
    { account: "Expenses:Food", amountInput: "10", amount: "10" },
    { account: "Assets:Cash", amountInput: "-10", amount: "-10" },
    { account: "", amountInput: "1.2.3", amount: null },
  ];

  it("is still found when validation stops at the missing account", () => {
    expect(validatePostings(postings)).toBe("missingAccount");
    expect(remainder(postings)).toBe("0");
    expect(postings.some(hasUnparsedAmount)).toBe(true);
  });
});

// w21/849: the grey Done said nothing of being dimmed to VoiceOver.
describe("the Done button's disabled state", () => {
  it("leaves accessibilityState.disabled to say dimmed on an invalid draft", () => {
    const screen = require("fs")
      .readFileSync(
        require("path").join(
          __dirname,
          "..",
          "multi-postings-transaction-screen.tsx",
        ),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(screen.includes("disabled={saving||saved?true:undefined}")).toBe(
      true,
    );
    expect(
      screen.includes("accessibilityState={{disabled:!canSave||saving,"),
    ).toBe(true);
  });
});

// w21/855: " 20" pasted into a negative row read "- 20" and refused Done.
describe("typedAmountInput keeps the row's sign over pasted spaces", () => {
  it("reads a padded unsigned paste as the row's sign", () => {
    expect(typedAmountInput(" 20", true)).toBe("-20");
    expect(typedAmountInput("20 ", true)).toBe("-20");
    expect(typedAmountInput("\u200e 20", true)).toBe("-20");
    expect(parseExactAmount(typedAmountInput(" 20", true))).toBe("-20");
  });

  it("leaves a positive row, and signed pastes, as they were", () => {
    expect(typedAmountInput(" 20", false)).toBe("20");
    expect(typedAmountInput(" -20", false)).toBe("-20");
    expect(typedAmountInput(" -20", true)).toBe("-20");
    expect(typedAmountInput("", true)).toBe("");
  });
});
