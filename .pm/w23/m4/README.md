# w23 · m4 — Guard deleting an included file

**Worker:** worker1 **Goal:** deleting a file that is still `include`d is refused with guidance (or rewrites the includes in the same commit), like rename, on REST, GraphQL, and MCP alike **Status:** in progress

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Guard the repo-service delete path ✅ | 60m | — |
| t002 | Guard the workflow delete path ✅ | 45m | — |
| t003 | Document the delete guard ✅ | 30m | t001, t002 |
| t004 | Adoption surface ✅ | 20m | t003 |
| t005 | Simplify ✅ | 30m | t004 |
| t006 | Test coverage | 45m | t004 |
| t007 | Closeout | 15m | t005, t006 |

## Definition of done

- Deleting a file still included by another ledger file is refused naming the includers (or an `updateIncludes`-style flag rewrites them in the same commit), on REST, GraphQL, and MCP; the note's repro is refused instead of breaking the ledger.
- The rule is documented next to the rename rule in `docs/mcp.md` and on the affected schemas; OpenAPI regen with no drift.
- Package gates green in every touched package.

## Source + Goal linkage

- **Source:** promoted from `w23/091` (inbox note): production repro 2026-10-26 shows `deleteLedgerFiles` removing a still-included file (ledger fails to load) where rename refuses with guidance. Triage confirmed the asymmetry on main (rename guards in `ledger-workflow.ts`; `deleteLedgerFile` goes straight to the Fava delete) and sized the two delete paths past the sub-hour note limit.
- **Goal linkage:** A1 (agent-native accounting) — agents deleting a split-out file leave the ledger unloadable.
- **Expected outcome:** delete refuses or rewrites with guidance, matching rename, on every surface.
- **Why now:** one removal path guards includes and the other does not; the rename guard (w23/029, w23/056) is the template.
- **Adoption surface:** included — the milestone ships agent-facing refusal guidance and `docs/mcp.md` wording that must be accurate on every surface.
