---
name: beancount-close
description: Close an accounting period in a local Beancount ledger by reconciling each active account through beancount-reconcile, checking assertions and recurring gaps, reviewing flags, then proposing a commit with the period reports. Use for month-end close or wrapping up the books. Surface incomplete work and require a passing check before a confirmed commit; never push. Skip closing a single account (a `close` directive; beancount-add) and ledgers hosted on Beancount.io.
license: MIT-0
metadata:
  openclaw:
    homepage: 'https://github.com/bex-co/beancount-io/tree/main/skills'
    requires:
      anyBins:
        - bea
        - bean-check
    install:
      - id: brew
        kind: brew
        formula: bex-co/tap/bea
        bins:
          - bea
        label: Install bea (Homebrew)
      - id: uv
        kind: uv
        package: beancount-io
        bins:
          - bea
        label: Install bea (uv)
  hermes:
    category: finance
    tags:
      - beancount
      - accounting
      - month-end-close
      - reconciliation
---

# beancount-close

Close one month with a fixed, honest checklist — every account either ties out or is explicitly reported as unverified, and the close lands as a git commit whose message is the audit record.

This skill exists because trustworthy books come from ritual, not heroics: the same checks, every month, with nothing silently skipped. Each phase reports its status before the next begins; the final commit encodes the close report so `git log` reads as a close history.

## Prefer `bea`

Read beancount-init's `references/bea-cli.md` (from this skill's folder, `../beancount-init/references/bea-cli.md`; a copy at `references/bea-cli.md` when this skill was installed alone) before running ledger commands: it defines explicit root/destination paths, JSON batches, checks, and safe retries. Without `bea`, use beancount-init's `references/compatibility.md`. This skill writes nothing itself: reconciliation writes go through beancount-reconcile, and its own output is the report and one commit.

## Scope

**Does:** one period (default: the last complete calendar month) across all active accounts; reconciles each account through **beancount-reconcile** and its confirm gate; produces a close report; makes one confirmed git commit.

**Does not:** create entries to fill a gap, edit existing entries, force a tie-out, or push. Every unverified account, unpinned assertion, recurring gap, and carried flag appears in the report with its count.

Read `references/close-checklist.md` before running — it defines each phase's procedure and reportable status.

## Workflow

Seven phases: **Scope → Reconcile → Assert → Recurring → Flags → Report → Commit.** Announce the phase status line as each completes (e.g. `Reconcile: 2 tied, 1 unverified (no statement)`).

### 1. Scope

Local ledger files only. If the ledger is hosted on Beancount.io and its MCP server is connected, use that server's `close-month` prompt and tools instead (beancount-init's `references/bea-cli.md`, Hosted ledgers).

