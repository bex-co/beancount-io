# w23 · m13 — Preview lifecycle mutations with dry_run

**Worker:** worker1 **Goal:** updateLedger and deleteLedger preview on REST, GraphQL, and MCP like every content mutation; collaborator/star ops preview or carry a documented exclusion **Status:** todo (t001 done)

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Reproduce + map the lifecycle preview gaps — **DONE** | 30m | — |
| t002 | updateLedger preview end to end | 60m | t001 |
| t003 | deleteLedger preview end to end | 60m | t002 |
| t004 | Collaborator/star preview-or-exclusion end to end | 45m | t003 |
| t005 | Document lifecycle previews | 30m | t004 |
| t006 | Adoption surface | 20m | t005 |
| t007 | Simplify | 30m | t006 |
| t008 | Test coverage | 45m | t006 |
| t009 | Closeout | 15m | t007, t008 |

## Definition of done

- updateLedger and deleteLedger accept a preview flag on REST, GraphQL, and MCP; previews show what would change without committing anything, and refuse-or-render the same way on all three surfaces.
- setLedgerCollaborator, removeLedgerCollaborator, leaveLedger, and setLedgerStar each either preview on all three surfaces or carry a documented exclusion in its tool description and `docs/mcp.md`.
- Previews documented alongside the m7 write previews in `docs/mcp.md`; OpenAPI regen with no drift.
- Package gates green in every touched package.

## Source + Goal linkage

- **Source:** promoted from `w23/120` (inbox note): production audit 2026-10-26 shows every content mutation previewing while updateLedger/deleteLedger take no flag and have no preview tool; m7's record never mentions lifecycle. QA never executes these (no rename/destroy of the designated ledger), so the note is schema + HEAD-source evidence.
- **Goal linkage:** A1 (agent-native accounting) — agents preview writes before committing; deleteLedger is the most destructive call in the inventory and the only destroy operation with no preview of any kind.
- **Expected outcome:** an agent doing routine maintenance gets previews everywhere including where the blast radius is largest; a rename/re-privacy/destroy is never committed blind.
- **Why now:** m7 closed the content-mutation gaps with coherent preview semantics and parity tests; extending the same shape to lifecycle now keeps one preview dialect instead of two. Adoption surface included — the milestone ships agent-facing preview flags and tool wording that must hold on every surface.
