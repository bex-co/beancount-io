import type { DirectiveJson } from "@rustledger/wasm";
import type { FavaOptionsPublic } from "@/foundation/ledger-api-types";

/**
 * Fava's ledger options, parsed from `Custom` directives — a port of fava-slim's
 * `fava/core/fava_options.py` (`FavaOptions` + `parse_options`) for the
 * rustledger snapshot, mapped to the `FavaOptionsPublic` DTO the
 * `getLedgerFavaOptions` endpoint returns (`reports.py` -> `ledger.fava_options`).
 *
 * Options are declared in the ledger source as::
 *
 *   2016-04-01 custom "fava-option" "currency-column" "80"
 *
 * The custom `type` MUST be exactly `"fava-option"` — any other custom directive
 * (`beancountio-option`, `budget`, …) is ignored. The first positional value is
 * the option key (hyphens normalized to underscores), the second its value.
 *
 * Matching Python exactly (`parse_option_custom_entry`):
 *   - `key = str(entry.values[0].value).replace("-", "_")`.
 *   - Unknown keys raise `UnknownOptionError`; `parse_options` catches it and
 *     records an error. The endpoint returns only the options, so the field stays
 *     at its default and the error is dropped.
 *   - A missing second value yields the empty string `""`
 *     (`entry.values[1].value if len(entry.values) > 1 else ""`).
 *   - A non-string second value (number/amount/date/…) raises
 *     `NotAStringOptionError` -> the field keeps its default.
 *   - Duplicate keys: last one wins (sequential `setattr`).
 *   - A `fava-option` custom with no positional values raises
 *     `MissingOptionError` -> no option is set.
 *
 * Per-type coercion mirrors `parse_option_custom_entry`:
 *   - BOOL_OPTS: `value.lower() == "true"`.
 *   - INT_OPTS: `int(value)`; a value that is not a valid Python `int` literal
 *     raises `ValueError` -> field kept at default.
 *   - TUPLE_OPTS (`conversion_currencies`): `tuple(value.strip().split(" "))`.
 *   - STR_OPTS: assigned as-is.
 *   - `fiscal_year_end`: `parse_fye_string` (`MM-DD`); an invalid value raises
 *     `InvalidFiscalYearEndOptionError` -> default `12-31` kept.
 *   - `language`/`locale`: assigned as-is (fava-slim's `set_language`/`set_locale`
 *     perform no validation despite the unused validation error classes).
 *   - `collapse_pattern`: appended; the endpoint returns the raw pattern strings.
 *
 * NOTE ON NON-PUBLIC KEYS: `FavaOptions` also defines valid keys that
 * `FavaOptionsPublic` does not expose (`default_file`, `default_file`,
 * `import_config`, `import_dirs`, `insert_entry`). They are valid keys but never
 * surface in the returned DTO, so parsing them here is a no-op for the output;
 * see {@link parseFavaOptions} for the residual-behavior note.
 */

const FAVA_CUSTOM_TYPE = "fava-option";

/** Fava's default `FiscalYearEnd` (`END_OF_YEAR = FiscalYearEnd(12, 31)`). */
const DEFAULT_FISCAL_YEAR_END = { month: 12, day: 31 } as const;

/** Boolean option keys (`BOOL_OPTS`) that appear in `FavaOptionsPublic`. */
const BOOL_KEYS = [
  "account_journal_include_children",
  "auto_reload",
  "invert_income_liabilities_equity",
  "show_accounts_with_zero_balance",
  "show_accounts_with_zero_transactions",
  "show_closed_accounts",
  "use_external_editor",
] as const;

type BoolKey = (typeof BOOL_KEYS)[number];

/** Integer option keys (`INT_OPTS`) that appear in `FavaOptionsPublic`. */
const INT_KEYS = [
  "currency_column",
  "indent",
  "sidebar_show_queries",
  "upcoming_events",
  "uptodate_indicator_grey_lookback_days",
] as const;

type IntKey = (typeof INT_KEYS)[number];

/** String option keys (`STR_OPTS`) that appear in `FavaOptionsPublic`. */
const STR_KEYS = ["default_page", "unrealized"] as const;

type StrKey = (typeof STR_KEYS)[number];

const BOOL_KEY_SET: ReadonlySet<string> = new Set(BOOL_KEYS);
const INT_KEY_SET: ReadonlySet<string> = new Set(INT_KEYS);
const STR_KEY_SET: ReadonlySet<string> = new Set(STR_KEYS);

/** `MM-DD` matcher for `parse_fye_string`. */
const FYE_RE = /^(\d{2})-(\d{2})$/;

/**
 * Render a `FiscalYearEnd` back to the `MM-DD` string the date/time filter
 * ({@link "./directive-filter".FilterOptions.fiscalYearEnd}) consumes — so a
 * ledger's `custom "fava-option" "fiscal-year-end" "06-30"` actually reaches
 * `time`/`fyXXXX` parsing instead of silently defaulting to `12-31`. Round-trips
 * through the same `MM-DD` convention `parse_fye_string` uses on both ends.
 */
