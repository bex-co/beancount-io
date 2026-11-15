import { BadUserInputError } from "@/shared/errors";
import {
  assertValidAccountPattern,
  isAccountSpelling,
  lexesAsAccount,
  loadsAsAccount,
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

  it("sends a name the lexer splits to the regex branch, as Fava does", () => {
    // Each is two tokens or more to the lexer, so no account is spelled so.
    expect(isAccountSpelling("Expenses:Food:coffee", ROOTS)).toBe(false);
    expect(isAccountSpelling("Expenses:Food:", ROOTS)).toBe(false);
    expect(isAccountSpelling("Expenses:Food::Bar", ROOTS)).toBe(false);
    expect(isAccountSpelling("Expenses:Food:-Bar", ROOTS)).toBe(false);
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
    expect(
      matchesAccountPattern("Assets:Broker", "Assets:Broker2", ROOTS),
    ).toBe(false);
    expect(
      matchesAccountPattern("Assets:Broker", "Assets:Bank:Checking", ROOTS),
    ).toBe(false);
  });

  it("anchors a bare root", () => {
    expect(matchesAccountPattern("Assets", "Assets:Broker", ROOTS)).toBe(true);
    expect(matchesAccountPattern("Assets", "Expenses:Taxes", ROOTS)).toBe(
      false,
    );
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

describe("assertValidAccountPattern", () => {
  it("accepts spellings and compilable patterns", () => {
    expect(() => assertValidAccountPattern("Assets:Broker:AAPL")).not.toThrow();
    expect(() => assertValidAccountPattern("broker")).not.toThrow();
    expect(() =>
      assertValidAccountPattern("Expenses:(Dining|Groceries)"),
    ).not.toThrow();
  });

  it("refuses a pattern that does not compile", () => {
    expect(() => assertValidAccountPattern("([")).toThrow(BadUserInputError);
    expect(() => assertValidAccountPattern("([")).toThrow(
      "Invalid account filter '(['",
    );
  });
});

describe("lexesAsAccount and loadsAsAccount (w31/013)", () => {
  it.each([
    // [name, one lexer token, loads in stock Beancount]
    ["Assets:Bank:Checking", true, true],
    ["Expenses:Food:日本", true, true],
    ["Expenses:Food:Café", true, true],
    ["Expenses:Food:éclair", true, true],
    ["Expenses:2026:日本", true, true],
    ["Expenses:Food:خرید\u200cها", true, true],
    ["Aktiva:Bank", true, true],
    // The grammar needs a capital or a digit to start the first component.
    ["Expenses:日本", true, false],
    ["日本:Food", true, false],
    // The lexer splits these, so neither loader reads one account.
    ["Expenses:Food:coffee", false, false],
    ["assets:Bank", false, false],
    ["Expenses:Food:", false, false],
    ["Expenses:Food::日本", false, false],
    ["Expenses:Food:-Bar", false, false],
    ["Expenses:Food:Bar$", false, false],
    ["Expenses", false, false],
    ["", false, false],
    // Spaces and controls end a name; bidirectional overrides are refused.
    ["Expenses:Food:日 本", false, false],
    ["Expenses:Food:日\u3000本", false, false],
    ["Expenses:Food:日\u00a0本", false, false],
    ["Expenses:Food:日\u0085本", false, false],
    ["Expenses:Food:日本\u202e", false, false],
  ])("%p: lexes %p, loads %p", (name, lexes, loads) => {
    expect(lexesAsAccount(name)).toBe(lexes);
    expect(loadsAsAccount(name)).toBe(loads);
  });
});
