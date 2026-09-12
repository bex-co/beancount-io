/**
 * CSV validation utilities
 */

import type { ParsedRow } from "../types";

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

/**
 * Validate and parse amount.
 *
 * Accepts only a complete signed decimal token (optional fraction/exponent).
 * Rejects grouping commas and trailing junk that `parseFloat` would silently
 * strip (`"-1,234.56"` → -1, `"12oops"` → 12).
 */
export function parseAmount(amountStr: string): {
  valid: boolean;
  amount?: number;
  error?: string;
} {
  const trimmed = amountStr.trim();

  if (trimmed === "") {
    return { valid: false, error: "Amount cannot be empty" };
  }

  // Whole-token grammar: optional sign, digits with optional fraction, or
  // leading-dot fraction; optional scientific exponent. No commas/grouping.
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) {
    return { valid: false, error: "Amount must be a valid number" };
  }

  const amount = Number(trimmed);

  if (isNaN(amount) || !isFinite(amount)) {
    return { valid: false, error: "Amount must be a valid number" };
  }

  return { valid: true, amount };
}

export function createParsedRowId(): string {
  return crypto.randomUUID();
}

/**
 * Build a ParsedRow from editable field strings, applying the same validators
 * used by the CSV parser so upload and inline edit share one contract.
 */
export function buildParsedRow(fields: {
  date: string;
  payee: string;
  description: string;
  amountInput: string;
  id?: string;
}): ParsedRow {
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

  const amountResult = parseAmount(fields.amountInput);
  if (!amountResult.valid) {
    errors.push(amountResult.error!);
  }

  return {
    id: fields.id ?? createParsedRowId(),
    date: fields.date,
    payee: fields.payee,
    description: fields.description,
    amountInput: fields.amountInput,
    amount: amountResult.valid ? amountResult.amount! : 0,
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
