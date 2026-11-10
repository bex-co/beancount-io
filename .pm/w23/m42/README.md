# w23 · m42 — Name the commit every write makes, and let an agent undo it

**Worker:** worker1 **Goal:** Every write result carries the sha of the commit it made, and one tool reverts a commit with a preview, the same way on REST, GraphQL and MCP. **Status:** todo (t001–t005 done; t010 added when t002 was narrowed)

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Spike: how to revert one commit on a main-only repository — **DONE** | 40m | — |
| t002 | Return the commit sha on the file-write family's results — **DONE** | 50m | t001 |
| t003 | Implement revertCommit with a preview — **DONE** | 70m | t001 |
| t004 | Expose revertCommit on REST, GraphQL and MCP — **DONE** | 60m | t003 |
| t005 | Document the undo recipe — **DONE** | 20m | t004 |
| t010 | Return the commit sha on the entry, source-slice, receipt and GraphQL file writes | 90m | t002 |
| t006 | Adoption surface | 20m | t002, t005, t010 |
| t007 | Simplify | 20m | t006 |
| t008 | Test coverage | 30m | t006 |
| t009 | Closeout | 15m | t008 |

## Definition of done

Every write result on REST, GraphQL and MCP carries `commit`; `revertCommit` previews the revert under the `w23/m21` rule and writes one revert commit, refusing when a later commit touched the same lines and refusing a read-only credential; the three surfaces behave the same; `docs/mcp.md` carries an "undo my last change" recipe; `yarn test`, `yarn typecheck` and the OpenAPI drift check pass; the CLI pin is re-synced. If the spike finds no atomic revert on a main-only repository, the milestone shrinks to the `commit` field and the rest is blocked with that reason.

## Source + Goal linkage

- **Source:** `w1/228` (an idea that asked for sizing); `/pm-brainstorm more for w23` 2026-11-10, proposal 5.
- **Goal linkage:** A1 — Agent-native accounting.
- **Expected outcome:** A coding agent working on a hosted ledger can say "undo what I just did" and have it happen in one reviewed step, instead of inferring the commit from a racy list and reverse-applying a diff by hand.
- **Why now:** Hosted agents write through MCP; the missing undo makes every write feel irreversible. The `commit` field is small and needed by anything that follows, and the spike decides the larger step before any code is built on it.
- **Adoption surface:** included: new tool and result field on three surfaces, the OpenAPI snapshot and the CLI pin.
