import { mixedComparisonError } from "../mixed-comparison-guard";

/** w23/132: the engine answers mixed-type equality without coercing. */
describe("mixedComparisonError", () => {
  it.each([
    "SELECT payee FROM postings WHERE date = '2026-01-01'",
    "SELECT count(*) FROM postings WHERE date != '2026-01-01'",
    "SELECT '2026-01-01' = date AS e FROM postings LIMIT 1",
    "SELECT count(*) FROM postings WHERE number = '3000'",
    "SELECT count(*) FROM postings WHERE cost_number = '1.5'",
    "select count(*) from postings where date = '2026-01-01'",
    "SELECT 1 = '1' AS e FROM postings LIMIT 1",
    "SELECT year(date) = '2024' AS e FROM postings LIMIT 1",
    "SELECT flag = 1 AS e FROM postings LIMIT 1",
    "SELECT true = 1 AS e FROM postings LIMIT 1",
    "SELECT payee FROM postings WHERE date = 2024-1-1",
    "SELECT sum(number) = 'x' AS e FROM postings LIMIT 1",
    "SELECT NOT (date = '2026-01-01') AS e FROM postings LIMIT 1",
    "SELECT weight = 'x' AS e FROM postings LIMIT 1",
    "SELECT tags = 1 AS e FROM postings LIMIT 1",
  ])("refuses %p", (query) => {
    const refused = mixedComparisonError(query);
    expect(refused?.rows).toEqual([]);
    expect(refused?.errors[0]).toMatchObject({
      severity: "error",
      message: expect.stringContaining("Mixed-type comparison"),
    });
  });

  it.each([
    "SELECT count(*) FROM postings WHERE date IN ('2026-01-01')",
    "SELECT count(*) FROM postings WHERE number IN ('3000')",
    "SELECT count(*) FROM postings WHERE date NOT IN ('2026-01-01', '2026-01-02')",
    "SELECT count(*) FROM postings WHERE 2024-01-15 IN (payee)",
  ])("refuses %p", (query) => {
    expect(mixedComparisonError(query)?.errors[0]).toMatchObject({
      severity: "error",
      message: expect.stringContaining("IN compares"),
    });
  });

  it.each([
    "SELECT payee FROM postings WHERE date = 2026-01-01",
    "SELECT payee FROM postings WHERE date = date('2026-01-01')",
    "SELECT count(*) FROM postings WHERE number = 3000",
    "SELECT count(*) FROM postings WHERE number = 3000.00",
    "SELECT * FROM postings WHERE payee = 'x' LIMIT 1",
    "SELECT * FROM postings WHERE payee != '' LIMIT 1",
    "SELECT length(payee) = 3 AS e FROM postings LIMIT 1",
    "SELECT year(date) = 2024 AS e FROM postings LIMIT 1",
    "SELECT count(*) = 2 AS e FROM postings LIMIT 1",
    "SELECT 1 = 1 AS e FROM postings LIMIT 1",
    // NULL comparisons belong to the NULL-note family.
    "SELECT count(*) FROM postings WHERE date = NULL",
    "SELECT count(*) FROM postings WHERE payee != NULL",
    // Same-composite-type defers to the composite guard.
    "SELECT tags = tags AS e FROM postings LIMIT 1",
    "SELECT weight = weight AS e FROM postings LIMIT 1",
    // An AS alias may retype the name.
    "SELECT 'a' AS date FROM postings WHERE date = 'x'",
    // IN lists stock answers leniently (or correctly) stay untouched.
    "SELECT count(*) FROM postings WHERE payee IN ('a', 'b')",
    "SELECT count(*) FROM postings WHERE payee IN ('a', 1)",
    "SELECT count(*) FROM postings WHERE payee IN (1, 2)",
    "SELECT count(*) FROM postings WHERE number IN (3000, 3000.00)",
    "SELECT count(*) FROM postings WHERE date IN (date('2024-01-15'))",
    "SELECT count(*) FROM postings WHERE date IN (NULL, date('2024-01-15'))",
    // Inequalities are already strict; LIKE is out of scope.
    "SELECT count(*) FROM postings WHERE date > '2026-01-01'",
    "SELECT count(*) FROM postings WHERE payee LIKE 'x%'",
    // Unknown shapes abstain (engine is loud or correct on each).
    "SELECT meta('x') = 1 AS e FROM postings LIMIT 1",
    "SELECT (payee = 'x') = (narration = 'y') AS e FROM postings LIMIT 1",
    "SELECT nosuchcol = 'x' AS e FROM postings LIMIT 1",
    "SELECT * FROM postings LIMIT 1",
  ])("leaves %p alone", (query) => {
    expect(mixedComparisonError(query)).toBeUndefined();
  });
});
