# w23 · m18 — Bind ledger pins to the repository ID

**Worker:** worker1 **Goal:** a credential pinned to one ledger follows that ledger across a rename and never follows a recreated name **Status:** blocked (t001–t008 done)

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Resolve a pin to its repository ID and back — **DONE** | 45m | — |
| t002 | API keys pin to the repository ID — **DONE** | 60m | t001 |
| t003 | OAuth grants pin to the repository ID — **DONE** | 60m | t001 |
| t004 | Say which name a pin uses — **DONE** | 30m | t002, t003 |
| t005 | Docs and the ADR 0007 amendment — **DONE** | 30m | t004 |
| t006 | Adoption surface — **DONE** | 20m | t005 |
| t007 | Simplify — **DONE** | 30m | t006 |
| t008 | Test coverage — **DONE** | 45m | t006 |
| t009 | Verify on production and close out | 20m | t007, t008 |

## Definition of done

- A pinned API key or OAuth token addresses its ledger by the new name after a rename, on REST, GraphQL and MCP, and its listings and refusals show the current name.
- A pin whose repository was deleted, or whose old name now belongs to a different repository, is refused.
- Legacy name-only pins keep working and bind to the repository ID on first use.
- ADR 0007, docs, the surface-parity gate and package checks are green; the production rerun passes.

## Source + Goal linkage

- **Source:** promoted from `w23/065` (2026-11-01, owner chose to bind pins to the repository ID).
- **Goal linkage:** A1 (agent-native accounting): year-end renames such as `personal` to `personal-2025` must not strand every pinned agent credential.
- **Expected outcome:** pinned agents keep working across renames and cannot be silently redirected to a different repository.
- **Why now:** the credential trust boundary is decided; the pin still compares names as strings in five places.

## Blocked

**Re-blocked 2026-11-01** — the owner reported both services deployed, but the rerun could not start: production answers HTTP 401 `unauthorized` to the QA token in `./.env` (expired or revoked), so no authenticated call can be made. The deploy condition is met; the credential is the only blocker. **Unblock:** the owner mints a fresh short-lived read/write QA key (`bcio_…`) on the dedicated QA account, pinned to a synthetic ledger, and stores it as `QA_MCP_TOKEN` in the repo-root `./.env` (never on the board or in chat); a worker then reruns the production repro and records the observed revision. Who can clear it: the repository owner (credential), then a worker (rerun).

Earlier record: **Unblocked 2026-11-01** — the owner reported that backend-v2 is deployed with the latest `main` (carrying the `0026_api_key_pin_repo_id` migration and the pin commits); revision not recorded. Only t009 remains: a worker reruns the production repro on a disposable QA ledger and records the observed revision and result. Earlier block, kept for history: **Blocked 2026-11-01** — t001 to t008 shipped (`96258e9f0`, `a201ae3fe`, `1a5bfebb7`, and the test/triage commits). Only t009 remains, and it is a production check: after the next deploy carries these commits, a pinned credential must keep addressing a renamed ledger by its new name. The deploy must also run migration `0026_api_key_pin_repo_id` (adds `api_keys.ledger_scope_repo_id`, nullable) before the new code serves.

