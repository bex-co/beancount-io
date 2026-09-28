---
name: beancount-reconcile
description: Reconcile one Beancount account against a CSV statement or pasted PDF text. Report missing entries, duplicates, amount mismatches and date drift; confirm missing-entry writes and a passing period-end balance assertion through bea. Use for checking whether an account matches its statement. Skip bulk imports, analytics, multi-account close orchestration, and edits to existing entries.
---

# beancount-reconcile

Reconcile **one account** against **one statement period**: find every discrepancy between the ledger and the statement, and — only after the user confirms — append the missing transactions and a period-end balance assertion that proves the account ties out.

This skill exists because reconciliation is the deterministic trust check for a ledger, and doing it by hand is tedious and error-prone: statement sign conventions differ from ledger conventions, pending-vs-settled timing shifts dates, and the only real proof of correctness is a `balance` assertion that beancount itself verifies. The skill normalizes the statement, diffs it against the ledger, classifies each discrepancy, and lands a balance assertion whose success (via the root-ledger check) is the reconciliation's definition of done.

## Prefer `bea`

Read beancount-init's `references/bea-cli.md` before running ledger commands: it defines explicit root/destination paths, JSON batches, checks, and safe retries. Without `bea`, use beancount-init's `references/compatibility.md`.

Use `bea` for approved account opens, missing-transaction batches and balance
assertions. The skill retains normalization, discrepancy classification and
the tie-out. An explicit opening adjustment may use `add balance --pad-from`
only on a first reconcile with no prior assertion and an accepted opening gap.

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
4. **Proposed transactions** — for each missing-in-ledger line, one transaction, formatted exactly as it will appear. Attach `import-id` per beancount-import's `references/dedup.md` and preserve pending/uncertain `!` flags in the JSON batch. The target-account posting is the statement amount (in ledger sign); the other leg is categorized from the ledger's own payee history (see below). Format the entry, don't just describe it.
5. **Tie-out calculation** — the query that produced the numbers and its output (see "Reproducible tie-out arithmetic" below). The ledger balance, projected balance and **residual** (`statement ending − projected ledger`, signed) come from that output, not from prose arithmetic.
6. **Proposed balance assertion** — only when the executed residual is exactly zero and no suspects, mismatches, or duplicates remain.
   - **Ties out**: propose the `balance` assertion at the statement's ending balance, dated the **day after** the statement's last day (see "Balance-assertion date" below).
   - **Does not tie out**: do **not** propose a passing-looking assertion, and never append a failing one — a permanently-failing `balance` directive would break the user's `bea check` on every future run. Instead show the signed **residual** and tie it to the unresolved items: the residual equals the net of the reported suspects/mismatches/duplicates, or is unexplained when there are none. Never invent a fee, pad, or adjustment to absorb it. Tell the user to resolve those (by hand — this skill won't edit existing entries) and re-run. Offer, only if they explicitly ask, to append the assertion as a commented-out `; 2026-06-01 balance …` tripwire.
7. A clear **yes/no** prompt.

#### Reproducible tie-out arithmetic

Every balance, sum, and residual in the proposal must be reproducible by the user. Mental or prose arithmetic has produced wrong expressions next to correct ledger values, so compute with the ledger engine's decimal arithmetic in one read and quote its output:

<!-- recipe: tie-out -->
```sh
bea --file "$ledger" --json --no-input query "SELECT sum(number) AS ledger, sum(number) + $proposed_net AS projected, $statement_ending - (sum(number) + $proposed_net) AS residual WHERE account = '$account' AND currency = '$currency' AND date < $assertion_date"
```

- `$proposed_net` is the signed sum of the proposed missing-in-ledger target postings, written as decimal literals (e.g. `-3.00`, or `(-54.20 + -12.00)`); use `0.00` when nothing is proposed. `$assertion_date` is the day after the statement's last day.
- Show the command and its `rows` in the proposal. Any arithmetic you restate in prose — e.g. `2945.00 − 3.00 = 2942.00` — must copy the operands and result from that output. If the query returns no row or null, the account has no postings before that date; state that rather than assuming zero silently.
- If a figure you wrote disagrees with the output, correct it before asking for approval. After any revision, rerun the query; never carry numbers over from an earlier draft.
- The residual's sign is part of the result: negative means the ledger would hold more than the statement says; positive means less.

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

Tie-out (bea query, executed):
  SELECT sum(number) AS ledger, sum(number) + (-54.20 + -12.00) AS projected,
         1203.80 - (sum(number) + (-54.20 + -12.00)) AS residual
  WHERE account = 'Assets:Bank:Checking' AND currency = 'USD' AND date < 2026-06-01
  → ledger 1297.00, projected 1230.80, residual -27.00
  1297.00 − 66.20 = 1230.80; 1203.80 − 1230.80 = −27.00 (ledger 27.00 above statement)

Statement ending balance: 1,203.80 USD, as of end of 2026-05-31.
Balance assertion: withheld. The −27.00 residual equals the net of the
reported suspect (−25.00: refund in ledger only) and amount mismatch
(−2.00: ledger gas 40.00 vs statement 42.00).

Append these to ./ledger.beancount? (yes/no)
```

On **yes**, use the recipes in beancount-init's `references/bea-cli.md`:

1. Open approved new accounts with dates covering the affected history.
2. Write missing entries with `bea --file "$ledger" --json --no-input add transactions --from "$batch" --into "$target"`.
3. If the account ties out, write `bea --file "$ledger" --json --no-input add balance --date "$assertion_date" --account "$account" --amount "$amount" --into "$target"`.
4. Persist the reviewed config comment block.

An opening adjustment uses the shared `--pad-from` recipe before period-end
assertion. Each command validates its own write; the sequence is not one
atomic operation. If the assertion fails, keep track of the successful batch
and re-read the ledger before retrying. On **no**, revise the proposal.
Without `bea`, use beancount-init's `references/compatibility.md`.

Do not append the suspect / duplicate / amount-mismatch items — those are reported only. They are exactly what an amount-off assertion will flag next.

### 5. Verify

After writing, verify the entire root ledger:

```sh
bea --file "$ledger" --json --no-input check
```

Use the compatibility reference only when `bea` is absent.

In the clean case, you wrote the missing entries plus a passing `balance` assertion — that assertion is the reconciliation's proof, and the check verifies it:

- **Check passes** → the account ties out to the statement's ending balance. Report success, and note any items still left for manual review (suspects, mismatches) if the reconcile was partial.
- **Assertion command refuses the proposed balance** (e.g. `Balance failed for 'Assets:Bank:Checking': expected 2865.80 USD != accumulated 2863.80 USD (2.00 too little)`) → the assertion was not written, but the earlier missing-entry batch may have been. Do **not** report success. Surface the residual and re-examine the current ledger before retrying; never replay that batch blindly.
- **Any other check error** (undeclared account from a categorized leg, transaction doesn't balance) → surface the exact output, propose a fix, never silently revert.

Recall from Propose that when the account does **not** tie out (unresolved suspect / mismatch / duplicate), you never wrote an assertion at all — you reported the residual instead. So a well-run partial reconcile leaves the check green (no failing assertion), with the residual and its causes reported in prose for the user to fix.

If validation cannot run, report the result as unvalidated and suggest installing `bea`; manual tie-out does not replace the engine check.

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
- Don't append an assertion that won't tie out, and don't claim success on any `bea check` failure — surface the residual instead.
- Don't touch `option`, `plugin`, or `include` directives.
