import { sourceSelectHeaders } from "../bql-select-aliases";

describe("sourceSelectHeaders (w23/216)", () => {
  it("returns an unaliased expression's source text verbatim, spacing and case included", () => {
    expect(sourceSelectHeaders("SELECT 1+1")).toEqual(["1+1"]);
    expect(sourceSelectHeaders("SELECT UPPER( payee )")).toEqual([
      "UPPER( payee )",
    ]);
    expect(sourceSelectHeaders("SELECT  year  +  1  FROM postings")).toEqual([
      "year  +  1",
    ]);
    expect(sourceSelectHeaders("SELECT not TRUE")).toEqual(["not TRUE"]);
  });

  it("leaves an aliased item to the engine, which names it by the alias", () => {
    expect(sourceSelectHeaders("SELECT year>2025 AS y")).toEqual([undefined]);
    expect(sourceSelectHeaders("SELECT a AS b, count(*) AS n")).toEqual([
      undefined,
      undefined,
    ]);
  });

  it("leaves a bare column to the engine, which names it canonically", () => {
    expect(sourceSelectHeaders("SELECT Year, PAYEE")).toEqual([
      undefined,
      undefined,
    ]);
  });

  it("treats TRUE, FALSE and NULL as expressions, keeping their spelling", () => {
    expect(sourceSelectHeaders("SELECT TRUE, False, null")).toEqual([
      "TRUE",
      "False",
      "null",
    ]);
  });

  it("returns one entry per item, mixing the three kinds in order", () => {
    expect(
      sourceSelectHeaders("SELECT year, month  =  7, count( * ) AS n, 'x'"),
    ).toEqual([undefined, "month  =  7", undefined, "'x'"]);
  });

  it("does not split on commas inside strings or parentheses", () => {
    expect(sourceSelectHeaders("SELECT 'a,b', f(1, 2), (3, 4)")).toEqual([
      "'a,b'",
      "f(1, 2)",
      "(3, 4)",
    ]);
  });

  it("does not read an AS inside an item's own parentheses as an alias", () => {
    expect(sourceSelectHeaders("SELECT cast(x as y)")).toEqual([
      "cast(x as y)",
    ]);
  });

  it("drops DISTINCT, which is not part of a column's name", () => {
    expect(sourceSelectHeaders("SELECT DISTINCT year>2025")).toEqual([
      "year>2025",
    ]);
    expect(sourceSelectHeaders("SELECT DISTINCT payee")).toEqual([undefined]);
  });

  it("stops the list at the first clause word", () => {
    expect(
      sourceSelectHeaders("SELECT year>1 FROM postings WHERE a, b LIMIT 1"),
    ).toEqual(["year>1"]);
  });

  it("gives up on a wildcard, which changes the column count", () => {
    expect(sourceSelectHeaders("SELECT *")).toBeUndefined();
    expect(sourceSelectHeaders("SELECT year+1, *")).toBeUndefined();
  });

  it("does not mistake the star in count(*) for a wildcard", () => {
    expect(sourceSelectHeaders("SELECT count( * )")).toEqual(["count( * )"]);
  });

  it("gives up on a statement with no SELECT list", () => {
    expect(sourceSelectHeaders("JOURNAL 'Assets:Cash'")).toBeUndefined();
    expect(sourceSelectHeaders("")).toBeUndefined();
  });
});
