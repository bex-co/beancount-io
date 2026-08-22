import type { ILogger } from "@/shared/logger";
import type { ToolError } from "../tools/types";

/**
 * Shared error-handling wrapper for AI-agent tool `execute` functions.
 *
 * `execute()` does one of two things: return the success **payload** `T`, or
 * **throw**. `runToolSafely` owns the encapsulation, guaranteeing the result is
 * always `{ ok: true, result }` on a returned value, or `{ ok: false, error }`
 * on a thrown one (logged at `level`, message run through `formatError`).
 */
export async function runToolSafely<T>({
  execute,
  logger,
  message,
  context,
  level = "warn",
  formatError,
}: {
  execute: () => Promise<T>;
  logger: ILogger;
  message: string;
  context?: Record<string, unknown>;
  level?: "warn" | "error";
  formatError?: (msg: string) => string;
}): Promise<{ ok: true; result: T } | ToolError> {
  try {
    return { ok: true, result: await execute() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger[level](message, { ...context, error: msg });
    return { ok: false, error: formatError ? formatError(msg) : msg };
  }
}
