import BigNumber from "bignumber.js";
import type { DirectiveJson, PostingJson } from "@rustledger/wasm";
import { getRustledgerWorkerPool } from "./rustledger-worker-pool";
import { utcDate } from "./utc-date";

/**
 * Fava `FavaLedger.get_filtered(account, filter, time)` reimplemented as a pure
 * walk over a parsed `DirectiveJson[]` — the three entry filters from
 * `fava/core/filters.py` (`AccountFilter`, `AdvancedFilter`, `TimeFilter`) plus
 * the date-range parsing from `fava/util/date.py` (`parse_date`/`substitute`).
 *
 * Fava composes the three filters in order (account, then advanced, then time);
 * we do the same. Each filter is a faithful port of its Python counterpart:
 *
 *  - AccountFilter  — keep entries touching an account whose name either contains
 *    the filter as a whole `:`-delimited component (beancount `has_component`) or
 *    matches it as a case-insensitive regex (`Match`).
 *  - AdvancedFilter — the tag/link/string/key DSL, parsed with the same grammar
 *    (`#tag`, `^link`, bare/`"quoted"` strings, `key:str`, `key<op>num`,
 *    `<op>num`, `any(...)`, `all(...)`, `-` negation, `,` OR, juxtaposition AND,
 *    and parentheses).
 *  - TimeFilter (date range only) — keep entries whose date is inside the parsed
 *    `[begin, end)` range. See the note below on Fava's summarization gap.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * PARITY NOTE — TimeFilter summarization is intentionally NOT reproduced.
 * Fava's `TimeFilter.apply` calls beancount `summarize.clamp_opt`, which does
 * more than a date-range keep: it (1) transfers pre-period Income/Expenses
 * balances into a synthetic "retained earnings" transaction, (2) summarizes all
 * other pre-period activity into synthetic "opening balances" transactions,
 * (3) truncates after the end date, and (4) inserts currency-conversion entries.
 * Steps 1/2/4 synthesize brand-new directives computed from a running inventory
 * (with cost-basis handling) — they cannot be produced by a directive-in /
 * directive-out filter. This module reproduces the OBSERVABLE truncation (step 3
 * generalized to the inclusive-begin/exclusive-end range): it keeps exactly the
 * original entries whose date lies in `[begin, end)`. Consumers that need the
 * summarized opening/earnings/conversion balances (i.e. a balance sheet with a
 * `time` filter set) still need the Python engine. This is documented as the one
 * residual gap.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface FilterOptions {
  /** Fava `account` param — AccountFilter. */
  account?: string;
  /** Fava `time` param — TimeFilter (date range). */
  time?: string;
  /** Fava `filter` param — AdvancedFilter DSL. */
  filter?: string;
  /**
   * Fiscal-year end used by `time` parsing, as `MM-DD` (Fava default `12-31`).
   * Mirrors `FavaOptions.fiscal_year_end`.
   */
  fiscalYearEnd?: string;
  /**
   * "Today", as `YYYY-MM-DD`, used to resolve relative `time` variables
   * (`year`, `month`, `quarter`, …). Defaults to the real local date, matching
   * Fava's `local_today()`.
   */
  today?: string;
}

/** Keep user-authored regex programs small before they enter a worker. */
export const MAX_FILTER_PATTERN_LENGTH = 256;

/**
 * Thrown when `time` cannot be parsed to a range — mirrors Fava's
 * `TimeFilterParseError`. AccountFilter never raises (an invalid account regex
 * degrades to exact-string comparison, Fava `Match`); an unparseable
 * advanced-filter expression raises {@link AdvancedFilterParseError}, mirroring
 * Fava's `FilterParseError`. Both are mapped to a `BadUserInputError` (400) by
 * the consuming services.
 */
export class TimeFilterParseError extends Error {
  public constructor(value: string) {
    super(`Failed to parse date: ${value}`);
    this.name = "TimeFilterParseError";
  }
}

/**
 * Compose the three Fava filters. Absent/empty options are skipped exactly as
 * `FilteredLedger.__init__` does (`if account`, `if filter and filter.strip()`,
 * `if time`).
 */
export function filterDirectives(
  directives: DirectiveJson[],
  opts: FilterOptions,
): DirectiveJson[] {
  let entries = directives;
  if (opts.account) {
    entries = applyAccountFilter(entries, opts.account);
  }
  if (opts.filter && opts.filter.trim()) {
    entries = applyAdvancedFilter(entries, opts.filter);
  }
  if (opts.time) {
    entries = applyTimeFilter(
      entries,
      opts.time,
      opts.fiscalYearEnd,
      opts.today,
    );
  }
  return entries;
}

/**
 * Request-path filter entrypoint. Regex matching runs in the bounded
 * rustledger worker pool so catastrophic backtracking cannot block the API
 * event loop; syntax is validated locally first so caller-facing parse errors
 * retain their concrete error classes.
 */
export async function filterDirectivesAsync(
  directives: DirectiveJson[],
  opts: FilterOptions,
): Promise<DirectiveJson[]> {
  // An empty walk still builds the predicates and parses the time expression,
  // but never runs a user regex against ledger-controlled subject text.
  filterDirectives([], opts);
  const matchedIndices = await getRustledgerWorkerPool().filter(
    directives,
    opts,
  );
  // Preserve the caller's original object identities. Entry IDs, plugin
  // provenance and source lookups use identity-keyed Maps/WeakMaps.
  return matchedIndices.map((index) => directives[index]);
}

