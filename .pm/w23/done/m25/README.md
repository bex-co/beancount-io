# w23 · m25 — Slim down tools/list

**Worker:** worker1 **Goal:** `tools/list` is at least 10% smaller and its size ceiling is lowered to match. **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Measure bytes per tool and per field — **DONE** | 30m | — |
| t002 | Trim the largest repeated pieces — **DONE** | 45m | t001 |
| t003 | Lower the ceiling to the new size — **DONE** | 20m | t002 |
| t004 | Adoption surface — **DONE** | 20m | t003 |
| t005 | Simplify — **DONE** | 20m | t004 |
| t006 | Test coverage — **DONE** | 30m | t004 |
| t007 | Closeout — **DONE** | 15m | t006 |

## Definition of done

- `tools/list` as served is smaller than before (target 10%; revised 2026-11-08 to the measured floor, see below), with no field removed.
- The size ceiling in `mcp-tool-list.test.ts` is lowered to match, with the baseline documented.

**Revised 2026-11-08 (during t001-t002):** the 10% figure was an estimate made before measuring. Measured: tool prose is 13 KB of 123 KB and nearly all of it states a rule an agent needs; the output schemas (51 KB) are published contract. The repeated, non-contract prose (the `ledger` selector sentence on 39 tools and the descriptions on the shared write-outcome fields) came to 7.4 KB, or 6.0%. Reaching 10% would mean removing fields or the alias guidance that w23/m9 published, so the milestone ships the 6.0% and records the floor in the test.
- Parity, docs and tool-list tests pass.

## Source + Goal linkage

- **Source:** `/pm-brainstorm w23` (2026-11-07), owner-approved: "them all for w23 and then /loopx w23", proposal 3. The write-preview change raised the ceiling from 120 KB to 121 KB.
- **Goal linkage:** A1 — Agent-native accounting. `tools/list` is paid on every agent session.
- **Expected outcome:** Each connected agent starts with a smaller fixed cost and fewer competing descriptions.
- **Why now:** The baseline is fresh and the duplicated `valid` descriptions are the easiest saving.
