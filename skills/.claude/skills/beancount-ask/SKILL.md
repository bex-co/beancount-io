---
name: beancount-ask
description: Answer questions about a local Beancount ledger using shown, reproducible bea queries and reports for spending, trends, net worth, subscriptions and anomalies. Strictly read-only; figures come from executed queries. Skip recording transactions, reconciliation, migration, ledger edits, and general Beancount or BQL documentation questions.
---

# beancount-ask

Answer ledger questions with **shown, re-runnable BQL** — never with model arithmetic.

This skill exists because a fluent-but-unverifiable answer about money is worse than no answer: the entire credibility of plain-text accounting is that every number is reproducible. So the contract is: every figure cited comes from a shown query execution, the query is shown with the answer, and the ledger is never modified. Prefer `bea` for reads. Read beancount-init's `references/bea-cli.md` before running ledger commands: it defines explicit root/destination paths, JSON batches, checks, and safe retries. Without `bea`, use beancount-init's `references/compatibility.md`.

## Scope

**Does:** run read-only BQL against local ledger files; interpret results; show the query with every figure.

**Does not:** write, edit, or format any file; guess or estimate when data is missing; answer general "how does beancount work" questions (point at docs); compute figures in-model (the query engine computes, the skill interprets).

## Workflow

### 1. Discover

Find the main ledger file (same procedure as the sibling skills: `fd -e beancount -e bean .`, main = the file with `option`/`include` directives). Confirm which file when ambiguous.

Bind the discovered root as `ledger` and use the shared read recipes:

```sh
bea --file "$ledger" --json --no-input query "$query"
bea --file "$ledger" --json --no-input balance
bea --file "$ledger" --json --no-input report income-statement --time "$month"
```

For entry searches, use root-scoped `list transaction --search/--tag/--link`;
check truncation before treating a listing as complete. Use `report` for
polished statements. Keep query execution here rather than delegating the
question to another LLM via `bea ask`.

For market values, existing managed price includes resolve during a `bea`
load; `bea --file "$ledger" price status` reports freshness. Missing quotes
or includes require a separate write workflow; this skill does not run
`add price`, price refresh/export, or edit includes to answer a question.

### 2. Translate the question

Map the question to a recipe in `references/bql-recipes.md` — **read it first; every query there is tested**. Establish the period explicitly: "last month" etc. resolves against today's date; state the resolved date range in the answer. If the question is ambiguous ("how much do I spend?" — period? category? average or total?), **ask, don't assume** — a precise answer to the wrong question reads as authoritative and misleads.

### 3. Run, then answer

Run the query. Answer format:

- **Lead with the figure(s)**, in a sentence or small table.
- **Show the query** underneath (collapsed/quoted is fine) so the user can re-run or refine it.
- **Say what the data can't show** when relevant (e.g. "transfers excluded; card payments are not spending").
- Point at the matching **Fava view** for browsing (Income Statement / Balance Sheet / Journal with a filter) when one exists.

Interpretation rules (the classic sign traps are in the recipes reference): Income accounts accumulate negative; Expenses positive; `cost(position)` for USD totals; transfers and credit-card payments are **not** spending — recipes exclude them by selecting `^Expenses:` only.

### 4. When the data can't answer

Missing period, no such account/payee, ledger doesn't track it (e.g. market values without price directives or a managed include): say exactly what's missing and what would make it answerable. **Never estimate.** If the answer needs a write (adding price directives, opening accounts), that's another skill's job — name it and stop.

## What NOT to do

- Don't state any figure that didn't come out of the query you show.
- Don't modify, format, or "fix" any file — read-only, no exceptions.
- Don't answer an ambiguous question by picking an interpretation silently.
- Don't rebuild Fava's statements in BQL when pointing at Fava/`bea report` serves better.
- Don't extrapolate ("at this rate you'll…") without labeling it as arithmetic on top of queried figures — and keep even that minimal.
