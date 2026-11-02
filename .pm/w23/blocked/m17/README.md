# w23 · m17 — Make createPullRequest work reliably

**Worker:** worker1 **Goal:** `createPullRequest` opens a pull request on production through a path that does not depend on the failing standalone branch-create call **Status:** blocked (t001–t007 done)

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Reproduce the branch-create 500 locally and name the cause — **DONE** | 45m | — |
| t002 | Create the branch and the commit in one repoChangeFiles call — **DONE** | 60m | t001 |
| t003 | Open the pull request and clean up on every failure path — **DONE** | 30m | t002 |
| t004 | Check REST, GraphQL and MCP parity and docs — **DONE** | 30m | t003 |
| t005 | Adoption surface — **DONE** | 20m | t004 |
| t006 | Simplify — **DONE** | 30m | t005 |
| t007 | Test coverage — **DONE** | 45m | t005 |
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

## Blocked

**Blocked 2026-11-01** — t001–t007 shipped and are deployed (the refusal now names the step). Production rerun, with a valid QA key: `createPullRequest` with a one-file change fails on three disposable ledgers (a new file on one, an edit of `main.bean` on two) with `Gitea 500 while committing the changes to new branch pr-patch-… (Gitea gave no reason; its server log has the cause)`. So the one-request design does not avoid the failure: production Gitea cannot create a branch at all, whether through the standalone call or as part of a commit. A stock local Gitea 1.24.7 does not reproduce it, and nothing in this repository can see why.

**Unblock:** the owner (or whoever runs the production Gitea) reads the Gitea server log for one failed call and records the error line (any `createPullRequest` on a disposable ledger reproduces it; the branch name in the refusal dates the attempt). With the cause, a worker fixes what this repository can fix (a request shape, a branch-name rule) or records a server-side setting for the owner, then reruns the repro. Who can clear it: the Gitea server operator (log), then a worker.

Earlier record: the owner reported the deploy on 2026-11-01; a rejected QA credential delayed the rerun and was replaced.

