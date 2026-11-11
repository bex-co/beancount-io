import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";

/**
 * A localized query-error message: an i18n key plus its interpolation values.
 */
export interface QueryErrorFeedback {
  key: string;
  params?: Record<string, string | number>;
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
 * The engine's parser diagnostic: `… syntax error at position 16: unexpected
 * token 'FROM'`. The position is a 0-based character offset. Only a short,
 * quote- and angle-bracket-free token is accepted, so the interpolated value
 * cannot carry arbitrary server text into the page.
 */
const SYNTAX_ERROR_PATTERN =
  /\bsyntax error at position (\d{1,6}): unexpected token '([A-Za-z0-9_.,;()*=!~+-]{1,32})'(?!\S)/;

/**
 * The current parser's form: `… syntax error at position 26: found ')'
 * expected …`. Its position is a 0-based UTF-8 byte offset into the query
 * (30 for the `)` after `'日本'`), and the expected-token list is never
 * shown. The token rules match the legacy form's.
 */
const FOUND_TOKEN_PATTERN =
  /\bsyntax error at position (\d{1,6}): found '([A-Za-z0-9_.,;()*=!~+-]{1,32})' expected\b/;

/**
 * The engine's refusal of a column that is neither grouped nor aggregated:
 * `Bare column "position" is not grouped and not aggregated: …`.
 */
const UNGROUPED_COLUMN_PATTERN =
  /\bBare column "([A-Za-z_][A-Za-z0-9_.]{0,63})" is not grouped and not aggregated\b/;

/** `… no function matches "NOSUCHFN"`; the engine upper-cases the name. */
const UNKNOWN_FUNCTION_PATTERN =
  /\bno function matches "([A-Za-z_][A-Za-z0-9_]{0,63})"(?!\S)/;

/** `… table '#nosuchtable' does not exist. Available system tables: …` */
const UNKNOWN_TABLE_PATTERN =
  /\btable '(#?[A-Za-z_][A-Za-z0-9_]{0,63})' does not exist\b/;

/** `… invalid arguments for function LENGTH: expected 1 argument(s), got 2` */
const ARGUMENT_COUNT_PATTERN =
  /\binvalid arguments for function ([A-Za-z_][A-Za-z0-9_]{0,63}): expected (\d{1,3}) argument\(s\), got (\d{1,3})\b/;

/** `… type error: EMPTY expects an inventory`; its detail is never shown. */
const TYPE_ERROR_PATTERN = /\btype error:/;

/** The engine's own words for these stay in the query language. */
const BQL_TOKENS = {
  groupBy: "GROUP BY",
  sum: "sum()",
  first: "first()",
  accounts: "#accounts",
  prices: "#prices",
};

const utf8 = new TextEncoder();

/**
 * The 1-based character at which `token` starts in `query`, given its 0-based
 * UTF-8 byte offset; null when the offset does not land on that token, so a
 * mismatched query never yields a wrong position (w4/971).
 */
function characterAtByteOffset(
  query: string,
  byteOffset: number,
  token: string,
): number | null {
  let bytes = 0;
  let units = 0;
  let characters = 0;
  for (const character of query) {
    if (bytes === byteOffset) {
      return query.startsWith(token, units) ? characters + 1 : null;
    }
    if (bytes > byteOffset) return null;
    bytes += utf8.encode(character).length;
    units += character.length;
    characters += 1;
  }
  return null;
}

/**
 * Resolve a query error to editor feedback. A recognized engine diagnostic —
 * an unknown column, function or table, a parser error, an ungrouped column,
 * a wrong argument count or a type error — is explained with only validated
 * short identifiers and counts interpolated; everything else falls back to
 * the shared, generic mapping — raw server messages are never shown.
 */
export function getQueryErrorFeedback(
  error: unknown,
  query?: string,
): QueryErrorFeedback {
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
      const syntax = SYNTAX_ERROR_PATTERN.exec(gqlError.message);
      if (syntax) {
        return {
          key: "bql.errors.syntaxError",
          // Readers count characters from 1; the engine counts from 0.
          params: { token: syntax[2], position: String(Number(syntax[1]) + 1) },
        };
      }
      const found = FOUND_TOKEN_PATTERN.exec(gqlError.message);
      const position =
        found && query !== undefined
          ? characterAtByteOffset(query, Number(found[1]), found[2])
          : null;
      if (found && position !== null) {
        return {
          key: "bql.errors.syntaxError",
          params: { token: found[2], position: String(position) },
        };
      }
      const ungrouped = UNGROUPED_COLUMN_PATTERN.exec(gqlError.message);
      if (ungrouped) {
        return {
          key: "bql.errors.ungroupedColumn",
          params: {
            column: ungrouped[1],
            groupBy: BQL_TOKENS.groupBy,
            sum: BQL_TOKENS.sum,
            first: BQL_TOKENS.first,
          },
        };
      }
      const fn = UNKNOWN_FUNCTION_PATTERN.exec(gqlError.message);
      if (fn) {
        // BQL function names are case-insensitive and written in lower case.
        return {
          key: "bql.errors.unknownFunction",
          params: { name: fn[1].toLowerCase() },
        };
      }
      const table = UNKNOWN_TABLE_PATTERN.exec(gqlError.message);
      if (table) {
        return {
          key: "bql.errors.unknownTable",
          params: {
            table: table[1],
            accounts: BQL_TOKENS.accounts,
            prices: BQL_TOKENS.prices,
          },
        };
      }
      const args = ARGUMENT_COUNT_PATTERN.exec(gqlError.message);
      if (args) {
        return {
          key: "bql.errors.argumentCount",
          // A number: i18next picks a plural form only for a numeric count.
          params: {
            name: args[1].toLowerCase(),
            count: Number(args[2]),
            got: args[3],
          },
        };
      }
      if (TYPE_ERROR_PATTERN.test(gqlError.message)) {
        return { key: "bql.errors.typeError" };
      }
    }
  }
  return { key: getErrorMessageKey(error) };
}

/**
 * Whether running the same query again could succeed. The engine refusing
 * the query (BAD_USER_INPUT) answers the same way every time; a network or
 * service failure may not (w2/111).
 */
export function isRetryableQueryError(error: unknown): boolean {
  return !(
    CombinedGraphQLErrors.is(error) &&
    error.errors.some((item) => item.extensions?.code === "BAD_USER_INPUT")
  );
}
