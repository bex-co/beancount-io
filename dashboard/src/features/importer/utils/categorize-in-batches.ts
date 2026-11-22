export interface AISuggestion {
  rowIndex: number;
  targetAccount: string;
  confidence: number;
  reasoning: string;
}

/**
 * The most transactions one suggestTransactionCategories call accepts (the
 * server's cap). A larger import is sent in batches of this size.
 */
export const AI_CATEGORIZATION_BATCH_SIZE = 500;

/**
 * A later batch failed after earlier ones returned suggestions. Those
 * suggestions are kept so they can still be applied; `cause` is the failure.
 */
export class AICategorizationIncompleteError extends Error {
  readonly suggestions: Map<number, AISuggestion>;

  constructor(suggestions: Map<number, AISuggestion>, cause: unknown) {
    super("AI categorization stopped before every batch finished", { cause });
    this.name = "AICategorizationIncompleteError";
    this.suggestions = suggestions;
  }
}

/**
 * Ask for suggestions one batch at a time and collect them by rowIndex.
 * Batches run in order because each one spends AI quota: the first failure
 * stops the rest. When earlier batches already answered, the failure
 * arrives as an {@link AICategorizationIncompleteError} carrying their
 * suggestions; a cancellation is passed on unchanged.
 */
export async function categorizeInBatches<Row>(
  rows: readonly Row[],
  suggestBatch: (batch: Row[]) => Promise<readonly AISuggestion[]>,
): Promise<Map<number, AISuggestion>> {
  const suggestions = new Map<number, AISuggestion>();
  for (
    let start = 0;
    start < rows.length;
    start += AI_CATEGORIZATION_BATCH_SIZE
  ) {
    let batch: readonly AISuggestion[];
    try {
      batch = await suggestBatch(
        rows.slice(start, start + AI_CATEGORIZATION_BATCH_SIZE),
      );
    } catch (err) {
      const cancelled = err instanceof Error && err.name === "AbortError";
      if (suggestions.size === 0 || cancelled) throw err;
      throw new AICategorizationIncompleteError(suggestions, err);
    }
    for (const suggestion of batch) {
      suggestions.set(suggestion.rowIndex, suggestion);
    }
  }
  return suggestions;
}
