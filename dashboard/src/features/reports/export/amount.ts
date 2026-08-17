/** Format an exact decimal without passing it through IEEE-754 arithmetic. */
export function formatStatementAmount(value: string, locale: string): string {
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) return value.trim();

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
