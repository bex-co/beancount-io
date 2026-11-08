# w2 · m48 — Reconciliation coverage and close review state (ADR 020 P0)

**Worker:** worker2 **Goal:** before `beancount-reconcile` reports a single match, it states what the supplied statement covers: the account it belongs to, its currency and period, how many rows it holds and what they total, and every row left out and why. `beancount-close` records each step's evidence and state, so an account no statement covered, a period a statement covers only partly, or a blocked step is never presented as verified. **Status:** todo (t001–t003 done)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| [t001](./done/t001.md) | Add a coverage preflight to `beancount-reconcile` — **DONE** | 75m | w2/m41/t004 |
| [t002](./done/t002.md) | Record each close step's evidence and state — **DONE** | 45m | t001 |
| [t003](./done/t003.md) | Write evals from ADR 020's fixtures — **DONE** | 60m | t001, t002 |
| t004 | Run the evals on Claude Code and Codex | 45m | t003 |
| t005 | Adoption surface | 30m | t004 |
| t006 | Simplify | 15m | t005 |
| t007 | Test coverage | 45m | t005, t006 |
| t008 | Closeout | 15m | t007 |

## Blocked

- **t004 (2026-10-19)** — all 31 reconcile/close evals run on one client (20 pass + 2 partial reconcile, 7 pass + 2 partial close; evidence in [t004](./t004.md)); the second client's 31 runs all ended at its account usage limit before any work. **Unblock:** Codex usage returns (2026-11-17); rerun the set there and close t004. t005 onward wait behind it. **Who can clear it:** the operator (Codex usage).

## Definition of done

- A reconcile proposal opens with a coverage section, before the mismatch report. It gives the target account and the statement's own account label or number, the currency, the statement period, the source row count and signed total, the ledger's posting count and total for the same window (from an executed recipe), and every excluded row with its reason. Included plus excluded rows equal the source rows.
- When a statement prints an opening balance, reconcile checks that opening plus the included rows equals the printed ending balance. A failure is reported as an extraction problem before any matching, not as missing ledger entries.
- Rows for another account or currency in the same file are listed as excluded and never matched to the target. No row leaves the match without appearing in the excluded list.
- Two equal ledger postings against one statement row are reported as an ambiguity, with both file positions, and the user is asked. A statement row that equals two ledger postings (a split settlement) is asked about, never paired automatically.
- Amounts keep the precision the commodity is printed with, for example three-decimal fund units or eight-decimal crypto. A tolerance exists only as stated user policy, per commodity, and every difference below it is listed.
- A close records, for each active account, its evidence (statement file, period, coverage counts, residual) and a state: tied, partial, partly covered, unverified, or blocked. Owner and due date appear only when the user supplies them, so the personal close report is no longer than today's. The headline and commit message never call the period verified while any active account is not tied over the whole period, and `check: PASS` is labelled as ledger validity.
- Evals for each ADR 020 fixture pass on Claude Code and Codex, recorded with versions and dates. The existing reconcile and close evals still pass. New recipes run in `scripts/skills/test_beancount_skills.py`.

## Source + Goal linkage

- **Source:** [ADR 020](../../../../docs/adrs/ADR020-skills-accounting-workflow-candidates.md) (proposed 2026-09-27): its two P0 rows, "Reconciliation coverage preflight" and "Close dependencies and review state", their release gates, and its evaluation fixtures. The 2026-10-18 skills brainstorm found neither on any board. Verified on `main`: reconcile's Normalize phase extracts the period, the ending balance, and the rows, but nothing counts or totals the rows, checks the statement's own arithmetic, or lists exclusions. `references/matching.md` classes one statement row matching two postings as a duplicate without asking. Close marks an account with no statement as unverified, but records no per-step evidence or blocked state.
- **Goal linkage:** **A1 — Agent-native accounting:** an agent's reconciliation or close can be trusted because it says what it checked and what it did not. The suite's reconcile and close are the deterministic trust checks for a ledger, so a false "reconciled" is the costliest error they can make.
- **Expected outcome:** a user who closes a month with statements for two of three accounts sees the third named as uncovered, not hidden behind a green check. A statement whose rows do not add up to its own balances is caught at extraction, instead of being reported as missing ledger entries. Signals: the ADR 020 fixture pass rate on both clients, and fewer QA findings of false tie-outs.
- **Why now:** ADR 020 sequences coverage and review state first, because roll-forwards, accruals, and the exception register all depend on knowing what the inputs cover. Run after [m41](../../m41/README.md), which compacts the reconcile and close text, so the two rewrites do not collide (t001 depends on m41's closeout). The PDF statement path proposed in the same brainstorm relies on the same statement-arithmetic check. Adoption surface is included because both skills change the output users read.

## Out of scope

- ADR 020's P1 reconciliation exception register, which carries open reconciling items across periods with first-seen date and age. It builds on this preflight and is the natural follow-up.
- Reconciling more than one account per run. Reconcile stays one account per run; close orchestrates.
- Roll-forwards, accruals, variance explanations, and project-management features beyond an optional owner and due date.
- Editing or deleting existing entries.
