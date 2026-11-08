# w23 · m29 — Add preview-commit, stale-hash and filter journeys to the agent eval

**Worker:** worker1 **Goal:** Real Claude Code and Codex sessions are scored on the preview, optimistic-concurrency and filter features. **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Add fixtures and expected facts | 40m | — |
| t002 | Register the journeys and scoring rules | 40m | t001 |
| t003 | Test the scorers deterministically | 30m | t002 |
| t004 | Record a baseline on the hosted endpoint | 45m | t003 |
| t005 | Update the journey table in the eval docs | 15m | t004 |
| t006 | Simplify | 20m | t005 |
| t007 | Test coverage | 30m | t005 |
| t008 | Closeout | 15m | t007 |

## Definition of done

`yarn mcp:agent-eval` lists the three new journeys, scorer tests cover pass/fail/incomplete, and a committed baseline records the hosted revision and results for both clients.

## Source + Goal linkage

- **Source:** `/pm-brainstorm w23` (2026-11-07), owner-approved: "them all for w23", proposal 3.
- **Goal linkage:** A1 — Agent-native accounting: measures real agent behavior on the newest MCP features.
- **Expected outcome:** Before/after comparisons for tool changes include preview, concurrency and filters.
- **Why now:** These are the most recently invested agent surfaces and have no journey yet.
- **Adoption surface:** omitted: internal QA tooling with no user- or agent-facing surface beyond the QA skill, updated in-milestone.
