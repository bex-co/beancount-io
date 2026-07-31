# w2 · m1 — beancount-reconcile: statement-vs-ledger diff + balance assertion

**Worker:** worker2 **Goal:** an agent can reconcile one account against a bank/broker statement — report missing/duplicate/mismatched entries and, on explicit confirmation, append fixes plus a period-end balance assertion that `bean-check` passes **Status:** done

## Tasks (in order)

| id   | title                                                          | est | depends_on | status |
| ---- | -------------------------------------------------------------- | --- | ---------- | ------ |
| t001 | SKILL.md skeleton: triggers/skip, discovery, config block      | 45m | —          | — **DONE** |
| t002 | Statement normalization reference (CSV / pasted PDF text)      | 45m | t001       | — **DONE** |
| t003 | Matching rules reference: mismatch classes + tolerances        | 1h  | t002       | — **DONE** |
| t004 | Fix flow: confirm-gated corrective entries + balance assertion | 45m | t003       | — **DONE** |
| t005 | Evals: fixture statement+ledger pairs per mismatch class       | 1h  | t004       | — **DONE** |
| t006 | Adoption surface — skill discoverable on every surface         | 30m | t005       | — **DONE** |
| t007 | Simplify                                                       | 20m | t006       | — **DONE** |
| t008 | Test coverage — failure-mode evals                             | 45m | t006       | — **DONE** |
| t009 | Closeout                                                       | 15m | t008       | — **DONE** |

## Definition of done

Given a ledger and one account's statement period (fixture or real), the skill produces a reconciliation diff classifying every discrepancy (missing-in-ledger, missing-on-statement, duplicate, amount mismatch, date drift) and, only after explicit confirmation, appends the missing entries plus a period-end `balance` assertion; `bean-check` passes on the result; all evals in `skills/.claude/skills/beancount-reconcile/evals/` pass; no write ever happens without confirmation.

## Source + Goal linkage

- **Source:** /pm-brainstorm 2026-07-31 — July 2026 skills-market research: reconciliation is named in every community demand list, is QuickBooks' marquee AI feature ("3× faster"), and is shipped by no open tool.
- **Goal linkage:** A1 — extends what a coding agent can do to maintain a ledger end-to-end, with deterministic verification (`bean-check` + balance assertions) as the trust rail. Extends upstream beancount rather than re-implementing it (DO_NOT_DO-clean).
- **Expected outcome:** a beancount user can hand their agent a statement and get a verified reconciliation; observable via skill installs/invocations and launch-content engagement.
- **Why now:** the highest-credibility differentiator in the suite — deterministic-friendly, so it showcases the propose-then-confirm + bean-check house pattern better than any other skill; it also unblocks m5 (beancount-close). Adoption surface included: ships a new agent-facing skill (skills/CLAUDE.md table, symlinks, Claude Code + Codex parity).
