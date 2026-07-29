/**
 * CSV validation utilities
 */

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDateFormat(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

/**
 * Parse and validate date
 */
export function parseDate(dateStr: string): {
  valid: boolean;
  date?: Date;
  error?: string;
} {
  if (!isValidDateFormat(dateStr)) {
    return { valid: false, error: "Invalid date format. Expected YYYY-MM-DD" };
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return { valid: false, error: "Invalid date value" };
  }

  return { valid: true, date };
}

/**
 * Validate and parse amount
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

  const amount = parseFloat(trimmed);

  if (isNaN(amount) || !isFinite(amount)) {
    return { valid: false, error: "Amount must be a valid number" };
  }

  return { valid: true, amount };
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
