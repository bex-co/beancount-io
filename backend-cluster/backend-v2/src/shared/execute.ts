import { logger } from "@/shared/logger";

export type TryCatchOptions<T> = {
  defaultValue?: T;
  onError?: (error: Error) => void;
  logError?: boolean;
  context?: string;
};

export type TryCatchResult<T> = {
  success: boolean;
  data?: T;
  error?: Error;
};

export type DelayRunOptions<T> = {
  delay?: number;
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
  context?: string;
} & TryCatchOptions<T>;

/**
 * Safely executes a function with error handling and optional logging
 * Automatically detects whether the function is async or sync
 * @param fn - The function to execute (can be async or sync)
 * @param options - Configuration options for error handling
 * @returns Promise with success status, data, and error information
 */
export const tryCatch = async <T>(
  fn: () => Promise<T> | T,
  options: TryCatchOptions<T> = {},
): Promise<TryCatchResult<T>> => {
  const {
    defaultValue,
    onError,
    logError = true,
    context = "tryCatch",
  } = options;

  try {
    const result = await fn();
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    const err = error as Error;

    if (logError) {
      logger.error(`${context} execution failed`, {
        error: err.message,
        stack: err.stack,
        context,
      });
    }

    if (onError) {
      onError(err);
    }

    return {
      success: false,
      error: err,
      data: defaultValue,
    };
  }
};

/**
 * Executes a function after a specified delay with optional retry logic
 * Automatically detects whether the function is async or sync
 * @param fn - The function to execute (can be async or sync)
 * @param options - Configuration options for delay and retry behavior
 * @returns Promise with success status, data, and error information
 */
export const delayRun = async <T>(
  fn: () => Promise<T> | T,
  options: DelayRunOptions<T> = {},
): Promise<TryCatchResult<T>> => {
  const {
    delay = 10,
    maxRetries = 0,
    retryDelay = 1000,
    onRetry,
    context = "delayRun",
    ...tryCatchOptions
  } = options;

  // Initial delay
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  let lastError: Error | undefined;
  let attempt = 0;

  while (attempt <= maxRetries) {
    const result = await tryCatch(fn, {
      ...tryCatchOptions,
      context: `${context} (attempt ${attempt + 1})`,
    });

    if (result.success) {
      return result;
    }

    lastError = result.error;
    attempt++;

    if (attempt <= maxRetries) {
      if (onRetry) {
        onRetry(attempt, lastError!);
      }

      logger.debug(`${context} retry ${attempt}/${maxRetries}`, {
        error: lastError?.message,
        retryDelay,
      });

      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  return {
    success: false,
    error: lastError,
    data: tryCatchOptions.defaultValue,
  };
};
