import { ordinalRangeError } from "../ordinal-range-guard";

describe("ordinalRangeError (w23/187)", () => {
  it.each([
    ["SELECT flag ORDER BY 9223372036854775808 LIMIT 1", "ORDER BY"],
    ["SELECT flag ORDER BY 9223372036854775808 DESC", "ORDER BY"],
    ["SELECT COUNT(*) GROUP BY 99999999999999999999999", "GROUP BY"],
    ["SELECT flag, COUNT(*) GROUP BY flag, 18446744073709551616", "GROUP BY"],
    [
      "SELECT flag, month(date), COUNT(*) GROUP BY 1, 2 PIVOT BY 9223372036854775808, 2",
      "PIVOT BY",
    ],
    // At or past 2^32 the engine traps (`GROUP BY 4294967296` is
    // `unreachable`) or silently mis-answers (`GROUP BY 4294967297`
    // collapses to one group, `ORDER BY 4294967296` sorts nothing), where
    // stock beanquery reports out-of-range loudly — so the guard refuses.
    ["SELECT COUNT(*) GROUP BY 4294967296", "GROUP BY"],
    ["SELECT COUNT(*) GROUP BY 9007199254740992", "GROUP BY"],
    ["SELECT COUNT(*) GROUP BY 0004294967296", "GROUP BY"],
    ["SELECT flag ORDER BY 4294967296", "ORDER BY"],
    ["SELECT flag ORDER BY 9007199254740992 DESC", "ORDER BY"],
    ["SELECT flag ORDER BY 4294967296 LIMIT 5", "ORDER BY"],
    [
      "SELECT flag, month(date), COUNT(*) GROUP BY 1, 2 PIVOT BY 4294967296, 2",
      "PIVOT BY",
    ],
    [
      "SELECT flag, month(date), COUNT(*) GROUP BY 1, 2 PIVOT BY 0, 2",
      "PIVOT BY",
    ],
    [
      "select flag, month(date), count(*) group by 1, 2 pivot by 1, 00",
      "PIVOT BY",
    ],
  ])("refuses %p", (query, clause) => {
    const refused = ordinalRangeError(query);
    expect(refused?.rows).toEqual([]);
    expect(refused?.errors[0]).toMatchObject({
      severity: "error",
      message: expect.stringContaining(`Invalid ${clause} column index`),
    });
  });

  it.each([
    // Below 2^32 and i64::MAX itself the engine reports out-of-range loudly,
    // so they stay the engine's error.
    "SELECT flag ORDER BY 9223372036854775807",
    "SELECT flag ORDER BY 4294967295",
    "SELECT COUNT(*) GROUP BY 2147483648",
    "SELECT flag ORDER BY 1",
    "SELECT flag, COUNT(*) GROUP BY 1 ORDER BY 2 DESC LIMIT 5",
    "SELECT flag, month(date), COUNT(*) GROUP BY 1, 2 PIVOT BY 1, 2",
    // GROUP/ORDER 0 already refuses loudly on the engine; not this guard's job.
    "SELECT flag GROUP BY 0",
    // Numerals outside a key list, inside calls, or in literals are not ordinals.
    "SELECT flag WHERE number > 9223372036854775808",
    "SELECT flag GROUP BY round(number, 99999999999999999999999)",
    "SELECT flag, month(date), COUNT(*) GROUP BY 1, 2 PIVOT BY foo(x, 0), 2",
    "SELECT narration WHERE narration = 'ORDER BY 9223372036854775808'",
    "SELECT flag /* GROUP BY 99999999999999999999999 */ GROUP BY 1",
    // A later clause's numeral is not part of the key list.
    "SELECT flag GROUP BY flag LIMIT 99999999999999999999999",
    "SELECT flag GROUP BY flag ORDER BY flag LIMIT 5",
  ])("leaves %p alone", (query) => {
    expect(ordinalRangeError(query)).toBeUndefined();
  });
});
