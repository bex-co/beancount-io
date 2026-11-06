/**
 * The MCP argument paths whose text is stored verbatim as file content, where
 * U+0000 is data and not a malformed identifier: it commits and reads back
 * (w23/220). Every other string argument is refused if it holds the byte
 * (`assertNoNulDeep`, w23/m22). `runBqlQuery`'s `query` and the append tool's
 * `text` stay verbatim too: a NUL inside a BQL string literal answers
 * normally, and directive text is parsed whole.
 */
export const MCP_NUL_EXEMPT_PATHS: ReadonlySet<string> = new Set([
  "files[].content",
  "files[].old_string",
  "files[].new_string",
  "changes[].content",
  "newContent",
  "text",
  "query",
]);
