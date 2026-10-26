# w23 · m7 — Preview every mutation with dry_run

**Worker:** worker1 **Goal:** all five unpreviewable mutations — rename, typed entry add, and the three entry-source writes — preview on REST, GraphQL, and MCP with the same bean-check the commit runs **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Reproduce + map the five preview gaps | 30m | — |
| t002 | Typed add preview end to end | 60m | t001 |
| t003 | Entry-source update/delete preview end to end | 60m | t002 |
| t004 | Rename preview end to end | 60m | t003 |
| t005 | Document write previews | 30m | t004 |
| t006 | Adoption surface | 20m | t005 |
| t007 | Simplify | 30m | t006 |
| t008 | Test coverage | 45m | t006 |
| t009 | Closeout | 15m | t007, t008 |

## Definition of done

- All five mutations (rename, typed entry add, entry-source update, entry-source single delete, entry-source bulk delete) accept a preview flag on REST, GraphQL, and MCP; previews run the same bean-check the commit runs and return the rendered result plus validation without committing anything.
- Previews documented alongside the other write previews in `docs/mcp.md`; OpenAPI regen with no drift.
- Package gates green in every touched package.

## Source + Goal linkage

- **Source:** promoted from `w23/095` (inbox note): production audit 2026-10-26 shows five mutation tools answering `Unrecognized key: "dry_run"`, while the file tools and raw-text append already preview. Triage confirmed on main that typed `entriesBodySchema`, GQL `bulkEntries`, and the MCP entry tools take no preview flag — only the raw-text append path does.
- **Goal linkage:** A1 (agent-native accounting) — agents preview writes before committing; nearly half the mutation surface cannot be previewed.
- **Expected outcome:** every mutation previews alike: an agent sees the rendered result and validation errors before anything commits, on whichever surface it uses.
- **Why now:** the note audited all five gaps in one pass on the same workflow files; fixing them together keeps the preview semantics and parity tests coherent. Neighbors w23/091 (delete/include guard) and w23/093 (append preview gap) cover the same "every mutation previews and guards alike" area on distinct paths.
- **Adoption surface:** included — the milestone ships agent-facing preview flags and tool wording that must hold on every surface.
