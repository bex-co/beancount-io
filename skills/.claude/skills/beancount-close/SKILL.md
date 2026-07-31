---
name: beancount-close
description: Run a month-end close ritual over a beancount ledger — reconcile every active account, verify balance assertions, check recurring-entry completeness, sweep flagged entries, and commit the month's P&L/balance-sheet summary. Use this skill whenever the user wants to close out a period — "close the month", "run my June close", "do my month-end", "wrap up May's books". The skill walks a fixed checklist, delegates account-level reconciliation to beancount-reconcile, surfaces everything unverifiable, and only commits after the user confirms the close report. SKIP when the user wants to reconcile a single account (beancount-reconcile directly), import an export (beancount-import), ask an ad-hoc question (beancount-ask), or record individual transactions. The core trigger is "close the books for this period".
---

# beancount-close

Close one month with a fixed, honest checklist — every account either ties out or is explicitly reported as unverified, and the close lands as a git commit whose message is the audit record.

This skill exists because trustworthy books come from ritual, not heroics: the same checks, every month, with nothing silently skipped. Each phase reports its status before the next begins; the final commit encodes the close report so `git log` reads as a close history.

## Scope

**Does:** one period (default: last complete calendar month) across all active accounts; delegates per-account reconciliation to the **beancount-reconcile** skill; appends only what that skill's confirm-gated flow appends; produces a close report; makes one confirm-gated git commit.

**Does not:** fabricate missing entries (a missing subscription charge is *reported*, not invented); edit existing entries; force a tie-out; push to remotes (`/ship` is separate); close a period when `bean-check` is red — red blocks the commit proposal, always.

Read `references/close-checklist.md` before running — it defines each phase's procedure and reportable status.

## Workflow

Seven phases: **Scope → Reconcile → Assert → Recurring → Flags → Report → Commit.** Announce the phase status line as each completes (e.g. `Reconcile: 2 tied, 1 unverified (no statement)`).

### 1. Scope

Resolve the period (user's words or last complete month — state it). Find the ledger (same discovery as sibling skills). Enumerate **active accounts**: any Assets/Liabilities account with postings in the period or a nonzero balance. Run `bean-check` first — a ledger that starts red must be fixed (surface the errors) before a close can mean anything.

### 2. Reconcile

For each active account, ask the user for the period statement (CSV/pasted text). Per account **with** a statement, run the `beancount-reconcile` flow (its own confirm gate applies) — outcome **tied**, or **partial** when reconcile correctly withholds the assertion over unresolved suspects/mismatches (a reported finding with its residual, *not* a failure to retry). Per account **without** one: status **unverified** — listed in the report, never silently passed. Nothing in this phase writes except through reconcile's confirmed appends.

### 3. Assert

After reconciliation, every reconciled account has a period-end `balance` assertion (reconcile appends them). Verify each active account has an assertion dated on/after period end; accounts without one are **unpinned** in the report.

### 4. Recurring completeness

Detect expected-but-missing entries: payees appearing in **each of the prior 2–3 months** (steady amount ⇒ subscription-like) but absent this period (query per `close-checklist.md`). Each gap is a **finding** ("NETFLIX appeared Apr+May, absent in June — charge missing, subscription cancelled, or card changed?") — the user answers; if a real entry is missing, it arrives via `beancount-import`/manual entry, **never fabricated** by this skill.

### 5. Flags

List every `!`-flagged entry dated in or before the period. Each is either resolved by the user now (their edit) or carried forward — counted in the report either way.

### 6. Report

Generate the period's numbers with `bean-query` (reuse the `beancount-ask` recipes — income statement by account, monthly totals) and assemble the close report:

```
Close: 2026-06 (2026-06-01 … 2026-06-30)
Reconciled: Assets:Bank:Checking ✓ (ties to 7,874.60)     Unverified: Liabilities:CreditCard:Amex (no statement)
Assertions: 1 pinned, 1 unpinned
Recurring gaps: NETFLIX (present Apr, May — absent Jun)   Flags carried: 1 (2026-06-21 ! WHOLE FOODS)
Income: 3,000.00        Expenses: 203.60        Net: +2,796.40
bean-check: PASS
```

### 7. Commit

Only when `bean-check` passes. Show what will be staged (the ledger files the close touched) and the commit message — subject `close: <period> — <n> reconciled, <m> unverified`, body = the close report. **Commit only on explicit yes.** On no: leave the working tree exactly as it is, report stays in the conversation. Never push.

## What NOT to do

- Don't skip or hide anything: unverified accounts, unpinned assertions, recurring gaps, and carried flags all appear in the report with counts.
- Don't fabricate entries to fill gaps or force assertions to pass.
- Don't propose the commit while `bean-check` is red.
- Don't commit or push without explicit confirmation (and never push at all).
- Don't re-implement reconciliation — delegate to beancount-reconcile per account.
