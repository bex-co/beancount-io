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
  /** A CSV the client could not read; AI parsing waits for the user's yes. */
  | "ai-offer"
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
  /**
   * Structured amount rejection from `parseAmount` — used to block LLM
   * fallback without matching English error strings.
   */
  amountFailureReason?: "empty" | "invalid" | "unsupported-precision";
  /** The source column writes comma decimals (`1.000,00`); edits re-parse with it. */
  decimalComma?: boolean;
  /**
   * The source column mixes point and comma decimals, so the parser refused
   * the row; an edit re-reads the amount on its own.
   */
  decimalMixed?: boolean;
  /**
   * The source record had the wrong number of fields. Editing its four cells
   * cannot resolve that, so an edited row keeps this reason in `errors` and
   * stays out of the import until it is removed or the file is corrected and
   * uploaded again (w4/972).
   */
  structuralError?: string;
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
   * A plain decimal string normalized from the CSV token, never a double, so
   * `0.00000001` and 20-digit amounts reach the ledger as written.
   */
  amount: string;
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
  /**
   * When set, multi-stage parsing must keep these rows for repair and must
   * not fall through to LLM — even if `validCount` is 0: an amount the
   * representability guard refused (`unsupported-precision`), or a header the
   * parser recognized whose records all carry its columns
   * (`recognized-layout`), so their errors are the reader's to fix and a
   * header-only file is honestly empty (w4/961).
   */
  blockLlmFallback?: "unsupported-precision" | "recognized-layout";
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
