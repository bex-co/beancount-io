# w23 · m25 — Slim down tools/list

**Worker:** worker1 **Goal:** `tools/list` is at least 10% smaller and its size ceiling is lowered to match. **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Measure bytes per tool and per field | 30m | — |
| t002 | Trim the largest repeated pieces | 45m | t001 |
| t003 | Lower the ceiling to the new size | 20m | t002 |
| t004 | Adoption surface | 20m | t003 |
| t005 | Simplify | 20m | t004 |
| t006 | Test coverage | 30m | t004 |
| t007 | Closeout | 15m | t006 |

## Definition of done

- `tools/list` as served is at least 10% smaller than before, with no field removed.
- The size ceiling in `mcp-tool-list.test.ts` is lowered to match, with the baseline documented.
- Parity, docs and tool-list tests pass.

## Source + Goal linkage

- **Source:** `/pm-brainstorm w23` (2026-11-07), owner-approved: "them all for w23 and then /loopx w23", proposal 3. The write-preview change raised the ceiling from 120 KB to 121 KB.
- **Goal linkage:** A1 — Agent-native accounting. `tools/list` is paid on every agent session.
- **Expected outcome:** Each connected agent starts with a smaller fixed cost and fewer competing descriptions.
- **Why now:** The baseline is fresh and the duplicated `valid` descriptions are the easiest saving.
