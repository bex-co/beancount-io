import { quotedColumnError } from "../quoted-column-guard";

/** w23/157: the engine literals `"…"` where stock resolves columns. */
describe("quotedColumnError", () => {
  it.each([
    'SELECT "narration" LIMIT 1',
    'SELECT "account" LIMIT 1',
    "SELECT count(*) AS n WHERE \"account\" = 'Assets:Cash'",
    'SELECT narration ORDER BY "date" DESC LIMIT 1',
    'SELECT "account", count(*) GROUP BY "account"',
    'SELECT "date" FROM entries LIMIT 1',
    'SELECT "amount" FROM prices LIMIT 1',
    'SELECT upper("payee") LIMIT 1',
    'SELECT p."payee" FROM postings p LIMIT 1',
  ])("refuses %p", (query) => {
    const refused = quotedColumnError(query);
    expect(refused?.rows).toEqual([]);
    expect(refused?.errors[0]).toMatchObject({
      severity: "error",
      message: expect.stringContaining("Quoted identifiers are not supported"),
    });
  });

  it.each([
    // Unknown names fall back to literals on both sides.
    'SELECT "nonexistent" LIMIT 1',
    // Stock's quoted rule is case-sensitive too: literals agree.
    'SELECT "Payee" LIMIT 1',
    // Not that table's column: stock literals, like the engine.
    'SELECT "payee" FROM prices LIMIT 1',
    // No quotes, no fire.
    "SELECT * FROM postings LIMIT 1",
    // Quoted alias definitions are skipped (engine reports those itself).
    'SELECT narration AS "payee" LIMIT 1',
    // The FROM span is 115/130's rewrite, never this guard.
    'SELECT count(*) FROM "postings" LIMIT 1',
    // `options` has no engine table; its table error stays accurate.
    'SELECT "date" FROM options LIMIT 1',
    // Unproven scopes abstain (the known residual) — even for names
    // that would fire under a proven table.
    'SELECT "payee" FROM (SELECT payee LIMIT 1)',
    'SELECT "payee" FROM nosuchtable LIMIT 1',
    // The quoted text inside a string literal is not syntax.
    `SELECT narration WHERE narration = 'say "payee" hi' LIMIT 1`,
    // Non-SELECT statements are out of scope.
    'CHECK "payee" = "payee"',
  ])("leaves %p alone", (query) => {
    expect(quotedColumnError(query)).toBeUndefined();
  });

  it("names the offending identifier and the bare spelling", () => {
    const refused = quotedColumnError('SELECT "account" LIMIT 1');
    expect(refused?.errors[0]?.message).toContain(
      '"account" reads as the string literal',
    );
    expect(refused?.errors[0]?.hint).toBe(
      'Replace "account" with the bare column name account.',
    );
  });
});
