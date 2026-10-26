# w23 · m1 — Fence concurrent same-entry updates

**Worker:** worker1 **Goal:** overlapped `updateEntrySource` calls leave exactly one entry with the winner's content and report the loser honestly (never a duplicate, never a silent deletion, never `FORBIDDEN`) **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Reproduce and root-cause the mis-resolution — **DONE** | 1h | — |
| t002 | Fence same-entry updates — **DONE** | 1h | t001 |
| t003 | Translate commit failures as retryable, not forbidden — **DONE** | 45m | t001 |
| t004 | Adoption surface — **DONE** | 20m | t002, t003 |
| t005 | Simplify — **DONE** | 30m | t004 |
| t006 | Test coverage — **DONE** | 45m | t004 |
| t007 | Closeout — **DONE** | 15m | t005, t006 |

## Definition of done

- Overlapped same-entry `updateEntrySource` calls, fired in true overlap repeatedly, always leave exactly one entry carrying the winner's content; the loser gets `CONFLICT` (stale `sha256sum`) or `NOT_FOUND` (hash rotated) — never a second commit, never `FORBIDDEN`, never a reported `OK` that deleted the entry, and (t001 experiment 3) never a silent edit of an unaddressed identical twin.
- A commit-step failure (Gitea 500/lock) on any write path reports `SERVICE_UNAVAILABLE` (retryable), never `FORBIDDEN`/`OPERATION_NOT_ALLOWED`.
- Race tests run the overlap repeatedly (the bug needed 3 rounds to show all 3 outcomes) and assert single-entry + winner-content + honest loser on every surface the update exposes (REST, GraphQL, MCP).
- `docs/mcp.md` retry contracts (`CONFLICT` → re-read + resend fresh `sha256sum`) hold for update races; nothing documents the old `FORBIDDEN`-on-commit behavior.
- Package gates green in every touched package; OpenAPI regen with no drift.

## Source + Goal linkage

- **Source:** promoted from `w23/085` (inbox note): production repro 2026-10-25 shows duplication (1→2), silent deletion (1→0 with `OK`), and a lying `FORBIDDEN` across three overlapped rounds. Triage verified the gap still holds and sized it past the sub-hour note limit: cross-package (ledger owns the read-modify-write in `ledger-journal-service.ts updateSourceSlice` + `commit-ledger-files.ts` retry; backend-v2 owns the error mapping), mechanism unknown (`relocateSlice` should already throw on sha mismatch, so the duplicate/delete path needs real investigation), plus repeated race tests.
- **Goal linkage:** A1 (agent-native accounting) — agents that retry or parallelize edits are the normal pattern; they must not corrupt ledgers they touch.
- **Expected outcome:** concurrent same-entry edits are safe and honest: one winner, one `CONFLICT`/`NOT_FOUND` loser, retryable codes on commit failures.
- **Why now:** blocker severity — silent data loss and duplication on ledgers, already observed on production.
- **Adoption surface:** included, because the milestone changes agent-observable error semantics (retry contracts) on MCP/REST/GraphQL writes.
