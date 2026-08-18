import { filterAccounts, fuzzyMatch } from "../account-search";
import type { AccountUsage } from "../account-frecency";

// The runner only ships toBe/toEqual/toBeCloseTo/toBeTruthy/toBeFalsy/toThrow,
// so score comparisons are asserted as booleans.

describe("fuzzyMatch", () => {
  describe("subsequence semantics (fava parity)", () => {
    test("matches characters in order with gaps allowed", () => {
      expect(fuzzyMatch("exfo", "Expenses:Food") > 0).toBe(true);
      expect(fuzzyMatch("asbnk", "Assets:Bank:Checking") > 0).toBe(true);
    });

    test("scores 0 when a pattern character is missing", () => {
      expect(fuzzyMatch("zzz", "Expenses:Food")).toBe(0);
      expect(fuzzyMatch("food", "Expenses:Fod")).toBe(0);
    });

    test("scores 0 when characters appear out of order", () => {
      expect(fuzzyMatch("dof", "Expenses:Food")).toBe(0);
    });

    test("scores 0 when the pattern is longer than the text", () => {
      expect(fuzzyMatch("Expenses:Food:Extra", "Expenses:Food")).toBe(0);
    });

    test("an empty pattern matches everything neutrally", () => {
      expect(fuzzyMatch("", "Expenses:Food")).toBe(1);
    });
  });

  describe("smartcase", () => {
    test("a lowercase pattern matches either case", () => {
      expect(fuzzyMatch("food", "Expenses:Food") > 0).toBe(true);
      expect(fuzzyMatch("FOOD", "Expenses:Food")).toBe(0);
    });

    test("an uppercase pattern character demands an exact match", () => {
      expect(fuzzyMatch("F", "Expenses:Food") > 0).toBe(true);
      expect(fuzzyMatch("F", "Expenses:food")).toBe(0);
    });
  });

  describe("ranking", () => {
    test("an exact substring outranks a scattered subsequence", () => {
      const exact = fuzzyMatch("exp", "Expenses:Food");
      const scattered = fuzzyMatch("exp", "Equity:X:Pension");
      expect(scattered > 0).toBe(true);
      expect(exact > scattered).toBe(true);
    });

    test("a match starting a segment outranks one starting mid-word", () => {
      const segmentStart = fuzzyMatch("fo", "Expenses:Food");
      const midWord = fuzzyMatch("fo", "Assets:Bofo");
      expect(midWord > 0).toBe(true);
      expect(segmentStart > midWord).toBe(true);
    });

    test("consecutive characters outrank the same characters scattered", () => {
      const consecutive = fuzzyMatch("ban", "Assets:Bank");
      const scattered = fuzzyMatch("ban", "Assets:Brokerage:Anz");
      expect(scattered > 0).toBe(true);
      expect(consecutive > scattered).toBe(true);
    });
  });
});

describe("filterAccounts", () => {
  const accounts = [
    "Assets:Bank:Checking",
    "Assets:Bank:Savings",
    "Expenses:Food",
    "Expenses:Food:Restaurants",
    "Expenses:Fun:Outdoors",
    "Income:Salary",
  ];

  test("ranks the fava-style abbreviation first", () => {
    expect(filterAccounts("exfo", accounts)[0]).toBe("Expenses:Food");
  });

  test("drops accounts that do not match at all", () => {
    const result = filterAccounts("salary", accounts);
    expect(result).toEqual(["Income:Salary"]);
  });

  test("returns an empty list when nothing matches", () => {
    expect(filterAccounts("zzzz", accounts)).toEqual([]);
  });

  test("an empty or whitespace query keeps the input order", () => {
    expect(filterAccounts("", accounts)).toEqual(accounts);
    expect(filterAccounts("   ", accounts)).toEqual(accounts);
  });

  test("breaks ties on the shorter account, then alphabetically", () => {
    const result = filterAccounts("food", accounts);
    expect(result).toEqual(["Expenses:Food", "Expenses:Food:Restaurants"]);
  });

  test("searches across every root type", () => {
    const result = filterAccounts("a", accounts);
    expect(result.length > 1).toBe(true);
  });

  describe("frecency tiebreak", () => {
    const NOW = 1_700_000_000_000;
    const DAY = 24 * 60 * 60 * 1000;
    // Same length, same match shape — nothing but the tiebreak separates them.
    const tied = ["Expenses:Aaa:Outdoors", "Expenses:Bbb:Outdoors"];

    test("scores the pair identically, so only the tiebreak can order it", () => {
      expect(fuzzyMatch("outdoors", tied[0])).toBe(
        fuzzyMatch("outdoors", tied[1]),
      );
    });

    test("orders equally-good matches by usage", () => {
      const usage: AccountUsage = {
        "Expenses:Bbb:Outdoors": { count: 4, lastUsedAt: NOW },
      };
      expect(filterAccounts("outdoors", tied, { usage, now: NOW })[0]).toBe(
        "Expenses:Bbb:Outdoors",
      );
    });

    test("prefers the more recently used at equal counts", () => {
      const usage: AccountUsage = {
        "Expenses:Aaa:Outdoors": { count: 2, lastUsedAt: NOW - 60 * DAY },
        "Expenses:Bbb:Outdoors": { count: 2, lastUsedAt: NOW },
      };
      expect(filterAccounts("outdoors", tied, { usage, now: NOW })[0]).toBe(
        "Expenses:Bbb:Outdoors",
      );
    });

    test("keeps the alphabetical fallback when no usage is supplied", () => {
      expect(filterAccounts("outdoors", [...tied].reverse())).toEqual(tied);
    });

    test("never lets usage outrank a better match", () => {
      const usage: AccountUsage = {
        "Expenses:Fun:Outdoors": { count: 99, lastUsedAt: NOW },
      };
      // `food` matches `Expenses:Food` exactly and `Expenses:Fun:Outdoors`
      // only as a scattered subsequence, so no amount of usage reorders them.
      expect(
        filterAccounts("food", [...accounts, "Expenses:Fun:Outdoors"], {
          usage,
          now: NOW,
        })[0],
      ).toBe("Expenses:Food");
    });
  });
});
