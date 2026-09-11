import type { ConversionOption } from "@/common/types/chart";

const KEYWORDS: ReadonlySet<string> = new Set(["at_cost", "at_value", "units"]);

/**
 * Single owner of the presentation-conversion default and fallback: an
 * empty value or a currency outside `operatingCurrencies` resolves to
 * "at_cost" (own currencies). Everything else passes through unchanged.
 */
export function resolvePresentationConversion(
  raw: string,
  operatingCurrencies: readonly string[],
): ConversionOption {
  if (KEYWORDS.has(raw)) return raw as ConversionOption;
  if (raw && operatingCurrencies.includes(raw)) return raw;
  return "at_cost";
}

export function isCurrencyConversion(value: ConversionOption): boolean {
  return !KEYWORDS.has(value);
}

/** "Own currencies" writes an empty value so the URL drops the param. */
export function toWrittenConversion(value: string): string {
  return value === "at_cost" ? "" : value;
}
