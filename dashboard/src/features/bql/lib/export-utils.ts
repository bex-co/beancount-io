import type { QueryResultTable } from "@/graphql/definitions";
import {
  downloadCSV as downloadSecureCSV,
  rowsToCSV,
} from "@/common/lib/export/csv";

/**
 * Convert query result table to CSV format.
 */
export function tableToCSV(result: QueryResultTable): string {
  const { types, rows } = result;

  if (!types || types.length === 0) {
    return "";
  }

  return rowsToCSV([types.map((type) => type.name), ...rows]);
}

/**
 * Trigger download of CSV data in the browser.
 */
export function downloadCSV(
  csv: string,
  filename: string = "query_result.csv",
) {
  downloadSecureCSV(csv, filename);
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
