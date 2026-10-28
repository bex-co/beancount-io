import { windowFromError } from "../window-from-guard";

/**
 * w23/139: top-level windows the stage cannot rescue refuse with the
 * actual cause instead of the bogus subquery error.
 */
describe("windowFromError", () => {
  it.each([
    [
      "SELECT rank() OVER () FROM entries LIMIT 3",
      "cannot evaluate over FROM entries",
    ],
    [
      "SELECT row_number() OVER () FROM (SELECT payee FROM postings LIMIT 5)",
      "cannot evaluate over a derived table",
    ],
    [
      "SELECT flag, row_number() OVER () FROM postings GROUP BY flag LIMIT 5",
      "not supported with GROUP BY",
    ],
    [
      "SELECT flag, row_number() OVER () GROUP BY flag LIMIT 5",
      "not supported with GROUP BY",
    ],
    [
      "SELECT row_number() OVER () FROM postings LIMIT 3",
      "omit FROM to number postings rows",
    ],
    [
      "SELECT sum(number) OVER () FROM postings LIMIT 1",
      "Window function 'sum' is not implemented",
    ],
    [
      "SELECT sum(number) OVER () FROM entries LIMIT 1",
      "Window function 'sum' is not implemented",
    ],
  ])("refuses %p", (query, marker) => {
    const refused = windowFromError(query);
    expect(refused?.rows).toEqual([]);
    expect(refused?.errors[0]).toMatchObject({
      severity: "error",
      message: expect.stringContaining(marker),
    });
  });

  it.each([
    "SELECT row_number() OVER () LIMIT 3",
    "SELECT sum(number) OVER () LIMIT 1",
    "SELECT row_number() OVER () FROM OPEN ON 2020-01-01 LIMIT 3",
    'SELECT row_number() OVER () FROM "postings" LIMIT 2',
    "SELECT row_number() FROM postings LIMIT 2",
    "SELECT rank(payee) OVER FROM postings LIMIT 2",
    "SELECT payee FROM postings LIMIT 3",
    "SELECT row_number() OVER () FROM postings AS p LIMIT 2",
    "SELECT 'row_number() OVER () FROM entries' LIMIT 1",
    "SELECT payee AS rank FROM postings LIMIT 1",
  ])("leaves %p alone", (query) => {
    expect(windowFromError(query)).toBeUndefined();
  });
});
