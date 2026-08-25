---
name: beancount-reconcile
description: Reconcile one beancount account against a bank or broker statement. Use this skill whenever the user wants to check that their ledger matches a statement — "reconcile my checking account", "does my ledger match my May Chase statement", "find the missing transactions for last month", "why is my balance off", or when they paste/point to a statement (CSV export or PDF text) and ask to compare it to the ledger. The skill reports a diff (missing, duplicate, amount-mismatch, date-drift) and, only after explicit confirmation, appends the missing transactions plus a period-end balance assertion, then runs bean-check. SKIP when the user wants to bulk-import a statement as the primary source of new transactions (that is an import workflow, not reconciliation), record a single specific trade or transaction, ask analytics/reporting questions ("top expenses"), or edit existing entries. The core trigger is "check my ledger against this statement and fix what's missing".
---

# beancount-reconcile

Reconcile **one account** against **one statement period**: find every discrepancy between the ledger and the statement, and — only after the user confirms — append the missing transactions and a period-end balance assertion that proves the account ties out.

This skill exists because reconciliation is the deterministic trust check for a ledger, and doing it by hand is tedious and error-prone: statement sign conventions differ from ledger conventions, pending-vs-settled timing shifts dates, and the only real proof of correctness is a `balance` assertion that beancount itself verifies. The skill normalizes the statement, diffs it against the ledger, classifies each discrepancy, and lands a balance assertion whose success (via `bean-check`) is the reconciliation's definition of done.

## Scope — what this skill does and does not touch

**Does:** compare one account to one statement; **append** missing transactions and one period-end `balance` assertion; report everything else it finds.

**Does not:** edit or delete existing entries. Duplicates, suspect entries (in the ledger but not on the statement), and amount mismatches are **reported for the user to fix by hand** — this skill only appends. It never touches `option`, `plugin`, or `include` directives, and never reconciles more than one account per run.

Read `references/statement-formats.md` before parsing any statement and `references/matching.md` before classifying discrepancies. Both encode edge cases that are easy to get wrong.

## Workflow

Five phases, in order: **Discover → Normalize → Match → Propose → Verify.**

### 1. Discover

Learn the ledger and the reconciliation target before reading the statement.

Find beancount files in the working directory:

```bash
fd -e beancount -e bean . | head -20
# fallback: find . -maxdepth 4 \( -name '*.beancount' -o -name '*.bean' \)
```

The "main" file is the one with `option`/`plugin`/`include` directives at the top, or the largest with `open` directives.

Then establish, in order:

- **Target account** — the single account being reconciled (e.g. `Assets:Bank:Checking`, `Liabilities:CreditCard:Amex`). If the user named an account or a bank, map it to the open account. If ambiguous, ask — do not guess which account a statement belongs to.
- **Account type** — is the target an `Assets` or a `Liabilities` account? This determines the statement sign convention (see Normalize). Read it from the account name.
- **Config block** — a comment block at the top of the main file starting with `;; beancount-reconcile config`. If present, it records the statement's date format and sign convention per account so re-runs don't re-detect. Re-read it rather than re-detecting.
- **Prior reconciliation point** — the most recent `balance` assertion for the target account. Its date and amount are the trusted starting point; you only need to reconcile forward from there.
- **Append target** — the file where the target account's transactions live (the main file, or an included sub-file, possibly year-bucketed).

Report the target account, its type, and the prior balance assertion (if any) to the user before continuing, so a misdetection is caught early.

Persist the contract as a config block on the main file — but only as part of the confirmed append (show it in the Propose phase; never write it before the explicit yes):

```
;; beancount-reconcile config
;; date_format: MDY
;; Assets:Bank:Checking sign: asset      ; +deposits, -withdrawals
;; Liabilities:CreditCard:Amex sign: liability  ; -charges, +payments
;; append_target: ./ledger.beancount
```

### 2. Normalize

Turn the statement into normalized lines. **Read `references/statement-formats.md` first.** In brief:

