/**
 * Format commodity quote strings for tooltips without cash-style 2dp rounding.
 * Keeps the source decimal text, only stripping redundant trailing zeros —
 * from the mantissa alone, so `2.5e-10` keeps its exponent rather than
 * reading as `2.5e-1` (w4/1003).
 */
export function formatCommodityPriceLabel(raw: string): string {
  const trimmed = raw.trim();
  const [, mantissa, exponent = ""] = /^(.*?)([eE][+-]?\d+)?$/.exec(trimmed)!;
  if (!mantissa.includes(".")) return trimmed;
  return mantissa.replace(/0+$/, "").replace(/\.$/, "") + exponent;
}

/** Past this many places a fixed-point tick is mostly leading zeros. */
const FIXED_AXIS_DECIMALS = 6;

/**
 * The y-axis decimals that keep nearby ticks in a low-price series distinct,
 * while large quotes (e.g. BTC) stay readable at two places.
 */
export function commodityAxisDecimals(values: number[]): number {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return 2;

  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const range = Math.abs(max - min);

  if (range === 0) {
    const abs = Math.abs(min);
    if (abs === 0 || abs >= 1) return 2;
    return Math.max(2, Math.ceil(-Math.log10(abs)) + 1);
  }

  return Math.max(2, Math.ceil(-Math.log10(range / 10)));
}

/**
 * A y-axis tick: fixed-point up to six places. A finer series (1e-9 … 3e-9)
 * would round every fixed tick to 0.000000, so it gets the significant digits
 * those decimals amount to at the series' magnitude instead, which JavaScript
 * writes in exponent form below 1e-6 (w4/1003).
 */
export function formatCommodityAxisTick(
  value: number,
  values: number[],
): string {
  const decimals = commodityAxisDecimals(values);
  if (decimals <= FIXED_AXIS_DECIMALS) return value.toFixed(decimals);
  if (value === 0) return "0";
  const magnitude = Math.max(
    ...values.filter((each) => Number.isFinite(each)).map(Math.abs),
  );
  const digits = decimals + Math.floor(Math.log10(magnitude)) + 1;
  return String(Number(value.toPrecision(Math.min(Math.max(digits, 1), 15))));
}
