import { integerOverflowError } from "../integer-overflow-guard";

/** w23/133: past-MAX literals misreport and constant overflow goes NULL. */
describe("integerOverflowError", () => {
  it.each([
    "SELECT * FROM postings LIMIT 4294967296",
    "SELECT * FROM postings LIMIT 4294967297",
    "SELECT * FROM postings LIMIT 9223372036854775807",
    "SELECT * FROM postings LIMIT 9223372036854775808",
    "SELECT * FROM postings LIMIT 79228162514264337593543950336",
    "select * from postings limit 4294967296",
    "SELECT count(*) FROM (SELECT * FROM postings LIMIT 8589934592)",
  ])("refuses %p", (query) => {
    const refused = integerOverflowError(query);
    expect(refused?.rows).toEqual([]);
    expect(refused?.errors[0]).toMatchObject({
      severity: "error",
      message: expect.stringContaining("32-bit page"),
    });
  });

  it.each([
    "SELECT 79228162514264337593543950336",
    "SELECT -79228162514264337593543950336",
    "SELECT - 79228162514264337593543950336",
    "SELECT 00079228162514264337593543950336",
    "SELECT count(*) FROM postings WHERE number = 79228162514264337593543950336",
    "SELECT count(*) FROM postings WHERE number = -79228162514264337593543950336",
    "SELECT 79228162514264337593543950335.5",
    "SELECT 99999999999999999999999999999.5",
  ])("refuses %p", (query) => {
    const refused = integerOverflowError(query);
    expect(refused?.rows).toEqual([]);
    expect(refused?.errors[0]).toMatchObject({
      severity: "error",
      message: expect.stringContaining("79228162514264337593543950335"),
    });
  });

  it.each([
    "SELECT 79228162514264337593543950335 + 1",
    "SELECT 79228162514264337593543950335 + 5 - 5",
    "SELECT 79228162514264337593543950335 + 1 - 1",
    "SELECT 2 * 79228162514264337593543950335",
    "SELECT 79228162514264337593543950335 * 2 - 79228162514264337593543950335",
    "SELECT (79228162514264337593543950335 + 1)",
    "SELECT 79228162514264337593543950335 - -1",
    "SELECT -79228162514264337593543950335 - 1",
  ])("refuses %p", (query) => {
    const refused = integerOverflowError(query);
    expect(refused?.rows).toEqual([]);
    expect(refused?.errors[0]).toMatchObject({
      severity: "error",
      message: expect.stringContaining("overflows the maximum"),
    });
  });

  // w23/160: in-range but unholdable — the engine silently rounds
  // (half-up past MAX's mantissa, to zero past the 28-place scale).
  it.each([
    "SELECT 79228162514264337593543950334.9",
    "SELECT 79228162514264337593543950334.90",
    "SELECT 79228162514264337593543950334.1",
    "SELECT 79228162514264337593543950334.5",
    "SELECT 7922816251426433759354395033.49",
    "SELECT 792281625142643375935439503.49",
    "SELECT -79228162514264337593543950334.9",
    "SELECT 0.00000000000000000000000000001",
    "SELECT 0.123456789012345678901234567890123456789",
    "SELECT 79228162514264337593543950334.90000",
    "SELECT count(*) FROM postings WHERE number = 79228162514264337593543950334.9",
  ])("refuses %p", (query) => {
    const refused = integerOverflowError(query);
    expect(refused?.rows).toEqual([]);
    expect(refused?.errors[0]).toMatchObject({
      severity: "error",
      message: expect.stringContaining("decimal precision"),
    });
  });

  it.each([
    "SELECT 79228162514264337593543950335",
    "SELECT -79228162514264337593543950335",
    "SELECT 79228162514264337593543950335.0",
    "SELECT 79228162514264337593543950335.00",
    // The engine normalizes trailing zeros before the boundary bites.
    "SELECT 7922816251426433759354395033.50",
    "SELECT 1.00000000000000000000000000000",
    "SELECT 0.00000000000000000000000000010",
    // The rule is mantissa-vs-MAX: 29 digits below MAX stay exact.
    "SELECT 7922816251426433759354395033.5",
    "SELECT 192281625142643375935439503.49",
    "SELECT 1.0000000000000000000000000001",
    "SELECT 0.0000000000000000000000000001",
    "SELECT 9007199254740992",
    "SELECT 9223372036854775807",
    "SELECT 5 - 3",
    "SELECT -5",
    "SELECT 2 * 3 + 4",
    "SELECT 5 / 2",
    "SELECT 10 % 3",
    "SELECT 1.5 + 2.5",
    "SELECT 0.5 * 99999999999999999999999999",
    "SELECT * FROM postings LIMIT 5",
    "SELECT * FROM postings LIMIT 2147483647",
    "SELECT * FROM postings LIMIT 4294967295",
    "SELECT * FROM postings LIMIT 0",
    "SELECT * FROM postings LIMIT -5",
    "SELECT * FROM postings LIMIT 2.5",
    "SELECT payee FROM postings WHERE date = 2026-01-01",
    "SELECT '79228162514264337593543950336'",
    'SELECT "79228162514264337593543950336"',
    "SELECT 5 /* 79228162514264337593543950336 */",
    "SELECT col79228162514264337593543950336 FROM postings",
    "SELECT 79228162514264337593543950336col FROM postings",
    "SELECT 1e40",
    "SELECT decimal('9007199254740992')",
    "SELECT int('79228162514264337593543950336')",
  ])("leaves %p alone", (query) => {
    expect(integerOverflowError(query)).toBeUndefined();
  });
});
