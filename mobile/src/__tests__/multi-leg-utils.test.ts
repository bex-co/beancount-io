import {
  addLeg,
  buildEntryInput,
  makeLeg,
  removeLeg,
  remainder,
  toggleLastLegAuto,
  updateLegAccount,
  updateLegAmount,
  validateLegs,
} from "../screens/add-transaction-screen/multi-leg-utils";

// helpers to build test legs without touching the ID counter
function leg(
  account: string,
  amountInput: string,
  amountCents: number,
  isAuto = false,
) {
  return makeLeg({ account, amountInput, amountCents, isAuto });
}

// ──────────────────────────────────────────────────────────────────────────────
// remainder
// ──────────────────────────────────────────────────────────────────────────────

test("remainder sums integer cents exactly", () => {
  const legs = [
    leg("Assets:Checking", "-10.10", -1010),
    leg("Expenses:Food", "10.10", 1010),
  ];
  expect(remainder(legs)).toBe(0);
});

test("remainder handles classic 0.10 + 0.20 without float drift", () => {
  const legs = [
    leg("Assets:Bank", "-0.30", -30),
    leg("Expenses:Coffee", "0.10", 10),
    leg("Expenses:Snack", "0.20", 20, true),
  ];
  expect(remainder(legs)).toBe(0);
});

test("remainder returns non-zero for unbalanced legs", () => {
  const legs = [
    leg("Assets:Bank", "-100.00", -10000),
    leg("Expenses:Food", "60.00", 6000),
  ];
  expect(remainder(legs)).toBe(-4000);
});

// ──────────────────────────────────────────────────────────────────────────────
// updateLegAmount + auto-fill
// ──────────────────────────────────────────────────────────────────────────────

test("editing a non-last leg auto-fills the last leg when isAuto=true", () => {
  const legs = [
    leg("Assets:Bank", "0.00", 0, false),
    leg("Expenses:Food", "0.00", 0, true),
  ];
  const updated = updateLegAmount(legs, 0, "-50.00");
  const last = updated[1];
  expect(last.amountCents).toBe(5000);
  expect(last.amountInput).toBe("50.00");
  expect(last.isAuto).toBe(true);
});

test("editing the last leg manually disables auto tracking", () => {
  const legs = [
    leg("Assets:Bank", "-100.00", -10000, false),
    leg("Expenses:Food", "100.00", 10000, true),
  ];
  const updated = updateLegAmount(legs, 1, "60.00");
  expect(updated[1].isAuto).toBe(false);
  expect(updated[1].amountCents).toBe(6000);
});

test("changing a non-last leg does not affect a manual last leg", () => {
  const legs = [
    leg("Assets:Bank", "-80.00", -8000, false),
    leg("Expenses:Food", "60.00", 6000, false), // manually set
  ];
  const updated = updateLegAmount(legs, 0, "-90.00");
  // last leg stays at 6000 — it's manual
  expect(updated[1].amountCents).toBe(6000);
  expect(updated[1].isAuto).toBe(false);
});

test("auto-fill sign correctness: positive sum of others → negative auto", () => {
  const legs = [
    leg("Income:Salary", "3000.00", 300000, false),
    leg("Assets:Bank", "0.00", 0, true),
  ];
  const updated = updateLegAmount(legs, 0, "3000.00");
  expect(updated[1].amountCents).toBe(-300000);
  expect(updated[1].amountInput).toBe("-3000.00");
});

// ──────────────────────────────────────────────────────────────────────────────
// toggleLastLegAuto
// ──────────────────────────────────────────────────────────────────────────────

test("toggleLastLegAuto flips isAuto on last leg and recomputes", () => {
  let legs = [
    leg("Assets:Bank", "-50.00", -5000, false),
    leg("Expenses:Food", "70.00", 7000, false), // manual, not balanced
  ];
  // enable auto on last
  legs = toggleLastLegAuto(legs);
  expect(legs[1].isAuto).toBe(true);
  expect(legs[1].amountCents).toBe(5000);
  expect(legs[1].amountInput).toBe("50.00");
});

// ──────────────────────────────────────────────────────────────────────────────
// addLeg / removeLeg
// ──────────────────────────────────────────────────────────────────────────────

