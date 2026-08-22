import { type BcioOptionsPublic } from "@/foundation/fava/Api";

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
export function interpolateFilePath(template: string, date: Date): string {
  const year = date.getFullYear().toString();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const quarter = String(Math.ceil((date.getMonth() + 1) / 3));
  const isoDate = date.toISOString().slice(0, 10);
  return template
    .replace(/\{year\}/g, year)
    .replace(/\{month\}/g, month)
    .replace(/\{quarter\}/g, quarter)
    .replace(/\{date\}/g, isoDate);
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
