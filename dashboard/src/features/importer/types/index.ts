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
  date: string;
  payee: string;
  description: string;
  amount: number;
  errors?: string[];
};

export type ImportTransaction = {
  rowIndex: number;
  date: Date;
  payee: string;
  description: string;
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
