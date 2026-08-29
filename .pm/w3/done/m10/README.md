# w3 · m10 — Dashboard personal access tokens: create, verify, and document the API-key path

**Worker:** worker3 **Goal:** A signed-in user can create, copy once, inspect, and revoke a scoped Beancount.io API key from Dashboard settings, then use it successfully from the public REST API reference. **Status:** done

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Add Dashboard GraphQL operations for the API-key lifecycle — **DONE** | 30m | — |
| t002 | Build the Personal Access Tokens settings experience — **DONE** | 60m | t001 |
| t003 | Finish and verify the flow in the local docker-mac stack — **DONE** | 60m | t002 |
| t004 | Adoption surface and verified launch-copy handoff — **DONE** | 30m | t003 |
| t005 | Simplify — **DONE** | 30m | t004 |
| t006 | Test coverage — **DONE** | 45m | t004 |
| t007 | Closeout — **DONE** | 20m | t006 |

## Definition of done

A signed-in paid-plan user can open a distinct Personal Access Tokens page in Dashboard settings; create a named key with one or more of `ledger.read`, `ledger.write`, and `ledger.admin`, an optional `owner/name` ledger restriction, and an optional expiry; copy the `bcio_` plaintext from a one-time reveal that is neither logged nor recoverable after dismissal; see only the key prefix and lifecycle metadata on later visits; and revoke the key with a confirmation step. In `deploy/docker-mac`, the copied key authenticates through `x-api-key` against the local v1 REST API, a read-only key is refused a write operation, and a revoked key is refused on its next request. The public API contract and monorepo quickstart point users to the Dashboard key page, and the verified key-creation steps are captured as public-safe launch-copy handoff only after that end-to-end run. Dashboard format, lint, tests, and build pass.

## Source + Goal linkage

- **Source:** Direct user request on 2026-08-29, following the launch of the public REST API reference at `https://beancount.io/docs/api-reference`.
- **Goal linkage:** **A2 — Frictionless onboarding:** the API reference no longer asks a newcomer for a credential without showing where to obtain one. Secondary **A1 — Agent-native accounting:** scripts, CI jobs, and coding agents gain an intentional scoped credential flow instead of borrowing a browser session.
- **Expected outcome:** A new API user can go from the reference to a least-privilege key and a successful request without backend knowledge or manual token extraction; revocation and one-time-secret behavior are understandable from the UI.
- **Why now:** The backend already exposes GraphQL and REST list/create/revoke operations, but Dashboard settings expose only SSH public keys. The API launch makes that missing front door the final blocking gap in the first-request journey. Adoption surface is included because this milestone ships a user-facing credential workflow and must connect settings, the public contract, quickstart guidance, and launch copy.
- **Public-board boundary:** The launch article is maintained outside this public monorepo. Per `.pm/DO_NOT_DO.md`, this milestone does not name or depend on that private source tree; t004 produces verified public-safe copy for its owner after t003 proves the flow.
