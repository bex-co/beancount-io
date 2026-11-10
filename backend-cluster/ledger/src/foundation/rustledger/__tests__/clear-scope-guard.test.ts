import { clearScopeError } from "../clear-scope-guard";

/** w1/192: the engine parses `FROM … CLEAR` and ignores it. */
describe("clearScopeError", () => {
  it.each([
    "SELECT account, sum(position) FROM CLOSE ON 2026-08-01 CLEAR GROUP BY account",
    "select account, sum(position) from close on 2026-08-01 clear group by account",
    "SELECT account FROM OPEN ON 2026-01-01 CLOSE ON 2027-01-01 CLEAR",
    "BALANCES FROM CLOSE ON 2026-08-01 CLEAR",
    "SELECT * FROM (SELECT account FROM CLEAR)",
  ])("refuses %p, naming the earnings sum", (query) => {
    const refused = clearScopeError(query);
    expect(refused?.rows).toEqual([]);
    expect(refused?.errors[0]).toMatchObject({
      severity: "error",
      phase: "query",
      message: expect.stringContaining("Equity:Earnings:Current"),
      hint: expect.stringContaining("Remove CLEAR"),
    });
  });

  it.each([
    "SELECT account, sum(position) FROM CLOSE ON 2026-08-01 GROUP BY account",
    // The word inside a string literal is not the clause.
    "SELECT narration FROM year = 2026 WHERE narration ~ 'clear'",
    'SELECT account FROM CLOSE ON 2026-08-01 WHERE account = "Assets:Clear"',
    // Part of a longer identifier.
    "SELECT account FROM postings WHERE account ~ 'x' ORDER BY cleared_flag",
    // Before any FROM, it is not the scope clause.
    "SELECT account AS clear GROUP BY account",
  ])("leaves %p alone", (query) => {
    expect(clearScopeError(query)).toBeUndefined();
  });
});
