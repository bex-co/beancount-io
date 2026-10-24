/**
 * Ledger amounts kept as decimal strings, and the little exact arithmetic the
 * budget figures need. A double holds about 15 significant digits: the
 * ledger's 9007199254740993 USD reads 9007199254740992, so a target one
 * dollar above its actual compared as met (w4/1039). The dashboard keeps the
 * same rules in its own module; packages do not import each other.
 *
 * Imports stay out, so the jest-lite runner can exercise this directly.
 */

const DECIMAL_NUMBER = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/;

/** Exponents beyond this are not ledger amounts; reject them. */
const MAX_EXPONENT = 64;

function isZeroDigits(value: string): boolean {
  return /^[0.]*$/.test(value);
}

/**
 * The plain decimal for `text`, or `null` when it is not a number. A leading
 * `+` and redundant leading zeros go, a bare leading `.` gains its zero, an
 * exponent is written out in digits and a negative zero loses its sign.
 * Fraction digits, trailing zeros included, are kept as written.
 */
export function parseDecimal(text: string): string | null {
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

/** A finite number as a plain decimal, for figures that only exist as one. */
export function decimalOf(value: number): string {
  return (Number.isFinite(value) && parseDecimal(String(value))) || "0";
}

/** True for any spelling of zero from `parseDecimal`. */
export function isZeroDecimal(value: string): boolean {
  return isZeroDigits(value.replace(/^-/, ""));
}

/** The exact negation of a plain decimal. */
export function negateDecimal(value: string): string {
  if (value.startsWith("-")) return value.slice(1);
  return isZeroDigits(value) ? value : `-${value}`;
}

/** The magnitude of a plain decimal. */
export function absDecimal(value: string): string {
  return value.startsWith("-") ? value.slice(1) : value;
}

const fractionLength = (value: string) => value.split(".")[1]?.length ?? 0;

/** A plain decimal as signed units of `10^-scale` (`-1.5`, 2 → `-150n`). */
function decimalUnits(value: string, scale: number): bigint {
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = (negative ? value.slice(1) : value).split(".");
  const magnitude = BigInt(whole + fraction.padEnd(scale, "0"));
  return negative ? -magnitude : magnitude;
}

/** Signed units of `10^-scale` written as a plain decimal, never `-0`. */
function formatDecimalUnits(units: bigint, scale: number): string {
  const negative = units < 0n;
  const digits = (negative ? -units : units)
    .toString()
    .padStart(scale + 1, "0");
  const unsigned =
    scale === 0 ? digits : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
  return negative ? `-${unsigned}` : unsigned;
}

/**
 * The exact sum of plain decimals, at the widest fraction among them
 * (`10.50` + `-4` is `6.50`).
 */
export function sumDecimals(values: readonly string[]): string {
  const scale = Math.max(0, ...values.map(fractionLength));
  let units = 0n;
  for (const value of values) units += decimalUnits(value, scale);
  return formatDecimalUnits(units, scale);
}

/** -1, 0 or 1 as `a` is below, equal to or above `b`. */
export function compareDecimals(a: string, b: string): -1 | 0 | 1 {
  const difference = sumDecimals([a, negateDecimal(b)]);
  if (isZeroDecimal(difference)) return 0;
  return difference.startsWith("-") ? -1 : 1;
}

/** Units of `10^-digits`, rounded half away from zero. */
function roundedUnits(numerator: bigint, denominator: bigint, digits: number) {
  const negative = numerator < 0n;
  const scaled = (negative ? -numerator : numerator) * 10n ** BigInt(digits);
  let rounded = scaled / denominator;
  if ((scaled % denominator) * 2n >= denominator) rounded += 1n;
  return negative ? -rounded : rounded;
}

/** `value` rounded half away from zero to exactly `digits` places. */
export function roundDecimal(value: string, digits: number): string {
  const scale = fractionLength(value);
  return formatDecimalUnits(
    roundedUnits(decimalUnits(value, scale), 10n ** BigInt(scale), digits),
    digits,
  );
}

/** `value × numerator / denominator`, one term of `sumDecimalFractions`. */
export type DecimalFraction = {
  value: string;
  numerator: number;
  denominator: number;
};

/**
 * The exact sum of `value × numerator / denominator` over plain decimals,
 * rounded once, half away from zero, to `digits` places. It is the one
 * division a daily-equivalent proration needs: 1650 a month over a 28-day
 * February is 1650.00 exactly, not the sum of 28 doubles.
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
  return formatDecimalUnits(
    roundedUnits(numerator, denominator, digits),
    digits,
  );
}

function greatestCommonDivisor(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b;
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
}
