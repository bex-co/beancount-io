import {
  addPosting,
  buildEntryInput,
  createPrefilledPostings,
  formatExactAmount,
  isRemainderBalanced,
  lastPostingAutoToggle,
  makePosting,
  parseExactAmount,
  postingAmountAccessibility,
  removePosting,
  remainder,
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

test("removing last posting makes new last auto and recomputes", () => {
  const postings = [
    posting("Assets:Bank", "-100.00", "-100.00", false),
    posting("Expenses:Food", "40.00", "40.00", false),
    posting("Expenses:Transport", "60.00", "60.00", false),
  ];
  const updated = removePosting(postings, 2);
  expect(updated.length).toBe(2);
  expect(updated[1].isAuto).toBe(true);
  expect(updated[1].amount).toBe("100.00");
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
