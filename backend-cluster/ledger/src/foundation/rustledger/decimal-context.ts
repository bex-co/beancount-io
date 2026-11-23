import BigNumber from "bignumber.js";

const PYTHON_DECIMAL_PRECISION = 28;

// Division needs guard digits before rounding to Python Decimal's 28
// significant-digit context. Ledger prices are ordinary financial magnitudes;
// 128 fractional guard places comfortably covers them while keeping the result
// deterministic and bounded.
const Division = BigNumber.clone({
  DECIMAL_PLACES: 128,
  ROUNDING_MODE: BigNumber.ROUND_HALF_EVEN,
});

/** Decimal places a number was written with: `"1250.50"` -> 2, `"7"` -> 0. */
export function writtenScale(number: string): number {
  const dot = number.indexOf(".");
  return dot < 0 ? 0 : number.length - dot - 1;
}

/** `numerator / denominator` under Python Decimal's default context. */
export function divideWithPythonDecimalContext(
  numerator: BigNumber.Value,
  denominator: BigNumber.Value,
): BigNumber {
  const quotient = new Division(numerator).div(new Division(denominator));
  if (quotient.isZero()) return quotient;
  return quotient.precision(
    PYTHON_DECIMAL_PRECISION,
    BigNumber.ROUND_HALF_EVEN,
  );
}

/**
 * A value rounded the way every Python `Decimal.__add__/__mul__` result is:
 * 28 significant digits, half-even. Values that already fit pass through
 * untouched, so this is an identity everywhere except past beancount's
 * precision — exactly where the engine's own wider division (e.g. a repeating
 * total-cost per-unit) and exact multi-term sums would otherwise erase the
 * dust beancount's intermediate rounding leaves behind.
 */
export function roundWithPythonDecimalContext(value: BigNumber): BigNumber {
  if (value.isZero()) return value;
  return value.precision(PYTHON_DECIMAL_PRECISION, BigNumber.ROUND_HALF_EVEN);
}