test("addLeg appends an auto leg and clears isAuto on previous last", () => {
  const legs = [
    leg("Assets:Bank", "-100.00", -10000, false),
    leg("Expenses:Food", "100.00", 10000, true),
  ];
  const updated = addLeg(legs);
  expect(updated.length).toBe(3);
  expect(updated[1].isAuto).toBe(false);
  expect(updated[2].isAuto).toBe(true);
});

test("addLeg auto-fills new last leg immediately", () => {
  // Legs sum to 0 before add, so new leg auto-fills to 0
  const legs = [
    leg("Assets:Bank", "-100.00", -10000, false),
    leg("Expenses:Food", "100.00", 10000, false),
  ];
  const updated = addLeg(legs);
  expect(updated[2].amountCents).toBe(0);
});

test("removeLeg refuses to go below two legs", () => {
  const legs = [leg("A", "-10.00", -1000), leg("B", "10.00", 1000)];
  const updated = removeLeg(legs, 0);
  expect(updated.length).toBe(2);
});

test("removeLeg removes a middle leg and keeps auto-fill correct", () => {
  const legs = [
    leg("Assets:Bank", "-100.00", -10000, false),
    leg("Expenses:Food", "40.00", 4000, false),
    leg("Expenses:Transport", "60.00", 6000, true),
  ];
  const updated = removeLeg(legs, 1); // remove middle
  expect(updated.length).toBe(2);
  expect(updated[1].amountCents).toBe(10000);
});

test("removing last leg makes new last auto and recomputes", () => {
  const legs = [
    leg("Assets:Bank", "-100.00", -10000, false),
    leg("Expenses:Food", "40.00", 4000, false),
    leg("Expenses:Transport", "60.00", 6000, false),
  ];
  const updated = removeLeg(legs, 2); // remove last
  expect(updated.length).toBe(2);
  expect(updated[1].isAuto).toBe(true);
  expect(updated[1].amountCents).toBe(10000);
});

// ──────────────────────────────────────────────────────────────────────────────
// validateLegs
// ──────────────────────────────────────────────────────────────────────────────

test("validateLegs returns null for valid balanced legs", () => {
  const legs = [
    leg("Assets:Bank", "-100.00", -10000),
    leg("Expenses:Food", "100.00", 10000),
  ];
  expect(validateLegs(legs)).toBe(null);
});

test("validateLegs returns missingAccount when any leg has no account", () => {
  const legs = [leg("", "-50.00", -5000), leg("Expenses:Food", "50.00", 5000)];
  expect(validateLegs(legs)).toBe("missingAccount");
});

test("validateLegs returns zeroAmount when any leg has zero cents", () => {
  const legs = [leg("Assets:Bank", "0.00", 0), leg("Expenses:Food", "0.00", 0)];
  expect(validateLegs(legs)).toBe("zeroAmount");
});

test("validateLegs returns unbalanced when legs do not sum to zero", () => {
  const legs = [
    leg("Assets:Bank", "-100.00", -10000),
    leg("Expenses:Food", "50.00", 5000),
  ];
  expect(validateLegs(legs)).toBe("unbalanced");
});

// ──────────────────────────────────────────────────────────────────────────────
// buildEntryInput
// ──────────────────────────────────────────────────────────────────────────────

test("buildEntryInput builds N postings with correct amount strings", () => {
  const legs = [
    leg("Assets:Bank", "-100.00", -10000),
    leg("Expenses:Food", "60.00", 6000),
    leg("Expenses:Transport", "40.00", 4000),
  ];
  const entry = buildEntryInput(legs, {
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
  const legs = [
    leg("Assets:Bank", "-100.00", -10000),
    leg("Expenses:Food", "60.00", 6000),
    leg("Expenses:Transport", "40.00", 4000),
  ];
  const entry = buildEntryInput(legs, {
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

test("updateLegAccount sets account without touching amounts", () => {
  const legs = [
    leg("Assets:Old", "-50.00", -5000),
    leg("Expenses:Old", "50.00", 5000),
  ];
  const updated = updateLegAccount(legs, 0, "Assets:New");
  expect(updated[0].account).toBe("Assets:New");
  expect(updated[0].amountCents).toBe(-5000);
  expect(updated[1].account).toBe("Expenses:Old");
});
