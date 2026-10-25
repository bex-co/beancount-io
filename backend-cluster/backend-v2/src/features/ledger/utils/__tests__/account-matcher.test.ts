import {
  isAccountSpelling,
  matchesAccountPattern,
} from "../account-matcher";

const ROOTS = ["Assets", "Liabilities", "Equity", "Income", "Expenses"];

describe("isAccountSpelling", () => {
  it.each([
    ["Assets:Broker:AAPL", true],
    ["Assets:Broker2", true],
    ["Assets", true],
    ["broker", false],
    ["Expenses:(Dining|Groceries)", false],
    ["Assets:Bro$", false],
    ["([", false],
    ["", false],
  ])("%p spells an account: %p", (value, expected) => {
    expect(isAccountSpelling(value, ROOTS)).toBe(expected);
  });

  it("accepts a non-Latin leaf the loader reads as one token", () => {
    expect(isAccountSpelling("Expenses:Food:中餐", ROOTS)).toBe(true);
    expect(isAccountSpelling("Expenses:Kค่า", ROOTS)).toBe(true);
  });

  it("refuses control characters to the regex branch", () => {
    expect(isAccountSpelling("Assets:Nope\u202E", ROOTS)).toBe(false);
  });

  it("honors configured roots", () => {
    expect(isAccountSpelling("Aktiv", ["Aktiv"])).toBe(true);
    expect(isAccountSpelling("Aktiv", ROOTS)).toBe(false);
  });
});

describe("matchesAccountPattern", () => {
  it("matches everything without a pattern", () => {
    expect(matchesAccountPattern(undefined, "Assets:Broker", ROOTS)).toBe(true);
    expect(matchesAccountPattern("", "Assets:Broker", ROOTS)).toBe(true);
  });

  it("anchors an account spelling at the start", () => {
    expect(matchesAccountPattern("Assets:Broker", "Assets:Broker", ROOTS)).toBe(
      true,
    );
    expect(
      matchesAccountPattern("Assets:Broker", "Assets:Broker:AAPL", ROOTS),
    ).toBe(true);
    // A prefix sibling is not a descendant (w5/292).
    expect(matchesAccountPattern("Assets:Broker", "Assets:Broker2", ROOTS)).toBe(
      false,
    );
    expect(
      matchesAccountPattern("Assets:Broker", "Assets:Bank:Checking", ROOTS),
    ).toBe(false);
  });

  it("anchors a bare root", () => {
    expect(matchesAccountPattern("Assets", "Assets:Broker", ROOTS)).toBe(true);
    expect(matchesAccountPattern("Assets", "Expenses:Taxes", ROOTS)).toBe(false);
  });

  it("searches any other pattern case-insensitively", () => {
    expect(matchesAccountPattern("broker", "Assets:Broker:AAPL", ROOTS)).toBe(
      true,
    );
    expect(
      matchesAccountPattern(
        "Expenses:(Dining|Groceries)",
        "Expenses:Dining",
        ROOTS,
      ),
    ).toBe(true);
    expect(matchesAccountPattern("zzz", "Assets:Broker", ROOTS)).toBe(false);
  });

  it("falls back to literal equality when the pattern does not compile", () => {
    expect(matchesAccountPattern("([", "([", ROOTS)).toBe(true);
    expect(matchesAccountPattern("([", "Assets:Broker", ROOTS)).toBe(false);
  });
});