export function formatFiscalYearEnd(fye: {
  month: number;
  day: number;
}): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${pad(fye.month)}-${pad(fye.day)}`;
}

/** Fresh copy of Fava's default `FavaOptions`, projected onto `FavaOptionsPublic`. */
function defaultFavaOptions(): FavaOptionsPublic {
  return {
    account_journal_include_children: true,
    auto_reload: false,
    collapse_pattern: [],
    conversion_currencies: [],
    currency_column: 61,
    default_page: "income_statement/",
    fiscal_year_end: { ...DEFAULT_FISCAL_YEAR_END },
    indent: 2,
    invert_income_liabilities_equity: false,
    language: null,
    locale: null,
    show_accounts_with_zero_balance: true,
    show_accounts_with_zero_transactions: true,
    show_closed_accounts: false,
    sidebar_show_queries: 5,
    unrealized: "Unrealized",
    upcoming_events: 7,
    uptodate_indicator_grey_lookback_days: 60,
    use_external_editor: false,
  };
}

/**
 * Port of `int(value)` for the subset of literals Beancount/Python accepts here.
 * Python's `int(str)` accepts an optional sign, surrounding whitespace, and
 * (since 3.6) single underscores between digits; anything else raises
 * `ValueError`. Returns `null` when Python would raise, so the caller keeps the
 * field at its default (mirroring `parse_options` swallowing the `ValueError`).
 */
function parsePythonInt(value: string): number | null {
  const trimmed = value.trim();
  // Python: leading `+`/`-`, decimal digits, optional single `_` separators
  // (never leading/trailing/doubled). No decimal point, no exponent.
  if (!/^[+-]?\d+(?:_\d+)*$/.test(trimmed)) return null;
  const parsed = Number(trimmed.replace(/_/g, ""));
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * Port of `parse_fye_string` (`fava/util/date.py`): a `MM-DD` string is valid
 * iff `datetime.date(2001, (month - 1) % 12 + 1, day)` is a real date. Returns
 * the `{ month, day }` (the *raw* month, as stored on `FiscalYearEnd`) or `null`.
 */
function parseFiscalYearEnd(
  value: string,
): { month: number; day: number } | null {
  const match = FYE_RE.exec(value);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  // `datetime.date(2001, (month - 1) % 12 + 1, day)` — validate the day against
  // the normalized month-of-year in the (non-leap) year 2001.
  const monthOfYear = ((((month - 1) % 12) + 12) % 12) + 1;
  const daysInMonth = new Date(Date.UTC(2001, monthOfYear, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return null;
  return { month, day };
}

/**
 * Parse Fava's ledger options out of a parsed rustledger snapshot. Scans every
 * `Custom` directive whose type is `"fava-option"` and produces the
 * `FavaOptionsPublic` DTO the `getLedgerFavaOptions` endpoint returns.
 *
 * @param directives - The full directive list from a rustledger parse
 *   (`getDirectives()` / `parseLedgerFiles(...).directives`). Non-custom and
 *   non-fava directives are ignored.
 *
 * Residual behavior vs. Python: `parse_options` collects `OptionError`s (unknown
 * key, non-string value, bad int, bad regex, bad FYE) that the
 * `getLedgerFavaOptions` endpoint discards — it only returns the options. This
 * function likewise drops those errors and leaves each affected field at its
 * default. Valid-but-non-public keys (`default_file`, `import_config`,
 * `import_dirs`, `insert_entry`) never appear in `FavaOptionsPublic`, so they are
 * accepted as known keys (no error) but have no effect on the output.
 */
export function parseFavaOptions(
  directives: DirectiveJson[],
): FavaOptionsPublic {
  const options = defaultFavaOptions();

  directives.forEach((directive) => {
    if (directive.type !== "custom") return;
    if (directive.custom_type !== FAVA_CUSTOM_TYPE) return;

    const values = directive.values ?? [];
    // Python: `if not entry.values: raise MissingOptionError` — a fava custom
    // with no positional values is an error, so no option is set.
    if (values.length === 0) return;

    // Python: `str(entry.values[0].value).replace("-", "_")`.
    const key = String(values[0].value).replace(/-/g, "_");

    // Python: `entry.values[1].value if len(entry.values) > 1 else ""`.
    const rawValue = values.length > 1 ? values[1].value : "";
    // Python: `if not isinstance(value, str): raise NotAStringOptionError`.
    if (typeof rawValue !== "string") return;

    if (key === "collapse_pattern") {
      // Python compiles the regex then appends its source; the endpoint returns
      // the raw pattern strings (`[p.pattern for p in ...]`). An invalid regex
      // raises in Python; we only need the string, so store it as-is.
      options.collapse_pattern.push(rawValue);
      return;
    }

    if (key === "fiscal_year_end") {
      const fye = parseFiscalYearEnd(rawValue);
      // Invalid -> Python raises InvalidFiscalYearEndOptionError; keep default.
      if (fye) options.fiscal_year_end = fye;
      return;
    }

    if (key === "language") {
      options.language = rawValue;
      return;
    }

    if (key === "locale") {
      options.locale = rawValue;
      return;
    }

    if (key === "conversion_currencies") {
      // Python (TUPLE_OPTS): `tuple(value.strip().split(" "))`.
      options.conversion_currencies = rawValue.trim().split(" ");
      return;
    }

    if (STR_KEY_SET.has(key)) {
      options[key as StrKey] = rawValue;
      return;
    }

    if (BOOL_KEY_SET.has(key)) {
      // Python (BOOL_OPTS): `value.lower() == "true"`.
      options[key as BoolKey] = rawValue.toLowerCase() === "true";
      return;
    }

    if (INT_KEY_SET.has(key)) {
      // Python (INT_OPTS): `int(value)`; a ValueError keeps the default.
      const parsed = parsePythonInt(rawValue);
      if (parsed !== null) options[key as IntKey] = parsed;
      return;
    }

    // Any remaining key is either a valid-but-non-public FavaOption
    // (`default_file`, `import_config`, `import_dirs`, `insert_entry`) or an
    // unknown key (Python: UnknownOptionError). Neither affects the returned
    // public DTO, so this is a no-op.
  });

  return options;
}
