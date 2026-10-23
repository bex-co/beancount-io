import type {
  AmountValue,
  CostNumberJson,
  DirectiveJson,
  MetaValueJson,
  PostingJson,
  TypedValueJson,
} from "@rustledger/wasm";
import type {
  DirectiveType,
  JournalAmountPublic,
  JournalBalancePublic,
  JournalClosePublic,
  JournalCommodityPublic,
  JournalCostPublic,
  JournalCustomPublic,
  JournalDocumentPublic,
  JournalEventPublic,
  JournalNotePublic,
  JournalOpenPublic,
  JournalPadPublic,
  JournalPostingPublic,
  JournalPricePublic,
  JournalTransactionPublic,
} from "@/foundation/ledger-api-types";
import {
  CustomSubtype,
  DocumentSubtype,
  TransactionSubtype,
} from "@/foundation/ledger-api-types";
import BigNumber from "bignumber.js";
import { hashEntry } from "./entry-hash";
import { endsInsideString, type SourceSyntax } from "./source-slice";
import { perUnitFromTotalCostString } from "./total-cost";

/**
 * Journal item serialization + subtype filters + per-directive plaintext —
 * parity for the fava-slim `journal.py` endpoints (`getJournal` /
 * `plaintextJournal`).
 *
 * Faithful reimplementation of `app.utils.journal_serializer.serialize_directive`
 * (the JSON shape returned by `getJournal`), the `filter_*_subtypes` helpers, and
 * `fava.beans.str.to_string(entry, _indent=2)` (the plaintext-journal renderer),
 * consuming rustledger `DirectiveJson` instead of live beancount objects.
 *
 * PARITY NOTES (see module doc-comment in the returned notes):
 * - `entry_hash` uses the canonical, golden-validated `hashEntry` implementation
 *   (`exclude_meta=True`). The orchestrator replaces it with the full-stream,
 *   occurrence-disambiguated ID for production journal responses.
 * - Serialized `meta` carries only the user metadata rustledger surfaces; the
 *   Python service additionally includes `filename`/`lineno` (kept by
 *   `sanitize_meta`, which only strips dunder keys). Those source-location keys
 *   are unavailable here.
 * - `Balance.diff_amount` is `null` for a passing assertion, which matches. A
 *   failed one is not on rustledger's `DirectiveJson`; its validator reports it
 *   as an `E2001` error instead, which {@link failedBalanceDiffs} joins back
 *   onto the directive as beancount's `actual − expected` (w21/087).
 * - `Balance` also carries the asserted `amount` and its explicit `tolerance`,
 *   which the Python `serialize_directive` dropped, so a journal row can show
 *   what was asserted (w3/556). The fields are additive.
 * - `directiveToText` renders numbers from rustledger's own source-preserving
 *   strings rather than reproducing beancount's ledger-global `DisplayContext`
 *   (`MOST_COMMON` precision), which can re-pad numbers to a ledger-wide common
 *   scale. Matches when the source scale already is the common scale.
 */

/** Serialized metadata value — matches the `Meta` DTO (`string|number|boolean|null`). */
type MetaOut = Record<string, string | number | boolean | null>;

/** The serialized-directive union returned by `getJournal`. */
export type JournalItem =
  | JournalTransactionPublic
  | JournalBalancePublic
  | JournalCommodityPublic
  | JournalClosePublic
  | JournalCustomPublic
  | JournalDocumentPublic
  | JournalEventPublic
  | JournalNotePublic
  | JournalOpenPublic
  | JournalPadPublic
  | JournalPricePublic;

const DIRECTIVE_TYPE_BY_TAG: Record<DirectiveJson["type"], DirectiveType> = {
  transaction: "Transaction" as DirectiveType,
  balance: "Balance" as DirectiveType,
  commodity: "Commodity" as DirectiveType,
  close: "Close" as DirectiveType,
  custom: "Custom" as DirectiveType,
  document: "Document" as DirectiveType,
  event: "Event" as DirectiveType,
  note: "Note" as DirectiveType,
  open: "Open" as DirectiveType,
  pad: "Pad" as DirectiveType,
  price: "Price" as DirectiveType,
  query: "Custom" as DirectiveType,
};