- Accept a **CSV export** or **pasted PDF text**. Extract three things: the **statement period** (start and end dates), the **ending balance**, and the **transaction lines** (date, amount, description).
- Map every amount to the **ledger's sign convention for the target account**:
  - **Asset** account: money in `= +`, money out `= −`.
  - **Liability** account: a charge `= −` (you owe more), a payment `= +` (you owe less).
- Statements vary (separate debit/credit columns, signed amounts, MDY vs DMY dates, running-balance columns). When the sign or date convention is ambiguous, **ask — never guess**; a flipped sign silently corrupts the reconciliation.

If the statement's ending balance or period bounds can't be found, ask for them. They are required — the balance assertion depends on them.

### 3. Match

Diff the normalized statement lines against the ledger's postings to the target account within the period. **Read `references/matching.md` first** for the full algorithm and tolerances. The classes:

| Class | Meaning | Action |
|---|---|---|
| **matched** | statement line ↔ ledger posting agree | none |
| **missing-in-ledger** | on the statement, not in the ledger | propose a new transaction (Propose phase) |
| **missing-on-statement** | in the ledger, not on the statement (a suspect) | report for manual review |
| **duplicate** | same real transaction recorded twice in the ledger | report for manual review |
| **amount-mismatch** | matched payee/date but amounts differ | report for manual review |
| **date-drift** | same transaction, dates differ (pending vs settled) | treat as matched; note the drift |

Matching order: exact (date + amount) first, then a windowed pass (amount equal within ±N days, description similar), then a near-miss pass over the leftovers (similar description + date window with *different* amounts → amount-mismatch; one line matching two+ postings → duplicate). Anything unmatched on either side falls into one of the classes above. When a match is ambiguous, ask rather than force it.

### 4. Propose

Show the user the reconciliation, then ask before writing. **Never write before an explicit yes** — this is the user's financial source of truth.

Present, in this exact order:

1. **Target file** — one explicit path.
2. **Diff report** — a section per class with counts, listing each line and the proposed action.
3. **New `open` directives** — only if a proposed entry needs an account that doesn't exist yet.
4. **Proposed transactions** — for each missing-in-ledger line, one transaction, formatted exactly as it will appear. The target-account posting is the statement amount (in ledger sign); the other leg is categorized from the ledger's own payee history (see below). Format the entry, don't just describe it.
5. **Proposed balance assertion** — but only when the account will actually tie out. Before proposing it, compute the **tie-out**: `prior asserted balance + sum of every matched statement movement + the missing-in-ledger entries you're about to add`. Compare it to the statement's ending balance.
   - **Ties out** (no unresolved suspects, mismatches, or duplicates): propose the `balance` assertion at the statement's ending balance, dated the **day after** the statement's last day (see "Balance-assertion date" below).
   - **Does not tie out**: do **not** propose a passing-looking assertion, and never append a failing one — a permanently-failing `balance` directive would break the user's `bean-check` on every future run. Instead show the **residual** (the difference and its sign) and tie it to the unresolved items: the residual equals the net of the reported suspects/mismatches/duplicates. Tell the user to resolve those (by hand — this skill won't edit existing entries) and re-run. Offer, only if they explicitly ask, to append the assertion as a commented-out `; 2026-06-01 balance …` tripwire.
6. A clear **yes/no** prompt.

Categorizing the other leg of a missing entry:

- Look at how the same or a similar payee was categorized before in this ledger. If there's a confident prior, reuse that account.
- If there's no confident match, post the other leg to `Expenses:Uncategorized` (open it if needed) and **say so** — flag it for the user to refine. **Never invent a plausible-looking account name.**
- Keep the target-account posting exactly equal to the statement amount; the reconciliation depends on it.

Example proposal:

