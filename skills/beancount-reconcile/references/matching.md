# Matching rules

Diff the normalized statement lines (from `statement-formats.md`) against the ledger's postings to the **target account** within the statement period, and classify every unmatched item. The output is the diff report the Propose phase shows the user.

## Inputs

- **Statement lines**: `{date, amount (ledger sign), description}` for the period.
- **Ledger postings**: every posting to the target account with a date in `[period_start, period_end]`. Get them from the ledger directly, or via:
```bash
  bea --file "$ledger" --json --no-input query "SELECT date, position, narration WHERE account = 'Assets:Bank:Checking' AND date >= 2026-05-01 AND date <= 2026-05-31 ORDER BY date"
```
  On a ledger already failing its check (the user's failing assertion), this read refuses; pass it `--allow-errors` and report the errors it returns, as the skill's tie-out section says. Writes run strict first. Only beancount-reconcile's documented diagnosed-assertion retries permit a flagged approved account open or missing-row batch after that operation's strict refusal identifies the same assertion alone; other errors and manual developer-tool writes do not qualify.
- **Anchor**: the prior `balance` assertion for the account (from Discover). Reconcile forward from it; you do not need to re-match anything before it.

## Matching algorithm — three passes, then classify

Match on **amount first** (the number rarely lies; dates and descriptions drift).

**Pass 1 — exact.** Pair a statement line with a ledger posting when `amount` is equal **and** `date` is equal. Remove both from the pools. This clears the bulk.

**Pass 2 — windowed.** For the leftovers, pair when `amount` is equal **and** `|date_statement − date_ledger| ≤ WINDOW` (default **WINDOW = 3 days**), preferring the smallest date gap, then the closest description. This absorbs pending-vs-settled timing. A pair matched here with a nonzero gap is **date-drift**: matched, but note the drift in the report.

When two candidates tie (same amount, same gap), or an amount appears an unequal number of times on each side, **do not force a pairing** — surface it and ask. A wrong pairing hides a real discrepancy.

**Pass 3 — near-miss (amounts differ).** For what remains, pair a statement line with a ledger posting when the **descriptions are similar** (same merchant tokens) and the dates are within WINDOW, **but the amounts differ**. Each such pair is an **amount-mismatch** — report it, never auto-edit. Also check multiplicity here, as an **ambiguity**, never as a verdict: one statement line whose amount matches **two or more** ledger postings within the window is reported with every candidate's file position, and the user says which posting is the row, which is a duplicate, or which belongs to an adjacent period. The reverse is a question too: a row whose amount equals the **sum** of two near-dated postings (or two rows summing to one posting) may be a split settlement — ask, and never pair it automatically. Pass 3 exists because Passes 1–2 require amount equality, so mismatches and multiplicities can never surface without it.

Everything still unpaired after Pass 3 is a discrepancy. Classify it.

## The discrepancy classes

| Class | Definition | Report action |
|---|---|---|
| **matched** | paired in Pass 1, or Pass 2 with zero gap | none |
| **date-drift** | paired in Pass 2 with a nonzero date gap | none to the ledger; note "ledger 05-09 vs statement 05-11" |
| **missing-in-ledger** | statement line with no ledger posting | **propose a new transaction** (Propose phase) |
| **missing-on-statement** | ledger posting with no statement line — a *suspect* | **report for manual review** — do not delete |
| **amount-mismatch** | same payee, dates within window, amounts differ | **report for manual review** — do not edit |
| **duplicate** | the user confirmed two+ ledger postings are one real transaction | **report for manual review** — do not delete |
| **ambiguous** | two+ equal postings could be one row, or a row could be a split settlement | **ask** — never label it a duplicate unasked |

### missing-in-ledger

The statement has it; the ledger doesn't. This is the only class the skill fixes, by appending a transaction (target-account posting = the statement amount; other leg categorized from payee history or `Expenses:Uncategorized`). Example: an autopay that never got entered.

### missing-on-statement (suspect)

The ledger has a posting the statement doesn't. Causes: a transaction entered in the wrong account, a future-dated or duplicated entry, or a real item that will appear on the *next* statement (in-transit at the period boundary). **Report it and explicitly explain the possible timing difference to the user**, in these words: "This may be a legitimate in-transit item that clears on the next statement. Keep it in the ledger; do not delete it." Do not remove an entry merely because this statement omits it. It will make the period-end balance assertion differ, which is the correct signal for the user to investigate.

### amount-mismatch

A line pairs on payee and date but the numbers differ (ledger $40.00, statement $42.00): a typo, an added tip/fee, or a partial capture. **Report both amounts and the delta; do not auto-edit** — the skill is append-only and can't know which figure is right. The mismatch's delta will show up in the balance-assertion residual.

### ambiguous, then duplicate only when confirmed

Two or more equal ledger postings matching one statement line on amount and near-date *might* be the same real transaction recorded twice (double-entered import, or a manual entry plus an imported one) — or one of them might belong to an adjacent period, or both might be real (two identical charges the bank settled as one line, or the reverse split). Amount equality cannot tell these apart, so **preserve the ambiguity**: report every candidate with its file position and the statement row's identity, and ask. Only what the user confirms as recorded-twice becomes **duplicate** (report for manual removal; never delete here). A row equal to the sum of two near-dated postings, or two rows summing to one posting, is the same question in the other direction — a possible split settlement, asked about and never paired automatically.

## Tolerances and rules

- **Date window**: default ±3 days. Widen only if the user says their bank posts slowly; note it if you do.
- **Description similarity** is a tie-breaker only, never a sole match criterion — amount equality is required for any pairing. Bank descriptions are noisy (`SQ *COFFEE 0123`, `TRADER JOE'S #456`); normalize casing/whitespace before comparing, but never pair on description alone.
- **Never pair across a sign flip.** If a `+50.00` and a `−50.00` look "close", they are opposites, not a match — most likely a sign-normalization bug upstream; re-check `statement-formats.md` sign rules.
- **Ask on ambiguity.** Every place the algorithm can't decide (tie, unequal multiplicity, MDY/DMY doubt surfacing here as impossible matches) becomes a question, not a silent guess.

## Why the classes matter for the assertion

The Propose phase writes the missing-in-ledger transactions and, only when the account ties out, a period-end `balance` assertion. If any suspect, amount-mismatch, or duplicate remains unresolved, a strict `bea add balance` refuses the failing assertion before writing it. Report the residual instead; earlier successful transaction writes remain in place. Tie each unresolved report line to its contribution to the residual when you can. Use beancount-init's `references/compatibility.md` only when `bea` is absent.
