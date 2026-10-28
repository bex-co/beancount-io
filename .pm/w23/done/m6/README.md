# w23 · m6 — Complete the typed entry schema

**Worker:** worker1 **Goal:** the typed entry path expresses what investments and careful bookkeeping need — posting cost, total price, posting tags/links/meta, open booking, balance tolerance, and pad — identically on REST, GraphQL, and MCP **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Spike — map each gap to its layers ✅ | 30m | — |
| t002 | Posting cost end to end ✅ | 60m | t001 |
| t003 | Posting meta, tags, and links end to end ✅ | 45m | t002 |
| t009 | Open booking and balance tolerance end to end ✅ | 60m | t003 |
| t010 | Total price and pad end to end ✅ | 60m | t009 |
| t004 | Document the new entry fields ✅ | 30m | t010 |
| t005 | Adoption surface ✅ | 20m | t004 |
| t006 | Simplify ✅ | 30m | t005 |
| t007 | Test coverage ✅ | 45m | t005 |
| t008 | Closeout ✅ | 15m | t006, t007 |

## Definition of done

- Typed entries accept posting `cost` and total price, posting `tags`/`links`/`meta`, open `booking`, balance `tolerance`, and a `pad` variant — identically on REST, GraphQL, and MCP, rendered through the directive-text serializer with the project's string escaping; `cost` is refused where beancount forbids it with field-level errors. The note's repro (a posting with `cost`) commits instead of answering `Unrecognized key`.
- New fields documented next to the entry tools, including the cost-vs-price distinction; OpenAPI regen with no drift.
- Package gates green in every touched package.

## Source + Goal linkage

- **Source:** promoted from `w23/094` (inbox note): production repro 2026-10-26 shows `addLedgerEntries` refusing `cost` with `Unrecognized key`, while the raw-text path accepts lots. Triage confirmed every gap field-for-field on main (REST `postingSchema` and GQL `LedgerPostingInput` are `units/account/price/flag` only; `LedgerOpenInput` has no `booking`; `LedgerBalanceInput` has no `tolerance`; no pad variant among the 12 input classes) and sized the schema + renderer + three-surface work past the sub-hour note limit.
- **Goal linkage:** A1 (agent-native accounting) — agents booking investments through the typed API must drop to raw text, losing field-level validation.
- **Expected outcome:** the typed path expresses lots, booking methods, tolerances, and pads, with the cost-vs-price distinction documented where agents read it.
- **Why now:** the note's audit found all six gaps in one pass on the same schema files; fixing them together keeps the renderer and parity tests coherent.
- **Adoption surface:** included — the milestone ships agent-facing entry fields and tool wording that must hold on every surface.

**Prod re-verified it.6371:** `addLedgerEntries` dry_run with a posting `cost: {number, currency, date}` passes schema validation — both attempts reached bean-check (unopened-account / currency-constraint errors naming the ledger problem), never `Unrecognized key`. m6's core gap holds live.