// --- meta / value serialization ------------------------------------------

/**
 * Serialize a rustledger `MetaValueJson` into the DTO's `Meta` value space.
 * Amount-shaped meta (`{number,currency}`, which the DTO can't represent) is
 * stringified as `"<number> <currency>"` (matches beancount's `str(Amount)`).
 */
function serializeMetaValue(
  value: MetaValueJson,
): string | number | boolean | null {
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  return `${value.number} ${value.currency}`;
}

/**
 * Serialize a rustledger meta map. Mirrors `sanitize_meta`: dunder keys
 * (`__x__`) are dropped. Returns `null` when there is no user metadata (Fava's
 * `sanitize_meta` returns `None` for an empty/absent map).
 */
function serializeMeta(
  meta: Record<string, MetaValueJson> | undefined,
): MetaOut | null {
  if (!meta) return null;
  const out: MetaOut = {};
  let hasKey = false;
  Object.keys(meta).forEach((key) => {
    if (key.startsWith("__") && key.endsWith("__")) return;
    out[key] = serializeMetaValue(meta[key]);
    hasKey = true;
  });
  return hasKey ? out : null;
}

function serializeAmount(amount: AmountValue): JournalAmountPublic {
  return { number: amount.number, currency: amount.currency };
}

/**
 * Extract the per-unit cost number from a rustledger `CostNumberJson`. Fava's
 * `JournalCost.number` is the per-unit `Cost.number` (a booked lot), so we take
 * the per-unit component for each cost-number kind.
 */
function costNumberToPerUnit(
  number: CostNumberJson,
  unitsNumber: string | undefined,
): string {
  switch (number.kind) {
    case "per_unit":
      return number.value;
    case "total": {
      return (
        perUnitFromTotalCostString(number.value, unitsNumber) ?? number.value
      );
    }
    case "compound":
    case "per_unit_from_total":
      return number.per_unit;
    default:
      return "0";
  }
}

function serializeCost(posting: PostingJson): JournalCostPublic | null {
  const cost = posting.cost;
  if (!cost) return null;
  return {
    number: cost.number
      ? costNumberToPerUnit(cost.number, posting.units?.number)
      : "0",
    currency: cost.currency ?? "",
    date: cost.date ?? "",
    label: cost.label ?? null,
  };
}

function serializePosting(posting: PostingJson): JournalPostingPublic {
  return {
    account: posting.account,
    units: posting.units
      ? serializeAmount(posting.units)
      : { number: "", currency: "" },
    cost: serializeCost(posting),
    price: posting.price ? serializeAmount(posting.price) : null,
    meta: serializeMeta(posting.meta),
    flag: posting.flag ?? null,
  };
}

/**
 * Flatten a rustledger `TypedValueJson` into the DTO's `CustomValue` space —
 * matches `serialize_custom_value`: an `Amount` becomes `{number,currency}`,
 * everything else (string/account/currency/tag/link/date/number/bool/null) is
 * its raw scalar. `date`/`number` stay as their stringified form (matching
 * `str(date)`/`str(Decimal)`).
 */
function serializeCustomValue(
  value: TypedValueJson,
): string | number | boolean | null | JournalAmountPublic {
  if (value.type === "amount") {
    return serializeAmount(value.value);
  }
  return value.value;
}

// --- failed balance assertions --------------------------------------------

/** `Balance failed for Assets:Cash: expected 50.00 USD, got 49.75 USD` (E2001). */
const BALANCE_FAILED =
  /^Balance failed for (\S+): expected (-?[\d.]+) (\S+), got (-?[\d.]+) (\S+)$/;

/**
 * `Balance exceeds explicit tolerance for Assets:Cash: expected 99.995 USD ~
 * 0.001, got 100.00 USD (difference: 0.005)` (E2002): an assertion that wrote
 * its own `~ tolerance` fails with this, not with E2001 (w21/533).
 */
