export const shortNumber = (number: number | string): string => {
  // Convert string to number if needed
  const num = typeof number === "string" ? parseFloat(number) : number;

  // Handle invalid numbers
  if (isNaN(num)) {
    return number.toString();
  }

  // Handle negative numbers
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  if (absNum < 1000) {
    return num.toFixed(1);
  }

  const suffixes = [
    { value: 1e3, symbol: "K" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "B" },
    { value: 1e12, symbol: "T" },
    { value: 1e15, symbol: "Q" },
  ];

  for (let i = suffixes.length - 1; i >= 0; i--) {
    const { value, symbol } = suffixes[i];
    if (absNum >= value) {
      const shortNum = absNum / value;
      // If the result is a whole number, don't show decimal
      if (shortNum === Math.floor(shortNum)) {
        return (isNegative ? "-" : "") + shortNum.toString() + symbol;
      }
      // Otherwise show one decimal place
      return (isNegative ? "-" : "") + shortNum.toFixed(1) + symbol;
    }
  }

  return num.toFixed(1);
};

/**
 * Group the integer part of a number with thousands separators and keep two
 * decimals (e.g. 1234.5 → "1,234.50"). Always non-negative — the sign is the
 * caller's concern. Hermes-safe (no `toLocaleString` reliance).
 */
export const groupThousands = (value: number): string => {
  const safe = Number.isFinite(value) ? Math.abs(value) : 0;
  const [intPart, decimals] = safe.toFixed(2).split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${grouped}.${decimals}`;
};

/**
 * A signed money string with a currency symbol, e.g. "-$1,234.50" or "$0.00".
 * Pass `includePlus` to prefix a "+" on non-negative amounts (e.g. "+$1,234.50")
 * for gain/loss deltas.
 */
export const formatSignedMoney = (
  value: number,
  symbol: string,
  includePlus = false,
): string => {
  const normalized = Number.isFinite(value) ? value : 0;
  const sign = normalized < 0 ? "-" : includePlus ? "+" : "";
  return `${sign}${symbol}${groupThousands(normalized)}`;
};
