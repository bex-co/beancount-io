# w1 · m11 — Split the CLI into top-level local verbs + a `bea cloud` namespace

**Worker:** worker1 **Goal:** the unreleased `bea` CLI gets its final command shape — local task verbs stay at the top level, everything that touches the hosted service lives under `bea cloud` — with the local/cloud boundary enforced structurally, not just by naming. **Status:** done

## Tasks (in order)

| id   | title                                                                 | est | depends_on |
| ---- | --------------------------------------------------------------------- | --- | ---------- |
| t001 | Restructure commands: `cloud` namespace with flattened auth + ledger — **DONE**  | 45m | —          |
| t002 | Group `--help` output into Local and Cloud panels — **DONE**                     | 20m | t001       |
| t003 | Enforce the import boundary: network code only under cloud commands — **DONE**   | 30m | t001       |
| t004 | Sweep docs and cross-repo references to the old command paths — **DONE**         | 30m | t001       |
| t005 | Adoption surface — **DONE**                                                      | 30m | t002, t003, t004 |
| t006 | Simplify — **DONE**                                                              | 30m | t005       |
| t007 | Test coverage — **DONE**                                                         | 45m | t005       |
| t008 | Closeout — **DONE**                                                              | 15m | t007       |

## Definition of done

`bea --help` shows the local verbs (`check`, `format`, `query`, `report`, `add`, `list`, `ask`) at the top level and a single `cloud` entry; `bea cloud login`, `bea cloud logout`, `bea cloud status`, and `bea cloud ledger list|create|delete|clone` all work; `bea auth` and top-level `bea ledger` no longer exist (no back-compat aliases — the CLI is unreleased). A test fails if any command module outside the cloud subtree imports the API gateway client, the login ceremony (`cli.auth.device_flow`), or server settings — reading a stored credential (`cli.auth.credentials`) is allowed everywhere, as the sanctioned shape for a local verb like `bea ask` that authenticates an outbound call (refined from the original wording during the simplify review). `cli/README.md`, `docs/USAGE.md`, and `cli/CLAUDE.md` document the new tree, and no tracked file still references the old paths. `make check-all` is green.

## Source + Goal linkage

- **Source:** `/pm` invocation capturing the CLI local/cloud command-tree design discussion (2026-09-07): local-first top level, `cloud` as the only hosted namespace, auth flattened to `cloud login/logout/status`, cloud reserved for account + cloud-resource commands (task verbs never move in — remote capability arrives later as target flags).
- **Goal linkage:** A1 (agent-native accounting) — a coding agent can read from the command tree alone which operations are safe/offline and which touch the hosted service and need credentials; A2 (frictionless onboarding) — newcomers see a small local-first surface with one clearly-marked cloud entry point.
- **Expected outcome:** the shipped `bea` has a stable, self-explaining command shape before first release, so no future rename breaks users, docs, or agent skills; help output alone answers "which commands need the network".
- **Why now:** the CLI is unreleased — this is the last window for a breaking rename at zero cost, and m12 (REST transport migration) builds on the cloud namespace, so this must land first. Adoption surface task included because the milestone reshapes the user- and agent-facing command tree.
