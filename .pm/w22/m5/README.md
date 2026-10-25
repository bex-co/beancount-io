# w22 · m5 — A reusable CI check for ledger repositories

**Worker:** worker1 **Goal:** a ledger repository adds `bea` validation with one `uses:` line or a pre-commit hook, and findings appear as line-level annotations **Status:** todo (t001–t003 done)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Composite action with a problem matcher — **DONE** | 50m | — |
| t002 | `.pre-commit-hooks.yaml` with check and format hooks — **DONE** | 30m | — |
| t003 | Fixture ledger and matcher-regex test — **DONE** | 40m | t001 |
| t004 | Replace the copy-paste example workflow and update docs | 25m | t003 |
| t005 | Adoption surface | 25m | t004 |
| t006 | Simplify | 25m | t005 |
| t007 | Test coverage | 45m | t005 |
| t008 | Closeout | 15m | t006, t007 |

## Definition of done

- The action runs green on a clean fixture ledger and fails with a line-level annotation on a broken one.
- `pre-commit run` works from a clean clone with the shipped hooks.
- A test proves the problem-matcher regex parses real `bea check` output.
- The copy-paste example workflow is replaced by the one-line usage in the docs.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for cli` 2026-10-24, candidate 5; today only `cli/docs/examples/ledger-check.yml` exists.
- **Goal linkage:** A3 (distribution through ledger repositories), with A1 for agents opening PRs against a ledger.
- **Expected outcome:** Ledger repos gain a validated CI check in one line; installs from CI and issue quality improve because findings point at lines.
- **Why now:** `bea check` and `bea format --check` already have stable exit contracts, so packaging them is cheap and every adopting repo keeps the dependency. Ships a tool only; no outreach.
- **Adoption surface:** included, because the milestone ships user- and agent-facing `bea` behavior.
