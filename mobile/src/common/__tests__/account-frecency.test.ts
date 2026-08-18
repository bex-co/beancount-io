import {
  frecencyScore,
  recordUsage,
  topAccounts,
  usageFor,
  type AccountUsage,
  type LedgerAccountUsage,
} from "../account-frecency";

// Imports are relative because the unit-test runner does not resolve the `@/`
// alias for value modules, and score comparisons are asserted as booleans —
// the runner ships only toBe/toEqual/toBeCloseTo/toBeTruthy/toBeFalsy/toThrow.

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;
const daysAgo = (days: number) => NOW - days * DAY;

describe("frecencyScore", () => {
  test("scores 0 for an account that has never been picked", () => {
    expect(frecencyScore(undefined, NOW)).toBe(0);
    expect(frecencyScore({ count: 0, lastUsedAt: NOW }, NOW)).toBe(0);
  });

  test("grows with the number of picks", () => {
    const once = frecencyScore({ count: 1, lastUsedAt: NOW }, NOW);
    const thrice = frecencyScore({ count: 3, lastUsedAt: NOW }, NOW);
    expect(thrice > once).toBe(true);
  });

  test("decays as the last pick ages", () => {
    const entry = (days: number) => ({ count: 1, lastUsedAt: daysAgo(days) });
    const today = frecencyScore(entry(0), NOW);
    const thisWeek = frecencyScore(entry(3), NOW);
    const thisMonth = frecencyScore(entry(20), NOW);
    const older = frecencyScore(entry(200), NOW);
    expect(today > thisWeek).toBe(true);
    expect(thisWeek > thisMonth).toBe(true);
    expect(thisMonth > older).toBe(true);
    expect(older > 0).toBe(true);
  });

  test("is deterministic for a fixed now", () => {
    const entry = { count: 4, lastUsedAt: daysAgo(2) };
    expect(frecencyScore(entry, NOW)).toBe(frecencyScore(entry, NOW));
  });

  test("treats a pick timestamped in the future as just now", () => {
    const future = { count: 1, lastUsedAt: NOW + 5 * DAY };
    expect(frecencyScore(future, NOW)).toBe(
      frecencyScore({ count: 1, lastUsedAt: NOW }, NOW),
    );
  });

  test("recency can outweigh a higher count", () => {
    const staleFavourite = { count: 5, lastUsedAt: daysAgo(200) };
    const freshOneOff = { count: 1, lastUsedAt: NOW };
    expect(
      frecencyScore(freshOneOff, NOW) > frecencyScore(staleFavourite, NOW),
    ).toBe(true);
  });
});

describe("topAccounts", () => {
  test("ranks the more recently used first when counts are equal", () => {
    const usage: AccountUsage = {
      "Expenses:Food": { count: 2, lastUsedAt: daysAgo(40) },
      "Expenses:Transport": { count: 2, lastUsedAt: daysAgo(1) },
      "Expenses:Rent": { count: 2, lastUsedAt: daysAgo(10) },
    };
    expect(topAccounts({ usage, now: NOW }, 3)).toEqual([
      "Expenses:Transport",
      "Expenses:Rent",
      "Expenses:Food",
    ]);
  });

  test("ranks the more used first at equal recency", () => {
    const usage: AccountUsage = {
      "Expenses:Food": { count: 1, lastUsedAt: daysAgo(2) },
      "Expenses:Transport": { count: 7, lastUsedAt: daysAgo(2) },
    };
    expect(topAccounts({ usage, now: NOW }, 2)).toEqual([
      "Expenses:Transport",
      "Expenses:Food",
    ]);
  });

  test("never surfaces a zero-usage account", () => {
    const usage: AccountUsage = {
      "Expenses:Food": { count: 0, lastUsedAt: NOW },
      "Expenses:Transport": { count: 1, lastUsedAt: NOW },
    };
    expect(topAccounts({ usage, now: NOW }, 5)).toEqual(["Expenses:Transport"]);
    expect(topAccounts({ usage: {}, now: NOW }, 5)).toEqual([]);
  });

  test("caps the result at the limit", () => {
    const usage: AccountUsage = {
      a: { count: 1, lastUsedAt: NOW },
      b: { count: 2, lastUsedAt: NOW },
      c: { count: 3, lastUsedAt: NOW },
    };
    expect(topAccounts({ usage, now: NOW }, 2)).toEqual(["c", "b"]);
    expect(topAccounts({ usage, now: NOW }, 0)).toEqual([]);
  });

  test("drops accounts the caller no longer offers, before the cap", () => {
    const usage: AccountUsage = {
      "Expenses:Closed": { count: 9, lastUsedAt: NOW },
      "Expenses:Food": { count: 2, lastUsedAt: NOW },
      "Expenses:Rent": { count: 1, lastUsedAt: NOW },
    };
    expect(
      topAccounts({ usage, now: NOW }, 2, ["Expenses:Food", "Expenses:Rent"]),
    ).toEqual(["Expenses:Food", "Expenses:Rent"]);
  });

  test("orders a full tie alphabetically so the pinned rows stay put", () => {
    const usage: AccountUsage = {
      "Expenses:Transport": { count: 1, lastUsedAt: NOW },
      "Expenses:Food": { count: 1, lastUsedAt: NOW },
    };
    expect(topAccounts({ usage, now: NOW }, 5)).toEqual([
      "Expenses:Food",
      "Expenses:Transport",
    ]);
  });

  test("is deterministic for a fixed now", () => {
    const usage: AccountUsage = {
      "Expenses:Food": { count: 3, lastUsedAt: daysAgo(5) },
      "Expenses:Rent": { count: 3, lastUsedAt: daysAgo(6) },
    };
    expect(topAccounts({ usage, now: NOW }, 5)).toEqual(
      topAccounts({ usage, now: NOW }, 5),
    );
  });
});

