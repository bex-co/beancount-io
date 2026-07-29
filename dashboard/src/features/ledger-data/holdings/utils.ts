export const csvObjectToString = (obj: object) => {
  return Object.entries(obj)
    .map(([key, value]) => {
      // Check if value is a valid number with more than two decimal places
      const displayValue = formatNumber(value);
      return `${displayValue} ${key}`;
    })
    .join("\r\n");
};

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

  // Create CSV data rows
  const dataRows = rows.map((row) =>
    row
      .map((cell) => {
        // Handle null/undefined values
        if (cell === null || cell === undefined) {
          return '""';
        }
        // For objects, convert to string representation
        const value =
          typeof cell === "object" ? csvObjectToString(cell) : String(cell);
        // Escape quotes and wrap in quotes
        const escapedValue = value.replace(/"/g, '""');
        return `"${escapedValue}"`;
      })
      .join(","),
  );

  return [headerRow, ...dataRows].join("\n");
}

/**
 * Formats a raw cell value from the holdings API response.
 * Intentionally diverges from common/lib/format/format-number.ts: that util
 * accepts a typed number + renderCommas flag; this one accepts unknown (API cells
 * can be strings, null, or booleans) and has no comma option.
 */
export const formatNumber = (value: unknown): string => {
  // Handle null/undefined by returning empty string
  if (value === null || value === undefined) {
    return "";
  }

  const numValue = Number(value);
  if (numValue === 0) {
    return "0";
  }
  const result =
    !isNaN(numValue) &&
    numValue.toString().includes(".") &&
    numValue.toString().split(".")[1]?.length > 2
      ? numValue.toFixed(2)
      : String(value);
  return result;
};

/**
 * Determines if an unknown value is considered "empty"
 * Returns true for: "0", "", {}, 0, false
 * @param value - The value to check
 * @returns true if the value is considered empty, false otherwise
 * @example
 * isEmpty("0") // => true
 * isEmpty("") // => true
 * isEmpty({}) // => true
 * isEmpty(0) // => true
 * isEmpty(false) // => true
 * isEmpty("hello") // => false
 * isEmpty({ key: "value" }) // => false
 * isEmpty(1) // => false
 * isEmpty(true) // => false
 */
export function isEmpty(value: unknown): boolean {
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

  // For all other types (null, undefined, etc.), return false
  return false;
}

export const defaultRowsFilter = (row: unknown[][]): unknown[][] => {
  return row.filter((row) => !row.slice(1).every((o: unknown) => isEmpty(o)));
};

export const holdingsRowsFilter = (row: unknown[][]): unknown[][] => {
  return row.filter(
    (row) =>
      !isEmpty(row[1]) && !row.slice(1).every((o: unknown) => isEmpty(o)),
  );
};