// ── Account helpers (beans/account.py + beancount has_component) ──────────────

/**
 * Accounts involved in an entry, in Fava's `get_entry_accounts` order (for
 * transactions the posting accounts are reversed; ordering is irrelevant to the
 * membership tests here but preserved for faithfulness).
 */
function getEntryAccounts(directive: DirectiveJson): string[] {
  switch (directive.type) {
    case "transaction":
      return directive.postings.map((posting) => posting.account).reverse();
    case "custom":
      // Fava keeps only values whose dtype is the account type. The wire type
      // tags these as `{ type: "account", value }`.
      return (directive.values ?? [])
        .filter((value) => value.type === "account")
        .map((value) => String(value.value));
    case "pad":
      return [directive.account, directive.source_account];
    case "open":
    case "close":
    case "balance":
    case "note":
    case "document":
      return [directive.account];
    default:
      // price, event, query, commodity carry no account.
      return [];
  }
}

/**
 * beancount `account.has_component` — whole `:`-delimited component match.
 * Returns a closure over a regex compiled ONCE per filter evaluation: the
 * previous per-call `new RegExp` compiled entries×accounts times per request
 * (~30k compiles on a 10k-entry ledger). The regex has no flags (notably not
 * `g`/`y`), so `.test` is stateless and the instance is safe to reuse.
 */
function makeComponentMatcher(
  component: string,
): (accountName: string) => boolean {
  const escaped = escapeRegExp(component);
  const regex = new RegExp(`(^|:)${escaped}(:|$)`);
  return (accountName: string): boolean => regex.test(accountName);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Fava `Match`: compile the search string as a case-insensitive regex whose
 * `.search()` (substring, not anchored) decides the match; on an invalid regex
 * fall back to exact string equality.
 */
type FilterValueMatcher = (value: unknown) => boolean;

function compileMatcherRegex(search: string): RegExp {
  try {
    return new RegExp(search, "i");
  } catch (originalError) {
    // Translate the common Python-only constructs accepted by Fava's `re` so
    // they do not silently degrade to literal equality under JavaScript.
    let source = search;
    const flags = new Set(["i"]);
    const inlineFlags = source.match(/^\(\?([ims]+)\)/u);
    if (inlineFlags) {
      for (const flag of inlineFlags[1]) flags.add(flag);
      source = source.slice(inlineFlags[0].length);
    }
    source = source
      .replace(/\(\?P<([A-Za-z_][A-Za-z0-9_]*)>/gu, "(?<$1>")
      .replace(/\(\?P=([A-Za-z_][A-Za-z0-9_]*)\)/gu, "\\k<$1>");
    if (source === search) throw originalError;
    return new RegExp(source, [...flags].join(""));
  }
}

function makeMatcher(search: string): FilterValueMatcher {
  if (search.length > MAX_FILTER_PATTERN_LENGTH) {
    throw new AdvancedFilterParseError(
      `Filter pattern exceeds ${MAX_FILTER_PATTERN_LENGTH} characters`,
    );
  }
  try {
    const regex = compileMatcherRegex(search);
    return (value): boolean => regex.test(stringifyFilterValue(value));
  } catch {
    // Fava deliberately treats a regex that Python cannot compile as a literal
    // exact match. Keep that behavior after attempting the compatibility
    // translations above.
    return (value): boolean => stringifyFilterValue(value) === search;
  }
}

function applyAccountFilter(
  directives: DirectiveJson[],
  value: string,
): DirectiveJson[] {
  if (!value) return directives;
  const match = makeMatcher(value);
  const hasComponent = makeComponentMatcher(value);
  return directives.filter((directive) =>
    getEntryAccounts(directive).some(
      (name) => hasComponent(name) || match(name),
    ),
  );
}

// ── Advanced filter (core/filters.py FilterSyntaxLexer + FilterSyntaxParser) ──

type TokenType =
  | "ANY"
  | "ALL"
  | "CMP_OP"
  | "EQ_OP"
  | "KEY"
  | "LINK"
  | "NUMBER"
  | "STRING"
  | "-"
  | ","
  | "("
  | ")";

interface FilterToken {
  type: TokenType;
  value: string;
}

/**
 * Raised internally on a lex/parse failure. Fava surfaces this as
 * `FilterParseError`/`FilterIllegalCharError`; `applyAdvancedFilter` lets it
 * propagate so the consuming service maps it to a `BadUserInputError` (a 400) —
 * matching Fava, which surfaces a bad filter as an error rather than silently
 * returning the whole ledger (which would read as "filter matched everything").
 */
export class AdvancedFilterParseError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AdvancedFilterParseError";
  }
}

/**
 * Fava duck-types its predicates: the same closure is applied to a directive at
 * the top level and to a POSTING inside `any(...)`/`all(...)` (via `getattr`).
 * We model that with a tagged match target — either a directive or a posting
 * (carrying the parent transaction so tag/link/string predicates still resolve,
 * matching Python's `getattr(posting, "tags", None)` → None → false).
 */
