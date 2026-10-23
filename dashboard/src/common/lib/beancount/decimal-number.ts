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

/** The magnitude of a plain decimal from `parseDecimalNumber`. */
export function absDecimalNumber(value: string): string {
  return value.startsWith("-") ? value.slice(1) : value;
}

/** A plain decimal as signed units of `10^-scale` (`-1.5`, 2 → `-150n`). */
function decimalUnits(value: string, scale: number): bigint {
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = (negative ? value.slice(1) : value).split(".");
  const magnitude = BigInt(whole + fraction.padEnd(scale, "0"));
  return negative ? -magnitude : magnitude;
}

/** Signed units of `10^-scale` written as a plain decimal, never `-0`. */
function formatUnits(units: bigint, scale: number): string {
  const negative = units < 0n;
  const digits = (negative ? -units : units)
    .toString()
    .padStart(scale + 1, "0");
  const unsigned =
    scale === 0 ? digits : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
  return negative ? `-${unsigned}` : unsigned;
}

const fractionLength = (value: string) => value.split(".")[1]?.length ?? 0;

/**
 * The exact sum of plain decimals from `parseDecimalNumber`, carrying the
 * widest fractional precision among them (`10.50` + `-4` is `6.50`).
 */
export function sumDecimalNumbers(values: readonly string[]): string {
  const scale = Math.max(0, ...values.map(fractionLength));
  let units = 0n;
  for (const value of values) units += decimalUnits(value, scale);
  return formatUnits(units, scale);
}

/** `value × numerator / denominator`, one term of `sumDecimalFractions`. */
export type DecimalFraction = {
  value: string;
  numerator: number;
  denominator: number;
};

/**
 * The exact sum of `value × numerator / denominator` over plain decimals,
 * rounded once, half away from zero, to `digits` places (written out in
 * full, `1650.00`). It is the one division a daily-equivalent proration
 * needs: 1650 a month over a 28-day February is 1650.00 exactly, not the
 * 1649.999999999999 that adding 28 doubles gives (w4/m55).
 */
export function sumDecimalFractions(
  terms: readonly DecimalFraction[],
  digits: number,
): string {
  let numerator = 0n;
  let denominator = 1n;
  for (const term of terms) {
    const scale = fractionLength(term.value);
    const units = decimalUnits(term.value, scale);
    const termDenominator = 10n ** BigInt(scale) * BigInt(term.denominator);
    numerator =
      numerator * termDenominator +
      units * BigInt(term.numerator) * denominator;
    denominator *= termDenominator;
    const divisor = greatestCommonDivisor(numerator, denominator);
    numerator /= divisor;
    denominator /= divisor;
  }

  const negative = numerator < 0n;
  const scaled = (negative ? -numerator : numerator) * 10n ** BigInt(digits);
  let rounded = scaled / denominator;
  if ((scaled % denominator) * 2n >= denominator) rounded += 1n;
  return formatUnits(negative ? -rounded : rounded, digits);
}

function greatestCommonDivisor(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b;
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
}
