import type { BeancountOptionsPublic } from "@/foundation/ledger-api-types";
import { DEFAULT_CLAMP_ACCOUNTS, type ClampAccountOptions } from "./time-clamp";

/**
 * A faithful port of the subset of Beancount's option handling that backs
 * fava-slim's `getLedgerOptions` endpoint (`BeancountOptionsPublic`).
 *
 * The rustledger WASM only surfaces `title` and `operating_currencies` (see
 * `engine.ts` / `getOptions`); the remaining public options
 * (`name_assets`/`name_liabilities`/`name_equity`/`name_income`/`name_expenses`,
 * `account_current_conversions`, `account_current_earnings`, `render_commas`)
 * are NOT exposed by the parsed directive stream. Beancount also does not model
 * `option` directives as first-class entries — they are consumed by the parser
 * and only reflected in the resulting `options` map. So to recover any explicit
 * overrides we scan the raw source text for `option "<name>" "<value>"` lines,
 * replicating Beancount's own lexer/validator semantics, and fall back to the
 * platform defaults (which are Beancount's defaults with fava-slim's
 * `render_commas -> true` override, see
 * `fava/beans/beancount_defaults.py::apply_platform_option_defaults`).
 *
 * `title` and `operating_currency` are taken directly from the WASM-parsed
 * values (`input.title` / `input.operatingCurrencies`) since the engine already
 * resolves those correctly, including `option` overrides and multiple
 * `operating_currency` directives.
 */

/**
 * Platform default values (Beancount's `OPTIONS_DEFAULTS` plus fava-slim's
 * `render_commas -> true` override). Only the fields consumed by
 * `BeancountOptionsPublic` are listed.
 */
const DEFAULTS = {
  title: "Beancount",
  name_assets: "Assets",
  name_liabilities: "Liabilities",
  name_equity: "Equity",
  name_income: "Income",
  name_expenses: "Expenses",
  account_current_conversions: "Conversions:Current",
  account_current_earnings: "Earnings:Current",
  render_commas: true,
} as const;

/**
 * Root-account name validator — mirrors Beancount's
 * `account.ACC_COMP_TYPE_RE` (`[\p{Lu}][\p{L}\p{Nd}\-]*`) applied via
 * `is_valid_root` (a full match). Used for the `name_*` options.
 */
const ROOT_ACCOUNT_RE = /^[\p{Lu}][\p{L}\p{Nd}-]*$/u;

/**
 * Leaf/component-name validator — mirrors Beancount's
 * `account.ACC_COMP_NAME_RE` (`[\p{Lu}\p{Nd}][\p{L}\p{Nd}\-]*`). `is_valid_leaf`
 * splits on ":" and requires every component to match. Used for the
 * `account_current_*` options.
 */
const LEAF_COMPONENT_RE = /^[\p{Lu}\p{Nd}][\p{L}\p{Nd}-]*$/u;

/** `is_valid_root(value)` from `beancount.core.account`. */
function isValidRootAccount(value: string): boolean {
  return ROOT_ACCOUNT_RE.test(value);
}

/** `is_valid_leaf(value)` from `beancount.core.account`. */
function isValidLeafAccount(value: string): boolean {
  const parts = value.split(":");
  return parts.every((part) => LEAF_COMPONENT_RE.test(part));
}

/**
 * `options_validate_boolean(value)` from `beancount.parser.options`:
 * `value.lower() in ("1", "true", "yes")`.
 */
function parseBoolean(value: string): boolean {
  return (
    value.toLowerCase() === "1" ||
    value.toLowerCase() === "true" ||
    value.toLowerCase() === "yes"
  );
}

/**
 * Decode Beancount's string-literal escapes as its C lexer does: the recognized
 * escapes `\n \t \r \\ \"` map to their control/literal characters; any other
 * `\<char>` sequence drops the backslash and keeps the following character
 * (verified empirically: `\x41` -> `x41`, `\q` -> `q`).
 */