const TOLERANCE_FAILED =
  /^Balance exceeds explicit tolerance for (\S+): expected (-?[\d.]+) (\S+) ~ ([\d.]+), got (-?[\d.]+) (\S+)(?: \(difference: .*\))?$/;

/** `got − expected`, exactly, at the finer of the two written scales. */
function subtractDecimal(got: string, expected: string): string {
  const scale = Math.max(
    new BigNumber(got).decimalPlaces() ?? 0,
    new BigNumber(expected).decimalPlaces() ?? 0,
    (got.split(".")[1] ?? "").length,
    (expected.split(".")[1] ?? "").length,
  );
  return new BigNumber(got).minus(expected).toFixed(scale);
}

/** The same quantity however it was written: `50`, `50.0` and `50.00`. */
function decimalKey(number: string): string {
  return new BigNumber(number).toFixed();
}

/** What an assertion and its error share: the explicit tolerance is part of it. */
function assertionKey(
  account: string,
  amount: string,
  currency: string,
  tolerance: string,
): string {
  return `${account}\u0000${decimalKey(amount)}\u0000${currency}\u0000${tolerance === "" ? "" : decimalKey(tolerance)}`;
}

/**
 * Each failing Balance directive's `diff_amount` (actual − expected), joined
 * from the validator's `E2001` and `E2002` errors, which name the account and both
 * amounts but carry no date. A key (account, asserted amount) shared by more
 * assertions than errors cannot say which of them failed, so those stay null
 * rather than mark a passing assertion failed; otherwise errors pair with
 * their assertions in date order. The validator checks assertions in date
 * order, so that is the order its errors come in whatever line each sits on: a
 * file that is not in date order (a backdated assertion appended last) put the
 * errors by line against the assertions by date and swapped their differences
 * (w21/532).
 */
export function failedBalanceDiffs(
  directives: readonly DirectiveJson[],
  errors: readonly {
    message: string;
    code?: string | null;
    file?: string | null;
    line?: number | null;
    date?: string;
  }[],
): Map<DirectiveJson, JournalAmountPublic> {
  const failures = new Map<
    string,
    { diff: JournalAmountPublic; date?: string }[]
  >();
  for (const error of errors) {
    const message = error.message.trim();
    let account: string;
    let expected: string;
    let currency: string;
    let got: string;
    let gotCurrency: string;
    let tolerance = "";
    if (error.code === "E2001") {
      const match = BALANCE_FAILED.exec(message);
      if (!match) continue;
      [, account, expected, currency, got, gotCurrency] = match;
    } else if (error.code === "E2002") {
      const match = TOLERANCE_FAILED.exec(message);
      if (!match) continue;
      [, account, expected, currency, tolerance, got, gotCurrency] = match;
    } else {
      continue;
    }
    if (gotCurrency !== currency) continue;
    const key = assertionKey(account, expected, currency, tolerance);
    const list = failures.get(key) ?? [];
    list.push({
      diff: { number: subtractDecimal(got, expected), currency },
      date: error.date,
    });
    failures.set(key, list);
  }
  const diffs = new Map<DirectiveJson, JournalAmountPublic>();
  if (failures.size === 0) return diffs;

  const assertions = new Map<string, DirectiveJson[]>();
  for (const directive of directives) {
    if (directive.type !== "balance") continue;
    const key = assertionKey(
      directive.account,
      directive.amount.number,
      directive.amount.currency,
      directive.tolerance ?? "",
    );
    if (!failures.has(key)) continue;
    const list = assertions.get(key) ?? [];
    list.push(directive);
    assertions.set(key, list);
  }
  for (const [key, list] of failures) {
    const candidates = assertions.get(key) ?? [];
    // Failures that name their assertion's date pair with it, however many
    // other assertions share the amount (w21/677).
    if (list.every((failure) => failure.date !== undefined)) {
      for (const failure of list) {
        const match = candidates.filter(
          (directive) => directive.date === failure.date,
        );
        if (match.length === 1) diffs.set(match[0], failure.diff);
      }
      continue;
    }
    if (candidates.length !== list.length) continue;
    const dated = [...candidates].sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
    );
    dated.forEach((directive, i) => diffs.set(directive, list[i].diff));
  }
  return diffs;
}

