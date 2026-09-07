# w1 · m12 — Migrate `bea cloud` from GraphQL to REST driven by the v1 OpenAPI spec

**Worker:** worker1 **Goal:** the CLI's hosted transport becomes the v1 OpenAPI contract in `backend-cluster/idl/` — a pinned spec snapshot with a drift check, a generated typed REST client replacing `gql_client`, and a build-time Typer stub generator so future `bea cloud` commands grow from spec annotations instead of hand-written plumbing. **Status:** todo

## Tasks (in order)

| id   | title                                                                     | est | depends_on |
| ---- | ------------------------------------------------------------------------- | --- | ---------- |
| t001 | Audit v1 OpenAPI coverage of every hosted CLI operation                   | 30m | —          |
| t002 | Add missing REST endpoints (CLI auth-session flow) to backend-v2          | 60m | t001       |
| t003 | Pin a spec snapshot in `cli/` with a drift check against `idl/`           | 30m | t002       |
| t004 | Generate a typed REST client from the snapshot; replace `make codegen`    | 45m | t003       |
| t005 | Migrate cloud commands to the REST client; map HTTP status to exit codes  | 45m | t004       |
| t006 | Delete `cli/graphql/`, `gql_client/`, and GraphQL codegen dependencies    | 20m | t005       |
| t007 | Build-time Typer stub generator with annotation-discipline gate           | 60m | t005       |
| t008 | Adoption surface                                                          | 30m | t006, t007 |
| t009 | Simplify                                                                  | 30m | t008       |
| t010 | Test coverage                                                             | 60m | t008       |
| t011 | Closeout                                                                  | 15m | t010       |

## Definition of done

Every `bea cloud` command works against the hosted API over REST only; no GraphQL artifact remains in `cli/` (no `cli/graphql/`, no `src/cli/api/gql_client/`, no ariadne/GraphQL dependency). `cli/` carries a pinned v1 OpenAPI snapshot and `make check-all` fails if it drifts from `backend-cluster/idl/`. The typed client and the cloud ledger command stubs are generated at build time from the snapshot, generation fails on operations missing `summary`/`description`, and `x-cli-destructive` operations prompt for confirmation. `make check-all` and the backend parity suite are green.

## Source + Goal linkage

- **Source:** `/pm` invocation capturing the CLI transport decision (2026-09-07): with `bea cloud` limited to account + resource commands (m11), that subtree is exactly the shape OpenAPI generates well — richer annotations (descriptions, examples, constraints, `x-*` extensions) map directly to help text, validation, and confirmation prompts, and `backend-cluster/idl/` plus the backend parity gate already maintain the REST contract.
- **Goal linkage:** A1 (agent-native accounting) — one machine-readable contract drives the CLI, and HTTP status → exit-code mapping gives agents deterministic failure semantics; the annotation gate keeps every generated command self-documenting.
- **Expected outcome:** new hosted capabilities reach `bea cloud` by annotating the spec and regenerating, instead of hand-writing client + command plumbing — the CLI's hosted surface can grow at the speed of the API.
- **Why now:** sequenced after m11 (the cloud namespace is the generation target); the CLI is unreleased, so swapping transport now costs seven commands and zero users — the price only goes up after first release. Adoption surface task included because the milestone changes the shipped CLI's behavior and its codegen workflow.
