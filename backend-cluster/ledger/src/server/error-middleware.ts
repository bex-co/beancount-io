import type { Context, Next } from "koa";
import { ZodError } from "zod";
import { CATEGORY_HTTP_STATUS, DomainError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { isGiteaWriteConflict } from "@/features/gitea/utils/gitea-error";
import { errorResponse, type ErrorEnvelope } from "./envelope";

const log = logger.child({ module: "error-middleware" });

/**
 * A failed response thrown by the generated Gitea client (swagger-typescript-api
 * throws the whole HttpResponse on !ok). Mirrors the Python
 * `api_exception_handler`: forward Gitea's status, prefer the `message` field
 * of Gitea's JSON error body.
 */
interface GiteaHttpErrorLike {
  status: number;
  error?: unknown;
}

function isGiteaHttpError(err: unknown): err is GiteaHttpErrorLike {
  return (
    typeof err === "object" &&
    err !== null &&
    typeof (err as { status?: unknown }).status === "number" &&
    ("error" in err || "data" in err) &&
    !(err instanceof DomainError)
  );
}

function giteaErrorMessage(err: GiteaHttpErrorLike): string {
  const body = err.error;
  if (typeof body === "object" && body !== null) {
    const message = (body as { message?: unknown }).message;
    // Explicit null/undefined check so empty-string messages pass through
    if (message !== undefined && message !== null) {
      return String(message);
    }
  }
  if (typeof body === "string" && body) {
    return body;
  }
  return `Gitea API error (${err.status})`;
}

/**
 * A write conflict in words a caller can act on: a file that already exists
 * is named, anything else is a lost race to re-read and retry.
 */
function conflictMessage(err: GiteaHttpErrorLike): string {
  const message = giteaErrorMessage(err);
  if (/already exists?/iu.test(message)) {
    // Gitea: "repository file already exists [path: qa.bean]".
    const path = /\[path: ([^\]]+)\]/u.exec(message)?.[1];
    return path === undefined
      ? message
      : `${path} already exists; update it with its sha, or choose another path`;
  }
  return "the ledger changed under a concurrent write; re-read it and retry";
}

/** Map any thrown error to the Python service's error envelope + status. */
export function toErrorResponse(err: unknown): {
  status: number;
  body: ErrorEnvelope;
} {
  if (err instanceof DomainError) {
    const status =
      err.httpStatusHint ?? CATEGORY_HTTP_STATUS[err.category] ?? 500;
    const metadata = err.metadata as
      { code?: string; details?: Record<string, number | string> } | undefined;
    return {
      status,
      body: errorResponse(
        err.message,
        metadata?.code ?? null,
        metadata?.details ?? null,
      ),
    };
  }
  if (err instanceof ZodError) {
    // Python: RequestValidationError → 422 "Validation error: loc -> loc: msg; …"
    const details = err.issues
      .map((issue) => `${issue.path.join(" -> ")}: ${issue.message}`)
      .join("; ");
    return { status: 422, body: errorResponse(`Validation error: ${details}`) };
  }
  if (isGiteaHttpError(err)) {
    // Gitea answers the loser of two commits racing for the branch ref with a
    // 500. Forwarded as-is it read as "dependency down, retry with backoff";
    // it is a lost compare-and-swap, which callers re-read and retry (w23/017).
    // A stale sha or a create over an existing file is a 422 that backend-v2
    // read as the caller's bad input, so its retry never ran (w23/032).
    // The single-file delete answers a stale sha with 400 (w21/550).
    if (
      (err.status === 400 || err.status === 422 || err.status >= 500) &&
      isGiteaWriteConflict(err)
    ) {
      return { status: 409, body: errorResponse(conflictMessage(err)) };
    }
    return { status: err.status, body: errorResponse(giteaErrorMessage(err)) };
  }
  // The body parser's refusal of a body past its limit. As a 500 it read as
  // "dependency down, retry" to a caller that only had to split (w23/074).
  if (isBodyTooLarge(err)) {
    return {
      status: 413,
      body: errorResponse("request body exceeds the ledger service's limit"),
    };
  }
  return { status: 500, body: errorResponse("Internal server error") };
}

function isBodyTooLarge(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { type?: unknown }).type === "entity.too.large"
  );
}

export function restErrorMiddleware() {
  return async (ctx: Context, next: Next): Promise<void> => {
    try {
      await next();
    } catch (err) {
      const { status, body } = toErrorResponse(err);
      if (status >= 500) {
        log.error("Unhandled request error", { err, path: ctx.path });
      }
      ctx.status = status;
      ctx.body = body;
    }
  };
}
