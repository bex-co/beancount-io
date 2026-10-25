import { BadUserInputError } from "@/shared/errors";

/**
 * Report conversion targets shared by the finance reads, mirroring
 * `bea report --conversion`.
 *
 * An explicit value is a currency code, `units` for no conversion, or —
 * where the read honors them — the Fava modes `at_cost`/`at_value`.
 * Omitted, the target is the ledger's single operating currency, else
 * none (each group in its held currency). Anything else is refused,
 * naming what the read supports; the target is safe to interpolate
 * into a quoted BQL leg or forward to the journal endpoint.
 */

/** A commodity code as quoted into BQL or forwarded to Fava. */
const COMMODITY = /^[A-Za-z][A-Za-z0-9._'-]{0,23}$/;

export function resolveConversionTarget(
  conversion: string | undefined,
  operatingCurrencies: string[],
  allowedModes: readonly string[],
): string | null {
  if (conversion === undefined) {
    return operatingCurrencies.length === 1 &&
      COMMODITY.test(operatingCurrencies[0]!)
      ? operatingCurrencies[0]!
      : null;
  }
  if (conversion.toLowerCase() === "units") return null;
  const modes = allowedModes.map((mode) => mode.toLowerCase());
  const modeIndex = modes.indexOf(conversion.toLowerCase());
  if (modeIndex !== -1) return allowedModes[modeIndex]!;
  if (
    !COMMODITY.test(conversion) ||
    /^(at_cost|at_value)$/i.test(conversion)
  ) {
    const nouns = ['a currency code', '"units"', ...allowedModes];
    const choices =
      nouns.length === 2
        ? `${nouns[0]} or ${nouns[1]}`
        : `${nouns.slice(0, -1).join(", ")}, or ${nouns[nouns.length - 1]}`;
    throw new BadUserInputError(
      `Unsupported conversion "${conversion}": pass ${choices}.`,
    );
  }
  return conversion;
}