// --- serializeDirective ---------------------------------------------------

/**
 * Serialize a rustledger `DirectiveJson` into a journal item — parity for
 * `serialize_directive`. A `query` directive (which fava-slim has no dedicated
 * schema for) is not emitted by `getJournal`; if one is passed we serialize it
 * as a `Custom`-typed item so the union stays exhaustive.
 */
export function serializeDirective(
  directive: DirectiveJson,
  balanceDiffs?: ReadonlyMap<DirectiveJson, JournalAmountPublic>,
): JournalItem {
  const date = directive.date;
  const directive_type = DIRECTIVE_TYPE_BY_TAG[directive.type];
  const entry_hash = hashEntry(directive);
  const meta = serializeMeta(directive.meta);

  switch (directive.type) {
    case "transaction":
      return {
        entry_hash,
        directive_type,
        date,
        meta,
        flag: directive.flag,
        payee: directive.payee ?? null,
        // beancount narration is always a string — fava emits '' (never null);
        // live-verified on bean-example (big-ledger bake-off caught this)
        narration: directive.narration ?? "",
        postings: directive.postings.map(serializePosting),
        tags: [...directive.tags],
        links: [...directive.links],
      };
    case "balance":
      return {
        entry_hash,
        directive_type,
        date,
        meta,
        account: directive.account,
        amount: serializeAmount(directive.amount),
        tolerance: directive.tolerance ?? null,
        diff_amount: balanceDiffs?.get(directive) ?? null,
      };
    case "commodity":
      return {
        entry_hash,
        directive_type,
        date,
        meta,
        currency: directive.currency,
      };
    case "close":
      return {
        entry_hash,
        directive_type,
        date,
        meta,
        account: directive.account,
      };
    case "custom":
      return {
        entry_hash,
        directive_type,
        date,
        meta,
        type: directive.custom_type,
        values: (directive.values ?? []).map(
          serializeCustomValue,
        ) as JournalCustomPublic["values"],
      };
    case "document":
      return {
        entry_hash,
        directive_type,
        date,
        meta,
        filename: directive.path,
        account: directive.account,
        tags: directive.tags ? [...directive.tags] : [],
        links: directive.links ? [...directive.links] : [],
      };
    case "event":
      return {
        entry_hash,
        directive_type,
        date,
        meta,
        type: directive.event_type,
        description: directive.value,
      };
    case "note":
      return {
        entry_hash,
        directive_type,
        date,
        meta,
        account: directive.account,
        comment: directive.comment,
      };
    case "open":
      return {
        entry_hash,
        directive_type,
        date,
        meta,
        account: directive.account,
        currencies:
          directive.currencies.length > 0 ? [...directive.currencies] : null,
        booking: directive.booking ?? null,
      };
    case "pad":
      return {
        entry_hash,
        directive_type,
        date,
        meta,
        account: directive.account,
        source_account: directive.source_account,
      };
    case "price":
      return {
        entry_hash,
        directive_type,
        date,
        meta,
        currency: directive.currency,
        amount: serializeAmount(directive.amount),
      };
    case "query":
      return {
        entry_hash,
        directive_type,
        date,
        meta,
        type: directive.name,
        values: [directive.query_string],
      };
    default:
      throw new Error(
        `Unknown directive type: ${(directive as { type: string }).type}`,
      );
  }
}

// --- filters --------------------------------------------------------------

/** Filter by `directive_type` — parity for `getJournal`'s `directive_types` filter. */
export function filterDirectiveTypes(
  item: JournalItem,
  types: DirectiveType[],
): boolean {
  if (types.length === 0) return true;
  return types.includes(item.directive_type);
}

