import { groupByCoverageError } from "../group-by-coverage-guard";

/** w23/131: the engine reports first-row values for bare grouped columns. */
describe("groupByCoverageError", () => {
  it.each([
    "SELECT account, date, count(*) FROM postings GROUP BY account",
    "SELECT payee, count(*) FROM postings GROUP BY account",
    "SELECT payee, narration, count(*) FROM postings GROUP BY payee",
    "select account, date, count(*) from postings group by account",
    "SELECT t.account, t.date, count(*) FROM postings t GROUP BY t.account",
    "SELECT account AS a, date AS d, count(*) FROM postings GROUP BY a",
    "SELECT date, count(*) FROM postings GROUP BY 2",
    "SELECT account, date FROM postings GROUP BY account",
    "SELECT date FROM postings GROUP BY account",
    "SELECT account, date, count(*) FROM postings GROUP BY account HAVING count(*) > 1",
    "SELECT account, date, count(*) FROM postings WHERE payee = 'x' GROUP BY account",
    "SELECT account, date, count(*) GROUP BY account",
  ])("refuses %p", (query) => {
    const refused = groupByCoverageError(query);
    expect(refused?.rows).toEqual([]);
    expect(refused?.errors[0]).toMatchObject({
      severity: "error",
      message: expect.stringContaining("first("),
    });
  });

  it("names every uncovered column", () => {
    const refused = groupByCoverageError(
      "SELECT account, date, payee, count(*) FROM postings GROUP BY account",
    );
    expect(refused?.errors[0]?.message).toContain('"date", "payee"');
  });

  it.each([
    "SELECT account, count(*) FROM postings GROUP BY account",
    "SELECT account, date, count(*) FROM postings GROUP BY account, date",
    "SELECT count(*) FROM postings GROUP BY account",
    "SELECT account AS a, count(*) FROM postings GROUP BY a",
    "SELECT account AS a, count(*) FROM postings GROUP BY account",
    "SELECT date, count(*) FROM postings GROUP BY 1",
    "SELECT account, date, count(*) FROM postings GROUP BY 1, 2",
    // Constants are harmless; the engine answers them correctly.
    "SELECT 1, count(*) FROM postings GROUP BY account",
    "SELECT 'x', count(*) FROM postings GROUP BY account",
    // Expressions abstain (deterministic, benign).
    "SELECT length(account), count(*) FROM postings GROUP BY account",
    "SELECT number + 1, count(*) FROM postings GROUP BY number + 1",
    "SELECT first(date), count(*) FROM postings GROUP BY account",
    "SELECT account, sum(position) AS total WHERE account ~ 'Expenses' GROUP BY account",
    // ORDER BY is unchecked; HAVING must name selected groups anyway.
    "SELECT account, count(*) FROM postings GROUP BY account ORDER BY date",
    "SELECT account, count(*) FROM postings GROUP BY account HAVING count(*) > 1",
    // The words inside a string literal or comment are not the clause.
    "SELECT account, count(*) FROM postings WHERE narration = 'GROUP BY date' GROUP BY account",
    "/* GROUP BY date */ SELECT account, count(*) FROM postings GROUP BY account",
    // Nested grouping abstains (multi-level pairing is out of scope).
    "SELECT date FROM (SELECT account, count(*) FROM postings GROUP BY account)",
    "SELECT * FROM (SELECT account, date, count(*) FROM postings GROUP BY account)",
    // No grouping at all.
    "SELECT account, date FROM postings",
  ])("leaves %p alone", (query) => {
    expect(groupByCoverageError(query)).toBeUndefined();
  });
});
