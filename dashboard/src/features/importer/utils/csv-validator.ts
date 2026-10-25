/**
 * CSV validation utilities
 */

import type { ParsedRow } from "../types";
import { parseDecimalNumber } from "@/common/lib/beancount/decimal-number";

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDateFormat(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Parse and validate a ledger calendar date (`YYYY-MM-DD`).
 *
 * Validation is pure Gregorian arithmetic (month length plus the leap rule) —
 * never a `Date` round-trip. Constructing `new Date(y, m - 1, d)` and comparing
 * the local getters rejects calendar days that simply do not exist as a local
 * instant in the browser's zone: Pacific/Apia skipped 1900-01-01 and the whole
 * of 2011-12-30 in the dateline jump, so a perfectly valid ledger date was
 * reported "Invalid date value" there. Impossible calendar days (Apr 31,
 * Feb 29 outside a leap year) are still rejected.
 *
 * The canonical `YYYY-MM-DD` string is what travels onward through preview →
 * configure → submit; no `Date` instant is produced, so no zone can shift it.
 */
export function parseDate(dateStr: string): {
  valid: boolean;
  isoDate?: string;
  error?: string;
} {
  if (!isValidDateFormat(dateStr)) {
    return { valid: false, error: "Invalid date format. Expected YYYY-MM-DD" };
  }

  const [year, month, day] = dateStr.split("-").map(Number);

  if (year < 1 || month < 1 || month > 12) {
    return { valid: false, error: "Invalid date value" };
  }

  const maxDay =
    month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1];
  if (day < 1 || day > maxDay) {
    return { valid: false, error: "Invalid date value" };
  }

  return { valid: true, isoDate: dateStr };
}

/** Why `parseAmount` rejected a token — structured, not an English substring. */
export type AmountParseFailureReason =
  | "empty"
  | "invalid"
  | "unsupported-precision";

export type AmountParseResult = {
  valid: boolean;
  amount?: number;
  /**
   * The exact plain decimal the token denotes, digits as written: `-1,234.56`
   * is `-1234.56`, `(12.50)` is `-12.50`, comma-decimal `-1.000` is `-1000`.
   * This, never the raw token, is what an import writes.
   */
  decimal?: string;
  error?: string;
  reason?: AmountParseFailureReason;
};

/**
 * Canonical exact-decimal key for value equality: significand×10^power with
 * no leading/trailing zeros (signed zero → `"0"`). Equivalent spellings such
 * as `1.2500`, `+2.5e1`, and `-0.0` collapse to the same key.
 */
function exactDecimalValueKey(text: string): string | null {
  const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(
    text.trim(),
  );
  if (!match) return null;
  const [, signChar, whole = "", fraction = "", expText] = match;
  if (whole === "" && fraction === "") return null;

  const exp = expText === undefined ? 0 : Number(expText);
  if (!Number.isFinite(exp)) return null;

  let digits = whole + fraction;
  let power = exp - fraction.length;
  digits = digits.replace(/^0+/, "");
  if (digits === "") return "0";

  while (digits.endsWith("0")) {
    digits = digits.slice(0, -1);
    power += 1;
  }

  const sign = signChar === "-" ? "-" : "";
  return `${sign}${digits}e${power}`;
}

function decimalsHaveSameValue(a: string, b: string): boolean {
  const left = exactDecimalValueKey(a);
  const right = exactDecimalValueKey(b);
  return left !== null && right !== null && left === right;
}

