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

/**
 * The viewer's local calendar day (`YYYY-MM-DD`) of an ISO instant — the day a
 * statement was generated as its reader sees it — or `null` when it does not
 * parse.
 */
export function localCalendarDate(instant: string): string | null {
  const value = new Date(instant);
  if (Number.isNaN(value.getTime())) return null;
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}
