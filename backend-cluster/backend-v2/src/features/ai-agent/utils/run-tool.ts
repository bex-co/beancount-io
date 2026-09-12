import type { ILogger } from "@/shared/logger";
import { DomainError } from "@/shared/errors";
import type { ToolError } from "../tools/types";

/**
 * Shared error-handling wrapper for AI-agent tool `execute` functions.
 *
 * `execute()` does one of two things: return the success **payload** `T`, or
 * **throw**. `runToolSafely` owns the encapsulation, guaranteeing the result is
 * always `{ ok: true, result }` on a returned value, or `{ ok: false, error }`
 * on a thrown one (logged at `level`, message run through `formatError`).
 *
 * A failure also carries the thrown error's category, hint, and retry-after
 * (w2/m28:t003). This boundary is the last place the error's *class* exists —
 * after it, the failure is a value — and the MCP surface needs a machine code
 * and a next step, not just prose. The fields are additive: the chat surfaces
 * that read `error` alone are unaffected.
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
    const metadata =
      err instanceof DomainError
        ? (err.metadata as { hint?: unknown; retryAfter?: unknown } | undefined)
        : undefined;
    return {
      ok: false,
      error: formatError ? formatError(msg) : msg,
      ...(err instanceof DomainError && { errorCode: err.category }),
      ...(typeof metadata?.hint === "string" && { errorHint: metadata.hint }),
      ...(typeof metadata?.retryAfter === "number" && {
        retryAfter: metadata.retryAfter,
      }),
    };
  }
}
