# w1 · m44 — List entries with their source text in one call

**Worker:** worker1 **Goal:** an agent that needs the source of N entries before editing or deleting them gets each entry's text, location and `sha256sum` from one `listLedgerEntries` page, on MCP, REST and GraphQL, instead of one `getEntryContext` call per entry. **Status:** in progress (t001–t005 done)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Journal reads can include each entry's source slice — **DONE** | 60m | — |
| t002 | `include_source` on MCP, REST and GraphQL, with parity rows — **DONE** | 45m | t001 |
| t003 | Describe the flag in the tool, the docs and the size budget — **DONE** | 20m | t002 |
| t004 | Adoption surface — **DONE** | 20m | t003 |
| t005 | Simplify — **DONE** | 15m | t004 |
| t006 | Test coverage | 30m | t004, t005 |
| t007 | Closeout | 10m | t006 |

## Definition of done

- `listLedgerEntries { include_source: true, limit: 8 }` returns, for each entry, `source { path, lineno, text, sha256sum }`. Each `sha256sum` is the one `getEntryContext` returns for that entry, and `updateEntrySource` and `deleteEntrySources` accept the listed `entry_hash` and `sha256sum` without any `getEntryContext` call in between.
- REST journal reads and GraphQL `getLedgerJournal` accept the same option and return the same `source` objects.
- A multi-line entry's text is the same slice `getEntryContext` returns (the w4/m34 rule: quoted strings are never split).
- With the option absent or false, every surface's response is unchanged from today.
- A page asking for source above the documented page cap is refused with `BAD_USER_INPUT` naming the cap. Each source file is read once per request, not once per entry.
- `yarn test` passes in `backend-cluster/backend-v2`, including the parity gate.

## Source + Goal linkage

- **Source:** [w1/228](../blocked/228.md) (from `/qa-find-bugs-mcp`, 2026-11-10): "Collecting the source of 8 entries took 8 `getEntryContext` calls, because `listLedgerEntries` returns no source text." `/pm-brainstorm for w1`, 2026-11-13, item 3; routed by the user via `/pmx` the same day.
- **Goal linkage:** **A1 — Agent-native accounting:** bulk edits and deletes stop costing one round trip, and one rate-limit unit, per entry.
- **Expected outcome:** a bulk edit of N entries takes two calls instead of N+1. Signals: calls per bulk-edit task in MCP QA, fewer `RATE_LIMITED` answers on bulk work.
- **Why now:** it is the smallest of w1/228's three primitives, and [m45](../m45/README.md) needs the same hash and `sha256sum` for every entry it moves. The ledger service already resolves a batch of slices from one parse (`findEntrySlicesWithFullLedger`, w1/237), so the cost is bounded. Adoption surface is included because a tool parameter and its docs change for every connecting agent.

## Out of scope

- Returning source from BQL results.
- Changing `getEntryContext`.
