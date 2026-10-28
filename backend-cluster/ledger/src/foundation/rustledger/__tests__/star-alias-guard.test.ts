import { starAliasError } from "../star-alias-guard";

/** w23/127: the engine answers `SELECT * AS x` with mismatched columns/rows. */
describe("starAliasError", () => {
  it.each([
    "SELECT * AS x FROM postings LIMIT 2",
    "select * as x from postings",
    "SELECT  *  AS  x  FROM postings",
    "SELECT DISTINCT * AS x FROM postings",
    "SELECT ALL * AS x FROM postings",
    "SELECT date, * AS x FROM postings",
    "SELECT * FROM (SELECT * AS x FROM postings LIMIT 1)",
    "SELECT * AS x",
  ])("refuses %p", (query) => {
    const refused = starAliasError(query);
    expect(refused?.rows).toEqual([]);
    expect(refused?.errors[0]).toMatchObject({
      severity: "error",
      message: expect.stringContaining("SELECT * AS <alias>"),
    });
  });

  it.each([
    "SELECT * FROM postings LIMIT 2",
    "SELECT DISTINCT * FROM postings",
    "SELECT count(*) FROM postings",
    "SELECT sum(number) AS total FROM postings",
    "SELECT a * b AS x FROM postings",
    "SELECT 2 * 3 AS x FROM postings",
    "SELECT *, date FROM postings",
    // Qualified stars stay with the engine, which already refuses them.
    "SELECT postings.* AS x FROM postings",
    // Table aliases are not star aliases.
    "SELECT * FROM postings AS x LIMIT 1",
    // The words inside a string literal are not the star.
    "SELECT narration WHERE narration = 'select * as x'",
    'SELECT * FROM postings WHERE narration = "a * as b" LIMIT 1',
  ])("leaves %p alone", (query) => {
    expect(starAliasError(query)).toBeUndefined();
  });
});
