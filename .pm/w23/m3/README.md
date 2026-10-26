# w23 · m3 — Unify mutation-tool parameter naming

**Worker:** worker1 **Goal:** agents can paste `entry_hash` from list output straight into entry mutations, and reuse one commit-message argument across file tools, on REST, GraphQL, and MCP alike **Status:** in progress

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Accept entry_hash alongside entryHash ✅ | 45m | — |
| t002 | Accept one commit-message name on file tools ✅ | 45m | — |
| t003 | Document the naming rule | 30m | t001, t002 |
| t004 | Adoption surface | 20m | t003 |
| t005 | Simplify | 30m | t004 |
| t006 | Test coverage | 45m | t004 |
| t007 | Closeout | 15m | t005, t006 |

## Definition of done

- `getEntryContext`, `updateEntrySource`, `deleteEntrySource`, `deleteEntrySources` accept the `entry_hash` spelling list output uses (alias or rename), on REST, GraphQL, and MCP; the note's strict-validation repro passes.
- The file-mutation tools accept one commit-message spelling everywhere (`create`/`update`/`delete`/`rename`), on all three surfaces; tools that compose their own message say so in their description.
- The one rule per split is documented on the tool schemas and in `docs/mcp.md`; OpenAPI regen with no drift.
- Package gates green in every touched package.

## Source + Goal linkage

- **Source:** promoted from `w23/090` (inbox note): production repro 2026-10-25 shows copy-paste across mutation tools failing on `entry_hash` vs `entryHash` and `description` vs `message`. Triage confirmed both splits on main (tool descriptions even document the hash mismatch: "addressed by entryHash (listLedgerEntries' entry_hash)") and sized the two splits past the sub-hour note limit.
- **Goal linkage:** A1 (agent-native accounting) — strict-schema errors guide recovery, but every failed paste is a wasted agent turn.
- **Expected outcome:** one naming rule per split, accepted on every surface, documented where agents read.
- **Why now:** same agent-facing consistency area as m2; the fix is contained in backend-v2 schemas plus docs.
- **Adoption surface:** included — the milestone ships agent-facing schema descriptions and `docs/mcp.md` wording that must be accurate on every surface.
