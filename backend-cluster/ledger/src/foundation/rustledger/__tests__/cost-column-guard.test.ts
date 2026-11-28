import { costColumnError } from "../cost-column-guard";

/** w31/163: the engine's `cost` column drops the sign of a reduction. */
describe("costColumnError", () => {
  it.each([
    // The note's repro: per posting, summed, and on the example ledger.
    "SELECT date, number, cost, cost(position), weight WHERE account = 'Assets:Broker:VTI'",
    "SELECT sum(cost), sum(cost(position)) WHERE account = 'Assets:Broker:VTI'",
    "SELECT account, sum(cost) GROUP BY account",
    "SELECT date, number, cost WHERE account = 'Assets:US:ETrade:GLD' AND number < 0",
    // Every clause the column can sit in.
    "SELECT cost",
    "SELECT DISTINCT cost WHERE cost IS NOT NULL",
    "SELECT count(*) WHERE cost IS NOT NULL",
    "SELECT account GROUP BY account, cost",
    "SELECT account, sum(number) GROUP BY account HAVING sum(cost) != NULL",
    "SELECT date ORDER BY cost DESC",
    "SELECT account, sum(position) GROUP BY account PIVOT BY account, cost",
    "SELECT neg(cost) AS c",
    "BALANCES WHERE cost IS NOT NULL",
    // An alias named cost: the SELECT list and WHERE still read the column.
    "SELECT sum(cost) AS cost GROUP BY account",
    "SELECT number AS cost WHERE cost > 100",
    "SELECT cost AS cost",
    // A lowercase reference does not reach an alias spelled `Cost`.
    "SELECT number AS Cost ORDER BY cost",
    // The subquery's own mention is judged in its scope.
    "SELECT x FROM (SELECT cost AS x WHERE cost_number IS NOT NULL)",
    "SELECT count(*) FROM (SELECT cost FROM postings)",
  ])("refuses %p", (query) => {
    const refused = costColumnError(query);
    expect(refused?.rows).toEqual([]);
    expect(refused?.errors[0]).toMatchObject({
      severity: "error",
      message: expect.stringContaining("Use cost(position)"),
    });
  });

  it.each([
    // The functions and the longer names are not the column.
    "SELECT cost(position), cost(sum(position)), cost (position) LIMIT 1",
    "SELECT cost_number, cost_currency, cost_date, cost_label LIMIT 1",
    // An alias named cost, and the clauses that read it.
    "SELECT -number * cost_number AS cost WHERE cost_number IS NOT NULL ORDER BY cost",
    "SELECT account, cost_number AS cost GROUP BY account, cost",
    "SELECT account, sum(number) AS cost GROUP BY account HAVING cost > 0",
    "SELECT account, sum(number * cost_number) AS cost GROUP BY account PIVOT BY account, cost",
    // An outer query reads the subquery's columns.
    "SELECT cost FROM (SELECT number * cost_number AS cost WHERE cost_number IS NOT NULL) ORDER BY cost",
    "SELECT cost FROM (SELECT * FROM postings) WHERE cost > 0",
    // BALANCES and JOURNAL take cost as their AT function.
    "BALANCES AT cost WHERE account ~ 'Broker'",
    "JOURNAL 'Assets:Broker:VTI' AT cost",
    // Attribute access, strings and comments.
    "SELECT position.cost LIMIT 1",
    "SELECT payee WHERE narration = 'cost' OR payee = \"cost basis\"",
    "SELECT payee /* cost */ LIMIT 1",
    // Other spellings are left to the engine, which resolves columns exactly.
    "SELECT COST LIMIT 1",
    "SELECT payee LIMIT 1",
  ])("leaves %p alone", (query) => {
    expect(costColumnError(query)).toBeUndefined();
  });

  it("names the signed spellings and how to keep lots only", () => {
    const error = costColumnError("SELECT cost")?.errors[0];
    expect(error?.message).toContain("-2 VTI {100.00 USD} reads 200.00 USD");
    expect(error?.message).toContain("number * cost_number");
    // The served error carries the message alone, so it says how to keep lots.
    expect(error?.message).toContain("add WHERE cost_number IS NOT NULL");
  });
});
