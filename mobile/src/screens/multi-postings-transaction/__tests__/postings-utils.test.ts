import {
  addPosting,
  buildEntryInput,
  createPrefilledPostings,
  makePosting,
  removePosting,
  remainder,
  toggleLastPostingAuto,
  updatePostingAccount,
  updatePostingAmount,
  validatePostings,
} from "../postings-utils";

// helpers to build test postings without touching the ID counter
function posting(
  account: string,
  amountInput: string,
  amountCents: number,
  isAuto = false,
) {
  return makePosting({ account, amountInput, amountCents, isAuto });
}

// ──────────────────────────────────────────────────────────────────────────────
// remainder
// ──────────────────────────────────────────────────────────────────────────────

test("remainder sums integer cents exactly", () => {
  const postings = [
    posting("Assets:Checking", "-10.10", -1010),
    posting("Expenses:Food", "10.10", 1010),
  ];
  expect(remainder(postings)).toBe(0);
});

test("remainder handles classic 0.10 + 0.20 without float drift", () => {
  const postings = [
    posting("Assets:Bank", "-0.30", -30),
    posting("Expenses:Coffee", "0.10", 10),
    posting("Expenses:Snack", "0.20", 20, true),
  ];
  expect(remainder(postings)).toBe(0);
});

test("remainder returns non-zero for unbalanced postings", () => {
  const postings = [
    posting("Assets:Bank", "-100.00", -10000),
    posting("Expenses:Food", "60.00", 6000),
  ];
  expect(remainder(postings)).toBe(-4000);
});

// ──────────────────────────────────────────────────────────────────────────────
// updatePostingAmount + auto-fill
// ──────────────────────────────────────────────────────────────────────────────

test("editing a non-last posting auto-fills the last posting when isAuto=true", () => {
  const postings = [
    posting("Assets:Bank", "0.00", 0, false),
    posting("Expenses:Food", "0.00", 0, true),
  ];
  const updated = updatePostingAmount(postings, 0, "-50.00");
  const last = updated[1];
  expect(last.amountCents).toBe(5000);
  expect(last.amountInput).toBe("50.00");
  expect(last.isAuto).toBe(true);
});

test("editing the last posting manually disables auto tracking", () => {
  const postings = [
    posting("Assets:Bank", "-100.00", -10000, false),
    posting("Expenses:Food", "100.00", 10000, true),
  ];
  const updated = updatePostingAmount(postings, 1, "60.00");
  expect(updated[1].isAuto).toBe(false);
  expect(updated[1].amountCents).toBe(6000);
});

test("changing a non-last posting does not affect a manual last posting", () => {
  const postings = [
    posting("Assets:Bank", "-80.00", -8000, false),
    posting("Expenses:Food", "60.00", 6000, false), // manually set
  ];
  const updated = updatePostingAmount(postings, 0, "-90.00");
  // last posting stays at 6000 — it's manual
  expect(updated[1].amountCents).toBe(6000);
  expect(updated[1].isAuto).toBe(false);
});

test("auto-fill sign correctness: positive sum of others → negative auto", () => {
  const postings = [
    posting("Income:Salary", "3000.00", 300000, false),
    posting("Assets:Bank", "0.00", 0, true),
  ];
  const updated = updatePostingAmount(postings, 0, "3000.00");
  expect(updated[1].amountCents).toBe(-300000);
  expect(updated[1].amountInput).toBe("-3000.00");
});

// ──────────────────────────────────────────────────────────────────────────────
// toggleLastPostingAuto
// ──────────────────────────────────────────────────────────────────────────────

test("toggleLastPostingAuto flips isAuto on last posting and recomputes", () => {
  let postings = [
    posting("Assets:Bank", "-50.00", -5000, false),
    posting("Expenses:Food", "70.00", 7000, false), // manual, not balanced
  ];
  // enable auto on last
  postings = toggleLastPostingAuto(postings);
  expect(postings[1].isAuto).toBe(true);
  expect(postings[1].amountCents).toBe(5000);
  expect(postings[1].amountInput).toBe("50.00");
});

// ──────────────────────────────────────────────────────────────────────────────
// addPosting / removePosting
// ──────────────────────────────────────────────────────────────────────────────

test("addPosting appends an auto posting and clears isAuto on previous last", () => {
  const postings = [
    posting("Assets:Bank", "-100.00", -10000, false),
    posting("Expenses:Food", "100.00", 10000, true),
  ];
  const updated = addPosting(postings);
  expect(updated.length).toBe(3);
  expect(updated[1].isAuto).toBe(false);
  expect(updated[2].isAuto).toBe(true);
});

test("addPosting auto-fills new last posting immediately", () => {
  // Postings sum to 0 before add, so new posting auto-fills to 0
  const postings = [
    posting("Assets:Bank", "-100.00", -10000, false),
    posting("Expenses:Food", "100.00", 10000, false),
  ];
  const updated = addPosting(postings);
  expect(updated[2].amountCents).toBe(0);
});

test("removePosting refuses to go below two postings", () => {
  const postings = [posting("A", "-10.00", -1000), posting("B", "10.00", 1000)];
  const updated = removePosting(postings, 0);
  expect(updated.length).toBe(2);
});

