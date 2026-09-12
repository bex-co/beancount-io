"""Directive reads and validated writes — the ledger operations `bea` used to do in-process.

ADR014 w1/m19 t018/t019 moved this code here from `cli.directives` and
`cli.ledger_write`. It is the same code, not a copy: `bea list` and `bea add`
now reach it as `bea-engine list` / `bea-engine add` across the process
boundary, and nothing under `cli/commands/list.py` or `cli/commands/add.py`
imports Beancount any more.

`bea ask` reaches validated raw-text writes as `bea-engine append` (t022).
`bea init` and `bea import` reach them as `bea-engine init` /
`bea-engine import` (t021). Balances and Fava reports already live in
`bea_engine.report` (t020). Only the engine distribution packages this code;
the frontend wheel ships `src/cli` alone (t023).

Layout:

- `models` — the Pydantic directive shapes the JSON protocol speaks in
- `reader` — one lister per directive type, entries to models
- `writer` — one writer per directive type, models to ledger text
- `write` — the atomic append: snapshot, validate a candidate, replace
- `text` — the two text primitives the ledger side needs
- `listing` / `adding` / `appending` — what the `list`, `add`, and `append`
  helper commands answer
"""