```
Target file: ./ledger.beancount
Reconciling:  Assets:Bank:Checking  —  May 2026 statement (2026-05-01 … 2026-05-31)
Prior assertion: 2026-05-01 balance … 1,000.00 USD ✓

Diff:
  matched:              18
  missing-in-ledger:     2   → propose transactions below
  missing-on-statement:  1   → REVIEW: 2026-05-14 "Refund ACME" 25.00 — in ledger, not on statement
  amount-mismatch:       1   → REVIEW: 2026-05-09 "Gas" ledger 40.00 vs statement 42.00
  duplicate:             0

New account opens (if any):
2026-05-01 open Expenses:Uncategorized

Proposed transactions:
2026-05-07 * "TRADER JOES #123"
  Assets:Bank:Checking      -54.20 USD
  Expenses:Food:Groceries    54.20 USD      ; categorized from prior "TRADER JOES" entries

2026-05-22 * "CITY PARKING AUTH"
  Assets:Bank:Checking      -12.00 USD
  Expenses:Uncategorized     12.00 USD      ; no prior match — please refine

Proposed balance assertion (statement ending balance 1,203.80 USD, as of end of 2026-05-31):
2026-06-01 balance Assets:Bank:Checking   1203.80 USD

Append these to ./ledger.beancount? (yes/no)
```

On **yes**: append. On **no**: ask what to change and re-propose. When appending:

- Insert in date order; most ledgers are date-sorted.
- Place any new `open` directives after existing opens near the top.
- Place the `balance` assertion in date order (it will sort after the last May transaction).
- Preserve trailing newlines and blank-line separators.

Do not append the suspect / duplicate / amount-mismatch items — those are reported only. They are exactly what an amount-off assertion will flag next.

### 5. Verify

After appending, run `bean-check` on the modified file:

```bash
bean-check ./ledger.beancount   # this repo: uv run --project cli bean-check
```

In the clean case, you appended the missing entries plus a passing `balance` assertion — that assertion is the reconciliation's proof, and `bean-check` verifies it:

- **`bean-check` passes** → the account ties out to the statement's ending balance. Report success, and note any items still left for manual review (suspects, mismatches) if the reconcile was partial.
- **`bean-check` fails on the assertion you just wrote** (e.g. `Balance failed for 'Assets:Bank:Checking': expected 2865.80 USD != accumulated 2863.80 USD (2.00 too little)`) → your tie-out math was wrong, or a proposed entry had the wrong amount. Do **not** report success. Surface the exact residual, and re-examine the missing entries you added — never leave a failing assertion in place claiming the account reconciled.
- **Any other `bean-check` error** (undeclared account from a categorized leg, transaction doesn't balance) → surface the exact output, propose a fix, never silently revert.

Recall from Propose that when the account does **not** tie out (unresolved suspect / mismatch / duplicate), you never appended an assertion at all — you reported the residual instead. So a well-run partial reconcile leaves `bean-check` green (no failing assertion), with the residual and its causes reported in prose for the user to fix.

If `bean-check` is unavailable, tell the user (`pip install beancount`) and, at minimum, sum the target account's postings over the period by hand and compare to the statement ending balance.

## Balance-assertion date — the one subtlety to get right

A beancount `balance` assertion checks the account balance at the **start of its date** — it includes every transaction *before* that date and **excludes** transactions dated *on* that date. So to assert a statement's ending balance as of the **end** of the last statement day, date the assertion the **day after** the statement's last day.

- Statement period ends `2026-05-31` with ending balance `1203.80 USD` → write `2026-06-01 balance Assets:Bank:Checking 1203.80 USD`.
- Dating it `2026-05-31` would wrongly exclude every transaction that actually happened on 2026-05-31.

State this reasoning to the user when proposing the assertion, so the off-by-one-day choice is visible and reviewable.

## What NOT to do

- Don't write anything without an explicit yes.
- Don't edit or delete existing entries — append only. Report suspects, duplicates, and amount mismatches for manual fixing.
- Don't reconcile more than one account per run.
- Don't guess a statement's sign or date convention, or a payee's category — ask or use `Expenses:Uncategorized` and flag it.
- Don't append an assertion that won't tie out, and don't claim success on any `bean-check` failure — surface the residual instead.
- Don't touch `option`, `plugin`, or `include` directives.