describe("usageFor", () => {
  const byLedger: LedgerAccountUsage = {
    "ledger-1": { "Expenses:Food": { count: 1, lastUsedAt: NOW } },
  };

  test("returns the named ledger's usage", () => {
    expect(usageFor(byLedger, "ledger-1")).toEqual({
      "Expenses:Food": { count: 1, lastUsedAt: NOW },
    });
  });

  test("returns one stable empty map for a ledger with no usage", () => {
    const missing = usageFor(byLedger, "ledger-2");
    expect(missing).toEqual({});
    // Same identity every call, so a memo keyed on it doesn't recompute.
    expect(missing === usageFor(byLedger, "ledger-3")).toBe(true);
    expect(missing === usageFor({}, "ledger-1")).toBe(true);
  });
});

describe("recordUsage", () => {
  test("starts an account at one pick", () => {
    const next = recordUsage({}, "ledger-1", "Expenses:Food", NOW);
    expect(next).toEqual({
      "ledger-1": { "Expenses:Food": { count: 1, lastUsedAt: NOW } },
    });
  });

  test("increments the count and moves lastUsedAt forward", () => {
    const first = recordUsage({}, "ledger-1", "Expenses:Food", daysAgo(3));
    const second = recordUsage(first, "ledger-1", "Expenses:Food", NOW);
    expect(second["ledger-1"]["Expenses:Food"]).toEqual({
      count: 2,
      lastUsedAt: NOW,
    });
  });

  test("keeps each ledger's usage to itself", () => {
    const one = recordUsage({}, "ledger-1", "Expenses:Food", NOW);
    const two = recordUsage(one, "ledger-2", "Expenses:Food", NOW);
    expect(two["ledger-1"]["Expenses:Food"].count).toBe(1);
    expect(two["ledger-2"]["Expenses:Food"].count).toBe(1);
    expect(
      topAccounts({ usage: usageFor(two, "ledger-2"), now: NOW }, 5),
    ).toEqual(["Expenses:Food"]);
  });

  test("leaves the other accounts on the ledger alone", () => {
    const one = recordUsage({}, "ledger-1", "Expenses:Food", daysAgo(1));
    const two = recordUsage(one, "ledger-1", "Expenses:Rent", NOW);
    expect(two["ledger-1"]["Expenses:Food"]).toEqual({
      count: 1,
      lastUsedAt: daysAgo(1),
    });
  });

  test("never mutates the map it was given", () => {
    const before: LedgerAccountUsage = {
      "ledger-1": { "Expenses:Food": { count: 1, lastUsedAt: daysAgo(1) } },
    };
    const next = recordUsage(before, "ledger-1", "Expenses:Food", NOW);
    expect(before["ledger-1"]["Expenses:Food"]).toEqual({
      count: 1,
      lastUsedAt: daysAgo(1),
    });
    // A new object at every touched level, or the reactive var never notifies.
    expect(next === before).toBe(false);
    expect(next["ledger-1"] === before["ledger-1"]).toBe(false);
  });
});