// Bank amount spellings, ported from the CLI's `csv_mapper.py` so one export
// imports the same way through `bea import --csv` and Smart Import (w0/007).
const ZERO_WIDTH = /[\u200b\u2060\ufeff]/g;
const THOUSAND_FILLER = /[\s'\u2019]/g;
const CURRENCY_SYMBOL = /^\p{Sc}$/u;
const EU_GROUPING = /^\d{1,3}(?:\.\d{3})+$/;
// One comma and any digit count but three: never a thousands group.
const COMMA_DECIMAL_TAIL = /^[^,]*,(?:\d{1,2}|\d{4,})$/;
// Point-decimal comma groupings: 1,234,567 and Indian 12,34,567.
const COMMA_GROUPING =
  /^(?:[1-9]\d{0,2}(?:,\d{3})+|[1-9]\d?(?:,\d{2})*,\d{3})$/;
const SINGLE_COMMA_THREE = /^\d+,\d{3}$/;
// Two or more dot groups (`1.650.000`): no convention writes two decimal
// points, so the cell proves dot grouping (the CLI's w5/753).
const DOT_GROUPING_TWO = /^[1-9]\d{0,2}(?:\.\d{3}){2,}$/;

// Symbols that name the currency a row must post, ported from the CLI's
// `_SYMBOL_CURRENCIES` (w3/421, w4/m44). `£` is also GIP, FKP, SHP and EGP,
// and `₩` is also KPW, so those accept any currency they name. `$` (dollars
// of a dozen countries) and `¥` (JPY and CNY) are deliberately absent: they
// say nothing a row can be refused over, and every `$` column keeps importing.
const SYMBOL_CURRENCIES: Record<string, readonly string[]> = {
  "€": ["EUR"],
  "£": ["GBP", "GIP", "FKP", "SHP", "EGP"],
  "₹": ["INR"],
  "₽": ["RUB"],
  "₩": ["KRW", "KPW"],
  "₪": ["ILS"],
  "₺": ["TRY"],
  "₫": ["VND"],
  "₴": ["UAH"],
  "฿": ["THB"],
  "₱": ["PHP"],
  "₦": ["NGN"],
  "₾": ["GEL"],
  "₸": ["KZT"],
  "₮": ["MNT"],
  "₼": ["AZN"],
  "₲": ["PYG"],
  // ₿ (U+20BF), ₭ (LAK) and ៛ (KHR) are unambiguous source units the sign
  // splitter already strips; without entries here a USD import silently
  // replaced them (w4/1059).
  "₿": ["BTC"],
  "₭": ["LAK"],
  "៛": ["KHR"],
};

type AmountCurrencySymbol = {
  symbol: string;
  currencies: readonly string[];
};

/**
 * Every distinct symbol an amount cell carries, in order, with the currencies
 * it names. All of them are read: `-£4.50€` agrees with GBP only if the euro
 * is ignored (w4/1002, the CLI's w5/927).
 */
export function amountCurrencySymbols(value: string): AmountCurrencySymbol[] {
  const found = new Map<string, readonly string[]>();
  for (const character of value) {
    const currencies = SYMBOL_CURRENCIES[character];
    if (currencies && !found.has(character)) found.set(character, currencies);
  }
  return [...found].map(([symbol, currencies]) => ({ symbol, currencies }));
}

type SplitAmount = { sign: string; core: string; negations: number };

/**
 * Split the sign, currency symbols, accounting parentheses and a trailing
 * minus off an amount cell, leaving an unsigned core for the grouping checks.
 */
function splitAmountSign(value: string): SplitAmount {
  let text = value
    .replace(ZERO_WIDTH, "")
    .replace(/\u2212/g, "-")
    .trim();
  let negations = 0;
  if (text.length >= 2 && text.startsWith("(") && text.endsWith(")")) {
    negations += 1;
    text = text.slice(1, -1).trim();
  }
  let sign = "";
  if (text[0] === "+" || text[0] === "-") {
    sign = text[0];
    text = text.slice(1);
  }
  let trailingMinusSeen = false;
  for (let i = 0; i < 4; i += 1) {
    text = text.trim();
    if (!text) break;
    if (CURRENCY_SYMBOL.test(text[0])) {
      text = text.slice(1);
    } else if (CURRENCY_SYMBOL.test(text[text.length - 1])) {
      text = text.slice(0, -1);
    } else if (text.endsWith("-") && !trailingMinusSeen) {
      trailingMinusSeen = true;
      negations += 1;
      text = text.slice(0, -1);
    } else {
      break;
    }
  }
  text = text.trim();
  if (text.length >= 2 && text.startsWith("(") && text.endsWith(")")) {
    negations += 1;
    text = text.slice(1, -1).trim();
  }
  if (!sign && (text[0] === "+" || text[0] === "-")) {
    sign = text[0];
    text = text.slice(1);
  }
  return { sign, core: text.trim(), negations };
}

type SeparatorVote = "us" | "eu" | "eu-weak" | null;

/**
 * One cell's evidence for the column's decimal mark. The grouping fillers the
 * parser removes (spaces, apostrophes) go first, so `1 234,567` votes as
 * `1234,567` does: the vote saw one shape and the parse another, and the
 * column fell back to point decimals and refused the row (w4/1054, the CLI's
 * w5/906).
 */
function separatorVote(rawCore: string): SeparatorVote {
  const core = rawCore.replace(THOUSAND_FILLER, "");
  if (core.includes(".") && core.includes(",")) {
    return core.lastIndexOf(",") > core.lastIndexOf(".") ? "eu" : "us";
  }
  if (COMMA_DECIMAL_TAIL.test(core)) return "eu-weak";
  if (SINGLE_COMMA_THREE.test(core) && !COMMA_GROUPING.test(core)) return "eu";
  // `1.234.567` proves dot grouping, so its column reads `1.250` as 1250,
  // not 1.25 (w4/1054).
  if (DOT_GROUPING_TWO.test(core)) return "eu";
  return null;
}

export type DecimalConvention =
  | { decimalComma: boolean; mixed: false }
  | { decimalComma: false; mixed: true };

/**
 * Decide one amount column's decimal mark from every cell, as the CLI does:
 * any cell that proves comma decimals (`1.000,00`, `0,125`) makes the column
 * comma-decimal, weak evidence (`-4,50`) counts only when no cell proves
 * point decimals, and a column with both proofs is refused as mixed.
 */
export function resolveDecimalConvention(values: string[]): DecimalConvention {
  let us = false;
  let eu = false;
  let weakEu = false;
  for (const value of values) {
    if (!value.trim()) continue;
    const vote = separatorVote(splitAmountSign(value).core);
    if (vote === "us") us = true;
    else if (vote === "eu") eu = true;
    else if (vote === "eu-weak") weakEu = true;
  }
  if (us && eu) return { decimalComma: false, mixed: true };
  return { decimalComma: eu || (!us && weakEu), mixed: false };
}

/** The plain decimal a bank spelling denotes, or null when it is not one. */
function normalizeBankAmount(
  value: string,
  decimalComma: boolean,
): string | null {
  const { sign, core, negations } = splitAmountSign(value);
  if (negations > 1 || (negations && (sign === "-" || core.startsWith("-")))) {
    return null;
  }
  let text = core.replace(THOUSAND_FILLER, "");
  if (decimalComma) {
    const [whole, ...rest] = text.split(",");
    if (rest.length > 1) return null;
    const fraction = rest[0];
    let wholeDigits = whole;
    if (whole.includes(".")) {
      if (!EU_GROUPING.test(whole)) return null;
      wholeDigits = whole.replace(/\./g, "");
    }
    if (fraction !== undefined && !/^\d+$/.test(fraction)) return null;
    text =
      fraction === undefined
        ? wholeDigits
        : `${wholeDigits || "0"}.${fraction}`;
  } else {
    const [whole, fraction = ""] = text.split(".", 2);
    if (whole.includes(",") && !COMMA_GROUPING.test(whole)) return null;
    if (fraction.includes(",")) return null;
    text = text.replace(/,/g, "");
  }
  const signed = sign + text;
  if (!negations) return signed;
  return signed.startsWith("-")
    ? signed.slice(1)
    : `-${signed.replace(/^\+/, "")}`;
}

/**
 * Validate and parse amount.
 *
 * Accepts a complete signed decimal token (optional fraction/exponent), plus
 * the spellings bank exports use: currency symbols, well-formed thousands
 * groups (`-1,234.56`), accounting parentheses and a trailing minus. With
 * `decimalComma` the column's comma is the decimal mark (`1.000,00`). Trailing
 * junk that `parseFloat` would silently strip (`"12oops"` → 12) is rejected.
 *
 * Also rejects tokens whose `Number` conversion changes the exact decimal
 * value (unsafe integers, excess fraction digits, nonzero underflow to 0).
 * Equivalent spellings (`1.2500`, `+2.5e1`, signed zero) remain valid.
 */
export function parseAmount(
  amountStr: string,
  { decimalComma = false }: { decimalComma?: boolean } = {},
): AmountParseResult {
  const raw = amountStr.trim();
  const trimmed =
    raw === "" ? "" : (normalizeBankAmount(raw, decimalComma) ?? raw);

  if (trimmed === "") {
    return {
      valid: false,
      error: "Amount cannot be empty",
      reason: "empty",
    };
  }

  // Whole-token grammar: optional sign, digits with optional fraction, or
  // leading-dot fraction; optional scientific exponent, after bank spellings
  // have been normalized above.
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) {
    return {
      valid: false,
      error: "Amount must be a valid number",
      reason: "invalid",
    };
  }

  const amount = Number(trimmed);

  if (Number.isNaN(amount) || !Number.isFinite(amount)) {
    return {
      valid: false,
      error: "Amount must be a valid number",
      reason: "invalid",
    };
  }

  // Compare the original decimal value with Number's serialized decimal text.
  // Do not compare two Numbers (both already rounded) or use binary epsilon.
  const serialized = String(amount);
  if (!decimalsHaveSameValue(trimmed, serialized)) {
    return {
      valid: false,
      error: "Amount has unsupported precision",
      reason: "unsupported-precision",
    };
  }

  // Null only past the decimal helper's exponent bound, which no bank writes.
  const decimal = parseDecimalNumber(trimmed);
  if (decimal === null) {
    return {
      valid: false,
      error: "Amount has unsupported precision",
      reason: "unsupported-precision",
    };
  }

  return { valid: true, amount, decimal };
}

