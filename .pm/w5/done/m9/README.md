# w5 · m9 — Complete a first month through the installed ledger skills

**Worker:** worker1 **Goal:** a newcomer uses the installed customer skills to take one synthetic ledger from initialization through import, reconciliation, and a confirmed monthly close **Status:** done

**Estimate:** 3h implementation; 5h including standing closing tasks (8 tasks). Priority 2 in the approved proposal, after inbox 016 and before inbox 017; that order does not impose a hard dependency.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Package a coherent synthetic first month and checkpoints — **DONE** | 45m | — |
| t002 | Add a read-only checkpoint verifier — **DONE** | 45m | w5/m9/t001 |
| t003 | Write the guided first-month prompts and decisions — **DONE** | 45m | w5/m9/t001 |
| t004 | Publish reproducible rehearsals for both installed agents — **DONE** | 45m | w5/m9/t002, w5/m9/t003 |
| t005 | Adoption surface — **DONE** | 30m | w5/m9/t004 |
| t006 | Simplify — **DONE** | 30m | w5/m9/t005 |
| t007 | Test coverage — **DONE** | 45m | w5/m9/t005, w5/m9/t006 |
| t008 | Closeout — **DONE** | 15m | w5/m9/t006, w5/m9/t007 |

## Definition of done

- A customer with `bea` and the installed suite can follow a self-contained guide in either Claude Code or Codex through init → import → reimport → reconcile → ask → close, using one evolving synthetic ledger and the existing skill triggers.
- The journey supplies its bank export, statement, explicit period, expected balances, and reproducible checkpoints. Its figures come from source data and re-runnable `bea` reads rather than unverified agent arithmetic.
- Approved writes produce the expected transactions and balances. Reimport creates no duplicate entries; the reconciled account receives the appropriate day-after-period-end assertion; `bea check` passes at the completed checkpoints.
- A declined mutation preserves its preceding ledger checkpoint. A declined close commit leaves the index and commit history unchanged. Unresolved or missing statements remain visibly unresolved without fabricated transactions or assertions; any confirmed partial-close commit retains the existing skill's honest status report.
- The final approved close commit includes only the approved files. The read-only analytical question and checkpoint verifier leave ledger content and Git state unchanged.
- Real sessions for both installed agents demonstrate the main journey and declined-write/unresolved-statement branches. Evidence records the repository revision, agent and CLI versions, discovered skills, completion time, intervention count, and checkpoint results. Unsupported or unavailable runs remain unverified and cannot satisfy closeout.
- Deterministic verifier and walkthrough checks, the customer skills package checks, and agent-guidance checks pass. A future user can discover the guide from the installed-suite documentation.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w5`, all three proposals approved with `$pm all for w5` on 2026-09-27; [w5/m3's installed-suite and first-query baseline](../m3/README.md), [the current first-query guide](../../../../skills/docs/first-query.md), and [the CLI first-month tutorial](../../../../cli/docs/TUTORIAL.md).
- **Goal linkage:** **A1 — Agent-native accounting** and **A2 — Frictionless onboarding**. People adopting accounting through an agent can progress from a read-only example to a repeatable monthly workflow through the existing customer skills.
- **Expected outcome:** both installed agents complete a documented monthly journey with verified ledger effects. Record completion rate, elapsed time to a reconciled month, and interventions as rehearsal signals; do not present these as production adoption metrics.
- **Why now:** installation, individual skills, the CLI tutorial, and executable command recipes have shipped. The remaining asset connects these on one ledger. w5 has capacity while its hosted MCP milestone remains blocked, and this local journey has no dependency on that deployment or bank setup.
- **Adoption surface:** included because the walkthrough, sample data, and verifier are customer- and agent-facing. Preserve equivalent discovery and instructions for Claude Code and Codex.

## Boundaries

- Implementation belongs in `skills/`; use `skills/tmp/` for scratch ledgers and raw session artifacts. Root discovery pointers may change during Adoption surface. Follow the now-shipped init/import command recipes and reuse existing customer fixtures and test helpers where appropriate.
- Extend onboarding beyond the first query. Do not recreate the installer, individual accounting skills, CLI tutorial, accounting engine, or hosted MCP evaluation harness. Use supported `bea` commands instead of importing CLI internals across packages.
- The verifier checks the named synthetic scenario and expected ledger effects; it is not a new general accounting engine or benchmark framework. Keep ordinary checks deterministic and free of paid agent calls; real sessions are explicit rehearsals using available agent access.
- This is a local-ledger workflow: no hosted QA ledger, bank connection, deployment, or duplicate MCP test stack is needed. Existing w5/m5 and w5/015 remain independently blocked.
- Ledger effects and commits stay within run-owned synthetic workspaces. Preserve the existing preview/confirmation semantics, and do not broaden skill write authority or hide demonstrated failures to obtain a passing rehearsal.
