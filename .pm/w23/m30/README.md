# w23 · m30 — Make every MCP failure carry an actionable hint

**Worker:** worker1 **Goal:** Every failure on an MCP tool path names the next call or resource, with no internal details. **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Write the missing-hint audit script | 40m | — |
| t002 | Add hints by category | 45m | t001 |
| t003 | Test hints per tool | 30m | t002 |
| t004 | Adoption surface | 20m | t003 |
| t005 | Simplify | 20m | t004 |
| t006 | Test coverage | 30m | t004 |
| t007 | Closeout | 15m | t006 |

## Definition of done

The audit script reports zero missing hints on MCP tool paths, tests guard it, and the failure-code table in `docs/mcp.md` matches the behavior; `yarn test` passes.

## Source + Goal linkage

- **Source:** `/pm-brainstorm w23` (2026-11-07), owner-approved: "them all for w23", proposal 4.
- **Goal linkage:** A1 — Agent-native accounting; A3 — credibility: agents recover from failures without guessing.
- **Expected outcome:** Fewer blind retries after a refused call.
- **Why now:** Error categories were just pinned (226); hint quality is the remaining half of the failure contract.
- **Adoption surface:** included: agents touch this surface directly.
