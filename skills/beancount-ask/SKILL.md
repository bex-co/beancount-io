---
name: beancount-ask
description: Answer questions about a local Beancount ledger using shown, reproducible bea queries and reports for spending, trends, net worth, holdings, subscriptions and anomalies. Strictly read-only; figures come from executed queries. Skip ledgers hosted on Beancount.io, recording transactions (beancount-add), reconciliation, migration, ledger edits, option pricing or greeks, investment or tax advice, and general Beancount, BQL, or `bea` documentation questions (including what `bea ask` does).
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
      - bql
      - reports
---

# beancount-ask

Answer ledger questions with **shown, re-runnable BQL** — never with model arithmetic.

This skill exists because a fluent-but-unverifiable answer about money is worse than no answer: the entire credibility of plain-text accounting is that every number is reproducible. So every figure comes from a query run against the ledger, the query is shown with the answer, and the ledger is never modified.

## Prefer `bea`

Read beancount-init's `references/bea-cli.md` (from this skill's folder, `../beancount-init/references/bea-cli.md`; a copy at `references/bea-cli.md` when this skill was installed alone) before running ledger commands: it binds the root ledger, lists the read recipes, explains valuation and missing prices, and records version notes. Without `bea`, use beancount-init's `references/compatibility.md`. Run the queries yourself: `bea ask` hands the question to another model, and its figures are not queries you can show.

## Scope

**Does:** run read-only BQL against local ledger files, interpret the results, and show the query with every figure.

**Does not:** write, edit, or format any file; estimate when data is missing; give investment or tax advice (state the ledger's figures and leave the decision and its tax treatment to the user); answer general "how does Beancount work" questions (point at the docs).

## Workflow

### 1. Discover

Local ledger files only. If the ledger is hosted on Beancount.io and its MCP server is connected, use that server's `spending-report` prompt and tools instead (beancount-init's `references/bea-cli.md`, Hosted ledgers).

Find the root ledger with the suite's discovery convention (`fd -e beancount -e bean .`; the root has `option`/`include` directives) and confirm it when ambiguous. Bind it as `ledger` for the shared read recipes:

```sh
bea --file "$ledger" --json --no-input query "$query"
bea --file "$ledger" --json --no-input balance
bea --file "$ledger" --json --no-input report income-statement --time "$month"
```

- **Spending** comes from the `weight` recipes. `balance` and `report` value at market, and a commodity without a price makes them exit 1 with `result.missing_prices` (a valuation gap, not an engine failure); pass `-x at_cost` for book value and disclose the missing prices.
- **Entry searches** use root-scoped `list transaction --search/--tag/--link`, read to completion (beancount-init's `references/bea-cli.md`, Version notes, on `list` pages).
- **Market values** come from the ledger's price directives and managed price includes, which resolve during a `bea` load; `bea --file "$ledger" price status` reports their freshness. When a held commodity is unpriced or its latest price is old, name it and point the user at beancount-add's price refresh (its Refreshing prices section) — never value it at cost or from memory.
- **Realized gains** for a period (per closed lot, with holding period, tied to the booked gain postings) come from beancount-trade's `references/realized-gains.md` (from this skill's folder, `../beancount-trade/references/realized-gains.md`); recording a trade itself is `beancount-trade`.

### 2. Translate the question

Map the question to a recipe in `references/bql-recipes.md` — **read it first; every query there is tested**. Resolve the period against today's date ("last month") and state the resolved range in the answer. When the question is ambiguous ("how much do I spend?" — which period, which categories, total or average?), ask which one the user means: a precise answer to the wrong question reads as authoritative.

### 3. Run, then answer

Run the query and answer:

- **Lead with the figure(s)**, in a sentence or small table, each one from the query output.
- **Show the query** underneath (collapsed or quoted) so the user can re-run or refine it.
- **Say what the data can't show** when relevant (e.g. "transfers excluded; card payments are not spending").
- Point at the matching **Fava view** or `bea report` for statement-shaped answers rather than rebuilding them in BQL.
- Label any projection ("at this rate…") as arithmetic on top of the queried figures, and keep it minimal.
- "Should I buy/sell…?" gets **no answer to the should** — not "probably not", not "that creates a tax bill", not the name of any strategy (harvesting, deferring, rebalancing), not even to correct a premise the question assumes. Reply with the position's figures only (units, cost, value, holding dates, each from a shown query) and one sentence: whether to sell and how a sale is taxed are the user's decision and outside this skill.

Interpretation (the sign traps are in the recipes reference): Income accumulates negative and Expenses positive; `sum(weight)` gives spending in the operating currency (it counts an `@`-priced foreign charge at the amount paid, where `cost(position)` leaves it in the foreign currency); transfers and card payments are not spending, so the recipes select `^Expenses:` only.

### 4. When the data can't answer

A missing period, no such account or payee, or something the ledger doesn't track (market values without prices): say exactly what is missing and what would make it answerable. Never estimate. When the answer needs a write — adding prices, opening an account, refreshing a price include — name the skill or workflow that does it and stop; this skill only reads.
