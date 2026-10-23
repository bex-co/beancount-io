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

    // w21/642: an exact name scored like a prefix, and usage broke the tie.
    test("puts the account the query names exactly first, whatever the usage", () => {
      const usage: AccountUsage = {
        "Expenses:Rental-Car": { count: 9, lastUsedAt: NOW },
        "Expenses:Food:Groceries": { count: 9, lastUsedAt: NOW },
      };
      const chart = [
        "Expenses:Rental-Car",
        "Expenses:Rent",
        "Expenses:Food:Groceries",
        "Expenses:Food",
      ];
      expect(filterAccounts("rent", chart, { usage, now: NOW })[0]).toBe(
        "Expenses:Rent",
      );
      expect(
        filterAccounts("Expenses:Food", chart, { usage, now: NOW })[0],
      ).toBe("Expenses:Food");
      expect(filterAccounts("food", chart, { usage, now: NOW })[0]).toBe(
        "Expenses:Food",
      );
      // Smartcase still holds: an uppercase query names only that case.
      expect(
        filterAccounts("RENT", ["Expenses:Rent", "Expenses:RENT-Car"])[0],
      ).toBe("Expenses:RENT-Car");
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

// w21/060: "İ" lowercases to two code units, which shifted every later
// character, so "bank" missed Assets:İşBank and the picker offered Create.
describe("account search with a dotted capital I", () => {
  const accounts = ["Assets:İşBank", "Assets:ZiraatBank"];

  it("finds İşBank by a lowercase query after the İ", () => {
    expect(filterAccounts("bank", accounts).includes("Assets:İşBank")).toBe(
      true,
    );
    expect(fuzzyMatch("bank", "Assets:İşBank") > 0).toBe(true);
  });

  it("finds it by iş and by İş", () => {
    expect(filterAccounts("iş", accounts)).toEqual(["Assets:İşBank"]);
    expect(filterAccounts("İş", accounts)).toEqual(["Assets:İşBank"]);
  });
});

// w21/255: an account name has no spaces, so "credit card" as one pattern
// matched nothing, and the Create row then offered a name the form refuses.
describe("filterAccounts with several words", () => {
  const accounts = [
    "Liabilities:CreditCard:Visa",
    "Expenses:Food:Groceries",
    "Expenses:Transport:PublicTransit",
    "Assets:Bank:Checking",
    "Assets:Cash",
  ];

  it("finds the account every word matches, in any order", () => {
    expect(filterAccounts("credit card", accounts)).toEqual([
      "Liabilities:CreditCard:Visa",
    ]);
    expect(filterAccounts("food groc", accounts)).toEqual([
      "Expenses:Food:Groceries",
    ]);
    expect(filterAccounts("public transit", accounts)).toEqual([
      "Expenses:Transport:PublicTransit",
    ]);
    expect(filterAccounts("bank checking", accounts)).toEqual([
      "Assets:Bank:Checking",
    ]);
    expect(filterAccounts("checking bank", accounts)).toEqual([
      "Assets:Bank:Checking",
    ]);
  });

  it("needs every word, and ignores extra spacing", () => {
    expect(filterAccounts("credit zebra", accounts)).toEqual([]);
    expect(filterAccounts("  credit    card  ", accounts)).toEqual([
      "Liabilities:CreditCard:Visa",
    ]);
  });

  it("scores a single word exactly as before", () => {
    expect(filterAccounts("cash", accounts)).toEqual(["Assets:Cash"]);
    expect(filterAccounts("food:groc", accounts)).toEqual([
      "Expenses:Food:Groceries",
    ]);
  });
});

// w21/256: a ledger from a system that writes decomposed Unicode holds "Café"
// as "Cafe" + U+0301; search for the typed "café" found nothing.
describe("filterAccounts with decomposed Unicode", () => {
  const nfd = "Expenses:Café";
  const accounts = [nfd, "Expenses:Food"];

  it("finds a decomposed account by its composed spelling, in either case", () => {
    expect(filterAccounts("café", accounts)).toEqual([nfd]);
    expect(filterAccounts("Café", accounts)).toEqual([nfd]);
    expect(filterAccounts("caf", accounts)).toEqual([nfd]);
  });

  it("returns the ledger's own spelling, not the normalised one", () => {
    expect(filterAccounts("café", accounts)[0]).toBe("Expenses:Café");
  });

  it("finds a composed account by a decomposed query too", () => {
    expect(filterAccounts("café", ["Expenses:Café"])).toEqual([
      "Expenses:Café",
    ]);
  });
});

// w21/836: an account spelled with Arabic letters, searched from a Persian keyboard.
describe("filterAccounts across Arabic-script spellings", () => {
  const accounts = ["Assets:Qa:بانك-ملي", "Expenses:Qa:Coffee"];

  test("finds the Arabic-spelled account from Persian typing", () => {
    expect(filterAccounts("ملی", accounts)).toEqual(["Assets:Qa:بانك-ملي"]);
    expect(filterAccounts("بانک", accounts)).toEqual(["Assets:Qa:بانك-ملي"]);
  });

  test("still finds it as typed", () => {
    expect(filterAccounts("ملي", accounts)).toEqual(["Assets:Qa:بانك-ملي"]);
  });
});
