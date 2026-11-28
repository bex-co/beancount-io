import { posix } from "path";
import { type BcioOptionsPublic } from "@/foundation/fava/Api";
import { BadUserInputError } from "@/shared/errors";
import { LEDGER_ENTRY_POINT } from "./ledger-entry-point";
import { unsafeRepoPathRule } from "./safe-repo-path";

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

/** A `custom "beancountio-option"` that names the file entries go to. */
type RoutingOption = Extract<keyof BcioOptionsPublic, `${string}_file`>;

/** The option each entry type is routed by ahead of `default_file`. */
const TYPE_OPTION: Record<EntryType, RoutingOption | null> = {
  Transaction: "transaction_file",
  Open: "account_file",
  Close: "account_file",
  Price: "price_file",
  Balance: "balance_file",
  Note: "note_file",
  Pad: "pad_file",
  Document: "document_file",
  Budget: "budget_file",
  Commodity: null,
  Custom: null,
  Event: null,
};

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
 * The repository file an option's interpolated value names. The value is a
 * path from the ledger root, which Beancount reads the way it reads an
 * `include` in the entry point: `./txns/2026.bean` is `txns/2026.bean`. Used
 * as written, the `./` failed the repository path check, which then blamed
 * the call's `paths[0]` although no caller sent a path (w31/152). Normalized
 * here, the existing-file lookup, the include check and the include line all
 * see the file the ledger loads. A value that still leads outside the ledger,
 * or breaks another path rule, is the option's fault, so the refusal names
 * the option and not an argument.
 */
function routedPath(
  option: RoutingOption,
  value: string,
  interpolated: string,
): string {
  const path = interpolated.startsWith("/")
    ? interpolated
    : posix.normalize(
        posix.join(posix.dirname(LEDGER_ENTRY_POINT), interpolated),
      );
  const outside =
    path.startsWith("/") || path === ".." || path.startsWith("../");
  const rule = outside ? "is outside the ledger" : unsafeRepoPathRule(path);
  if (!rule) return path;
  const written = value === path ? "" : ` (${JSON.stringify(value)})`;
  throw new BadUserInputError(
    `The ledger's \`${option}\` option${written} routes this entry to ${JSON.stringify(path)}, which ${rule}`,
    undefined,
    `Fix the ledger's \`custom "beancountio-option" "${option}"\` line so it names a file inside the ledger, as a path from the ledger root, or pass \`path\` on \`appendLedgerText\` to write to a file the ledger already loads.`,
  );
}

/**
 * Resolves the target file path for a given entry type and date, based on
 * the beancountio-option routing configuration.
 *
 * Resolution order: entry-type-specific file → default_file → "main.bean"
 * The resolved path is then interpolated with date-based template variables
 * and normalized to the repository path the ledger loads.
 */
export function resolveEntryFile(
  entryType: EntryType,
  entryDate: Date,
  opts: BcioOptionsPublic,
): string {
  // An option set to the empty string (a valueless `custom
  // "beancountio-option" "transaction_file"` stores `""`, mirroring Python)
  // is unset, not a file named "": fall through at each level so the order
  // above holds.
  const typeOption = TYPE_OPTION[entryType];
  const option =
    typeOption && opts[typeOption]
      ? typeOption
      : opts.default_file
        ? "default_file"
        : null;
  if (!option) return LEDGER_ENTRY_POINT;
  const value = opts[option]!;
  return routedPath(option, value, interpolateFilePath(value, entryDate));
}
