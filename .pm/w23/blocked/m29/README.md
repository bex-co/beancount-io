# w23 · m29 — Add preview-commit, stale-hash and filter journeys to the agent eval

**Worker:** worker1 **Goal:** Real Claude Code and Codex sessions are scored on the preview, optimistic-concurrency and filter features. **Status:** blocked (t001–t003, t005–t007 done; t004 and Closeout open)

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Add fixtures and expected facts — **DONE** | 40m | — |
| t002 | Register the journeys and scoring rules — **DONE** | 40m | t001 |
| t003 | Test the scorers deterministically — **DONE** | 30m | t002 |
| t004 | Record a baseline on the hosted endpoint — **BLOCKED** | 45m | t003 |
| t005 | Update the journey table in the eval docs — **DONE** | 15m | t004 |
| t006 | Simplify — **DONE** | 20m | t005 |
| t007 | Test coverage — **DONE** | 30m | t005 |
| t008 | Closeout | 15m | t007 |

## Definition of done

`yarn mcp:agent-eval` lists the three new journeys, scorer tests cover pass/fail/incomplete, and a committed baseline records the hosted revision and results for both clients.

## Source + Goal linkage

- **Source:** `/pm-brainstorm w23` (2026-11-07), owner-approved: "them all for w23", proposal 3.
- **Goal linkage:** A1 — Agent-native accounting: measures real agent behavior on the newest MCP features.
- **Expected outcome:** Before/after comparisons for tool changes include preview, concurrency and filters.
- **Why now:** These are the most recently invested agent surfaces and have no journey yet.
- **Adoption surface:** omitted: internal QA tooling with no user- or agent-facing surface beyond the QA skill, updated in-milestone.

## Blocked

**Blocked 2026-11-07** — t004 (record the hosted baseline) and, behind it, Closeout.

- **Blocker:** the baseline needs real, billed Claude Code and Codex sessions against the hosted endpoint. This machine has Claude Code but no Codex CLI. The harness also refuses to start unless the API key reaches exactly one ledger with a dedicated suffixed name (`mcp-agent-eval-<suffix>`); the only credential available to the loop is the general QA key, which reaches the shared QA ledger.
- **Unblock:** the owner (a) installs and signs in to Codex, (b) creates a private `mcp-agent-eval-<suffix>` ledger and mints a `ledger.read`+`ledger.write` key restricted to it with a short expiry, as in `backend-cluster/backend-v2/docs/mcp-agent-eval.md`, and (c) approves the billed run. Then run `yarn mcp:agent-eval --attempts 1` for the three new journeys and commit the report under `evals/mcp-agent/baseline/` with the observed deployed revision, then close t004 and Closeout.
- **Shipped baseline:** the three journeys, their scorer tests (60 passing) and the docs table are on `main`; `yarn mcp:agent-eval` lists them.