Resolve the period (the user's words or the last complete month) and state it. Find the root ledger with the suite's discovery convention. Enumerate **active accounts**: any Assets/Liabilities account with postings in the period or a nonzero balance at period end (bounded by `date < <period-end+1>`, so later entries don't count). Run `bea --file "$ledger" --json --no-input check` first: a ledger that starts red is fixed (surface the errors) before a close can mean anything.

### 2. Reconcile

For each active account, ask for the period statement (CSV or pasted text). Per account **with** a statement, run the `beancount-reconcile` flow (its own confirm gate applies). Record the account's **evidence** — the statement file or files, the statement period, the coverage counts from reconcile's Coverage phase (source / included / excluded rows), and the residual — and exactly one **state**:

- **tied** — a passing assertion over the whole close period.
- **partial** — reconcile withheld the assertion over unresolved suspects or mismatches (a reported finding with its residual, not a failure to retry).
- **partly covered** — the statement period does not span the close period, even if it ties over its own span.
- **unverified** — no statement.
- **blocked** — the step could not run, with the reason (for example, reconcile is not installed, or the user stopped).

If beancount-reconcile is not installed beside this skill (a registry can install one skill alone), say so and point the user to https://github.com/bex-co/beancount-io/blob/main/docs/skills/installation.md to add it. Without it, every account is **blocked** with that reason — never quietly downgraded to unverified.

An owner or a due date may be attached to a step or an account **only when the user supplies them**; when they do not, those fields do not appear anywhere in the report.

### 3. Assert

Every tied account now has a period-end `balance` assertion (reconcile appends them). Check that each active account has an assertion dated on or after period end; accounts without one are **unpinned** in the report. An assertion that pins only part of the close period (a partly covered account) does not pin the close — the account stays partly covered, not tied.

### 4. Recurring completeness

Find expected-but-missing entries: merchants (payee, or narration when the payee is empty) present in **each of the prior 2–3 months** with a steady amount but absent this period (query per `close-checklist.md`). Each gap is a **finding** for the user ("NETFLIX appeared Apr+May, absent in June — charge missing, subscription cancelled, or card changed?"). This skill never creates an entry on the strength of the pattern alone. When the user confirms the charge really happened, offer the routes: importing the missing export (`beancount-import`), or recording the single entry now — and only on their choice of the latter, compose `beancount-add`'s flow inside this session:

- Read the most recent prior occurrence and prefill beancount-add's full proposal from it: same payee/narration, same source and counter accounts, the steady (most recent) amount, and the date — the occurrence's day-of-month in the close period, clamped to the month's length — each field shown so the user can correct it. Run add's checks too (duplicate ±3 days; a hit is shown and the user decides).
- The write needs **its own explicit yes** to that proposal, separate from the close-commit yes. On yes, write through the shared `transaction` recipe and re-run the root check; then refresh the report's figures (the entry lands in the period) and mark the gap `recorded at your confirmation` in the report instead of open. On no — or when the user would rather import — nothing is written and the gap stays an open finding.
- This composition needs `beancount-add` installed beside this skill; without it, say so (installation guide pointer, as for beancount-reconcile) and keep the gap a finding that names the import/manual route.

### 5. Flags

List every `!`-flagged entry dated in or before the period. Each is either resolved by the user now (their edit) or carried forward, and counted in the report either way.

### 6. Report

Generate the period's numbers with the `close-income-statement` and `close-balance-sheet` recipes in `references/close-checklist.md`, both at book value (`-x at_cost`) — the valuation the checklist's period-end balances use — so a cost-basis lot counts at cost and an unpriced commodity (an `@`-priced foreign charge, an option lot) appears in its own units. State that valuation in the report. Expense totals in the operating currency come from beancount-ask's `weight` recipes (`top-expenses` counts `300 EUR @ 1.10 USD` as the 330 USD paid); without beancount-ask installed, report the two statements only. A report that exits 1 with `result.missing_prices` is a valuation gap (beancount-init's `references/bea-cli.md`, Read and check): list the missing prices in the close report. When the ledger holds investments, the period's realized gains per closed lot come from beancount-trade's `references/realized-gains.md` (from this skill's folder, `../beancount-trade/references/realized-gains.md`), tied to the booked gain postings. Assemble the close report:

```
Close: 2026-06 (2026-06-01 … 2026-06-30) — 1 tied, 1 not tied
Accounts:
  Assets:Bank:Checking — tied (june-checking.csv, 2026-06-01…06-30; coverage 42 source / 42 included / 0 excluded; residual 0.00; ties to 7,874.60)
  Liabilities:CreditCard:Amex — unverified (no statement)
Assertions: 1 pinned, 1 unpinned
Recurring gaps: NETFLIX (present Apr, May — absent Jun)   Flags carried: 1 (2026-06-21 ! WHOLE FOODS)
Income: 3,000.00        Expenses: 203.60        Net: +2,796.40
check (ledger validity): PASS — the ledger is valid; that alone does not verify this close
```

The headline counts **tied accounts only** as reconciled and names the not-tied count; the account lines list every account that is not tied with its state. Never call the close "verified", "complete", or "clean" — in the headline, the report, or the commit message — unless every active account is tied over the whole period. A green `check` line is ledger validity only.

### 7. Commit

Re-run `bea --file "$ledger" --json --no-input check` after all reconciliation writes. A red check blocks the commit proposal. When it passes, show what will be staged (the ledger files the close touched) and the commit message — subject `close: <period> — <n> tied, <m> not tied` (n counts tied accounts only), body = the close report — and **commit only on an explicit yes**. On no, leave the working tree exactly as it is; the report stays in the conversation. Pushing stays with the user.