function decodeStringLiteral(raw: string): string {
  let out = "";
  let escaped = false;
  for (const ch of raw) {
    if (escaped) {
      if (ch === "n") out += "\n";
      else if (ch === "t") out += "\t";
      else if (ch === "r") out += "\r";
      else out += ch;
      escaped = false;
    } else if (ch === "\\") {
      escaped = true;
    } else {
      out += ch;
    }
  }
  // A trailing lone backslash is not reachable for a well-formed quoted literal
  // (the closing quote would have terminated it); drop it defensively.
  return out;
}

/**
 * Match one `option "<name>" "<value>"` directive per source line and return
 * the decoded (name, value) pairs, in source order.
 *
 * Matches Beancount's *effective* behaviour (verified empirically):
 * - Leading whitespace is tolerated: an indented `option` line still applies
 *   its value (it emits a non-fatal parse error, but the resulting `options`
 *   map — which is what the endpoint reads — reflects the value), so we allow
 *   optional leading whitespace rather than anchoring to column 0.
 * - Whitespace between the keyword and the two string literals is optional
 *   (`option"title""T"` is accepted just like `option "title" "T"`).
 * - A `;`-prefixed line is a comment and skipped (it won't match here).
 * - Trailing non-comment content after the value invalidates the directive
 *   (`option "title" "T" extra` is NOT applied), so only trailing whitespace
 *   and an optional `;` comment are permitted.
 * Both string literals are double-quoted; embedded quotes must be escaped
 * (`\"`), so each value capture stops at the first unescaped quote.
 */
