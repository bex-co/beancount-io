import { formatFeedDate } from "../../common/date-format";
export type LedgerError = {
  filename?: string | null;
  lineno?: number | null;
  message: string;
};

export function formatErrorLocation(error: LedgerError): string {
  if (!error.filename) return error.message;
  const line = error.lineno != null ? `:${error.lineno}` : "";
  return `${error.filename}${line}`;
}

export function formatShortSha(sha: string, shortSha?: string | null): string {
  return shortSha ?? sha.slice(0, 7);
}

/**
 * The muted line under a commit: its author and, when the commit carries a
 * usable timestamp, the day it was made in the reader's locale. A missing or
 * unparseable date shows the author alone, never "Invalid Date" or 1970.
 */
export function formatCommitAuthorLine(
  name: string,
  date: unknown,
  locale: string,
): string {
  const day = formatFeedDate(date, locale);
  return day ? `${name} · ${day}` : name;
}
