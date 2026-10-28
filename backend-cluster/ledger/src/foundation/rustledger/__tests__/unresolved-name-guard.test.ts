import type { QueryResult } from "@rustledger/wasm";
import {
  buildResolutionProbe,
  unresolvedNameError,
} from "../unresolved-name-guard";

/** w23/135: empty input masks unknown names; an OR-TRUE probe unmasks. */
describe("buildResolutionProbe", () => {
  it.each([
    [
      "SELECT nosuchfn(payee) FROM postings WHERE FALSE LIMIT 1",
      "SELECT nosuchfn(payee) FROM postings WHERE (( FALSE )) OR TRUE LIMIT 1",
    ],
    [
      "SELECT payee FROM postings WHERE FALSE",
      "SELECT payee FROM postings WHERE (( FALSE)) OR TRUE LIMIT 1",
    ],
    [
      "SELECT payee FROM postings WHERE a AND b GROUP BY c ORDER BY d LIMIT 2",
      "SELECT payee FROM postings WHERE (( a AND b )) OR TRUE GROUP BY c ORDER BY d LIMIT 2",
    ],
    [
      "SELECT payee FROM postings WHERE FALSE;",
      "SELECT payee FROM postings WHERE (( FALSE)) OR TRUE LIMIT 1",
    ],
    [
      "SELECT * FROM (SELECT payee WHERE FALSE LIMIT 5) WHERE nosuchfn(payee)",
      "SELECT * FROM (SELECT payee WHERE (( FALSE )) OR TRUE LIMIT 5) WHERE (( nosuchfn(payee))) OR TRUE LIMIT 1",
    ],
    [
      "select payee from postings where false",
      "select payee from postings where (( false)) OR TRUE LIMIT 1",
    ],
    [
      "SELECT payee FROM postings WHERE narration = 'where having group'",
      "SELECT payee FROM postings WHERE (( narration = 'where having group')) OR TRUE LIMIT 1",
    ],
    [
      "SELECT payee FROM postings WHERE x /* group by y */ GROUP BY z",
      "SELECT payee FROM postings WHERE (( x /* group by y */ )) OR TRUE GROUP BY z LIMIT 1",
    ],
    [
      "SELECT flag FROM postings WHERE FALSE GROUP BY flag HAVING count(*) > 1",
      "SELECT flag FROM postings WHERE (( FALSE )) OR TRUE GROUP BY flag HAVING count(*) > 1 LIMIT 1",
    ],
  ])("widens %p", (query, expected) => {
    expect(buildResolutionProbe(query)).toBe(expected);
  });

  it.each([
    "SELECT payee FROM postings",
    "SELECT count(*) FROM postings",
    "SELECT flag, count(*) FROM postings GROUP BY flag HAVING count(*) > 1",
    "SELECT 'where'",
  ])("finds no WHERE in %p", (query) => {
    expect(buildResolutionProbe(query)).toBeUndefined();
  });
});

describe("unresolvedNameError", () => {
  const clean = (rows: unknown[][]): QueryResult =>
    ({ columns: ["x"], rows, errors: [] }) as unknown as QueryResult;
  const nameFailure = (message: string): QueryResult =>
    ({
      columns: [],
      rows: [],
      errors: [{ message, severity: "error" }],
    }) as unknown as QueryResult;

  it("adopts a no-function-matches probe failure over clean emptiness", () => {
    const probed = nameFailure('Query execution error: no function matches "nosuchfn"');
    const run = jest.fn((_query: string): QueryResult => probed);
    expect(
      unresolvedNameError(
        "SELECT nosuchfn(payee) FROM postings WHERE FALSE",
        clean([]),
        run,
      ),
    ).toBe(probed);
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls[0]![0]).toContain("OR TRUE");
  });

  it("adopts a not-found probe failure over a masked aggregate row", () => {
    const probed = nameFailure(
      "Query execution error: evaluation error: column 'nosuchcol' not found in subquery result",
    );
    expect(
      unresolvedNameError(
        "SELECT count(nosuchcol) FROM postings WHERE FALSE",
        clean([[0]]),
        () => probed,
      ),
    ).toBe(probed);
  });

  it("keeps the original when the probe succeeds", () => {
    const original = clean([]);
    expect(
      unresolvedNameError(
        "SELECT payee FROM postings WHERE FALSE",
        original,
        () => clean([["Employer"]]),
      ),
    ).toBeUndefined();
  });

  it("keeps the original when the probe fails with a value error", () => {
    const original = clean([]);
    expect(
      unresolvedNameError(
        "SELECT upper(x) FROM postings WHERE FALSE",
        original,
        () => nameFailure("Query execution error: type error: UPPER expects a string"),
      ),
    ).toBeUndefined();
  });

  it("keeps the original when the probe throws", () => {
    const original = clean([]);
    expect(
      unresolvedNameError(
        "SELECT payee FROM postings WHERE FALSE",
        original,
        () => {
          throw new Error("boom");
        },
      ),
    ).toBeUndefined();
  });

  it.each([
    ["multi-row original", "SELECT payee FROM postings", clean([[1], [2]])],
    [
      "single row without aggregates",
      "SELECT payee FROM postings WHERE x LIMIT 1",
      clean([[1]]),
    ],
    ["no WHERE to defeat", "SELECT payee FROM postings", clean([])],
  ])("never probes for %p", (_, query, result) => {
    const run = jest.fn(() => clean([]));
    expect(unresolvedNameError(query, result, run)).toBeUndefined();
    expect(run).not.toHaveBeenCalled();
  });

  it("never probes when the original already errored", () => {
    const run = jest.fn(() => clean([]));
    expect(
      unresolvedNameError(
        "SELECT payee FROM postings WHERE FALSE",
        nameFailure("Query execution error: something"),
        run,
      ),
    ).toBeUndefined();
    expect(run).not.toHaveBeenCalled();
  });
});
