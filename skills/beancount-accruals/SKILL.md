---
name: beancount-accruals
description: Prepare supported accrual and reversal drafts for a period from an explicitly stated schedule — basis, service interval, day-count, recognized-to-date, already-booked, required adjustment — posted only through the suite's propose/confirm/check flow with stable schedule identity. Skip recording one-off entries the user describes (beancount-add), explaining how a balance moved (beancount-roll-forward), tax or depreciation advice, automatic reversals, and ledgers hosted on Beancount.io.
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
      - accruals
---

# beancount-accruals

Part of the [Beancount.io](https://beancount.io/) ledger skill suite.

Prepare an accrual draft a user can approve — **calculated from a stated schedule, never estimated in chat, and never posted without confirmation**.

This skill exists because period-end accruals are where agent arithmetic does the most damage: a plausible number, posted once, then posted again on rerun. So the calculation follows the contract in `references/schedule-contract.md` — **read it first** — every figure traces to a query or to the schedule's stated basis, and the draft carries a stable identity that makes a rerun reproduce the same draft instead of a second posting.

## Prefer `bea`

Read beancount-init's `references/bea-cli.md` (from this skill's folder, `../beancount-init/references/bea-cli.md`; a copy at `references/bea-cli.md` when this skill was installed alone) before running ledger commands: it binds the root ledger, the batch write path, and the check gate. Without `bea`, use beancount-init's `references/compatibility.md`. Writes go through `bea add` after confirmation, with decimal strings in batch JSON; `bea check` must pass before and after.

## Scope

**Does:** for each schedule the user states (or confirms from support they provide), compute recognized-to-date, already-booked, and the required adjustment per the contract, present the balanced draft entries, and — only on an explicit yes — post them through the shared propose/confirm/check flow.

**Does not:** invent a schedule from a missing recurring payment (absence is not an expense); post, auto-reverse, or schedule anything without the confirmation in this run; give tax or depreciation advice; modify existing entries — surface a wrong booked amount and leave edits to the user. beancount-add appends only: if the user explicitly requests a separate adjusting entry, it can propose one through its own confirmation/check flow, but cannot edit or replace the original entry. Do not bypass the existing-identity stop with another identity for the same schedule and period.

## Workflow

### 1. Establish the schedule

Local ledger files only. For a ledger hosted on Beancount.io, stop this skill and offer a separately requested hosted workflow or local clone (beancount-init's `references/bea-cli.md`, Hosted ledgers). For each accrual the user wants, pin down the contract's fields: schedule id, expense and balance-sheet accounts (existing accounts only — categories are never invented), basis amount with its support, service interval, day-count convention, and target kind (cumulative or current-period). A policy may rest on an estimate the user approves, with method and source stated on the schedule. When any field is missing, ask; a draft built on an unstated assumption is an estimate wearing a schedule's clothes.

### 2. Compute and check identity

Resolve the accounting period separately from the as-of cutoff and day-count: monthly identities use `YYYY-MM` (as of February 1 closes January). Run the contract's queries (`accrual-booked`, `accrual-postings`) for recognized expense in that schedule's scope, not its prepaid or liability balance. Before drafting, search the ledger for this run's identity (`accrual:<slug>:<period>`, carried as the entry's `import-id` on posting): if a posting with that identity already exists, the period is already drafted — show the existing entry and stop. A rerun must reproduce the identical draft, never a second posting. Externally sourced recognition stays inside the booked evidence, never silently excluded.

### 3. Present the draft

Per schedule, show: the policy and its support, the interval and day-count, recognized-to-date, already-booked (with the postings list as evidence), and the required adjustment as balanced draft entries — direction in words when the adjustment is negative (a reversal of the usual direction). State the draft's identity. Nothing is written in this step.

### 4. Confirm, post, verify

Only on an explicit yes to the shown draft: write it through `bea add` with the identity as `import-id`, run `bea check`, and report the result. On no, nothing is written and the draft stays in the conversation. A reversal of a booked accrual is its own draft through the same flow — preparing a schedule never authorizes an automatic reversal later.
