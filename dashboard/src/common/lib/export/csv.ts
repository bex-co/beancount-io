// Cells starting with =, @, tab, or CR — or +/- unless the whole cell is a
// plain number — may be executed as formulas by spreadsheet applications.
const FORMULA_PREFIX = /^[\t\r]|^\s*[=+\-@]/;
const PLAIN_NUMBER = /^[+-]?\d+(?:\.\d+)?$/;

export interface CSVOptions {
  quoteAll?: boolean;
}

/**
 * Force spreadsheet-dangerous text to inert text semantics. CSV quoting alone
 * does not stop formula evaluation (CWE-1236).
 */
export function neutralizeSpreadsheetFormula(value: string): string {
  if (!FORMULA_PREFIX.test(value) || PLAIN_NUMBER.test(value)) {
    return value;
  }

  return `'${value}`;
}

/** Escape one value for a comma-delimited spreadsheet file. */
export function escapeCSVField(
  value: unknown,
  options: CSVOptions = {},
): string {
  if (value === null || value === undefined) {
    return options.quoteAll ? '""' : "";
  }

  const serialized =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  const safeValue = neutralizeSpreadsheetFormula(serialized);
  const needsQuoting = options.quoteAll || /[",\n\r]/.test(safeValue);

  if (!needsQuoting) {
    return safeValue;
  }

  return `"${safeValue.replace(/"/g, '""')}"`;
}

/** Serialize an ordered matrix to CSV without changing its row ordering. */
export function rowsToCSV(
  rows: ReadonlyArray<ReadonlyArray<unknown>>,
  options: CSVOptions = {},
): string {
  return rows
    .map((row) => row.map((value) => escapeCSVField(value, options)).join(","))
    .join("\n");
}

/**
 * Download UTF-8 CSV with a BOM for reliable Unicode handling in Excel.
 * The temporary object URL is always revoked, including when click() throws.
 */
export function createCSVBlob(csvContent: string): Blob {
  return new Blob(["\uFEFF", csvContent], {
    type: "text/csv;charset=utf-8;",
  });
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = createCSVBlob(csvContent);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  let appended = false;
  try {
    document.body.appendChild(link);
    appended = true;
    link.click();
  } finally {
    try {
      if (appended) {
        document.body.removeChild(link);
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
