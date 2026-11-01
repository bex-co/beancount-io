---
name: beancount-roll-forward
description: Explain how one balance-sheet account moved over a period — opening balance, each signed movement, closing balance — with shown, reproducible bea queries for prepaid, loan, and brokerage accounts. Strictly read-only; the closing is computed independently and any gap is reported, never plugged. Skip ledgers hosted on Beancount.io, recording entries (beancount-add), explanations of one transaction (beancount-ask), reconciliation against a statement (beancount-reconcile), investment or tax advice, and general Beancount or BQL questions.
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
      - roll-forward
---

# beancount-roll-forward

Explain a balance-sheet movement as **opening + signed movements = closing** — never with model arithmetic, and never with a plug.

This skill exists because "why is this balance what it is" is the question a ledger should answer exactly. Every figure comes from a query run against the ledger, the closing is computed by an independent route, and the ledger is never modified.

## Prefer `bea`

Read beancount-init's `references/bea-cli.md` (from this skill's folder, `../beancount-init/references/bea-cli.md`; a copy at `references/bea-cli.md` when this skill was installed alone) before running ledger commands. Without `bea`, use beancount-init's `references/compatibility.md`. Run the queries yourself: `bea ask` hands the question to another model, and its figures are not queries you can show.

## Scope

**Does:** run the read-only roll-forward trio in `references/roll-forward.md` — read it first; every query there is tested — for one account, one currency, and one period, and present the tie-out.

**Does not:** write, edit, or format any file; reconcile against an external statement (beancount-reconcile); explain spending or answer general ledger questions (beancount-ask); force a difference to zero; give investment or tax advice.

## Workflow

### 1. Discover

Local ledger files only. For a ledger hosted on Beancount.io, stop this skill and offer a separately requested hosted workflow or local clone (beancount-init's `references/bea-cli.md`, Hosted ledgers). Find the root ledger with the suite's discovery convention (`fd -e beancount -e bean .` (PowerShell: `Get-ChildItem -Recurse -Include *.beancount,*.bean`); the root has `option`/`include` directives) and confirm it when ambiguous.

### 2. Resolve the account, currency, and period

Name the exact account (a subtree rolls forward account by account, then sums only within one currency), the currency, and the half-open period `[start, end)`. Resolve "last quarter" against today's date and state the resolved range. When the account or period is ambiguous, ask — a precise explanation of the wrong account reads as authoritative.

### 3. Run the trio, then answer

Run opening, movements, and the independently computed closing from the reference. Present:

- **The tie-out table**: opening, each signed movement named by counterparty/payee/narration, the movement total, and closing — each figure from a query, the query shown underneath.
- **`Uncategorized` stays visible**: a movement that cannot be named is listed as its own bucket with date and amount, never dropped or netted.
- **Cost basis is the default**; keep market value separate and state the valuation date and price. If prices do not cover the period end, name that gap; when the user also asks what the holdings are worth, report an available later valuation with its actual date, without calling it period-end value (see the reference).
- **Signs keep their meaning**: a liability's negative closing is stated as an amount owed.
- **A gap is the report**: when independent closing ≠ opening + movements, say so with both figures and stop. Never invent a reconciling line; a missing entry is the user's or beancount-add's to record, not this skill's to fabricate.
