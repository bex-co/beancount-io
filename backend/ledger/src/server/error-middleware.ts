import type { Context, Next } from "koa";
import { ZodError } from "zod";
import { CATEGORY_HTTP_STATUS, DomainError } from "@/shared/errors";
import { logger } from "@/shared/logger";
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

/** Map any thrown error to the Python service's error envelope + status. */
export function toErrorResponse(err: unknown): {
  status: number;
  body: ErrorEnvelope;
} {
  if (err instanceof DomainError) {
    const status =
      err.httpStatusHint ?? CATEGORY_HTTP_STATUS[err.category] ?? 500;
    const metadata = err.metadata as
      | { code?: string; details?: Record<string, number | string> }
      | undefined;
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
    return { status: err.status, body: errorResponse(giteaErrorMessage(err)) };
  }
  return { status: 500, body: errorResponse("Internal server error") };
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
