import { rewriteBqlStringBetween as rewrite } from "../bql-string-between";

describe("rewriteBqlStringBetween (w23/191)", () => {
  it.each([
    [
      "SELECT count(*) WHERE payee BETWEEN 'A' AND 'M'",
      "SELECT count(*) WHERE (payee >= 'A' AND payee <= 'M')",
    ],
    [
      "select 1 where p.payee between 'A' and 'M' and flag = '*'",
      "select 1 where (p.payee >= 'A' AND p.payee <= 'M') and flag = '*'",
    ],
    [
      "SELECT 1 WHERE payee NOT BETWEEN 'A' AND 'M' OR flag = '!'",
      "SELECT 1 WHERE NOT (payee >= 'A' AND payee <= 'M') OR flag = '!'",
    ],
    [
      "SELECT 1 WHERE narration BETWEEN 'a b' AND 'z AND y'",
      "SELECT 1 WHERE (narration >= 'a b' AND narration <= 'z AND y')",
    ],
    [
      "SELECT 1 WHERE payee BETWEEN 'A' AND 'C' AND narration BETWEEN 'x' AND 'z'",
      "SELECT 1 WHERE (payee >= 'A' AND payee <= 'C') AND (narration >= 'x' AND narration <= 'z')",
    ],
  ])("rewrites %p", (query, expected) => {
    expect(rewrite(query)).toBe(expected);
  });

  it.each([
    // Numeric, date, and expression operands already work or keep their precedence.
    "SELECT 1 WHERE number BETWEEN 100 AND 5000",
    "SELECT 1 WHERE date BETWEEN 2026-01-01 AND 2026-03-31",
    "SELECT 1 WHERE length(payee) BETWEEN 'a' AND 'b'",
    "SELECT 1 WHERE payee BETWEEN 'A' AND payee2",
    "SELECT 1 WHERE payee BETWEEN date('2026-01-01') AND 'b'",
    // Text inside a literal is data.
    "SELECT 1 WHERE narration = 'payee BETWEEN ''A'' AND ''M'''",
    "SELECT 1 WHERE narration = \"x BETWEEN 'a' AND 'b'\"",
    // No BETWEEN at all.
    "SELECT payee, count(*) GROUP BY payee",
  ])("leaves %p alone", (query) => {
    expect(rewrite(query)).toBe(query);
  });
});