/** Parity for `filter_transaction_subtypes`. Non-transactions pass through. */
export function filterTransactionSubtypes(
  item: JournalItem,
  subtypes: TransactionSubtype[],
): boolean {
  if (subtypes.length === 0) return true;
  if (item.directive_type !== ("Transaction" as DirectiveType)) return true;
  const flag = (item as JournalTransactionPublic).flag;
  if (subtypes.includes(TransactionSubtype.Cleared) && flag === "*")
    return true;
  if (subtypes.includes(TransactionSubtype.Pending) && flag === "!")
    return true;
  return (
    subtypes.includes(TransactionSubtype.Other) && flag !== "*" && flag !== "!"
  );
}

/** Parity for `filter_document_subtypes`. Non-documents pass through. */
export function filterDocumentSubtypes(
  item: JournalItem,
  subtypes: DocumentSubtype[],
): boolean {
  if (subtypes.length === 0) return true;
  if (item.directive_type !== ("Document" as DirectiveType)) return true;
  const tags = (item as JournalDocumentPublic).tags ?? [];
  if (
    subtypes.includes(DocumentSubtype.Discovered) &&
    tags.includes("discovered")
  ) {
    return true;
  }
  return subtypes.includes(DocumentSubtype.Linked) && tags.includes("linked");
}

/** Parity for `filter_custom_subtypes`. Non-customs pass through. */
export function filterCustomSubtypes(
  item: JournalItem,
  subtypes: CustomSubtype[],
): boolean {
  if (subtypes.length === 0) return true;
  if (item.directive_type !== ("Custom" as DirectiveType)) return true;
  return (
    subtypes.includes(CustomSubtype.Budget) &&
    (item as JournalCustomPublic).type === "budget"
  );
}

/** Optional display selectors shared by journal and account-journal reads. */
export type JournalDisplayFilters = {
  directiveTypes?: DirectiveType[];
  transactionSubtypes?: TransactionSubtype[];
  documentSubtypes?: DocumentSubtype[];
  customSubtypes?: CustomSubtype[];
};

/**
 * Apply the main journal's omitted/empty-list semantics: absent or empty
 * selector lists do not restrict; non-empty lists keep matching rows only.
 */
export function matchesJournalDisplayFilters(
  item: JournalItem,
  filters: JournalDisplayFilters,
): boolean {
  if (
    filters.directiveTypes?.length &&
    !filterDirectiveTypes(item, filters.directiveTypes)
  ) {
    return false;
  }
  if (
    filters.transactionSubtypes?.length &&
    !filterTransactionSubtypes(item, filters.transactionSubtypes)
  ) {
    return false;
  }
  if (
    filters.documentSubtypes?.length &&
    !filterDocumentSubtypes(item, filters.documentSubtypes)
  ) {
    return false;
  }
  if (
    filters.customSubtypes?.length &&
    !filterCustomSubtypes(item, filters.customSubtypes)
  ) {
    return false;
  }
  return true;
}

// --- directiveToText (plaintext journal) ----------------------------------

