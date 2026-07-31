# w2 · m3 — beancount-migrate: Mint/Monarch/QBO exports → working ledger

**Worker:** worker2 **Goal:** a SaaS refugee with a CSV export goes from zero to a bean-check-clean ledger — mapped accounts, opening balances, migration report — running in Fava **Status:** todo

## Tasks (in order)

| id   | title                                                     | est  | depends_on |
| ---- | --------------------------------------------------------- | ---- | ---------- |
| t001 | SKILL.md skeleton: triggers/skip, composes beancount-init | 45m  | —          |
| t002 | Per-source references: Mint, Monarch, QBO formats + mapping | 1.5h | t001       |
| t003 | Verification: counts/balances vs source, unmapped report  | 45m  | t002       |
| t004 | Evals: fixture exports + expected ledgers                 | 1h   | t003       |
| t005 | Adoption surface — skill discoverable on every surface    | 30m  | t004       |
| t006 | Simplify                                                  | 20m  | t005       |
| t007 | Test coverage — failure-mode evals                        | 45m  | t005       |
| t008 | Closeout                                                  | 15m  | t007       |

## Definition of done

From a Mint-style export fixture, the skill produces a bean-check-clean ledger with a mapped account hierarchy, opening balances via `Equity:Opening-Balances`, deduplicated inter-account transfers, and a migration report (row counts and per-account balances reconciled against source totals, unmapped categories listed); Monarch and QBO export paths are covered by references and evals; the end state is a running Fava (via `beancount-init` composition).

## Source + Goal linkage

- **Source:** /pm-brainstorm 2026-07-31 — July 2026 skills-market research: provider mortality is recurring (Mint → Bench → Botkeeper, all dead within 24 months) and each shutdown produces refugees whose stated fear — data dying with the SaaS — is what plain text solves.
- **Goal linkage:** A2 (primary) — a newcomer who has never heard of beancount goes from an export file to a working ledger in one session; A3 — every shutdown news cycle is a launch moment for this skill.
- **Expected outcome:** measurable time-to-first-ledger for migrating users; install/invocation spikes correlated with shutdown events; the skill becomes the linkable answer in "Mint alternative" threads.
- **Why now:** the value is being ready *before* the next shutdown, not after; composes the already-shipped `beancount-init` so the marginal scope is mapping + verification. Adoption surface included: ships a new agent-facing skill.
