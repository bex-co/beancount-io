/**
 * The argument paths whose text is stored verbatim as file content, where
 * U+0000 is data and not a malformed identifier: it commits and reads back
 * (w23/220). Every other string argument is refused if it holds the byte
 * (`assertNoNulDeep`, w23/m22) on MCP, REST and GraphQL alike. `query` stays
 * verbatim too (a NUL inside a BQL string literal answers normally) and so
 * does the directive `text` appended whole.
 *
 * Paths are rooted at the arguments (MCP), the request body (REST) or the
 * field arguments (GraphQL); array members read as `[]`. A bare `content` is
 * the REST file body and the GraphQL file mutation argument.
 */
export const NUL_EXEMPT_PATHS: ReadonlySet<string> = new Set([
  "content",
  "files[].content",
  "files[].new_string",
  "files[].old_string",
  "changes[].content",
  "newContent",
  "text",
  "query",
]);
