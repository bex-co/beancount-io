import {
  downloadCSV as downloadSecureCSV,
  rowsToCSV,
} from "@/common/lib/export/csv";

/**
 * Converts an array of objects to CSV format
 * @param data Array of objects to convert
 * @param headers Optional headers array, if not provided will use object keys
 * @returns CSV string
 */
export function arrayToCSV<T extends Record<string, unknown>>(
  data: T[],
  headers?: string[],
): string {
  if (!data || data.length === 0) {
    return "";
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);

  return rowsToCSV(
    [
      csvHeaders,
      ...data.map((row) =>
        csvHeaders.map((header) => {
          const value = row[header];
          // Preserve this legacy helper's String(value) contract. The shared
          // serializer still owns quoting and spreadsheet-formula safety.
          return typeof value === "object" && value !== null
            ? String(value)
            : value;
        }),
      ),
    ],
    { quoteAll: true },
  );
}

/**
 * Downloads a CSV string as a file
 * @param csvContent CSV content as string
 * @param filename Name of the file to download
 */
export function downloadCSV(csvContent: string, filename: string): void {
  downloadSecureCSV(csvContent, filename);
}
