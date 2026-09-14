/**
 * Beancount numbers kept as decimal strings.
 *
 * An amount a person types must reach the ledger as that number. Parsing it
 * into a JavaScript double and serializing it back emits exponent notation
 * (`1e-8`, which Beancount rejects), drops significant digits
 * (`12345678901234567890` becomes `12345678901234567000`), or rounds. These
 * helpers keep the digits as text and do the little arithmetic the entry forms
 * need — negating a posting, summing postings to infer a balancing one —
 * exactly.
 */

const DECIMAL_NUMBER = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/;

/** Exponents beyond this are not amounts anyone typed; reject them. */
const MAX_EXPONENT = 64;

function isZeroDigits(value: string): boolean {
  return /^[0.]*$/.test(value);
}

/**
 * The plain Beancount decimal for a typed number, or `null` when it is not one.
 * Surrounding whitespace, a leading `+`, and redundant leading zeros are
 * dropped; a bare leading `.` gains its zero; an exponent is expanded into
 * digits; a negative zero loses its sign. Fractional digits, including
 * trailing zeros, are kept as typed. Grouping separators, `Infinity`, and
 * `NaN` are rejected.
 */
export function parseDecimalNumber(text: string): string | null {
  const match = DECIMAL_NUMBER.exec(text.trim());
  if (!match) return null;
  const [, sign, whole = "", fraction = "", exponentText] = match;
  if (whole === "" && fraction === "") return null;

  const exponent = exponentText === undefined ? 0 : Number(exponentText);
  if (Math.abs(exponent) > MAX_EXPONENT) return null;

  const digits = whole + fraction;
  const point = whole.length + exponent;
  let integerPart: string;
  let fractionPart: string;
  if (point <= 0) {
    integerPart = "0";
    fractionPart = "0".repeat(-point) + digits;
  } else if (point >= digits.length) {
    integerPart = digits + "0".repeat(point - digits.length);
    fractionPart = "";
  } else {
    integerPart = digits.slice(0, point);
    fractionPart = digits.slice(point);
  }
  integerPart = integerPart.replace(/^0+(?=\d)/, "");

  const unsigned = fractionPart
    ? `${integerPart}.${fractionPart}`
    : integerPart;
  return sign === "-" && !isZeroDigits(unsigned) ? `-${unsigned}` : unsigned;
}

/** True when the text is a decimal number greater than zero. */
export function isPositiveDecimalNumber(text: string): boolean {
  const value = parseDecimalNumber(text);
  return value !== null && !value.startsWith("-") && !isZeroDigits(value);
}

/** The exact negation of a plain decimal from `parseDecimalNumber`. */
export function negateDecimalNumber(value: string): string {
  if (value.startsWith("-")) return value.slice(1);
  return isZeroDigits(value) ? value : `-${value}`;
}

/**
 * The exact sum of plain decimals from `parseDecimalNumber`, carrying the
 * widest fractional precision among them (`10.50` + `-4` is `6.50`).
 */
export function sumDecimalNumbers(values: readonly string[]): string {
  const scale = Math.max(
    0,
    ...values.map((value) => value.split(".")[1]?.length ?? 0),
  );
  let units = 0n;
  for (const value of values) {
    const negative = value.startsWith("-");
    const [whole, fraction = ""] = (negative ? value.slice(1) : value).split(
      ".",
    );
    const magnitude = BigInt(whole + fraction.padEnd(scale, "0"));
    units += negative ? -magnitude : magnitude;
  }

  const negative = units < 0n;
  const digits = (negative ? -units : units)
    .toString()
    .padStart(scale + 1, "0");
  const unsigned =
    scale === 0 ? digits : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
  return negative ? `-${unsigned}` : unsigned;
}
