import { unwrapResolverError } from "@apollo/server/errors";
import type { GraphQLFormattedError } from "graphql";
import { ArgumentValidationError } from "type-graphql";
import { config } from "@/config/config";
import { DomainError, ErrorCategory } from "@/shared/errors";

/** One class-validator failure: a field plus its failed constraint messages. */
type ValidationErrorItem = {
  property: string;
  constraints?: Record<string, string>;
};

/**
 * Reduces a TypeGraphQL `ArgumentValidationError` to a single client-facing
 * message: the first failed field's first constraint message (the custom text
 * from the class-validator decorator), falling back to the field name. Returns
 * `undefined` when nothing usable is present (caller keeps the original message).
 */
function firstValidationMessage(
  error: ArgumentValidationError,
): string | undefined {
  const validationErrors = error.extensions?.validationErrors as
    | ValidationErrorItem[]
    | undefined;
  const first = validationErrors?.[0];
  if (!first) {
    return undefined;
  }
  const constraintMessages = first.constraints
    ? Object.values(first.constraints)
    : [];
  if (constraintMessages.length > 0) {
    return constraintMessages[0];
  }
  return first.property ? `Validation failed for ${first.property}` : undefined;
}

/**
 * Apollo `formatError` hook — the GraphQL transport adapter.
 *
 * Business logic throws transport-agnostic {@link DomainError}s. Because those are
 * no longer `GraphQLError` instances, Apollo would otherwise surface them as a
 * generic `INTERNAL_SERVER_ERROR`. This hook translates a `DomainError` into the
 * GraphQL wire shape: `extensions.code` = the error category, with metadata merged
 * into `extensions`. `path`/`locations` from the formatted error are preserved.
 *
 * It also rewrites TypeGraphQL `ArgumentValidationError`s: instead of the generic
 * "Argument Validation Error" message it surfaces the specific class-validator
 * decorator message (e.g. "Password must be at most 128 characters long"). The
 * per-field detail remains in `extensions.validationErrors`.
 *
 * Security: in production the message of any error that resolves to
 * `INTERNAL_SERVER_ERROR` (a thrown `InternalServerError` or an unexpected/unmapped
 * error Apollo wrapped) is masked, so internal details never leak to clients.
 * Client-facing errors (DomainError categories, `BAD_USER_INPUT` from
 * `ArgumentValidationError`, GraphQL parse/validation errors) keep their messages.
 */
export function formatError(
  formattedError: GraphQLFormattedError,
  error: unknown,
): GraphQLFormattedError {
  const originalError = unwrapResolverError(error);

  let formatted = formattedError;

  if (originalError instanceof DomainError) {
    formatted = {
      ...formattedError,
      message: originalError.message,
      extensions: {
        ...formattedError.extensions,
        code: originalError.category,
        ...originalError.metadata,
      },
    };
  } else if (originalError instanceof ArgumentValidationError) {
    const message = firstValidationMessage(originalError);
    if (message) {
      formatted = { ...formattedError, message };
    }
  }

  const isProduction = config.env === "production";
  const isInternal =
    formatted.extensions?.code === ErrorCategory.INTERNAL_SERVER_ERROR;

  if (isProduction && isInternal) {
    return {
      ...formatted,
      message: "Internal server error",
    };
  }

  return formatted;
}