export const OPTION_LINE_RE =
  /^[ \t]*option[ \t]*"((?:[^"\\]|\\.)*)"[ \t]*"((?:[^"\\]|\\.)*)"[ \t]*(?:;.*)?$/;

interface ParsedOption {
  name: string;
  value: string;
}

function scanOptions(source: string): ParsedOption[] {
  const results: ParsedOption[] = [];
  source.split(/\r\n|\r|\n/u).forEach((line) => {
    const match = OPTION_LINE_RE.exec(line);
    if (!match) return;
    results.push({
      name: decodeStringLiteral(match[1]),
      value: decodeStringLiteral(match[2]),
    });
  });
  return results;
}

export interface DeriveBeancountOptionsInput {
  /** Ledger title as resolved by the WASM engine (`null` when unset). */
  title: string | null;
  /** Operating currencies as resolved by the WASM engine (in source order). */
  operatingCurrencies: string[];
  /**
   * Raw ledger source text. When provided it is scanned for `option` directives
   * to recover overrides the WASM does not surface (`name_*`,
   * `account_current_*`, `render_commas`). When omitted, platform defaults are
   * used for those fields.
   */
  source?: string;
}

/**
 * Derive the public `BeancountOptions` DTO for `getLedgerOptions`.
 *
 * Matches fava-slim/Beancount exactly for the common case: default values,
 * plus any valid `option` override present in the source. Invalid overrides are
 * ignored (falling back to the default) exactly as Beancount does — an invalid
 * account name for a `name_*`/`account_current_*` option produces a load error
 * and leaves the default in place.
 */
export function deriveBeancountOptions(
  input: DeriveBeancountOptionsInput,
): BeancountOptionsPublic {
  const result: BeancountOptionsPublic = {
    title: input.title ?? DEFAULTS.title,
    name_assets: DEFAULTS.name_assets,
    name_liabilities: DEFAULTS.name_liabilities,
    name_equity: DEFAULTS.name_equity,
    name_income: DEFAULTS.name_income,
    name_expenses: DEFAULTS.name_expenses,
    account_current_conversions: DEFAULTS.account_current_conversions,
    account_current_earnings: DEFAULTS.account_current_earnings,
    render_commas: DEFAULTS.render_commas,
    operating_currency: [...input.operatingCurrencies],
  };

  if (input.source === undefined) return result;

  // Setters keyed by option name, each strongly typed to the target field.
  // A root-account setter validates with `is_valid_root`; a leaf setter with
  // `is_valid_leaf`; both leave the default in place on an invalid value
  // (matching Beancount, which emits a load error and keeps the default).
  const setRoot =
    (
      field:
        | "name_assets"
        | "name_liabilities"
        | "name_equity"
        | "name_income"
        | "name_expenses",
    ) =>
    (value: string): void => {
      if (isValidRootAccount(value)) result[field] = value;
    };
  const setLeaf =
    (field: "account_current_conversions" | "account_current_earnings") =>
    (value: string): void => {
      if (isValidLeafAccount(value)) result[field] = value;
    };

  const setters: Record<string, (value: string) => void> = {
    name_assets: setRoot("name_assets"),
    name_liabilities: setRoot("name_liabilities"),
    name_equity: setRoot("name_equity"),
    name_income: setRoot("name_income"),
    name_expenses: setRoot("name_expenses"),
    account_current_conversions: setLeaf("account_current_conversions"),
    account_current_earnings: setLeaf("account_current_earnings"),
    render_commas: (value: string): void => {
      result.render_commas = parseBoolean(value);
    },
  };

  // Later `option` directives win over earlier ones (Beancount applies them in
  // source order), so we do not stop at the first match.
  scanOptions(input.source).forEach(({ name, value }) => {
    if (Object.hasOwn(setters, name)) setters[name](value);
  });

  return result;
}

/** The report/root account names a ledger's `option` directives resolve to. */
export interface ReportAccounts {
  /**
   * The five `name_*` root-account names, for selecting which postings a report
   * sums (`Assets`/`Liabilities`/`Equity`/`Income`/`Expenses` by default, but
   * e.g. `option "name_assets" "Actif"` renames the assets root).
   */
  roots: {
    assets: string;
    liabilities: string;
    equity: string;
    income: string;
    expenses: string;
  };
  /**
   * The clamp account names {@link ClampAccountOptions} the `time`-filter
   * summarization needs — the income-statement predicate roots plus the
   * synthetic opening-balance / retained-earnings / conversion targets, which
   * are `<name_equity>:<leaf>`.
   */
  clamp: ClampAccountOptions;
}

/**
 * Resolve a ledger's report root-account names (and the derived clamp account
 * names) from its `option` directives, so reports and the `time`-filter clamp
 * honor `option "name_assets" "Actif"` / `option "name_equity" "Capital"` etc.
 * instead of assuming the beancount defaults.
 *
 * The synthetic-entry equity accounts are `<name_equity>` joined with the
 * beancount default leaves (`Earnings:Previous`, `Opening-Balances`), except the
 * current-conversions leaf, which `deriveBeancountOptions` surfaces (so an
 * `option "account_current_conversions" …` override is respected). The rarer
 * `account_previous_*` / `conversion_currency` overrides keep beancount defaults.
 */
export function deriveReportAccounts(input: {
  source: string | undefined;
  operatingCurrencies: string[];
  title?: string | null;
}): ReportAccounts {
  const opts = deriveBeancountOptions({
    source: input.source,
    operatingCurrencies: input.operatingCurrencies,
    title: input.title ?? null,
  });
  const equity = opts.name_equity;
  return {
    roots: {
      assets: opts.name_assets,
      liabilities: opts.name_liabilities,
      equity,
      income: opts.name_income,
      expenses: opts.name_expenses,
    },
    clamp: {
      nameIncome: opts.name_income,
      nameExpenses: opts.name_expenses,
      accountPreviousEarnings: `${equity}:Earnings:Previous`,
      accountPreviousBalances: `${equity}:Opening-Balances`,
      accountCurrentConversions: `${equity}:${opts.account_current_conversions}`,
      conversionCurrency: DEFAULT_CLAMP_ACCOUNTS.conversionCurrency,
    },
  };
}
