import { type BcioOptionsPublic } from "@/foundation/ledger-api-types";

type EntryType =
  | "Transaction"
  | "Open"
  | "Close"
  | "Price"
  | "Balance"
  | "Note"
  | "Pad"
  | "Document"
  | "Budget"
  | "Commodity"
  | "Custom"
  | "Event";

/**
 * Interpolates date-based template variables in a file path template.
 *
 * Supported variables:
 *   {year}    — 4-digit calendar year (e.g. 2025)
 *   {month}   — zero-padded month 01–12 (e.g. 03)
 *   {quarter} — quarter number 1–4 (e.g. 1)
 *   {date}    — full ISO 8601 date (e.g. 2025-03-15)
 */
function interpolateFilePath(template: string, date: Date): string {
  const year = date.getUTCFullYear().toString().padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const quarter = String(Math.ceil((date.getUTCMonth() + 1) / 3));
  const isoDate = date.toISOString().slice(0, 10);
  return template
    .replace(/\{year\}/g, year)
    .replace(/\{month\}/g, month)
    .replace(/\{quarter\}/g, quarter)
    .replace(/\{date\}/g, isoDate);
}

/** Strictly parse a calendar `YYYY-MM-DD`, rejecting Date's normalization. */
export function parseEntryDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Resolves the target file path for a given entry type and date, based on
 * the beancountio-option routing configuration.
 *
 * Resolution order: entry-type-specific file → default_file → "main.bean"
 * The resolved path is then interpolated with date-based template variables.
 */
export function resolveEntryFile(
  entryType: EntryType,
  entryDate: Date,
  opts: BcioOptionsPublic,
): string {
  const typeMap: Record<EntryType, string | null> = {
    Transaction: opts.transaction_file,
    Open: opts.account_file,
    Close: opts.account_file,
    Price: opts.price_file,
    Balance: opts.balance_file,
    Note: opts.note_file,
    Pad: opts.pad_file,
    Document: opts.document_file,
    Budget: opts.budget_file,
    Commodity: null,
    Custom: null,
    Event: null,
  };
  const template = typeMap[entryType] ?? opts.default_file;
  return interpolateFilePath(template, entryDate);
}
