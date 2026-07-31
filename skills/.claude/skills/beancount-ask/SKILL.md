---
name: beancount-ask
description: Answer questions about a beancount ledger with BQL queries — spending, trends, net worth, burn rate, subscriptions, anomalies. Use this skill whenever the user asks an analytical/reporting question about their ledger — "how much did I spend on groceries last month", "what's my net worth", "what subscriptions am I paying for", "did anything unusual happen in May", "what's my monthly burn" — or asks for a spending report/summary. Every figure in an answer comes from a bean-query run the user can see and re-run; the skill is strictly read-only. SKIP when the user wants to record transactions (beancount-options / beancount-import), reconcile against a statement (beancount-reconcile), migrate from another app (beancount-migrate), edit the ledger in any way, or asks how beancount/BQL works in general (that's a docs question, not a query over their data). The core trigger is "answer this question from my ledger's data".
---

# beancount-ask

Answer ledger questions with **shown, re-runnable BQL** — never with model arithmetic.

This skill exists because a fluent-but-unverifiable answer about money is worse than no answer: the entire credibility of plain-text accounting is that every number is reproducible. So the contract is: every figure cited comes from a `bean-query` execution, the query is shown with the answer, and the ledger is never modified.

## Scope

**Does:** run read-only BQL against local ledger files; interpret results; show the query with every figure.

**Does not:** write, edit, or format any file; guess or estimate when data is missing; answer general "how does beancount work" questions (point at docs); compute figures in-model (the query engine computes, the skill interprets).

## Workflow

### 1. Discover

Find the main ledger file (same procedure as the sibling skills: `fd -e beancount -e bean .`, main = the file with `option`/`include` directives). Confirm which file when ambiguous.

Tooling, in order of preference:

1. `bean-query <ledger> "<BQL>"` (from the `beanquery` package; `/tmp/beancount_venv/bin/bean-query` if not on PATH, else `pip install beanquery`).
2. `beancount-cli query "<BQL>"` — this repo's CLI (wraps beanquery), when the user has it installed.
3. For polished statements (income statement, balance sheet trees), `beancount-cli report` / Fava beat raw BQL — say so rather than rebuilding them in BQL.

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

Missing period, no such account/payee, ledger doesn't track it (e.g. market values without price directives): say exactly what's missing and what would make it answerable. **Never estimate.** If the answer needs a write (adding price directives, opening accounts), that's another skill's job — name it and stop.

## What NOT to do

- Don't state any figure that didn't come out of the query you show.
- Don't modify, format, or "fix" any file — read-only, no exceptions.
- Don't answer an ambiguous question by picking an interpretation silently.
- Don't rebuild Fava's statements in BQL when pointing at Fava/`beancount-cli report` serves better.
- Don't extrapolate ("at this rate you'll…") without labeling it as arithmetic on top of queried figures — and keep even that minimal.
