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
function interpolateFilePath(template: string, date: Date): string {
  // A directive date is a UTC midnight, so read it in UTC: local fields put
  // 2026-01-01 in 2025/12 on a server west of UTC. Pad the year so 0099 routes
  // to `0099`, the year its source line names (w4/m38).
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const quarter = String(Math.ceil((date.getUTCMonth() + 1) / 3));
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
  // An option set to the empty string (a valueless `custom
  // "beancountio-option" "transaction_file"` stores `""`, mirroring Python)
  // is unset, not a file named "": fall through at each level so the order
  // above holds.
  const template = typeMap[entryType] || opts.default_file || "main.bean";
  return interpolateFilePath(template, entryDate);
}
