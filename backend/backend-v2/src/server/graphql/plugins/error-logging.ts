import { ApolloServerPlugin } from "@apollo/server";
import { GraphQLError } from "graphql";
import { logger } from "@/shared/logger";
import { DomainError, ErrorCategory } from "@/shared/errors";

const errorLogger = logger.child({ module: "graphql-errors" });

/**
 * Error classification for logging levels
 */
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
]);

/**
 * Determine log level based on error code
 */
function getLogLevel(errorCode: string): "debug" | "info" | "error" {
  if (AUTH_ERRORS.has(errorCode as ErrorCategory)) {
    return "debug"; // Auth errors are expected, log at debug level
  }

  if (CLIENT_ERRORS.has(errorCode as ErrorCategory)) {
    return "info"; // Client errors are expected, log at info level
  }

  return "error"; // Server errors are unexpected, log at error level
}

/**
 * Determine log message based on error classification
 */
function getLogMessage(logLevel: "debug" | "info" | "error"): string {
  switch (logLevel) {
    case "debug":
      return "GraphQL auth error";
    case "info":
      return "GraphQL client error";
    case "error":
      return "GraphQL server error";
  }
}

/**
 * Apollo Server plugin for centralized error logging.
 *
 * This plugin logs all GraphQL errors in one place using the didEncounterErrors hook,
 * eliminating the need for try...catch blocks in individual resolvers just for logging.
 *
 * Resolvers can simply throw errors directly, and this plugin will:
 * - Log the error with contextual information (operation, path, etc.)
 * - Classify errors by type and log at appropriate levels (debug/info/error)
 * - Preserve the error for Apollo Server to format and return to the client
 *
 * Error classification:
 * - Debug level: Auth errors (UNAUTHENTICATED, FORBIDDEN)
 * - Info level: Client errors (BAD_USER_INPUT, NOT_FOUND, VALIDATION_FAILED, CONFLICT, RATE_LIMITED)
 * - Error level: Server errors (INTERNAL_SERVER_ERROR, SERVICE_UNAVAILABLE, etc.)
 *
 * Note: Keep try...catch in resolvers ONLY when you need actual error recovery logic
 * (e.g., returning fallback values). For simple logging, let this plugin handle it.
 */
export const errorLoggingPlugin: ApolloServerPlugin = {
  async requestDidStart() {
    return {
      async didEncounterErrors(requestContext) {
        const { errors, operation, request } = requestContext;

        if (!errors || errors.length === 0) {
          return;
        }

        errors.forEach((error: GraphQLError) => {
          // Extract error code: prefer the thrown DomainError's category, falling
          // back to the code Apollo placed on the formatted error's extensions.
          const originalError = error.originalError;
          const errorCode =
            originalError instanceof DomainError
              ? originalError.category
              : (error.extensions?.code as string | undefined) ||
                "UNKNOWN_ERROR";

          // Build log metadata
          const metadata: Record<string, unknown> = {
            message: error.message,
            code: errorCode,
            path: error.path,
            operation: operation?.operation,
            operationName: request.operationName,
          };

          // Add stack trace if available (for unexpected errors)
          if (error.extensions?.stacktrace) {
            metadata.stacktrace = error.extensions.stacktrace;
          }

          // Add original error if available
          if (error.originalError) {
            metadata.originalError = error.originalError.message;
          }

          // Determine log level and message based on error classification
          const logLevel = getLogLevel(errorCode);
          const logMessage = getLogMessage(logLevel);

          // Log at appropriate level
          errorLogger[logLevel](logMessage, metadata);
        });
      },
    };
  },
};
