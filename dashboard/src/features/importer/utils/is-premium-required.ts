/**
 * Premium-related GraphQL error codes
 */
const PREMIUM_ERROR_CODES = [
  "FORBIDDEN", // Most common for subscription/tier restrictions
  "PREMIUM_REQUIRED",
  "SUBSCRIPTION_REQUIRED",
  "PAYMENT_REQUIRED",
  "TIER_UPGRADE_REQUIRED",
] as const;

/**
 * Keywords in error messages that indicate premium features
 */
const PREMIUM_KEYWORDS = [
  "premium",
  "subscription",
  "paid",
  "tier",
  "access denied",
  "forbidden",
  "upgrade",
] as const;

/**
 * GraphQL error structure
 */
interface GraphQLErrorObject {
  errors: Array<{ message?: string; extensions?: { code?: string } }>;
}

/**
 * Type guard to check if error has GraphQL errors array structure
 */
function isGraphQLError(error: unknown): error is GraphQLErrorObject {
  return (
    typeof error === "object" &&
    error !== null &&
    "errors" in error &&
    Array.isArray((error as Record<string, unknown>).errors as Array<unknown>)
  );
}

/**
 * Determines if an error indicates that premium access is required
 *
 * Checks GraphQL error extensions.code first, then falls back to
 * message content checking for backward compatibility
 *
 * @param error - Error of unknown type (can be GraphQL error, Error, or any other type)
 * @returns true if the error indicates premium access is required
 *
 * @example
 * ```ts
 * try {
 *   await parseFile(file);
 * } catch (err) {
 *   if (isPremiumRequired(err)) {
 *     // Show upgrade prompt
 *   }
 * }
 * ```
 */
export function isPremiumRequired(error: unknown): boolean {
  // Check if it's a GraphQL error with extensions.code
  if (isGraphQLError(error)) {
    for (const err of error.errors) {
      const code = err.extensions?.code;
      if (
        code &&
        PREMIUM_ERROR_CODES.includes(
          code as (typeof PREMIUM_ERROR_CODES)[number],
        )
      ) {
        return true;
      }
    }

    // For GraphQL errors, also check messages in the errors array
    for (const err of error.errors) {
      if (err.message) {
        const lowerMessage = err.message.toLowerCase();
        if (
          PREMIUM_KEYWORDS.some((keyword) => lowerMessage.includes(keyword))
        ) {
          return true;
        }
      }
    }

    // No premium indicators found in GraphQL errors
    return false;
  }

  // Fallback: Check error message for premium-related keywords
  const errorMessage =
    error instanceof Error ? error.message : String(error ?? "");
  const lowerMessage = errorMessage.toLowerCase();

  return PREMIUM_KEYWORDS.some((keyword) => lowerMessage.includes(keyword));
}
