import { dropPostingsFromForWindows } from "../bql-from-windows";

/** w23/139: top-level windows over `FROM postings` drop to the bare form. */
describe("dropPostingsFromForWindows", () => {
  it.each([
    [
      "SELECT row_number() OVER () FROM postings LIMIT 3",
      "SELECT row_number() OVER () LIMIT 3",
    ],
    [
      "SELECT payee, row_number() OVER (ORDER BY payee) FROM postings LIMIT 3",
      "SELECT payee, row_number() OVER (ORDER BY payee) LIMIT 3",
    ],
    [
      "SELECT *, row_number() OVER () FROM postings LIMIT 2",
      "SELECT *, row_number() OVER () LIMIT 2",
    ],
    [
      "SELECT RANK() OVER () FROM POSTINGS LIMIT 2",
      "SELECT RANK() OVER () LIMIT 2",
    ],
    [
      "SELECT dense_rank() OVER () FROM postings;",
      "SELECT dense_rank() OVER ();",
    ],
    [
      "SELECT row_number() OVER () FROM postings WHERE flag = '*'",
      "SELECT row_number() OVER () WHERE flag = '*'",
    ],
    [
      "SELECT row_number() OVER () AS group FROM postings LIMIT 1",
      "SELECT row_number() OVER () AS group LIMIT 1",
    ],
  ])("drops %p", (query, expected) => {
    expect(dropPostingsFromForWindows(query)).toBe(expected);
  });

  it.each([
    "SELECT row_number() OVER () FROM entries LIMIT 3",
    "SELECT row_number() OVER () FROM (SELECT payee FROM postings LIMIT 5)",
    "SELECT row_number() OVER () FROM OPEN ON 2020-01-01 LIMIT 3",
    "SELECT flag, row_number() OVER () FROM postings GROUP BY flag LIMIT 5",
    "SELECT row_number() FROM postings LIMIT 2",
    "SELECT rank(payee) OVER FROM postings LIMIT 2",
    "SELECT payee FROM postings LIMIT 3",
    "SELECT row_number() OVER () LIMIT 3",
    "SELECT sum(number) OVER () FROM postings LIMIT 1",
    "SELECT row_number() OVER () FROM postings AS p LIMIT 2",
    "SELECT row_number() OVER () FROM postings p LIMIT 2",
    'SELECT row_number() OVER () FROM "postings" LIMIT 2',
    "SELECT * FROM (SELECT row_number() OVER () FROM postings)",
    "SELECT 'row_number() OVER () FROM postings' LIMIT 1",
    "SELECT payee AS rank FROM postings LIMIT 1",
  ])("leaves %p alone", (query) => {
    expect(dropPostingsFromForWindows(query)).toBe(query);
  });
});
