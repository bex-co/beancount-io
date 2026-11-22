import { describe, expect, it, vi } from "vitest";
import {
  AI_CATEGORIZATION_BATCH_SIZE,
  AICategorizationIncompleteError,
  categorizeInBatches,
  type AISuggestion,
} from "../categorize-in-batches";

const rowsOf = (length: number) =>
  Array.from({ length }, (_, rowIndex) => ({ rowIndex }));

/** Answers its first `answered` calls like `suggestAll`, then fails with `error`. */
function failingAfter(answered: number, error: Error) {
  let calls = 0;
  return vi.fn(async (batch: { rowIndex: number }[]) => {
    calls += 1;
    if (calls > answered) throw error;
    return suggestAll(batch);
  });
}

/** One confident suggestion for every row it is asked about. */
const suggestAll = vi.fn(
  async (batch: { rowIndex: number }[]): Promise<AISuggestion[]> =>
    batch.map(({ rowIndex }) => ({
      rowIndex,
      targetAccount: `Expenses:Row${rowIndex}`,
      confidence: 0.9,
      reasoning: "",
    })),
);

describe("categorizeInBatches", () => {
  it("sends an import larger than the cap in order, in batches the server accepts", async () => {
    suggestAll.mockClear();
    const rows = rowsOf(AI_CATEGORIZATION_BATCH_SIZE * 2 + 201);

    const suggestions = await categorizeInBatches(rows, suggestAll);

    expect(
      suggestAll.mock.calls.map(([batch]) => [batch[0].rowIndex, batch.length]),
    ).toEqual([
      [0, AI_CATEGORIZATION_BATCH_SIZE],
      [AI_CATEGORIZATION_BATCH_SIZE, AI_CATEGORIZATION_BATCH_SIZE],
      [AI_CATEGORIZATION_BATCH_SIZE * 2, 201],
    ]);
    // Every row of the import gets its suggestion, keyed by its own index.
    expect(suggestions.size).toBe(rows.length);
    expect(suggestions.get(rows.length - 1)?.targetAccount).toBe(
      `Expenses:Row${rows.length - 1}`,
    );
  });

  it("sends an import within the cap as one call", async () => {
    suggestAll.mockClear();
    await categorizeInBatches(rowsOf(AI_CATEGORIZATION_BATCH_SIZE), suggestAll);
    expect(suggestAll).toHaveBeenCalledTimes(1);
  });

  it("keeps earlier batches' suggestions when a later batch fails, and stops there", async () => {
    const refused = new Error("AI quota used up");
    const suggestBatch = failingAfter(1, refused);

    const failure = await categorizeInBatches(
      rowsOf(AI_CATEGORIZATION_BATCH_SIZE * 3),
      suggestBatch,
    ).catch((err: unknown) => err);

    expect(failure).toBeInstanceOf(AICategorizationIncompleteError);
    const incomplete = failure as AICategorizationIncompleteError;
    expect(incomplete.cause).toBe(refused);
    expect(incomplete.suggestions.size).toBe(AI_CATEGORIZATION_BATCH_SIZE);
    expect(suggestBatch).toHaveBeenCalledTimes(2);
  });

  it("passes a first-batch failure on unchanged", async () => {
    const offline = new Error("offline");
    await expect(
      categorizeInBatches(rowsOf(3), failingAfter(0, offline)),
    ).rejects.toBe(offline);
  });

  it("passes a cancellation on unchanged even after earlier batches", async () => {
    const abort = new Error("The operation was aborted");
    abort.name = "AbortError";
    const suggestBatch = failingAfter(1, abort);

    await expect(
      categorizeInBatches(
        rowsOf(AI_CATEGORIZATION_BATCH_SIZE + 1),
        suggestBatch,
      ),
    ).rejects.toBe(abort);
  });
});