type MatchTarget =
  | { kind: "directive"; directive: DirectiveJson }
  | { kind: "posting"; posting: PostingJson };

type EntryPredicate = (target: MatchTarget) => boolean;

// Lexer rules, ordered exactly as Fava's `FilterSyntaxLexer.RULES`. Each regex is
// anchored with `y` (sticky) so we can match at an explicit offset like PLY.
const LEX_RULES: Array<{ type: TokenType; regex: RegExp }> = [
  { type: "LINK", regex: /\^[A-Za-z0-9\-_/.]+/y },
  { type: "TAG" as TokenType, regex: /#[A-Za-z0-9\-_/.]+/y },
  { type: "ALL", regex: /all\(/y },
  { type: "ANY", regex: /any\(/y },
  { type: "KEY", regex: /[a-z][a-zA-Z0-9\-_]+(?=\s*(:|=|>=|<=|<|>))/y },
  { type: "EQ_OP", regex: /:/y },
  { type: "CMP_OP", regex: /(=|>=|<=|<|>)/y },
  { type: "NUMBER", regex: /\d*\.?\d+/y },
  {
    type: "STRING",
    regex: /[\p{L}\p{N}_][\p{L}\p{N}_-]*|"[^"]*"|'[^']*'/uy,
  },
];

const IGNORE = new Set([" ", "\t"]);
const LITERALS = new Set(["-", ",", "(", ")"]);

/** Port of `FilterSyntaxLexer.lex` — yields tokens, tag/link stripped of sigil. */
function lex(data: string): FilterToken[] {
  const tokens: FilterToken[] = [];
  let pos = 0;
  while (pos < data.length) {
    const char = data[pos];
    if (IGNORE.has(char)) {
      pos += 1;
      continue;
    }
    let matched = false;
    for (const rule of LEX_RULES) {
      rule.regex.lastIndex = pos;
      const result = rule.regex.exec(data);
      if (result && result.index === pos) {
        const raw = result[0];
        pos += raw.length;
        tokens.push(makeToken(rule.type, raw));
        matched = true;
        break;
      }
    }
    if (matched) continue;
    if (LITERALS.has(char)) {
      tokens.push({ type: char as TokenType, value: char });
      pos += 1;
      continue;
    }
    // Fava raises FilterIllegalCharError; we fail the whole parse (keep-all).
    throw new AdvancedFilterParseError(`Illegal character "${char}"`);
  }
  return tokens;
}

function makeToken(type: TokenType, raw: string): FilterToken {
  // TAG/LINK: drop the leading sigil (Fava's LINK/TAG token functions).
  if (type === "LINK" || (type as string) === "TAG") {
    return { type, value: raw.slice(1) };
  }
  if (type === "ALL" || type === "ANY") {
    return { type, value: type };
  }
  if (type === "STRING") {
    const first = raw[0];
    if (first === '"' || first === "'") {
      return { type, value: raw.slice(1, -1) };
    }
    return { type, value: raw };
  }
  return { type, value: raw };
}

/**
 * Recursive-descent parser matching Fava's PLY grammar and precedence
 * (`left AND` over juxtaposition, `,` as OR binding looser, `-` as unary NOT).
 *
 * Grammar (from `FilterSyntaxParser`):
 *   filter      : expr
 *   expr        : expr ',' expr          (OR, lowest precedence)
 *               | expr expr              (AND, juxtaposition)
 *               | '-' expr               (NOT, unary)
 *               | '(' expr ')'
 *               | ALL expr ')'
 *               | ANY expr ')'
 *               | simple_expr
 *   simple_expr : TAG | LINK | STRING
 *               | KEY EQ_OP STRING | KEY CMP_OP NUMBER
 *               | CMP_OP NUMBER
 */
class FilterParser {
  private pos = 0;

  public constructor(private readonly tokens: FilterToken[]) {}

  public parse(): EntryPredicate {
    const expr = this.parseOr();
    if (this.pos !== this.tokens.length) {
      throw new AdvancedFilterParseError("Trailing tokens");
    }
    return expr;
  }

  private peek(): FilterToken | undefined {
    return this.tokens[this.pos];
  }

  private next(): FilterToken {
    const token = this.tokens[this.pos];
    if (token === undefined) {
      throw new AdvancedFilterParseError("Unexpected end of filter");
    }
    this.pos += 1;
    return token;
  }

  private parseOr(): EntryPredicate {
    let left = this.parseAnd();
    while (this.peek()?.type === ",") {
      this.next();
      const right = this.parseAnd();
      const l = left;
      left = (entry): boolean => l(entry) || right(entry);
    }
    return left;
  }

  private parseAnd(): EntryPredicate {
    let left = this.parseUnary();
    while (this.startsExpr()) {
      const right = this.parseUnary();
      const l = left;
      left = (entry): boolean => l(entry) && right(entry);
    }
    return left;
  }

  private parseUnary(): EntryPredicate {
    if (this.peek()?.type === "-") {
      this.next();
      const inner = this.parseUnary();
      return (entry): boolean => !inner(entry);
    }
    return this.parsePrimary();
  }

  private startsExpr(): boolean {
    const token = this.peek();
    if (token === undefined) return false;
    switch (token.type) {
      case "TAG" as TokenType:
      case "LINK":
      case "STRING":
      case "KEY":
      case "CMP_OP":
      case "ANY":
      case "ALL":
      case "(":
      case "-":
        return true;
      default:
        return false;
    }
  }

  private parsePrimary(): EntryPredicate {
    const token = this.peek();
    if (token === undefined) {
      throw new AdvancedFilterParseError("Unexpected end of filter");
    }
    if (token.type === "(") {
      this.next();
      const inner = this.parseOr();
      this.expect(")");
      return inner;
    }
    if (token.type === "ALL" || token.type === "ANY") {
      this.next();
      const inner = this.parseOr();
      this.expect(")");
      return token.type === "ALL"
        ? matchAllPostings(inner)
        : matchAnyPostings(inner);
    }
    return this.parseSimple();
  }

  private parseSimple(): EntryPredicate {
    const token = this.next();
    switch (token.type) {
      case "TAG" as TokenType:
        return tagPredicate(token.value);
      case "LINK":
        return linkPredicate(token.value);
      case "STRING":
        return stringPredicate(token.value);
      case "KEY": {
        const opToken = this.next();
        if (opToken.type === "EQ_OP") {
          const valueToken = this.expect("STRING");
          return keyPredicate(token.value, makeMatcher(valueToken.value));
        }
        if (opToken.type === "CMP_OP") {
          const numberToken = this.expect("NUMBER");
          return keyPredicate(
            token.value,
            makeAmountMatcher(opToken.value, numberToken.value),
          );
        }
        throw new AdvancedFilterParseError(
          "Expected : or comparison after key",
        );
      }
      case "CMP_OP": {
        const numberToken = this.expect("NUMBER");
        const match = makeAmountMatcher(token.value, numberToken.value);
        return unitsPredicate(match);
      }
      default:
        throw new AdvancedFilterParseError(`Unexpected token ${token.type}`);
    }
  }

  private expect(type: TokenType): FilterToken {
    const token = this.next();
    if (token.type !== type) {
      throw new AdvancedFilterParseError(`Expected ${type}, got ${token.type}`);
    }
    return token;
  }
}

// Fava `Match.__call__(obj)` stringifies via `str(obj)`; our values are already
// strings, so `makeMatcher` (case-insensitive substring regex) applies directly.

/** Fava `MatchAmount`: compare `abs(number)` against the threshold. */
function makeAmountMatcher(op: string, rawValue: string): FilterValueMatcher {
  const threshold = new BigNumber(rawValue);
  return (value): boolean => {
    const raw = amountNumber(value);
    if (raw === undefined) return false;
    const number = new BigNumber(raw);
    if (number.isNaN()) return false;
    const abs = number.abs();
    switch (op) {
      case "=":
        return abs.isEqualTo(threshold);
      case ">=":
        return abs.isGreaterThanOrEqualTo(threshold);
      case "<=":
        return abs.isLessThanOrEqualTo(threshold);
      case ">":
        return abs.isGreaterThan(threshold);
      default: // "<"
        return abs.isLessThan(threshold);
    }
  };
}

/** Match every directive type that carries tags (transactions and documents). */
function tagPredicate(tag: string): EntryPredicate {
  return (target): boolean => {
    if (target.kind !== "directive") return false;
    const directive = target.directive;
    if (directive.type === "transaction") return directive.tags.includes(tag);
    if (directive.type === "document") {
      return (directive.tags ?? []).includes(tag);
    }
    return false;
  };
}

function linkPredicate(link: string): EntryPredicate {
  return (target): boolean => {
    if (target.kind !== "directive") return false;
    const directive = target.directive;
    if (directive.type === "transaction") return directive.links.includes(link);
    if (directive.type === "document") {
      return (directive.links ?? []).includes(link);
    }
    return false;
  };
}

/**
 * Fava `_string`: match against narration, payee, comment (in that order),
 * returning true on the first non-empty field that matches. A posting exposes
 * none of these (`getattr(posting, "narration", "")` → "") so it never matches.
 */
function stringPredicate(search: string): EntryPredicate {
  const match = makeMatcher(search);
  return (target): boolean => {
    if (target.kind !== "directive") return false;
    const directive = target.directive;
    const candidates: Array<string | undefined> = [];
    if (directive.type === "transaction") {
      candidates.push(directive.narration, directive.payee);
    }
    if (directive.type === "note") {
      candidates.push(directive.comment);
    }
    return candidates.some((value) => Boolean(value) && match(value as string));
  };
}

interface AttributeLookup {
  present: boolean;
  value?: unknown;
}

const ABSENT_ATTRIBUTE: AttributeLookup = { present: false };

function ownAttribute(
  values: Record<string, unknown>,
  key: string,
): AttributeLookup {
  return Object.prototype.hasOwnProperty.call(values, key)
    ? { present: true, value: values[key] }
    : ABSENT_ATTRIBUTE;
}

/**
 * Directive attributes reachable through Fava's `hasattr(entry, key)`. This is
 * deliberately per-variant: the JSON discriminator `type` is not a Beancount
 * attribute on most directives, while Event/Custom expose their own `type`
 * fields as `event_type`/`custom_type` on the rustledger wire.
 */
function directiveAttribute(
  directive: DirectiveJson,
  key: string,
): AttributeLookup {
  if (key === "date") return { present: true, value: directive.date };
  if (key === "meta") return { present: true, value: directive.meta ?? {} };

  switch (directive.type) {
    case "transaction": {
      const values: Record<string, unknown> = {
        flag: directive.flag,
        payee: directive.payee,
        narration: directive.narration,
        tags: directive.tags,
        links: directive.links,
        postings: directive.postings,
      };
      return ownAttribute(values, key);
    }
    case "balance": {
      const values: Record<string, unknown> = {
        account: directive.account,
        amount: directive.amount,
        tolerance: directive.tolerance,
        // Present on Beancount's Balance tuple even when validation did not
        // populate it; rustledger does not expose the value.
        diff_amount: undefined,
      };
      return ownAttribute(values, key);
    }
    case "open": {
      const values: Record<string, unknown> = {
        account: directive.account,
        currencies: directive.currencies,
        booking: directive.booking,
      };
      return ownAttribute(values, key);
    }
    case "close":
      return key === "account"
        ? { present: true, value: directive.account }
        : ABSENT_ATTRIBUTE;
    case "commodity":
      return key === "currency"
        ? { present: true, value: directive.currency }
        : ABSENT_ATTRIBUTE;
    case "pad": {
      const values: Record<string, unknown> = {
        account: directive.account,
        source_account: directive.source_account,
      };
      return ownAttribute(values, key);
    }
    case "event": {
      const values: Record<string, unknown> = {
        type: directive.event_type,
        description: directive.value,
      };
      return ownAttribute(values, key);
    }
    case "note": {
      const values: Record<string, unknown> = {
        account: directive.account,
        comment: directive.comment,
      };
      return ownAttribute(values, key);
    }
    case "document": {
      const values: Record<string, unknown> = {
        account: directive.account,
        filename: directive.path,
        tags: directive.tags,
        links: directive.links,
      };
      return ownAttribute(values, key);
    }
    case "price": {
      const values: Record<string, unknown> = {
        currency: directive.currency,
        amount: directive.amount,
      };
      return ownAttribute(values, key);
    }
    case "query": {
      const values: Record<string, unknown> = {
        name: directive.name,
        query_string: directive.query_string,
      };
      return ownAttribute(values, key);
    }
    case "custom": {
      const values: Record<string, unknown> = {
        type: directive.custom_type,
        values: directive.values,
      };
      return ownAttribute(values, key);
    }
  }
}

/** Attributes on Beancount's Posting tuple. */
function postingAttribute(posting: PostingJson, key: string): AttributeLookup {
  const values: Record<string, unknown> = {
    account: posting.account,
    units: posting.units,
    cost: posting.cost,
    price: posting.price,
    flag: posting.flag,
    meta: posting.meta ?? {},
  };
  return ownAttribute(values, key);
}

/**
 * Fava `_key`: if the object has the attribute, match its value (or `""`);
 * otherwise, if `key` is in `obj.meta`, match the meta value. Meta values that
 * are not plain strings are stringified the way Python's `str()` renders them
 * for the common cases.
 */
function keyPredicate(key: string, match: FilterValueMatcher): EntryPredicate {
  return (target): boolean => {
    const attribute =
      target.kind === "directive"
        ? directiveAttribute(target.directive, key)
        : postingAttribute(target.posting, key);
    if (attribute.present) {
      // Fava passes `getattr(obj, key) or ""` — None/empty become "".
      return match(isPythonTruthy(attribute.value) ? attribute.value : "");
    }
    const meta =
      target.kind === "directive" ? target.directive.meta : target.posting.meta;
    if (meta && Object.prototype.hasOwnProperty.call(meta, key)) {
      return match(meta[key]);
    }
    return false;
  };
}

function isPythonTruthy(value: unknown): boolean {
  if (
    value === null ||
    value === undefined ||
    value === false ||
    value === ""
  ) {
    return false;
  }
  if (typeof value === "number") return value !== 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function stringifyFilterValue(value: unknown): string {
  if (value === null || value === undefined) return "None";
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "object" && "number" in value && "currency" in value) {
    const amount = value as { number: string; currency: string };
    return `${amount.number} ${amount.currency}`;
  }
  if (Array.isArray(value)) return value.map(stringifyFilterValue).join(", ");
  if (typeof value === "object") {
    return Object.entries(value)
      .map(
        ([itemKey, itemValue]) =>
          `${itemKey}: ${stringifyFilterValue(itemValue)}`,
      )
      .join(", ");
  }
  return String(value);
}

function amountNumber(value: unknown): string | undefined {
  if (
    typeof value === "object" &&
    value !== null &&
    "number" in value &&
    (typeof value.number === "string" || typeof value.number === "number")
  ) {
    return String(value.number);
  }
  return undefined;
}

/**
 * Fava `_range` (the bare `<op>num` form): any posting's units number matches
 * the amount comparison. Applied to a posting target it reads that one posting.
 */
function unitsPredicate(match: FilterValueMatcher): EntryPredicate {
  return (target): boolean => {
    if (target.kind === "posting") return match(target.posting.units);
    return getPostings(target.directive).some((posting) =>
      match(posting.units),
    );
  };
}

function getPostings(directive: DirectiveJson): PostingJson[] {
  return directive.type === "transaction" ? directive.postings : [];
}

/**
 * `all(...)` — every posting satisfies the inner predicate. Fava applies the
 * inner predicate to each POSTING; Python's `all([])` is `True`, so a directive
 * with no postings (or a non-transaction) passes `all()`.
 */
function matchAllPostings(inner: EntryPredicate): EntryPredicate {
  return (target): boolean => {
    if (target.kind !== "directive") return inner(target);
    return getPostings(target.directive).every((posting) =>
      inner({ kind: "posting", posting }),
    );
  };
}

/** `any(...)` — some posting satisfies the inner predicate (`any([])` is `False`). */
function matchAnyPostings(inner: EntryPredicate): EntryPredicate {
  return (target): boolean => {
    if (target.kind !== "directive") return inner(target);
    return getPostings(target.directive).some((posting) =>
      inner({ kind: "posting", posting }),
    );
  };
}

function applyAdvancedFilter(
  directives: DirectiveJson[],
  value: string,
): DirectiveJson[] {
  // Fava raises FilterParseError to the caller on a malformed DSL string; we let
  // the AdvancedFilterParseError propagate (the consuming service maps it to a
  // 400) rather than silently returning every entry, which would masquerade as a
  // filter that matched everything.
  const tokens = lex(value);
  const predicate = new FilterParser(tokens).parse();
  return directives.filter((directive) =>
    predicate({ kind: "directive", directive }),
  );
}

// ── Time filter / date parsing (util/date.py) ────────────────────────────────

interface DateRange {
  begin: string; // inclusive, YYYY-MM-DD
  end: string; // exclusive, YYYY-MM-DD
}

const IS_RANGE_RE = /^(.*?)(?:-|to)(?=\s*(?:fy)*\d{4})(.*)$/;
const YEAR_RE = /^\d{4}$/;
const MONTH_RE = /^(\d{4})-(\d{2})$/;
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEK_RE = /^(\d{4})-w(\d{2})$/;
const QUARTER_RE = /^(\d{4})-q([1234])$/;
const FY_RE = /^fy(\d{4})$/;
const FY_QUARTER_RE = /^fy(\d{4})-q([1234])$/;
const VARIABLE_RE =
  /\(?(fiscal_year|year|fiscal_quarter|quarter|month|week|day)(?:([-+])(\d+))?\)?/g;

interface FiscalYearEnd {
  month: number;
  day: number;
}

const END_OF_YEAR: FiscalYearEnd = { month: 12, day: 31 };

function monthOfYear(fye: FiscalYearEnd): number {
  return ((fye.month - 1) % 12) + 1;
}

function yearOffset(fye: FiscalYearEnd): number {
  return Math.floor((fye.month - 1) / 12);
}

// ── minimal UTC date arithmetic (avoids TZ drift; matches datetime.date) ──────

function ymd(year: number, month: number, day: number): string {
  const pad = (n: number, width: number): string =>
    String(n).padStart(width, "0");
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

function isCalendarDate(year: number, month: number, day: number): boolean {
  return (
    year >= 1 &&
    year <= 9999 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)
  );
}

function isIsoDate(date: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return (
    match !== null &&
    isCalendarDate(
      Number.parseInt(match[1], 10),
      Number.parseInt(match[2], 10),
      Number.parseInt(match[3], 10),
    )
  );
}

function validDateRange(begin: string, end: string): DateRange | undefined {
  if (!isIsoDate(begin) || !isIsoDate(end) || begin >= end) return undefined;
  return { begin, end };
}

function nextYearStart(year: number): string {
  return ymd(year + 1, 1, 1);
}

function nextMonthStart(year: number, month: number): string {
  const nextMonth = (month % 12) + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return ymd(nextYear, nextMonth, 1);
}

function nextDay(dateStr: string): string {
  return addDays(dateStr, 1);
}

function nextQuarterStart(year: number, month: number): string {
  for (const boundary of [4, 7, 10]) {
    if (month < boundary) return ymd(year, boundary, 1);
  }
  return ymd(year + 1, 1, 1);
}

/** Offset a `YYYY-MM-DD` by whole months, keeping the day (may clamp). */
function monthOffset(dateStr: string, months: number): string {
  const [y, m, d] = dateStr.split("-").map((part) => Number.parseInt(part, 10));
  const total = m - 1 + months;
  const yearDelta = Math.floor(total / 12);
  const newMonth = ((total % 12) + 12) % 12;
  const newYear = y + yearDelta;
  const clampedDay = Math.min(d, daysInMonth(newYear, newMonth + 1));
  return ymd(newYear, newMonth + 1, clampedDay);
}

function parseFyeString(fye: string): FiscalYearEnd | undefined {
  const match = /^(\d{2})-(\d{2})$/.exec(fye);
  if (!match) return undefined;
  const month = Number.parseInt(match[1], 10);
  const day = Number.parseInt(match[2], 10);
  if (month < 1) return undefined;
  // Fava deliberately preserves months above 12 as a fiscal-year offset:
  // `15-31` means March 31 in the following year. Validate the calendar day
  // against the normalized month while returning the original offset month.
  const normalizedMonth = ((month - 1) % 12) + 1;
  if (day < 1 || day > daysInMonth(2001, normalizedMonth)) return undefined;
  return { month, day };
}

function hasQuarters(fye: FiscalYearEnd): boolean {
  // Fava: (date(2001, month_of_year, day) + ONE_DAY).day == 1 — i.e. the fiscal
  // year ends on the last day of a month.
  const moy = monthOfYear(fye);
  return fye.day === daysInMonth(2001, moy);
}

function getFiscalPeriod(
  year: number,
  fye: FiscalYearEnd,
  quarter?: number,
): DateRange | undefined {
  const startBase = monthOffset(
    ymd(year - 1 + yearOffset(fye), monthOfYear(fye), fye.day),
    0,
  );
  let start = nextDay(startBase);
  // Special-case 02-28 for leap years (Fava replaces to 03-01).
  if (monthOfYear(fye) === 2 && fye.day === 28) {
    const [sy] = start.split("-").map((part) => Number.parseInt(part, 10));
    start = ymd(sy, 3, 1);
  }

  if (quarter === undefined) {
    const [sy, sm, sd] = start
      .split("-")
      .map((part) => Number.parseInt(part, 10));
    return { begin: start, end: ymd(sy + 1, sm, sd) };
  }
  if (!hasQuarters(fye)) return undefined;
  if (quarter < 1 || quarter > 4) return undefined;

  const qStart = monthOffset(start, (quarter - 1) * 3);
  return { begin: qStart, end: monthOffset(qStart, 3) };
}

/** ISO week (`%G-W%V`) Monday for a given year/week. */
function isoWeekStart(year: number, week: number): string {
  // ISO 8601: week 1 is the week containing the year's first Thursday. The
  // Monday of week `w` is: (Monday of week 1) + (w-1)*7 days.
  const jan4 = utcDate(year, 0, 4);
  const jan4Dow = (jan4.getUTCDay() + 6) % 7; // Monday=0
  const week1Monday = utcDate(year, 0, 4 - jan4Dow);
  const target = new Date(week1Monday.getTime() + (week - 1) * 7 * 86_400_000);
  return ymd(
    target.getUTCFullYear(),
    target.getUTCMonth() + 1,
    target.getUTCDate(),
  );
}

function isoWeeksInYear(year: number): number {
  const finalWeek = isoFormatWeek(utcDate(year, 11, 28));
  return Number.parseInt(finalWeek.slice(-2), 10);
}

/** Port of `util/date.substitute` for the relative time variables. */
function substitute(input: string, fye: FiscalYearEnd, today: string): string {
  const [ty, tm, td] = today
    .split("-")
    .map((part) => Number.parseInt(part, 10));
  let result = input;
  // JavaScript `replace` changes one occurrence while `matchAll` enumerates the
  // original input. This deliberately avoids Fava's overlapping-token quirk:
  // Python's all-occurrence `str.replace("year", ...)` rewrites the `year`
  // prefix inside `year+1` before that second token is handled, producing an
  // unparseable expression. The TypeScript port resolves each token once.
  for (const match of input.matchAll(VARIABLE_RE)) {
    const complete = match[0];
    const interval = match[1];
    const sign = match[2];
    const modRaw = match[3];
    const mod = modRaw ? Number.parseInt(modRaw, 10) : 0;
    const offset = sign === "+" ? mod : -mod;

    if (interval === "fiscal_year") {
      const afterFye =
        tm > monthOfYear(fye) || (tm === monthOfYear(fye) && td > fye.day);
      const year = ty + (afterFye ? 1 : 0) - yearOffset(fye);
      result = result.replace(complete, `FY${year + offset}`);
    } else if (interval === "year") {
      result = result.replace(complete, String(ty + offset));
    } else if (interval === "fiscal_quarter") {
      if (!hasQuarters(fye)) {
        throw new TimeFilterParseError(input);
      }
      const target = monthOffset(ymd(ty, tm, 1), offset * 3);
      const [tgy, tgm] = target
        .split("-")
        .map((part) => Number.parseInt(part, 10));
      const afterFye = tgm > monthOfYear(fye);
      const year = tgy + (afterFye ? 1 : 0) - yearOffset(fye);
      // Fava: `(target.month - fye.month_of_year - 1) // 3 % 4 + 1` — the
      // months-since-fiscal-year-start, floor-divided by 3 (a quarter is three
      // months), then Python-mod 4. `Math.floor` matches Python `//` for the
      // negative operands that arise when tgm precedes the FY start month.
      const quarter =
        (((Math.floor((tgm - monthOfYear(fye) - 1) / 3) % 4) + 4) % 4) + 1;
      result = result.replace(complete, `FY${year}-Q${quarter}`);
    } else if (interval === "quarter") {
      const quarterToday = Math.floor((tm - 1) / 3) + 1;
      const year = ty + Math.floor((quarterToday + offset - 1) / 4);
      const quarter = ((((quarterToday + offset - 1) % 4) + 4) % 4) + 1;
      result = result.replace(complete, `${year}-Q${quarter}`);
    } else if (interval === "month") {
      const year = ty + Math.floor((tm + offset - 1) / 12);
      const month = ((((tm + offset - 1) % 12) + 12) % 12) + 1;
      result = result.replace(
        complete,
        `${year}-${String(month).padStart(2, "0")}`,
      );
    } else if (interval === "week") {
      const base = utcDate(ty, tm - 1, td + offset * 7);
      result = result.replace(complete, isoFormatWeek(base));
    } else if (interval === "day") {
      const base = utcDate(ty, tm - 1, td + offset);
      result = result.replace(
        complete,
        ymd(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate()),
      );
    }
  }
  return result;
}

function isoFormatWeek(date: Date): string {
  // %G-W%V — ISO year and week.
  const target = new Date(date.getTime());
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3); // Thursday of this week
  const isoYear = target.getUTCFullYear();
  const firstThursday = utcDate(isoYear, 0, 4);
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);
  const week =
    1 +
    Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

/**
 * Port of `util/date.parse_date`. Returns `[begin, end)` as `YYYY-MM-DD`
 * strings, or `undefined` when the string is empty/unparseable (Fava returns
 * `(None, None)`).
 */
export function parseDateRange(
  input: string,
  fiscalYearEnd?: string,
  today?: string,
): DateRange | undefined {
  const fye = (fiscalYearEnd && parseFyeString(fiscalYearEnd)) || END_OF_YEAR;
  const nowStr = today ?? localTodayStr();

  let string = input.trim().toLowerCase();
  if (!string) return undefined;
  string = substitute(string, fye, nowStr).toLowerCase();

  const rangeMatch = IS_RANGE_RE.exec(string);
  if (rangeMatch) {
    const left = parseDateRange(rangeMatch[1], fiscalYearEnd, nowStr);
    const right = parseDateRange(rangeMatch[2], fiscalYearEnd, nowStr);
    const begin = left?.begin;
    const end = right?.end;
    if (begin === undefined || end === undefined) return undefined;
    return validDateRange(begin, end);
  }

  if (YEAR_RE.test(string)) {
    const year = Number.parseInt(string, 10);
    return validDateRange(ymd(year, 1, 1), nextYearStart(year));
  }
  const monthMatch = MONTH_RE.exec(string);
  if (monthMatch) {
    const year = Number.parseInt(monthMatch[1], 10);
    const month = Number.parseInt(monthMatch[2], 10);
    return validDateRange(ymd(year, month, 1), nextMonthStart(year, month));
  }
  const dayMatch = DAY_RE.exec(string);
  if (dayMatch) {
    const begin = ymd(
      Number.parseInt(dayMatch[1], 10),
      Number.parseInt(dayMatch[2], 10),
      Number.parseInt(dayMatch[3], 10),
    );
    return validDateRange(begin, nextDay(begin));
  }
  const weekMatch = WEEK_RE.exec(string);
  if (weekMatch) {
    const year = Number.parseInt(weekMatch[1], 10);
    const week = Number.parseInt(weekMatch[2], 10);
    if (year < 1 || year > 9999 || week < 1 || week > isoWeeksInYear(year)) {
      return undefined;
    }
    const begin = isoWeekStart(year, week);
    return validDateRange(begin, nextDay(addDays(begin, 6)));
  }
  const quarterMatch = QUARTER_RE.exec(string);
  if (quarterMatch) {
    const year = Number.parseInt(quarterMatch[1], 10);
    const quarter = Number.parseInt(quarterMatch[2], 10);
    const begin = ymd(year, (quarter - 1) * 3 + 1, 1);
    const [by, bm] = begin.split("-").map((part) => Number.parseInt(part, 10));
    return validDateRange(begin, nextQuarterStart(by, bm));
  }
  const fyMatch = FY_RE.exec(string);
  if (fyMatch) {
    const range = getFiscalPeriod(Number.parseInt(fyMatch[1], 10), fye);
    return range ? validDateRange(range.begin, range.end) : undefined;
  }
  const fyQuarterMatch = FY_QUARTER_RE.exec(string);
  if (fyQuarterMatch) {
    const range = getFiscalPeriod(
      Number.parseInt(fyQuarterMatch[1], 10),
      fye,
      Number.parseInt(fyQuarterMatch[2], 10),
    );
    return range ? validDateRange(range.begin, range.end) : undefined;
  }
  return undefined;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map((part) => Number.parseInt(part, 10));
  const jsDate = utcDate(y, m - 1, d + days);
  return ymd(
    jsDate.getUTCFullYear(),
    jsDate.getUTCMonth() + 1,
    jsDate.getUTCDate(),
  );
}

function localTodayStr(): string {
  const now = new Date();
  return ymd(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function applyTimeFilter(
  directives: DirectiveJson[],
  time: string,
  fiscalYearEnd?: string,
  today?: string,
): DirectiveJson[] {
  const range = parseDateRange(time, fiscalYearEnd, today);
  if (!range) {
    throw new TimeFilterParseError(time);
  }
  // Keep entries in [begin, end). Dates are ISO `YYYY-MM-DD`, so lexicographic
  // string comparison equals chronological comparison.
  return directives.filter(
    (directive) => directive.date >= range.begin && directive.date < range.end,
  );
}
