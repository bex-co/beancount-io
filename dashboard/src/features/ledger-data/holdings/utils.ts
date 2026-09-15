import {
  formatDecimalCell,
  formatInventoryCellText,
} from "@/common/lib/format/inventory-cell";

/** Derived ratio column — rounded for display; quantity columns stay verbatim. */
export const UNREALIZED_PROFIT_PCT_COLUMN = "unrealized_profit_pct";

/** Re-export for Holdings CSV callers and existing tests. */
export const csvObjectToString = formatInventoryCellText;

export { formatDecimalCell };

/**
 * Converts table data (headers and rows) to CSV format
 * @param headers Array of header names
 * @param rows Array of row arrays (cells can be any type)
 * @returns CSV string
 */
export function tableToCSV(
  headers: string[],
  rows: Array<Array<unknown>>,
): string {
  if (!headers || headers.length === 0 || !rows || rows.length === 0) {
    return "";
  }

  // Create CSV header row
  const headerRow = headers.map((header) => `"${header}"`).join(",");

  // Create CSV data rows — percentage column matches on-screen rounding.
  const dataRows = rows.map((row) =>
    row
      .map((cell, cellIndex) => {
        // Handle null/undefined values
        if (cell === null || cell === undefined) {
          return '""';
        }
        // For objects, convert to string representation
        const value =
          typeof cell === "object"
            ? formatInventoryCellText(cell)
            : formatHoldingsCell(cell, headers[cellIndex]);
        // Escape quotes and wrap in quotes
        const escapedValue = value.replace(/"/g, '""');
        return `"${escapedValue}"`;
      })
      .join(","),
  );

  return [headerRow, ...dataRows].join("\n");
}

/**
 * Round a derived percentage for display (two decimals). Exact zeros stay "0";
 * null/empty stay empty; non-numeric text passes through unchanged.
 */
export function formatPercentageCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return "";
    if (/^-?0(?:\.0+)?$/.test(trimmed)) return "0";
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return trimmed;
    if (parsed === 0) return "0";
    return parsed.toFixed(2);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return String(value);
    if (value === 0) return "0";
    return value.toFixed(2);
  }

  return String(value);
}

/**
 * Formats a holdings cell. Quantity/cost/price/value stay lossless; only the
 * unrealized_profit_pct ratio column is rounded for readable comparison.
 */
export function formatHoldingsCell(
  value: unknown,
  columnName?: string,
): string {
  if (columnName === UNREALIZED_PROFIT_PCT_COLUMN) {
    return formatPercentageCell(value);
  }
  return formatDecimalCell(value);
}

/**
 * Formats a raw cell value from the holdings API response.
 * Intentionally diverges from common/lib/format/format-number.ts: that util
 * accepts a typed number + renderCommas flag; this one accepts unknown (API cells
 * can be strings, null, or booleans) and has no comma option.
 */
export const formatNumber = (value: unknown, columnName?: string): string =>
  formatHoldingsCell(value, columnName);

/**
 * Determines if an unknown value is considered "empty"
 * Returns true for: null, undefined, "0", "", {}, 0, false
 */
export function isEmpty(value: unknown): boolean {
  // null / undefined carry no value — treat as empty. A zero-balance holding
  // (e.g. a fully-netted IRAUSD lot) comes back with null average_cost/price
  // columns; without this those nulls would keep the otherwise-empty row and
  // surface a commodity the user doesn't actually hold.
  if (value === null || value === undefined) {
    return true;
  }

  // Check for string "0" or empty string
  if (typeof value === "string") {
    return value === "0" || value === "";
  }

  // Check for number 0
  if (typeof value === "number") {
    return value === 0;
  }

  // Check for boolean false
  if (typeof value === "boolean") {
    return value === false;
  }

  // Check for empty object {}
  if (value !== null && typeof value === "object") {
    // Handle arrays - empty arrays are not considered empty by this function
    if (Array.isArray(value)) {
      return false;
    }
    // Check if object has no own enumerable properties
    return Object.keys(value).length === 0;
  }

  // For all other types (functions, symbols, etc.), return false
  return false;
}

export const defaultRowsFilter = (row: unknown[][]): unknown[][] => {
  return row.filter((row) => !row.slice(1).every((o: unknown) => isEmpty(o)));
};

/** Units is column 0 (by-currency / by-cost-currency). Drop empty inventories. */
export const unitsFirstRowsFilter = (rows: unknown[][]): unknown[][] => {
  return rows.filter(
    (row) =>
      !isEmpty(row[0]) && !row.slice(1).every((o: unknown) => isEmpty(o)),
  );
};

export const holdingsRowsFilter = (row: unknown[][]): unknown[][] => {
  return row.filter(
    (row) =>
      !isEmpty(row[1]) && !row.slice(1).every((o: unknown) => isEmpty(o)),
  );
};
