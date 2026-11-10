import {
  MAX_OPERATOR_CHAIN,
  MAX_TOTAL_OPERATORS,
  bqlComplexityRefusal,
  measureBqlComplexity,
} from "../bql-complexity";

/** A query whose longest chain is exactly `operators` long. */
const andChain = (operators: number) =>
  `SELECT 1 WHERE ${Array.from({ length: operators + 1 }, () => "1").join(" AND ")}`;

const chainOf = (count: number, operator = "AND") =>
  `SELECT 1 WHERE 1=1 ${Array.from({ length: count }, () => `${operator} 1=1`).join(" ")}`;

describe("measureBqlComplexity", () => {
  it("counts ordinary queries as well within every limit", () => {
    expect(
      measureBqlComplexity(
        "SELECT account, sum(position) WHERE account ~ 'Assets' AND year = 2024 GROUP BY account ORDER BY account",
      ),
      // `~`, `AND` and `=`: three operators, but no class runs longer than one.
    ).toEqual({ maxChain: 1, maxUnaryRun: 0, totalOperators: 3 });
  });

  it("counts a flat AND chain by its length", () => {
    // The run of 3 `AND`s; the 4 `=` comparisons they join are each their own
    // one-operator run, so they count toward the total only (w1/213).
    expect(measureBqlComplexity(chainOf(3))).toMatchObject({
      maxChain: 3,
      totalOperators: 7,
    });
  });

  // w1/213: a k-term OR of comparisons counted 2k−1 and was refused at about
  // 250 terms, though the engine parses 1,500 of them in milliseconds.
  it("counts an OR list of comparisons by its ORs alone", () => {
    const terms = (n: number) =>
      "SELECT account WHERE " +
      Array.from({ length: n }, (_, i) => `account = 'Expenses:QA${i}'`).join(
        " OR ",
      );
    expect(measureBqlComplexity(terms(300))).toMatchObject({
      maxChain: 299,
      totalOperators: 599,
    });
    expect(bqlComplexityRefusal(terms(300))).toBeUndefined();
    expect(bqlComplexityRefusal(terms(MAX_OPERATOR_CHAIN + 2))).toMatch(
      /use `x IN \(…\)`/,
    );
  });

  it("restarts a tighter run at each looser operator", () => {
    expect(
      measureBqlComplexity("SELECT 1 + 2 + 3 * 4 * 5 + 6 = 7 AND 8 = 9"),
    ).toMatchObject({ maxChain: 3, totalOperators: 8 });
  });

  it("counts consecutive unary operators as a run", () => {
    expect(
      measureBqlComplexity(`SELECT 1 WHERE ${"NOT ".repeat(5)}FALSE`),
    ).toMatchObject({ maxUnaryRun: 5 });
  });

  it("reads a leading sign as unary and a subtraction as binary", () => {
    expect(measureBqlComplexity("SELECT -1")).toMatchObject({
      maxUnaryRun: 1,
      maxChain: 0,
    });
    expect(measureBqlComplexity("SELECT 3 - 1")).toMatchObject({
      maxUnaryRun: 0,
      maxChain: 1,
    });
    expect(measureBqlComplexity("SELECT 1-1-1-1")).toMatchObject({
      maxChain: 3,
    });
  });

  it("treats a date literal's dashes as part of the literal", () => {
    expect(measureBqlComplexity("SELECT 1 WHERE date = 2024-01-01")).toEqual({
      maxChain: 1,
      maxUnaryRun: 0,
      totalOperators: 1,
    });
  });

  it("ignores operators inside a string literal", () => {
    expect(
      measureBqlComplexity(
        "SELECT 1 WHERE narration = ' AND AND AND NOT - + '",
      ),
    ).toEqual({ maxChain: 1, maxUnaryRun: 0, totalOperators: 1 });
  });

  it("does not carry a chain across a parenthesis level or a clause", () => {
    expect(
      measureBqlComplexity(
        "SELECT 1 WHERE (1=1 AND 1=1 AND 1=1) AND (1=1 AND 1=1 AND 1=1)",
      ),
    ).toMatchObject({ maxChain: 2 });
    expect(
      measureBqlComplexity(
        "SELECT 1 WHERE 1=1 AND 1=1 AND 1=1 GROUP BY 1 ORDER BY 1=1 AND 1=1 AND 1=1",
      ),
    ).toMatchObject({ maxChain: 2 });
  });

  it("scores two-character operators once", () => {
    expect(measureBqlComplexity("SELECT 1 WHERE 1 <= 2")).toMatchObject({
      totalOperators: 1,
    });
    expect(measureBqlComplexity("SELECT 'a' || 'b'")).toMatchObject({
      totalOperators: 1,
    });
  });

  it("terminates on an unterminated string literal", () => {
    expect(() =>
      measureBqlComplexity("SELECT 1 WHERE narration = 'oops"),
    ).not.toThrow();
  });
});

describe("bqlComplexityRefusal", () => {
  it("accepts a chain exactly at the limit", () => {
    const atLimit = andChain(MAX_OPERATOR_CHAIN);
    expect(measureBqlComplexity(atLimit).maxChain).toBe(MAX_OPERATOR_CHAIN);
    expect(bqlComplexityRefusal(atLimit)).toBeUndefined();
  });

  it("refuses the first chain past the limit", () => {
    const overLimit = andChain(MAX_OPERATOR_CHAIN + 1);
    expect(bqlComplexityRefusal(overLimit)).toContain(
      String(MAX_OPERATOR_CHAIN + 1),
    );
  });

  it("refuses a chain over the limit, naming the limit", () => {
    expect(bqlComplexityRefusal(chainOf(MAX_OPERATOR_CHAIN))).toBeUndefined();
    const refusal = bqlComplexityRefusal(chainOf(MAX_OPERATOR_CHAIN + 1));
    expect(refusal).toContain(String(MAX_OPERATOR_CHAIN));
    expect(refusal).toMatch(/chains \d+ operators/);
  });

  it("refuses a long unary run", () => {
    expect(
      bqlComplexityRefusal(
        `SELECT 1 WHERE ${"NOT ".repeat(MAX_OPERATOR_CHAIN + 1)}FALSE`,
      ),
    ).toMatch(/consecutive unary operators/);
  });

  it("refuses an operator total spread across many short clauses", () => {
    const clause = " WHERE 1=1 AND 1=1";
    const query = `SELECT 1${clause.repeat(MAX_TOTAL_OPERATORS)}`;
    expect(measureBqlComplexity(query).maxChain).toBeLessThanOrEqual(
      MAX_OPERATOR_CHAIN,
    );
    expect(bqlComplexityRefusal(query)).toMatch(/operators, over the limit/);
  });

  it("accepts the ordinary queries the shell actually runs", () => {
    for (const query of [
      "SELECT date, narration, position WHERE account ~ 'Expenses' ORDER BY date DESC LIMIT 50",
      "SELECT account, sum(position) AS total FROM year = 2024 WHERE NOT account ~ 'Equity' GROUP BY account",
      "BALANCES FROM close ON 2024-12-31 WHERE account ~ 'Assets|Liabilities'",
      "SELECT sum(number) WHERE currency = 'USD' AND (date >= 2024-01-01 AND date <= 2024-12-31)",
    ]) {
      expect(bqlComplexityRefusal(query)).toBeUndefined();
    }
  });
});
