import type { QueryResultTable } from "@/graphql/definitions";

/**
 * Escape CSV field value.
 * Fields containing quotes, commas, or newlines must be quoted.
 * Quotes inside fields must be escaped with double quotes.
 */
function escapeCSVField(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let str = String(value);

  // Handle objects by converting to JSON string
  if (typeof value === "object") {
    str = JSON.stringify(value);
  }

  // Check if field needs quoting
  const needsQuoting = /[",\n\r]/.test(str);

  if (needsQuoting) {
    // Escape quotes by doubling them
    str = str.replace(/"/g, '""');
    // Wrap in quotes
    str = `"${str}"`;
  }

  return str;
}

/**
 * Convert query result table to CSV format.
 */
export function tableToCSV(result: QueryResultTable): string {
  const { types, rows } = result;

  if (!types || types.length === 0) {
    return "";
  }

  // Header row: column names
  const headers = types.map((type) => escapeCSVField(type.name));
  const csvRows: string[] = [headers.join(",")];

  // Data rows
  rows.forEach((row) => {
    const escapedRow = row.map((cell) => escapeCSVField(cell));
    csvRows.push(escapedRow.join(","));
  });

  return csvRows.join("\n");
}

/**
 * Trigger download of CSV data in the browser.
 */
export function downloadCSV(
  csv: string,
  filename: string = "query_result.csv",
) {
  // Create blob with UTF-8 BOM for Excel compatibility
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });

  // Create download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export query result as CSV file.
 */
export function exportQueryResultAsCSV(
  result: QueryResultTable,
  queryString: string = "",
) {
  const csv = tableToCSV(result);

  // Generate filename from query string or use default
  let filename = "query_result.csv";
  if (queryString) {
    // Extract a clean name from the query (first 30 chars, alphanumeric only)
    const cleanName = queryString
      .slice(0, 30)
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    if (cleanName) {
      filename = `${cleanName}.csv`;
    }
  }

  downloadCSV(csv, filename);
}
