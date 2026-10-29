import { unquoteBqlAliases } from "../bql-alias-quotes";

describe("unquoteBqlAliases (w23/188)", () => {
  it.each([
    ['SELECT payee AS "p" LIMIT 1', "SELECT payee AS p LIMIT 1"],
    ['select payee as "p"', "select payee as p"],
    [
      'SELECT payee AS   "p", number AS "n_2"',
      "SELECT payee AS   p, number AS n_2",
    ],
    [
      'SELECT sum(number) AS "total" GROUP BY account',
      "SELECT sum(number) AS total GROUP BY account",
    ],
  ])("unquotes an identifier alias: %p", (query, expected) => {
    expect(unquoteBqlAliases(query)).toBe(expected);
  });

  it.each([
    // Not identifier-shaped: the engine and the quoted-identifier guard judge it.
    'SELECT payee AS "my alias"',
    'SELECT payee AS "1st"',
    // Single-quoted aliases and quoted text outside an alias position stay.
    "SELECT payee AS 'p'",
    'SELECT "payee" ORDER BY payee',
    "SELECT payee WHERE narration = 'AS \"p\"'",
    'SELECT payee WHERE narration = "was" AND payee = "p"',
    // `as` must be the keyword, not the tail of a longer word.
    'SELECT payee, alias"p"',
    'SELECT payee has "p"',
    // An unterminated literal returns the query unchanged.
    'SELECT payee AS "p',
  ])("leaves %p as written", (query) => {
    expect(unquoteBqlAliases(query)).toBe(query);
  });
});
