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

/**
 * Parse and validate a ledger calendar date (`YYYY-MM-DD`).
 *
 * Built as a **local** midnight `Date` so `toLocaleDateString` and form
 * displays keep the same calendar day the CSV named. `new Date("YYYY-MM-DD")`
 * is UTC midnight and shifts every date one day earlier for anyone west of
 * Greenwich. Impossible calendar days (Apr 31, Feb 29 outside a leap year)
 * are rejected — JS Date would silently roll them to the next month.
 */
export function parseDate(dateStr: string): {
  valid: boolean;
  date?: Date;
  error?: string;
} {
  if (!isValidDateFormat(dateStr)) {
    return { valid: false, error: "Invalid date format. Expected YYYY-MM-DD" };
  }

  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return { valid: false, error: "Invalid date value" };
  }

  return { valid: true, date };
}

/**
 * Format an import `Date` back to the ledger `YYYY-MM-DD` calendar day.
 *
 * Uses local Y/M/D — never `toISOString().slice(0, 10)`, which is the UTC
 * day and shifts east-of-Greenwich local midnights to the previous date.
 */
export function formatImportDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

/**
 * Build a ParsedRow from editable field strings, applying the same validators
 * used by the CSV parser so upload and inline edit share one contract.
 */
export function buildParsedRow(fields: {
  date: string;
  payee: string;
  description: string;
  amountInput: string;
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

/**
 * Check if a line is a header row
 */
export function isHeaderRow(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    lower.includes("date") &&
    (lower.includes("payee") ||
      lower.includes("description") ||
      lower.includes("amount"))
  );
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
