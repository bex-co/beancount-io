import { useState, useCallback } from "react";
import { useTranslations } from "@/common/hooks/use-translations";
import type { ParsedRow, CSVParseResult } from "../types";
import {
  parseDate,
  parseAmount,
  validateDescription,
  validatePayee,
  isValidRowFormat,
  isHeaderRow,
} from "../utils/csv-validator";

/**
 * Parse a single CSV line respecting quoted fields that may contain commas.
 * Handles escaped double-quotes ("") inside quoted fields.
 */
function parseCSVLine(line: string): string[] {
  const columns: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // RFC 4180: "" inside a quoted field represents a single literal ".
        // The inner i++ advances to the second '"'; the loop's own i++ then
        // advances past it. This intentional double-increment is the standard
        // technique for skipping a two-character escape sequence.
        if (i + 1 < line.length && line[i + 1] === '"') {
          currentField += '"';
          i++; // skip the second '"'; the for-loop will increment past it
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        columns.push(currentField.trim());
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  columns.push(currentField.trim());
  return columns;
}

/**
 * Hook for parsing CSV files
 */
export function useCSVParser() {
  const { t } = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Parse CSV content string
   */
  const parseCSV = useCallback((content: string): CSVParseResult => {
    const lines = content
      .trim()
      .split("\n")
      .filter((line) => line.trim() !== "");

    if (lines.length === 0) {
      return {
        rows: [],
        validCount: 0,
        errorCount: 0,
        hasErrors: false,
      };
    }

    // Check if first line is a header
    const hasHeader = isHeaderRow(lines[0]);
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const rows: ParsedRow[] = dataLines.map((line, idx) => {
      const columns = parseCSVLine(line);

      const errors: string[] = [];
      const rowNum = idx + (hasHeader ? 2 : 1);

      // Validate row format
      if (!isValidRowFormat(columns)) {
        errors.push(
          `Row ${rowNum}: Expected 4 columns (Date, Payee, Description, Amount), got ${columns.length}`,
        );
        return {
          date: columns[0] || "",
          payee: columns[1] || "",
          description: columns[2] || "",
          amount: 0,
          errors,
        };
      }

      const [dateStr, payee, description, amountStr] = columns;

      // Validate date
      const dateResult = parseDate(dateStr);
      if (!dateResult.valid) {
        errors.push(dateResult.error!);
      }

      // Validate payee
      const payeeResult = validatePayee(payee);
      if (!payeeResult.valid) {
        errors.push(payeeResult.error!);
      }

      // Validate description
      const descResult = validateDescription(description);
      if (!descResult.valid) {
        errors.push(descResult.error!);
      }

      // Validate amount
      const amountResult = parseAmount(amountStr);
      if (!amountResult.valid) {
        errors.push(amountResult.error!);
      }

      return {
        date: dateStr,
        payee,
        description,
        amount: amountResult.amount || 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    });

    const errorCount = rows.filter(
      (row) => row.errors && row.errors.length > 0,
    ).length;
    const validCount = rows.length - errorCount;

    return {
      rows,
      validCount,
      errorCount,
      hasErrors: errorCount > 0,
    };
  }, []);

  /**
   * Parse CSV file
   */
  const parseFile = useCallback(
    (file: File): Promise<CSVParseResult> => {
      return new Promise((resolve, reject) => {
        setIsLoading(true);
        setError(null);

        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const result = parseCSV(content);
            setIsLoading(false);
            resolve(result);
          } catch (err) {
            console.error("Failed to parse CSV:", err);
            const errorMessage = t("importer.error.failedToParse");
            setError(errorMessage);
            setIsLoading(false);
            reject(new Error(errorMessage));
          }
        };

        reader.onerror = () => {
          const errorMessage = t("importer.error.failedToParse");
          setError(errorMessage);
          setIsLoading(false);
          reject(new Error(errorMessage));
        };

        reader.readAsText(file);
      });
    },
    [parseCSV, t],
  );

  return {
    parseFile,
    parseCSV,
    isLoading,
    error,
  };
}
