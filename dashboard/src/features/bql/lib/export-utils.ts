import type { QueryResultTable } from "@/graphql/definitions";
import {
  downloadCSV as downloadSecureCSV,
  rowsToCSV,
} from "@/common/lib/export/csv";
import { formatInventoryLikeCell } from "@/common/lib/format/inventory-cell";

/**
 * Format one query cell for CSV: inventory/amount maps become amount strings;
 * other values keep the generic writer's serialization.
 */
function formatExportCell(
  cell: unknown,
  dtype: string | null | undefined,
): unknown {
  const inventoryText = formatInventoryLikeCell(cell, dtype);
  if (inventoryText !== null) {
    return inventoryText;
  }
  return cell;
}

/**
 * Convert query result table to CSV format.
 */
export function tableToCSV(result: QueryResultTable): string {
  const { types, rows } = result;

  if (!types || types.length === 0) {
    return "";
  }

  const formattedRows = rows.map((row) =>
    row.map((cell, index) => formatExportCell(cell, types[index]?.dtype)),
  );

  return rowsToCSV([types.map((type) => type.name), ...formattedRows]);
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