test("removePosting removes a middle posting and keeps auto-fill correct", () => {
  const postings = [
    posting("Assets:Bank", "-100.00", -10000, false),
    posting("Expenses:Food", "40.00", 4000, false),
    posting("Expenses:Transport", "60.00", 6000, true),
  ];
  const updated = removePosting(postings, 1); // remove middle
  expect(updated.length).toBe(2);
  expect(updated[1].amountCents).toBe(10000);
});

test("removing last posting makes new last auto and recomputes", () => {
  const postings = [
    posting("Assets:Bank", "-100.00", -10000, false),
    posting("Expenses:Food", "40.00", 4000, false),
    posting("Expenses:Transport", "60.00", 6000, false),
  ];
  const updated = removePosting(postings, 2); // remove last
  expect(updated.length).toBe(2);
  expect(updated[1].isAuto).toBe(true);
  expect(updated[1].amountCents).toBe(10000);
});

// ──────────────────────────────────────────────────────────────────────────────
// validatePostings
// ──────────────────────────────────────────────────────────────────────────────

test("validatePostings returns null for valid balanced postings", () => {
  const postings = [
    posting("Assets:Bank", "-100.00", -10000),
    posting("Expenses:Food", "100.00", 10000),
  ];
  expect(validatePostings(postings)).toBe(null);
});

test("validatePostings returns missingAccount when any posting has no account", () => {
  const postings = [
    posting("", "-50.00", -5000),
    posting("Expenses:Food", "50.00", 5000),
  ];
  expect(validatePostings(postings)).toBe("missingAccount");
});

test("validatePostings returns zeroAmount when any posting has zero cents", () => {
  const postings = [
    posting("Assets:Bank", "0.00", 0),
    posting("Expenses:Food", "0.00", 0),
  ];
  expect(validatePostings(postings)).toBe("zeroAmount");
});

test("validatePostings returns unbalanced when postings do not sum to zero", () => {
  const postings = [
    posting("Assets:Bank", "-100.00", -10000),
    posting("Expenses:Food", "50.00", 5000),
  ];
  expect(validatePostings(postings)).toBe("unbalanced");
});

// ──────────────────────────────────────────────────────────────────────────────
// buildEntryInput
// ──────────────────────────────────────────────────────────────────────────────

test("buildEntryInput builds N postings with correct amount strings", () => {
  const postings = [
    posting("Assets:Bank", "-100.00", -10000),
    posting("Expenses:Food", "60.00", 6000),
    posting("Expenses:Transport", "40.00", 4000),
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
    posting("Assets:Bank", "-100.00", -10000),
    posting("Expenses:Food", "60.00", 6000),
    posting("Expenses:Transport", "40.00", 4000),
  ];
  const entry = buildEntryInput(postings, {
    date: "2026-07-09",
    payee: "",
    narration: "",
    currency: "USD",
  });
  const total = entry.postings.reduce((s, p) => {
    const v = parseFloat(p.amount.split(" ")[0]);
    return s + Math.round(v * 100);
  }, 0);
  expect(total).toBe(0);
});

// ──────────────────────────────────────────────────────────────────────────────
// createPrefilledPostings — seeds a scanned receipt into the form
// ──────────────────────────────────────────────────────────────────────────────

test("createPrefilledPostings opens balanced with the payment leg negative", () => {
  const postings = createPrefilledPostings(
    "Assets:Checking",
    "Expenses:Groceries",
    "27.35",
  );
  expect(postings.length).toBe(2);
  expect(postings[0].account).toBe("Assets:Checking");
  expect(postings[0].amountCents).toBe(-2735);
  expect(postings[1].account).toBe("Expenses:Groceries");
  expect(postings[1].amountCents).toBe(2735);
  expect(remainder(postings)).toBe(0);
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

  // Changing the payment leg re-derives the expense leg.
  const edited = updatePostingAmount(postings, 0, "-42.50");
  expect(edited[1].amountCents).toBe(4250);
  expect(remainder(edited)).toBe(0);
});

test("createPrefilledPostings formats whole and fractional totals to cents", () => {
  expect(
    createPrefilledPostings("Assets:A", "Expenses:B", "5")[0].amountInput,
  ).toBe("-5.00");
  expect(
    createPrefilledPostings("Assets:A", "Expenses:B", "0.99")[1].amountInput,
  ).toBe("0.99");
});

test("createPrefilledPostings tolerates an unparseable amount", () => {
  const postings = createPrefilledPostings("Assets:A", "Expenses:B", "");
  expect(postings[0].amountCents).toBe(0);
  expect(postings[1].amountCents).toBe(0);
  // Still invalid to save — the user has to type a total.
  expect(validatePostings(postings)).toBe("zeroAmount");
});

test("updatePostingAccount sets account without touching amounts", () => {
  const postings = [
    posting("Assets:Old", "-50.00", -5000),
    posting("Expenses:Old", "50.00", 5000),
  ];
  const updated = updatePostingAccount(postings, 0, "Assets:New");
  expect(updated[0].account).toBe("Assets:New");
  expect(updated[0].amountCents).toBe(-5000);
  expect(updated[1].account).toBe("Expenses:Old");
});
