import {
  isEquityConversion,
  matchCategory,
  pickPrimaryAccount,
  TRANSFER,
} from "../index";

describe("tx-category", () => {
  describe("pickPrimaryAccount", () => {
    it("returns the sole category leg of a plain expense", () => {
      expect(
        pickPrimaryAccount([
          { account: "Expenses:Food:Coffee", amount: 5 },
          { account: "Liabilities:Amex", amount: -5 },
        ]),
      ).toBe("Expenses:Food:Coffee");
    });

    it("weights a paycheck to Income, not the tax Expense leg", () => {
      expect(
        pickPrimaryAccount([
          { account: "Income:Salary", amount: -5000 },
          { account: "Expenses:Taxes", amount: 1000 },
          { account: "Assets:Checking", amount: 4000 },
        ]),
      ).toBe("Income:Salary");
    });

    it("picks the largest category leg of a split purchase", () => {
      expect(
        pickPrimaryAccount([
          { account: "Expenses:Food:Groceries", amount: 40 },
          { account: "Expenses:Home:Supplies", amount: 10 },
          { account: "Liabilities:Amex", amount: -50 },
        ]),
      ).toBe("Expenses:Food:Groceries");
    });

    // w21/211: 1,500 miles outweighed 500 dollars, so a flight that earns
    // miles got the Income tile beside "-$500.00".
    it("compares category legs only within one currency", () => {
      const flight = [
        { account: "Liabilities:Visa", amount: -500, currency: "USD" },
        { account: "Expenses:Transport", amount: 500, currency: "USD" },
        { account: "Assets:Miles", amount: 1500, currency: "MILES" },
        { account: "Income:Miles", amount: -1500, currency: "MILES" },
      ];
      // Without the operating currency, spending outranks the miles earned.
      expect(pickPrimaryAccount(flight)).toBe("Expenses:Transport");
      expect(pickPrimaryAccount(flight, {}, "USD")).toBe("Expenses:Transport");
      // Whatever order the postings arrive in.
      expect(pickPrimaryAccount([...flight].reverse(), {}, "USD")).toBe(
        "Expenses:Transport",
      );
    });

    it("picks the operating-currency leg of a JPY and USD mix", () => {
      const mixed = [
        { account: "Expenses:Food:Groceries", amount: 3000, currency: "JPY" },
        { account: "Expenses:Transport", amount: 150, currency: "USD" },
        { account: "Liabilities:Visa", amount: -150, currency: "USD" },
        { account: "Liabilities:Yen", amount: -3000, currency: "JPY" },
      ];
      expect(pickPrimaryAccount(mixed, {}, "USD")).toBe("Expenses:Transport");
      expect(pickPrimaryAccount(mixed, {}, "JPY")).toBe(
        "Expenses:Food:Groceries",
      );
    });

    it("flags account-to-account moves as a transfer", () => {
      expect(
        pickPrimaryAccount([
          { account: "Assets:Checking", amount: -500 },
          { account: "Assets:Savings", amount: 500 },
        ]),
      ).toBe(TRANSFER);
      // Credit-card payment (Assets -> Liabilities) is also a transfer.
      expect(
        pickPrimaryAccount([
          { account: "Assets:Checking", amount: -300 },
          { account: "Liabilities:Amex", amount: 300 },
        ]),
      ).toBe(TRANSFER);
    });

    it("falls back to root priority when amounts are unknown", () => {
      expect(
        pickPrimaryAccount([
          { account: "Liabilities:Amex" },
          { account: "Expenses:Food:Coffee" },
        ]),
      ).toBe("Expenses:Food:Coffee");
    });

    it("returns the lone account for a single-account directive", () => {
      expect(pickPrimaryAccount([{ account: "Assets:Bank:Checking" }])).toBe(
        "Assets:Bank:Checking",
      );
      expect(pickPrimaryAccount([])).toBe(null);
    });
  });

  describe("matchCategory", () => {
    it("maps common expense categories to glyphs", () => {
      expect(matchCategory("Expenses:Food:Coffee")).toBe("restaurant");
      expect(matchCategory("Expenses:Transport:Subway")).toBe("car");
      expect(matchCategory("Expenses:Travel:Flights")).toBe("airplane");
      expect(matchCategory("Expenses:Health:Dental")).toBe("medkit");
    });

    it("prefers the 2nd-level segment (Home:Gas is housing, not fuel)", () => {
      expect(matchCategory("Expenses:Home:Gas")).toBe("home");
      expect(matchCategory("Expenses:Transport:Gas")).toBe("car");
    });

    it("distinguishes home improvement from housing", () => {
      expect(matchCategory("Expenses:HomeImprovement:Furniture")).toBe(
        "hammer",
      );
      expect(matchCategory("Expenses:Home:Rent")).toBe("home");
    });

    it("does not category-match non-expense accounts", () => {
      // Income:Interest must stay income, not read as a financial fee.
      expect(matchCategory("Income:Interest")).toBe(null);
      expect(matchCategory("Assets:Bank:Checking")).toBe(null);
      expect(matchCategory("Liabilities:CreditCard")).toBe(null);
    });

    it("avoids false positives from short-keyword prefixes", () => {
      // "Caregiver" must not match "car"; unknown category -> null (root glyph).
      expect(matchCategory("Expenses:Caregiver")).toBe(null);
      expect(matchCategory("Expenses:Misc")).toBe(null);
    });
  });
});

// w21/818: an exchange through Equity conversion legs drew the Equity icon.
describe("a currency exchange through Equity conversions", () => {
  const fx = [
    { account: "Assets:QaUSD", amount: -100, currency: "USD" },
    { account: "Equity:Conversions", amount: 100, currency: "USD" },
    { account: "Assets:QaEUR", amount: 92, currency: "EUR" },
    { account: "Equity:Conversions", amount: -92, currency: "EUR" },
  ];

  it("is a transfer", () => {
    expect(isEquityConversion(fx)).toBe(true);
    expect(pickPrimaryAccount(fx, {}, "USD")).toBe(TRANSFER);
  });

  it("is not an opening balance, a one-currency entry or a spend", () => {
    expect(
      isEquityConversion([
        { account: "Assets:QaUSD", amount: 100, currency: "USD" },
        { account: "Equity:Opening", amount: -100, currency: "USD" },
        { account: "Assets:QaEUR", amount: 50, currency: "EUR" },
        { account: "Equity:Opening", amount: -50, currency: "EUR" },
      ]),
    ).toBe(false);
    expect(
      isEquityConversion([
        { account: "Assets:QaUSD", amount: -100, currency: "USD" },
        { account: "Equity:Conversions", amount: 100, currency: "USD" },
      ]),
    ).toBe(false);
    expect(
      isEquityConversion([
        ...fx,
        { account: "Expenses:Fees", amount: 1, currency: "USD" },
      ]),
    ).toBe(false);
    // Amounts unknown: nothing to judge.
    expect(isEquityConversion(fx.map(({ account }) => ({ account })))).toBe(
      false,
    );
  });
});
