import type { ParsedRow } from "../types";
import { parseAmount, parseDate } from "../utils/csv-validator";

/** Per-row choices retained across Configure ↔ Preview transitions. */
export type ImportConfigRowDraft = {
  targetAccount: string;
  selected: boolean;
};

/**
 * Configuration draft for the active import file. Keyed by ParsedRow.id so
 * preview edits/deletions cannot shift one row's mapping onto another.
 * Financial fields always come from the latest parse — never from the draft.
 */
export type ImportConfigDraft = {
  sourceAccount: string;
  defaultCurrency: string;
  rows: Record<string, ImportConfigRowDraft>;
};

export type ImportConfigTransactionValues = {
  /** Stable ParsedRow.id — draft identity, not submitted to the API. */
  id: string;
  /** Index among currently valid rows; used for import/AI rowIndex. */
  rowIndex: number;
  date: string;
  payee: string;
  description: string;
  amount: number;
  amountInput: string;
  targetAccount: string;
  selected: boolean;
};

export type ImportConfigFormValues = {
  sourceAccount: string;
  defaultCurrency: string;
  transactions: ImportConfigTransactionValues[];
};

/** Rows that still pass the shared parse contract for configuration. */
export function getValidImportRows(rows: ParsedRow[]): ParsedRow[] {
  return rows.filter((row) => {
    if (row.errors && row.errors.length > 0) return false;
    return parseDate(row.date).valid && parseAmount(row.amountInput).valid;
  });
}

/**
 * Build form values from the latest valid preview rows, restoring draft
 * target/selection by ParsedRow.id and applying safe defaults for new rows.
 */
export function buildImportConfigFormValues(
  rows: ParsedRow[],
  draft: ImportConfigDraft | null | undefined,
  primaryCurrency: string,
): ImportConfigFormValues {
  const validRows = getValidImportRows(rows);
  return {
    sourceAccount: draft?.sourceAccount ?? "",
    defaultCurrency: draft?.defaultCurrency || primaryCurrency,
    transactions: validRows.map((row, index) => {
      const dateResult = parseDate(row.date);
      const amountResult = parseAmount(row.amountInput);
      const rowDraft = draft?.rows[row.id];
      return {
        id: row.id,
        rowIndex: index,
        date: dateResult.isoDate!,
        payee: row.payee,
        description: row.description,
        amount: amountResult.amount!,
        amountInput: row.amountInput,
        targetAccount: rowDraft?.targetAccount ?? "",
        selected: rowDraft?.selected ?? true,
      };
    }),
  };
}

/** Persist only configuration choices; drop mappings for removed row ids. */
export function toImportConfigDraft(
  values: ImportConfigFormValues,
): ImportConfigDraft {
  const rows: Record<string, ImportConfigRowDraft> = {};
  for (const txn of values.transactions) {
    rows[txn.id] = {
      targetAccount: txn.targetAccount,
      selected: txn.selected,
    };
  }
  return {
    sourceAccount: values.sourceAccount,
    defaultCurrency: values.defaultCurrency,
    rows,
  };
}
