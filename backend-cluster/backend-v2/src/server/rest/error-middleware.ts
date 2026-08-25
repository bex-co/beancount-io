import Router, { RouterContext } from "@koa/router";
import {
  CATEGORY_HTTP_STATUS,
  DomainError,
  ErrorCategory,
} from "@/shared/errors";
import { logger } from "@/shared/logger";
import { config } from "@/config/config";

const errorLogger = logger.child({ module: "rest-errors" });

const AUTH_ERRORS = new Set([
  ErrorCategory.UNAUTHENTICATED,
  ErrorCategory.FORBIDDEN,
]);

const CLIENT_ERRORS = new Set([
  ErrorCategory.BAD_USER_INPUT,
  ErrorCategory.NOT_FOUND,
  ErrorCategory.VALIDATION_FAILED,
  ErrorCategory.CONFLICT,
  ErrorCategory.RATE_LIMITED,
  ErrorCategory.PREMIUM_REQUIRED,
]);

/**
 * Classify a domain error category into a log level: auth errors are expected
 * (debug), other client errors are expected (info), everything else is a server
 * error (error). Mirrors the GraphQL `error-logging-plugin` classification.
 */
function getLogLevel(category: ErrorCategory): "debug" | "info" | "error" {
  if (AUTH_ERRORS.has(category)) {
    return "debug";
  }
  if (CLIENT_ERRORS.has(category)) {
    return "info";
  }
  return "error";
}

/**
 * REST transport adapter — Koa middleware that translates thrown errors into the
 * standardized REST response shape:
 * `{ ok: false, error: { code: string, message: string, metadata?: object } }`.
 *
 * Business logic throws transport-agnostic {@link DomainError}s; this middleware
 * derives the HTTP status from the error category (via {@link CATEGORY_HTTP_STATUS}),
 * honouring an explicit `httpStatusHint` for genuine passthrough cases (e.g. the git
 * proxy forwarding an upstream status). `code` is the canonical category.
 *
 * It also logs centrally (classified by category), so REST handlers can simply
 * throw — no per-handler try/catch-just-to-log. Applied once as the outermost
 * middleware over all REST routes.
 */
export function restErrorMiddleware(): Router.Middleware {
  return async (ctx: RouterContext, next: () => Promise<void>) => {
    try {
      await next();
    } catch (error) {
      // Transport-agnostic domain errors
      if (error instanceof DomainError) {
        const level = getLogLevel(error.category);
        errorLogger[level]("REST error", {
          code: error.category,
          message: error.message,
          method: ctx.method,
          path: ctx.path,
        });

        ctx.status =
          error.httpStatusHint ?? CATEGORY_HTTP_STATUS[error.category];
        ctx.body = {
          ok: false,
          error: {
            code: error.category,
            message: error.message,
            ...(error.metadata && { metadata: error.metadata }),
          },
        };
        return;
      }

      // Unexpected errors
      const message =
        error instanceof Error
          ? error.message || "An unexpected error occurred"
          : "An unknown error occurred";
      errorLogger.error("REST server error", {
        message,
        method: ctx.method,
        path: ctx.path,
        stack: error instanceof Error ? error.stack : undefined,
      });

      ctx.status = 500;
      ctx.body = {
        ok: false,
        error: {
          code: ErrorCategory.INTERNAL_SERVER_ERROR,
          // Masked in production, exactly as `graphql/format-error.ts` masks an
          // INTERNAL_SERVER_ERROR there. An unexpected error is by definition one
          // nobody shaped for a client to read: a Drizzle failure arrives as the
          // full SQL text plus its bound parameters, and this middleware sits in
          // front of `resolveIdentity`, so an UNAUTHENTICATED caller was getting
          // the api_keys statement and the digest it had just probed with. The
          // message is still logged above with its stack.
          message:
            config.env === "production" ? "Internal server error" : message,
        },
      };
    }
  };
}
