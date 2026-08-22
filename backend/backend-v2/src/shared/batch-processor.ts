/**
 * Generic batch processor for handling concurrent operations with controlled rate limiting
 *
 * This utility processes items in batches with controlled concurrency to prevent
 * overwhelming external services or consuming excessive resources.
 *
 * Key features:
 * - True batch processing: Only creates promises per batch, not all upfront
 * - Error tracking: Collects both successful results and errors
 * - Progress callbacks: Optional monitoring of processing progress
 * - Configurable delays: Rate limiting between batches
 *
 * @example
 * ```typescript
 * const { results, errors } = await processBatch(
 *   userIds,
 *   async (userId) => fetchUserData(userId),
 *   {
 *     batchSize: 10,
 *     delayBetweenBatches: 100,
 *     onProgress: (processed, total) => logger.debug(`Processed ${processed}/${total}`)
 *   }
 * );
 * ```
 */

/**
 * Options for batch processing
 */
export interface BatchProcessorOptions {
  /**
   * Number of items to process concurrently per batch
   * @default 10
   */
  batchSize: number;

  /**
   * Delay in milliseconds between batches for rate limiting
   * Set to 0 to disable delays
   * @default 0
   */
  delayBetweenBatches?: number;

  /**
   * Optional callback to track processing progress
   * Called after each batch completes
   * @param processed - Number of items processed so far
   * @param total - Total number of items to process
   */
  onProgress?: (processed: number, total: number) => void;
}

/**
 * Result of batch processing
 */
export interface BatchProcessorResult<TOutput> {
  /**
   * Successfully processed results
   */
  results: TOutput[];

  /**
   * Errors encountered during processing
   * Each error includes the index of the failed item
   */
  errors: Array<{ index: number; error: Error }>;
}

/**
 * Process items in batches with controlled concurrency
 *
 * @template TInput - Type of input items
 * @template TOutput - Type of output results
 * @param items - Array of items to process
 * @param processor - Async function to process each item
 * @param options - Batch processing options
 * @returns Promise resolving to results and errors
 *
 * @example
 * ```typescript
 * // Process user IDs in batches of 5
 * const { results, errors } = await processBatch(
 *   ['user1', 'user2', 'user3'],
 *   async (userId) => fetchUser(userId),
 *   { batchSize: 5 }
 * );
 * ```
 */
export async function processBatch<TInput, TOutput>(
  items: TInput[],
  processor: (item: TInput) => Promise<TOutput>,
  options: BatchProcessorOptions,
): Promise<BatchProcessorResult<TOutput>> {
  const { batchSize, delayBetweenBatches = 0, onProgress } = options;

  // Edge case: empty input
  if (items.length === 0) {
    return { results: [], errors: [] };
  }

  const results: TOutput[] = [];
  const errors: Array<{ index: number; error: Error }> = [];

  // Process items in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batchItems = items.slice(i, i + batchSize);
    const batchStartIndex = i;

    // Create promises only for this batch (true batch processing)
    const batchPromises = batchItems.map((item) => processor(item));

    // Execute batch concurrently
    const batchResults = await Promise.allSettled(batchPromises);

    // Process results
    batchResults.forEach((result, batchIndex) => {
      const absoluteIndex = batchStartIndex + batchIndex;

      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        errors.push({
          index: absoluteIndex,
          error:
            result.reason instanceof Error
              ? result.reason
              : new Error(String(result.reason)),
        });
      }
    });

    // Report progress
    const processedCount = Math.min(i + batchSize, items.length);
    if (onProgress) {
      onProgress(processedCount, items.length);
    }

    // Delay between batches (except after the last batch)
    if (delayBetweenBatches > 0 && i + batchSize < items.length) {
      await delay(delayBetweenBatches);
    }
  }

  return { results, errors };
}

/**
 * Delay helper for rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
