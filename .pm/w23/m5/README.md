# w23 · m5 — Handle oversize BQL queries

**Worker:** worker1 **Goal:** a BQL query that fails as `INTERNAL_SERVER_ERROR` at ~16 KB URL-encoded either works or refuses actionably, identically on REST, GraphQL, and MCP **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Reproduce and root-cause the query cliff | 45m | — |
| t002 | Ledger accepts shell queries via POST | 60m | t001 |
| t003 | Backend-v2 sends shell queries via POST | 60m | t001, t002 |
| t004 | Document BQL size handling | 30m | t002, t003 |
| t005 | Adoption surface | 20m | t004 |
| t006 | Simplify | 30m | t005 |
| t007 | Test coverage | 45m | t005 |
| t008 | Closeout | 15m | t006, t007 |

## Definition of done

- A BQL query that failed as `INTERNAL_SERVER_ERROR` at ~16 KB URL-encoded now succeeds through a POST backend→ledger hop, or refuses as `BAD_USER_INPUT` naming the cap — identically on REST, GraphQL, and MCP, with no documented query shape 500ing.
- The handling is documented next to the BQL tools in `docs/mcp.md` and on the affected schemas; OpenAPI regen with no drift; the IDL contract and generated client in sync.
- Package gates green in every touched package.

## Source + Goal linkage

- **Source:** promoted from `w23/092` (inbox note): production repro 2026-10-26 shows BQL queries past ~16 KB URL-encoded failing as `INTERNAL_SERVER_ERROR: Failed to execute shell query` on MCP and REST alike. Triage confirmed the GET hop on main (`queryShell` is `GET /shell/{owner}/{repo}/query` in `foundation/fava/Api.ts`, read via `strQuery(ctx.query.query)` in `ledger/src/api/shell.ts`, wrapped as "execute shell query" in `ledger-shell-service.ts`) with no length check on any schema, and sized the two-package fix past the sub-hour note limit.
- **Goal linkage:** A1 (agent-native accounting) — agents build long generated queries and get an unactionable 500 with a retry hint that cannot help.
- **Expected outcome:** long BQL queries work or refuse with guidance, the same on every surface.
- **Why now:** the note prefers the POST hop (a raw-char cap would still mislead on unicode-heavy queries); t001 confirms the cliff's exact location before t002/t003 build on it.
- **Adoption surface:** included — the milestone ships agent-facing query behavior and `docs/mcp.md` wording that must hold on every surface.
