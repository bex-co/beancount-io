/**
 * Format a `YYYY-MM-DD` ledger date as a long-form date, pinned to UTC so a
 * statement reads the same regardless of the viewer's time zone. Shared by the
 * Markdown and print statement renderers (parallel to `formatStatementAmount`).
 */
export function formatStatementDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}
