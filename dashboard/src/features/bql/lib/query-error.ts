import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";

/**
 * A localized query-error message: an i18n key plus its interpolation values.
 */
export interface QueryErrorFeedback {
  key: string;
  params?: Record<string, string>;
}

/**
 * The engine's unknown-column diagnostic, as the ledger service forwards it
 * inside a BAD_USER_INPUT error: `… column 'nonexistent_column' not found`.
 * Only a plain BQL identifier is captured, so arbitrary server text can never
 * reach the page through the interpolated value.
 */
const UNKNOWN_COLUMN_PATTERN =
  /\bcolumn '([A-Za-z_][A-Za-z0-9_.]{0,63})' not found\b/;

/**
 * Resolve a query error to editor feedback. A recognized unknown-column
 * diagnostic names the offending identifier; everything else falls back to
 * the shared, generic mapping — raw server messages are never shown.
 */
export function getQueryErrorFeedback(error: unknown): QueryErrorFeedback {
  if (CombinedGraphQLErrors.is(error)) {
    for (const gqlError of error.errors) {
      if (gqlError.extensions?.code !== "BAD_USER_INPUT") continue;
      const match = UNKNOWN_COLUMN_PATTERN.exec(gqlError.message);
      if (match) {
        return {
          key: "bql.errors.unknownColumn",
          params: { column: match[1] },
        };
      }
    }
  }
  return { key: getErrorMessageKey(error) };
}
