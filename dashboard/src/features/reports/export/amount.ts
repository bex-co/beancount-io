import {
  currencyMinorDigits,
  formatNumber,
} from "@/common/lib/format/format-number";

/** Write ISO currencies at minor-unit precision and retain commodity digits. */
export function formatStatementAmount(
  value: string,
  locale: string,
  unit?: string,
): string {
  const decimal = value.trim();
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(decimal);
  if (!match) return decimal;

  if (unit && currencyMinorDigits(unit) !== undefined) {
    const unsigned = decimal.slice(match[1].length);
    const formatted = formatNumber(unsigned, true, locale, unit);
    // A value rounded to zero has no accounting parentheses.
    return match[1] === "-" && formatted !== formatNumber(0, true, locale, unit)
      ? `(${formatted})`
      : formatted;
  }

  const negative =
    match[1] === "-" && !/^0+$/.test(`${match[2]}${match[3] ?? ""}`);
  const integer = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(BigInt(match[2]));
  const decimalSeparator =
    new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
    })
      .formatToParts(1.1)
      .find((part) => part.type === "decimal")?.value ?? ".";
  const digitMap = Array.from({ length: 10 }, (_, digit) =>
    new Intl.NumberFormat(locale, { useGrouping: false }).format(digit),
  );
  const fraction = (match[3] ?? "").padEnd(2, "0");
  const localizedFraction = [...fraction]
    .map((digit) => digitMap[Number(digit)])
    .join("");
  const formatted = `${integer}${decimalSeparator}${localizedFraction}`;
  return negative ? `(${formatted})` : formatted;
}
