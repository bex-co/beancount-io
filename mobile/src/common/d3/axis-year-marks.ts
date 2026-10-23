import { localizeDigits } from "../date-format";

/**
 * Month labels with a short year where the year changes: "OCT 25 … DEC JAN 26
 * … OCT". A bar chart that spans more than a year labels its columns by month
 * alone, so a 12-month window showed two "OCT" columns and an ALL range
 * repeated every month (w21/497). The first column and each column whose year
 * differs from the one before carry the year; a range within one year, and a
 * label that is already a year, stay as they are. `dates` are the columns'
 * own dates (any `YYYY-…` text), aligned with `labels`.
 */
export function withYearMarks(
  labels: readonly string[],
  dates: readonly string[],
  locale = "en",
): string[] {
  const years = dates.map((date) => date.slice(0, 4));
  if (new Set(years).size < 2) return [...labels];
  return labels.map((label, index) => {
    if (/^\d{4}$/.test(label)) return label;
    const year = years[index];
    if (year === undefined || !/^\d{4}$/.test(year)) return label;
    return index === 0 || year !== years[index - 1]
      ? `${label} ${localizeDigits(year.slice(2), locale)}`
      : label;
  });
}
