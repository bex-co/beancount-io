import { useState, useCallback } from "react";
import { useTranslations } from "@/common/hooks/use-translations";
import type { ParsedRow, CSVParseResult } from "../types";
import {
  isValidRowFormat,
  isHeaderRow,
  buildParsedRow,
} from "../utils/csv-validator";

type ParseRecordsResult =
  | { ok: true; records: string[][] }
  | { ok: false; error: string };

/**
 * Parse logical CSV records from the full input, carrying quote state across
 * physical line endings (RFC 4180). Newlines separate records only outside
 * quotes; CRLF inside a quoted field is preserved as a single `\n`.
 */
export function parseCSVRecords(content: string): ParseRecordsResult {
  const records: string[][] = [];
  let columns: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;
  const text = content.replace(/^\uFEFF/, "");

  const pushRecord = () => {
    columns.push(currentField.trim());
    currentField = "";
    // Skip blank physical lines (a single empty field after trim).
    if (!(columns.length === 1 && columns[0] === "")) {
      records.push(columns);
    }
    columns = [];
  };

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        // RFC 4180: "" inside a quoted field is one literal ".
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      if (char === "\r") {
        currentField += "\n";
        i += text[i + 1] === "\n" ? 2 : 1;
        continue;
      }
      currentField += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ",") {
      columns.push(currentField.trim());
      currentField = "";
      i += 1;
      continue;
    }
    if (char === "\r" || char === "\n") {
      i += char === "\r" && text[i + 1] === "\n" ? 2 : 1;
      pushRecord();
      continue;
    }

    currentField += char;
    i += 1;
  }

  if (inQuotes) {
    return {
      ok: false,
      error: "Unterminated quoted field in CSV",
    };
  }

  // Final record when the file does not end with a newline.
  if (currentField.length > 0 || columns.length > 0) {
    pushRecord();
  }

  return { ok: true, records };
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
    const parsed = parseCSVRecords(content);

    if (!parsed.ok) {
      return {
        rows: [
          {
            date: "",
            payee: "",
            description: "",
            amount: 0,
            amountInput: "",
            errors: [parsed.error],
          },
        ],
        validCount: 0,
        errorCount: 1,
        hasErrors: true,
      };
    }

    const { records } = parsed;
    if (records.length === 0) {
      return {
        rows: [],
        validCount: 0,
        errorCount: 0,
        hasErrors: false,
      };
    }

    const hasHeader = isHeaderRow(records[0].join(","));
    const dataRecords = hasHeader ? records.slice(1) : records;

    const rows: ParsedRow[] = dataRecords.map((columns, idx) => {
      const errors: string[] = [];
      const rowNum = idx + (hasHeader ? 2 : 1);

      if (!isValidRowFormat(columns)) {
        errors.push(
          `Row ${rowNum}: Expected 4 columns (Date, Payee, Description, Amount), got ${columns.length}`,
        );
        return {
          date: columns[0] || "",
          payee: columns[1] || "",
          description: columns[2] || "",
          amount: 0,
          amountInput: columns[3] || "",
          errors,
        };
      }

      const [dateStr, payee, description, amountStr] = columns;
      return buildParsedRow({
        date: dateStr,
        payee,
        description,
        amountInput: amountStr,
      });
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
