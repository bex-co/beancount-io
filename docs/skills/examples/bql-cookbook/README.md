# bql-cookbook fixtures

`cookbook-ledger.beancount` is the `cleanup` fixture for
[`docs/skills/bql-cookbook.md`](../bql-cookbook.md): a synthetic June-2026
household ledger holding the mess a fresh import leaves behind — one
uncategorized row, one foreign-currency charge, one transfer still sitting in
`Assets:Suspense`, and one `!` review flag. Every figure is invented.

The cookbook's other fixtures are the beancount-ask eval ledgers
(`skills/beancount-ask/evals/files/eval{1,10,17}_ledger.beancount`), reused so
the recipes share their ground truth. `scripts/skills/verify-bql-cookbook.py`
executes every marked recipe against its fixture.
