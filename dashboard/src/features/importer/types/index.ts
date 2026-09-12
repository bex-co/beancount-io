/**
 * Types for multi-format importer feature
 */

export type FileFormat = "csv" | "pdf" | "ofx" | "image" | "unknown";

export type ParseMethod = "client-csv" | "server-llm" | "failed";

export type ParseStage =
  | "idle"
  | "detecting"
  | "client-parsing"
  | "server-parsing"
  | "complete"
  | "error";

export type ParsedRow = {
  /** Stable UI identity for preview row forms; not submitted to the API. */
  id: string;
  date: string;
  payee: string;
  description: string;
  /** Numeric amount when the row is valid; placeholder 0 when invalid. */
  amount: number;
  /** Raw amount token kept for editing and distinguishing invalid input from 0. */
  amountInput: string;
  errors?: string[];
};

export type ImportTransaction = {
  rowIndex: number;
  /** Canonical ledger calendar day (`YYYY-MM-DD`); never a zone-bound instant. */
  date: string;
  payee: string;
  description: string;
  /**
   * Signed bank-account movement for `sourceAccount` (negative = expense out of
   * the bank, positive = income/refund into the bank). Target gets the negation.
   */
  amount: number;
  sourceAccount: string;
  targetAccount: string;
  currency: string;
};

export type ImportStep =
  | "upload"
  | "preview"
  | "configure"
  | "importing"
  | "finish";

export type ImportResult = {
  success: boolean;
  message: string | null;
  successCount: number;
  failureCount: number;
  errors?: BulkImportError[];
};

export type CSVParseResult = {
  rows: ParsedRow[];
  validCount: number;
  errorCount: number;
  hasErrors: boolean;
};

export type BulkImportError = {
  index: number;
  message: string;
};

export type BulkImportResult = {
  success: boolean;
  successCount: number;
  failureCount: number;
  errors?: BulkImportError[];
};

/**
 * Workflow state for the import process
 */
export type WorkflowState = {
  currentStep: ImportStep;
  parseResult: CSVParseResult | null;
  selectedFileName: string;
};
