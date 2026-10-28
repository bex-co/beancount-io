import { compositeComparisonError } from "../composite-comparison-guard";

/** w23/128: the engine answers composite `=` / `!=` constant-False/True. */
describe("compositeComparisonError", () => {
  it.each([
    "SELECT tags = tags AS e FROM postings LIMIT 1",
    "SELECT tags != tags AS e FROM postings LIMIT 1",
    "SELECT position = position AS e FROM postings LIMIT 1",
    "SELECT balance = balance AS e FROM postings LIMIT 1",
    "SELECT cost(position) = cost(position) AS e FROM postings LIMIT 1",
    "SELECT count(*) FROM postings WHERE meta = meta",
    "SELECT tags = links AS e FROM postings LIMIT 1",
    "SELECT entry = entry AS e FROM postings LIMIT 1",
    // Stock refuses when either side is composite.
    "SELECT tags = 'x' AS e FROM postings LIMIT 1",
    "SELECT payee = tags AS e FROM postings LIMIT 1",
    "SELECT value(position) != value(balance) AS e FROM postings LIMIT 1",
    // Aggregates over composite arguments stay composite.
    "SELECT sum(position) = sum(position) AS e FROM postings LIMIT 1",
    "SELECT first(tags) = last(tags) AS e FROM postings LIMIT 1",
    "SELECT sum(DISTINCT tags) = sum(tags) AS e FROM postings LIMIT 1",
    "SELECT sum(cost(position)) = sum(number) AS e FROM postings LIMIT 1",
    // Dotted and lowercase spellings.
    "SELECT p.tags = p.tags AS e FROM postings p LIMIT 1",
    "select meta != meta from postings",
  ])("refuses %p", (query) => {
    const refused = compositeComparisonError(query);
    expect(refused?.rows).toEqual([]);
    expect(refused?.errors[0]).toMatchObject({
      severity: "error",
      message: expect.stringContaining("composite BQL values"),
    });
  });

  it.each([
    "SELECT payee = payee AS e FROM postings LIMIT 1",
    "SELECT count(tags) = count(tags) AS e FROM postings LIMIT 1",
    "SELECT length(tags) = 2 AS e FROM postings LIMIT 1",
    "SELECT tags FROM postings WHERE payee = 'x' LIMIT 1",
    "SELECT date = 2024-01-01 AS e FROM postings LIMIT 1",
    "SELECT number != 0 AS e FROM postings LIMIT 1",
    // An AS alias may retype the name; the guard stays out.
    "SELECT 1 AS tags FROM postings WHERE tags = 1",
    // The comparison inside a string literal is not syntax.
    "SELECT narration WHERE narration = 'tags = tags'",
    // meta() is a scalar accessor, not the dict column.
    "SELECT meta('x') = meta('y') AS e FROM postings LIMIT 1",
    // open/close self-equality answers correctly; out of scope.
    "SELECT open = open AS e FROM accounts LIMIT 1",
    // Inequalities are already loud natively; not this guard's job.
    "SELECT tags < tags AS e FROM postings LIMIT 1",
    // Substring names are not the columns.
    "SELECT stages = stages AS e FROM postings LIMIT 1",
    "SELECT * FROM postings LIMIT 1",
    // Non-SELECT statements are out of scope.
    "CHECK tags = tags",
  ])("leaves %p alone", (query) => {
    expect(compositeComparisonError(query)).toBeUndefined();
  });
});