const CURRENCY_COLUMN = 61;
const INDENT = "  ";
const META_IGNORE = new Set(["filename", "lineno"]);
// Matches `fava.core.misc.ALIGN_RE`.
const ALIGN_RE =
  /^([^";]*?)\s+([-+]?\s*[\d,]+(?:\.\d*)?)\s+([A-Z][A-Z0-9'._-]{0,22}[A-Z0-9]\b.*)$/;
// Matches beancount `align_position_strings`' currency-search (first uppercase).
const FIRST_UPPER_RE = /[A-Z]/;

function escapeString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * beancount renders non-string meta literals UNQUOTED (`amortize_months: 3`,
 * `effective: 2024-01-01`), but rustledger's wire stringifies them
 * (`MetaValueJson` has no number/date variant), so a `3` arrives
 * indistinguishable from `"3"`. Render number/date-shaped strings unquoted —
 * matching the Python printer for the overwhelmingly-common case (numeric
 * plugin meta like `amortize_months`). Caveat (documented): a source value
 * that was a QUOTED numeric string round-trips to the unquoted literal.
 */
const NUMBER_LITERAL_RE = /^-?\d+(\.\d+)?$/;
const DATE_LITERAL_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * How `directiveToText` treats string metadata. Re-serializing a parsed entry
 * must guess (see above); a caller's own entry states its values as strings,
 * and guessing turned `"00123"` into the number `123` (w23/053).
 */
export interface DirectiveTextOptions {
  /** Quote every string meta value, never reading it as a number or date. */
  readonly literalStringMeta?: boolean;
}

/** Port of beancount `EntryPrinter.write_metadata` (excluding filename/lineno/dunder). */
function renderMetadata(
  meta: Record<string, MetaValueJson> | undefined,
  prefix: string,
  options: DirectiveTextOptions = {},
): string {
  if (!meta) return "";
  let out = "";
  Object.keys(meta).forEach((key) => {
    if (META_IGNORE.has(key) || key.startsWith("__")) return;
    const value = meta[key];
    let valueStr: string;
    if (typeof value === "string") {
      valueStr =
        !options.literalStringMeta &&
        (NUMBER_LITERAL_RE.test(value) || DATE_LITERAL_RE.test(value))
          ? value
          : `"${escapeString(value)}"`;
    } else if (typeof value === "boolean") {
      valueStr = value ? "TRUE" : "FALSE";
    } else if (value === null) {
      valueStr = "";
    } else {
      // amount-shaped meta → `str(Amount)`
      valueStr = `${value.number} ${value.currency}`;
    }
    out += `${prefix}${key}: ${valueStr}\n`;
  });
  return out;
}

/** Render a posting's position string (`units [{cost}] [@ price]`). */
function renderPositionString(posting: PostingJson): string {
  if (!posting.units) return "";
  let str = `${posting.units.number} ${posting.units.currency}`;
  if (posting.cost) {
    const parts: string[] = [];
    if (posting.cost.number) {
      const perUnit = costNumberToPerUnit(
        posting.cost.number,
        posting.units.number,
      );
      parts.push(`${perUnit} ${posting.cost.currency ?? ""}`.trim());
    }
    if (posting.cost.date) parts.push(posting.cost.date);
    if (posting.cost.label) parts.push(`"${posting.cost.label}"`);
    str = `${str} {${parts.join(", ")}}`;
  }
  if (posting.price) {
    str += ` @ ${posting.price.number} ${posting.price.currency}`;
  }
  return str;
}

/** Port of beancount `align_position_strings`: align on the first currency char. */
function alignPositionStrings(strings: string[]): {
  aligned: string[];
  width: number;
} {
  let maxBefore = 0;
  let maxAfter = 0;
  let maxUnknown = 0;
  const items: Array<[number | null, string]> = [];
  strings.forEach((str) => {
    const match = FIRST_UPPER_RE.exec(str);
    if (match && match.index !== 0) {
      const index = match.index;
      maxBefore = Math.max(index, maxBefore);
      maxAfter = Math.max(str.length - index, maxAfter);
      items.push([index, str]);
    } else {
      maxUnknown = Math.max(str.length, maxUnknown);
      items.push([null, str]);
    }
  });
  const maxTotal = Math.max(maxBefore + maxAfter, maxUnknown);
  const maxAfterPrime = maxTotal - maxBefore;
  const aligned = items.map(([index, str]) => {
    if (index !== null) {
      const before = str.slice(0, index).padStart(maxBefore);
      const after = str.slice(index).padEnd(maxAfterPrime);
      return `${before}${after}`;
    }
    return str.padEnd(maxTotal);
  });
  return { aligned, width: maxTotal };
}

function padEnd(value: string, width: number): string {
  return value.length >= width ? value : value.padEnd(width);
}

/** Sorted `#tag`/`^link` suffix, matching `sorted(tags)` then `sorted(links)`. */
function tagsLinksSuffix(tags: string[], links: string[]): string {
  const parts = [
    ...[...tags].sort().map((tag) => `#${tag}`),
    ...[...links].sort().map((link) => `^${link}`),
  ];
  return parts.join("");
}

function renderTransaction(
  directive: Extract<DirectiveJson, { type: "transaction" }>,
  options: DirectiveTextOptions,
): string {
  const header: string[] = [];
  if (directive.payee) header.push(`"${escapeString(directive.payee)}"`);
  if (directive.narration) {
    header.push(`"${escapeString(directive.narration)}"`);
  } else if (directive.payee) {
    header.push('""');
  }
  [...directive.tags].sort().forEach((tag) => header.push(`#${tag}`));
  [...directive.links].sort().forEach((link) => header.push(`^${link}`));

  let out = `${directive.date} ${directive.flag} ${header.join(" ")}\n`;
  out += renderMetadata(directive.meta, INDENT, options);

  const accounts = directive.postings.map((posting) => {
    const flag = posting.flag ? `${posting.flag} ` : "";
    return `${flag}${posting.account}`;
  });
  const widthAccount =
    accounts.length > 0
      ? Math.max(...accounts.map((account) => account.length))
      : 1;
  const positions = directive.postings.map(renderPositionString);
  const { aligned, width } = alignPositionStrings(positions);
  const widthPosition = Math.max(1, width);

  directive.postings.forEach((posting, index) => {
    const line = `${INDENT}${padEnd(accounts[index], widthAccount)}  ${padEnd(
      aligned[index],
      widthPosition,
    )}`;
    out += `${line.replace(/\s+$/, "")}\n`;
    out += renderMetadata(posting.meta, "    ", options);
  });
  return out;
}

/**
 * Per-directive plaintext — parity for `fava.beans.str.to_string(entry, _indent=2)`
 * (a beancount `EntryPrinter` render + `fava.core.misc.align` to column 61, with
 * trailing whitespace stripped per line). See PARITY NOTES on number formatting.
 */
export function directiveToText(
  directive: DirectiveJson,
  options: DirectiveTextOptions = {},
): string {
  let raw: string;
  switch (directive.type) {
    case "transaction":
      raw = renderTransaction(directive, options);
      break;
    case "balance": {
      const account = padEnd(directive.account, 47);
      const tolerance = directive.tolerance ? `~ ${directive.tolerance} ` : "";
      raw =
        `${directive.date} balance ${account} ${directive.amount.number} ${tolerance}${directive.amount.currency}\n` +
        renderMetadata(directive.meta, INDENT, options);
      break;
    }
    case "open": {
      const account = padEnd(directive.account, 47);
      const currencies = directive.currencies.join(",");
      const booking = directive.booking ? `"${directive.booking}"` : "";
      raw =
        `${directive.date} open ${account} ${currencies} ${booking}`.replace(
          /\s+$/,
          "",
        ) +
        "\n" +
        renderMetadata(directive.meta, INDENT, options);
      break;
    }
    case "close":
      raw =
        `${directive.date} close ${directive.account}\n` +
        renderMetadata(directive.meta, INDENT, options);
      break;
    case "commodity":
      raw =
        `${directive.date} commodity ${directive.currency}\n` +
        renderMetadata(directive.meta, INDENT, options);
      break;
    case "pad":
      raw =
        `${directive.date} pad ${directive.account} ${directive.source_account}\n` +
        renderMetadata(directive.meta, INDENT, options);
      break;
    case "note": {
      const { tags = [], links = [] } = directive as SourceSyntax;
      const suffix = tagsLinksSuffix(tags, links);
      raw =
        `${directive.date} note ${directive.account} "${escapeString(
          directive.comment,
        )}"${suffix ? ` ${suffix}` : ""}\n` +
        renderMetadata(directive.meta, INDENT, options);
      break;
    }
    case "document": {
      const tags = directive.tags ?? [];
      const links = directive.links ?? [];
      const suffix = tagsLinksSuffix(tags, links);
      raw =
        `${directive.date} document ${directive.account} "${escapeString(
          directive.path,
        )}"${suffix ? ` ${suffix}` : ""}\n` +
        renderMetadata(directive.meta, INDENT, options);
      break;
    }
    case "price": {
      const currency = padEnd(directive.currency, 22);
      const amount = `${directive.amount.number} ${directive.amount.currency}`;
      const paddedAmount = amount.length >= 22 ? amount : amount.padStart(22);
      raw =
        `${directive.date} price ${currency} ${paddedAmount}\n` +
        renderMetadata(directive.meta, INDENT, options);
      break;
    }
    case "event":
      raw =
        `${directive.date} event "${escapeString(
          directive.event_type,
        )}" "${escapeString(directive.value)}"\n` +
        renderMetadata(directive.meta, INDENT, options);
      break;
    case "query":
      raw =
        `${directive.date} query "${escapeString(
          directive.name,
        )}" "${escapeString(directive.query_string)}"\n` +
        renderMetadata(directive.meta, INDENT, options);
      break;
    case "custom": {
      const values = (directive.values ?? []).map(renderCustomValueText);
      raw =
        `${directive.date} custom "${escapeString(directive.custom_type)}" ${values.join(" ")}\n`.replace(
          / \n$/,
          "\n",
        ) + renderMetadata(directive.meta, INDENT, options);
      break;
    }
    default:
      throw new Error(
        `Unknown directive type: ${(directive as { type: string }).type}`,
      );
  }
  return stripAndAlign(raw);
}

/** Render one custom value for plaintext — parity for `EntryPrinter.Custom`. */
function renderCustomValueText(value: TypedValueJson): string {
  switch (value.type) {
    case "account":
    case "currency":
      return value.value;
    case "string":
    case "tag":
    case "link":
      return `"${escapeString(value.value)}"`;
    case "number":
      return value.value;
    case "date":
      return value.value;
    case "bool":
      return value.value ? "TRUE" : "FALSE";
    case "amount":
      return `${value.value.number} ${value.value.currency}`;
    case "null":
      return "";
    default:
      return "";
  }
}

/** Port of `fava.core.misc.align` + the per-line rstrip in `to_string`. */
function stripAndAlign(raw: string): string {
  const lines = raw.split("\n");
  // `splitlines()` drops the trailing empty produced by a final "\n"; but the
  // printer always ends with "\n" and `align` re-appends one per input line and
  // `to_string` finally rstrips per line and joins with "\n". Reproduce the net
  // effect: align content lines, keep the trailing newline.
  const hadTrailingNewline = raw.endsWith("\n");
  const content = hadTrailingNewline ? lines.slice(0, -1) : lines;
  // Text inside a quoted string is the user's, not layout: a narration line
  // ending in "2 x Milk 3.50 EUR" was padded to the currency column, and
  // trailing spaces and \r dropped, silently changing what was typed
  // (w21/191). A line that starts inside a string is not aligned, and one that
  // ends inside it is not stripped.
  let inside = false;
  const alignedLines = content.map((line) => {
    const startsInside = inside;
    inside = endsInsideString(line, startsInside);
    if (startsInside) return line;
    const match = ALIGN_RE.exec(line);
    if (match) {
      const [, prefix, number, rest] = match;
      const numSpaces = CURRENCY_COLUMN - prefix.length - number.length - 4;
      const spaces = numSpaces > 0 ? " ".repeat(numSpaces) : "";
      return `${prefix}${spaces}  ${number} ${rest}`;
    }
    return line;
  });
  inside = false;
  const rstripped = alignedLines.map((line) => {
    const startsInside = inside;
    inside = endsInsideString(line, startsInside);
    return inside ? line : line.replace(/\s+$/, "");
  });
  return rstripped.join("\n") + (hadTrailingNewline ? "\n" : "");
}
