# w23 · m17 — Make createPullRequest work reliably

**Worker:** worker1 **Goal:** `createPullRequest` opens a pull request on production through a path that does not depend on the failing standalone branch-create call **Status:** todo (t001 done)

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Reproduce the branch-create 500 locally and name the cause — **DONE** | 45m | — |
| t002 | Create the branch and the commit in one repoChangeFiles call | 60m | t001 |
| t003 | Open the pull request and clean up on every failure path | 30m | t002 |
| t004 | Check REST, GraphQL and MCP parity and docs | 30m | t003 |
| t005 | Adoption surface | 20m | t004 |
| t006 | Simplify | 30m | t005 |
| t007 | Test coverage | 45m | t005 |
| t008 | Verify on production and close out | 20m | t006, t007 |

## Definition of done

- `createPullRequest` (REST, GraphQL, MCP) writes the change as one commit on a new branch and opens the pull request; no `pr-patch-*` branch remains after any failure.
- Production rerun of the original repro opens a pull request, or fails with a refusal that names a fixable cause.
- Docs and the surface-parity gate are green.

## Source + Goal linkage

- **Source:** promoted from `w23/082` (2026-10-31, owner chose to make this a milestone to fix or fully implement the flow rather than wait for Gitea server logs). Production failure since 2026-10-25: Gitea answers 500, no reason, to the standalone branch create; every other write succeeds.
- **Goal linkage:** A1 (agent-native accounting) and A2 (onboarding): agents propose ledger changes as pull requests for review; onboarding points at the same flow.
- **Expected outcome:** an agent can open a reviewable PR against a hosted ledger in one call.
- **Why now:** the flow has failed on every attempt for six days; the single-commit design removes the failing call whatever its cause.