export function createParsedRowId(): string {
  return crypto.randomUUID();
}

const MIXED_DECIMAL_ERROR =
  "Amount column mixes point decimals (1,234.56) and comma decimals (1.234,56). Use one convention per column.";

/**
 * Build a ParsedRow from editable field strings, applying the same validators
 * used by the CSV parser so upload and inline edit share one contract. A
 * `decimalMixed` column refuses every amount: no row may resolve
 * `1,234.56` against `1.234,56` alone, as in the CLI importer.
 */
export function buildParsedRow(
  fields: {
    date: string;
    payee: string;
    description: string;
    amountInput: string;
    id?: string;
  },
  {
    decimalComma = false,
    decimalMixed = false,
  }: { decimalComma?: boolean; decimalMixed?: boolean } = {},
): ParsedRow {
  const errors: string[] = [];

  const dateResult = parseDate(fields.date);
  if (!dateResult.valid) {
    errors.push(dateResult.error!);
  }

  const payeeResult = validatePayee(fields.payee);
  if (!payeeResult.valid) {
    errors.push(payeeResult.error!);
  }

  const descResult = validateDescription(fields.description);
  if (!descResult.valid) {
    errors.push(descResult.error!);
  }

  const amountResult = parseAmount(fields.amountInput, { decimalComma });
  if (!amountResult.valid) {
    errors.push(amountResult.error!);
  }
  if (decimalMixed) errors.push(MIXED_DECIMAL_ERROR);
  const amountValid = amountResult.valid && !decimalMixed;

  return {
    id: fields.id ?? createParsedRowId(),
    date: fields.date,
    payee: fields.payee,
    description: fields.description,
    amountInput: fields.amountInput,
    amount: amountValid ? amountResult.amount! : 0,
    amountFailureReason: amountValid
      ? undefined
      : decimalMixed
        ? "invalid"
        : amountResult.reason,
    ...(decimalComma ? { decimalComma } : {}),
    ...(decimalMixed ? { decimalMixed } : {}),
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Validate CSV row format (must have exactly 4 columns)
 */
export function isValidRowFormat(columns: string[]): boolean {
  return columns.length === 4;
}

/** The four fields an import row is built from. */
export type ImportColumnField = "date" | "payee" | "description" | "amount";

/** Accepted header spellings, lowercased, mapped to the field they fill. */
const HEADER_ALIASES = new Map<string, ImportColumnField>([
  ["date", "date"],
  ["payee", "payee"],
  ["description", "description"],
  ["narration", "description"],
  ["amount", "amount"],
]);

const REQUIRED_FIELDS: ImportColumnField[] = [
  "date",
  "payee",
  "description",
  "amount",
];

export type HeaderDetection = {
  /** The first record names columns rather than carrying transaction data. */
  isHeader: boolean;
  /**
   * Recognized field per column position, `null` where the name is unknown.
   * Data rows must be read through this order — a `Date,Payee,Amount,
   * Description` file is legal and must not be destructured positionally.
   */
  fields: (ImportColumnField | null)[];
  /**
   * True when the header names exactly date, payee, description (or narration)
   * and amount, once each, so `fields` maps every import field. A header that
   * is recognized but not supported must be reported, never guessed at.
   */
  supported: boolean;
};

/**
 * Inspect the first CSV record for a supported header row.
 *
 * Matches whole fields against the import schema (`date` plus a companion
 * `payee` / `description` / `amount` / `narration`), not substrings inside
 * transaction text. A first field that is already a calendar date is data.
 * Detection stays position-blind on purpose — reordered exports are common —
 * but the recognized order is reported so values are mapped by name.
 */
export function detectHeaderRow(columns: string[]): HeaderDetection {
  const notHeader: HeaderDetection = {
    isHeader: false,
    fields: [],
    supported: false,
  };

  if (columns.length === 0) return notHeader;

  const normalized = columns.map((column) => column.trim().toLowerCase());
  if (isValidDateFormat(normalized[0])) {
    return notHeader;
  }

  const fields = normalized.map((column) => HEADER_ALIASES.get(column) ?? null);
  const hasDateHeader = fields.includes("date");
  const hasCompanionHeader = fields.some(
    (field) => field !== null && field !== "date",
  );

  if (!hasDateHeader || !hasCompanionHeader) {
    return notHeader;
  }

  const countOf = (field: ImportColumnField) =>
    fields.filter((candidate) => candidate === field).length;

  // One unknown column plus exactly one unfilled *text* field is unambiguous:
  // a `Date,Payee,Memo,Amount` export keeps working without a bespoke alias.
  // Date and amount are never inferred — guessing those invents a wrong
  // calendar day or a wrong monetary value, which is the failure this
  // name-based mapping exists to prevent.
  if (fields.length === REQUIRED_FIELDS.length) {
    const unclaimed = REQUIRED_FIELDS.filter((field) => countOf(field) === 0);
    const unknownIndexes = fields.flatMap((field, index) =>
      field === null ? [index] : [],
    );
    const inferable =
      unclaimed.length === 1 &&
      unknownIndexes.length === 1 &&
      (unclaimed[0] === "description" || unclaimed[0] === "payee");
    if (inferable) {
      fields[unknownIndexes[0]] = unclaimed[0];
    }
  }

  const supported =
    fields.length === REQUIRED_FIELDS.length &&
    REQUIRED_FIELDS.every((required) => countOf(required) === 1);

  return { isHeader: true, fields, supported };
}

/**
 * Validate description
 */
export function validateDescription(description: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = description.trim();

  if (trimmed === "") {
    return { valid: false, error: "Description cannot be empty" };
  }

  return { valid: true };
}

/**
 * Validate payee
 */
export function validatePayee(payee: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = payee.trim();

  if (trimmed === "") {
    return { valid: false, error: "Payee cannot be empty" };
  }

  return { valid: true };
}
