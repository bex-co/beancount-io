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

**Re-blocked 2026-11-01** — the owner reported both services deployed, but the rerun could not start: production answers HTTP 401 `unauthorized` to the QA token in `./.env` (expired or revoked), so no authenticated call can be made. The deploy condition is met; the credential is the only blocker. **Unblock:** the owner mints a fresh short-lived read/write QA key (`bcio_…`) on the dedicated QA account, pinned to a synthetic ledger, and stores it as `QA_MCP_TOKEN` in the repo-root `./.env` (never on the board or in chat); a worker then reruns the production repro and records the observed revision. Who can clear it: the repository owner (credential), then a worker (rerun).

Earlier record: **Unblocked 2026-11-01** — the owner reported that backend-v2 is deployed with the latest `main` (carrying `32c6565db`); revision not recorded. Only t008 remains: a worker reruns the production repro on a disposable QA ledger and records the observed revision and result. Earlier block, kept for history: **Blocked 2026-10-31** — t001 to t007 shipped (`32c6565db`, `2ec9813ea`, plus triage closes): `createPullRequest` now creates the branch and the commit in one request, tests and docs are done. Only t008 remains, and it needs the production server: the original failure (Gitea 500 on the standalone branch create) does not reproduce on a stock local Gitea 1.24.7, so whether the one-request flow succeeds on production can only be seen there, after the next deploy carries `32c6565db`.

