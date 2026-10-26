/**
 * The one BQL size note every surface publishes (w23/m5/t004): the MCP
 * `runBqlQuery` and `runBqlQueryStructured` tools, the REST BQL route, and
 * the GraphQL `queryShell` / `queryShellText` queries.
 * Surface-neutral by construction — no spelling names its home.
 *
 * Proven end to end: 60 KB queries run identically on REST, GraphQL, and
 * MCP (`runs a 60 KB ...` in bql-parity.test.ts) and through the ledger
 * POST routes over real HTTP (shell-query-post.test.ts). Before w23/m5 the
 * same text in a GET query parameter died as a bare 431 past ~16 KB
 * URL-encoded and surfaced as a 500; the query now travels in a POST body
 * on every hop, so there is no URL-length ceiling left to hit.
 */
export const BQL_SIZE_DESCRIPTION =
  "The query travels in a POST body end to end, so long queries have no " +
  "URL-length ceiling.";
