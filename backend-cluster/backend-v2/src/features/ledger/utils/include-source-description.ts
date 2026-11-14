/**
 * The journal's source-slice option, as REST, GraphQL and MCP describe it
 * (w1/m44): one page of entries carries what N getEntryContext calls would.
 */
export const INCLUDE_SOURCE_DESCRIPTION =
  "Attach each entry's source as {path, lineno, text, sha256sum}: the text and checksum entry context returns, ready for the entry-source update and deletes. null where an entry has no editable source (a plugin's or a pad's copy, a managed price line). At most 200 entries per page with it.";
