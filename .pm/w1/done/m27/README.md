# w1 · m27 — Amounts are exact on the way in and out

**Worker:** worker1 **Goal:** every number a caller supplies reaches the ledger as the exact decimal they wrote, every number bea renders is bounded by the ledger's display context, and a retried write does not duplicate a directive **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Refuse JSON floats in bulk amount fields — **DONE** | 30m | — |
| t002 | Apply one scientific-notation rule across every write path — **DONE** | 20m | t001 |
| t003 | Preserve `@@` total prices instead of converting them to unit prices — **DONE** | 45m | — |
| t004 | Bound converted output by the ledger's display context — **DONE** | 45m | — |
| t005 | Make cost shapes symmetric between `add transaction` and `add transactions` — **DONE** | 30m | t001 |
| t006 | Make repeated `add price` and `add balance` idempotent — **DONE** | 45m | — |
| t007 | Adoption surface — **DONE** | 25m | t001, t002, t003, t004, t005, t006 |
| t008 | Simplify — **DONE** | 30m | t007 |
| t009 | Test coverage — **DONE** | 45m | t007, t008 |
| t010 | Closeout — **DONE** | 15m | t009 |

## Definition of done

- A property test feeds every write path — `add`, `add transactions --from -`, and `import --apply` — the same set of amount strings and asserts the bytes on disk equal the input's decimal value. No float appears anywhere on an amount path.
- Bulk JSON refuses float amounts with the field, the row, and the exact-string form named; `"amount": "0.3"` writes `0.3`, and no ledger ever receives `0.30000000000000004`.
- Scientific notation behaves identically through `add transaction`, `add transactions`, and `import`, under one documented rule.
- A posting entered with `@@` is written with `@@` and its exact total; no written price or converted amount carries an unbounded repeating expansion, and human tables honor a display context that infers zero fractional digits while JSON stays exact.
- `bea --json add transaction … | bea add transactions --from -` round-trips a costed posting with no payload editing, and lot and cost strings in the bulk shorthand are accepted.
- Re-running an identical `bea add price` or `bea add balance` does not append a second directive; a conflicting same-key value is refused naming both values; repeated `--amount` never silently drops a value.
- `cli/docs/USAGE.md` documents the amount grammar, the round-trip guarantee, and the idempotency rule; `cd cli && make check-all` passes.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w1` 2026-09-16, item 5. Absorbs continuous CLI QA inbox notes w3/240 (major), 259, 260 (major), 272, 291, 297, 304, 309 (major), 365, 367.
- **Goal linkage:** **A1 — Agent-native accounting.** `bea add transactions --from -` is the write primitive every `beancount-*` skill uses, and the value an agent computes must be the value the books record. Silent rounding is the one class of accounting bug a user cannot see.
- **Expected outcome:** An agent can pipe computed amounts into the ledger and know the books hold exactly what it sent, and a retried write after a timeout leaves one directive rather than two.
- **Why now:** w1/028 removed IEEE-754 rounding from three write paths, but the bulk JSON path — the one the skills actually use — still accepts floats and writes their binary expansion. The idempotency half matters for the same audience: agents retry, and today a retry silently duplicates a price or an assertion.
- **Adoption surface:** included — the amount grammar, the write contract and the skills' JSON examples are agent-facing.
