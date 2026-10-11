# w6 · m1 — Count canonical BQL rows in MCP text summaries

**Worker:** worker1 **Goal:** Agents can trust text query counts without losing query content. **Status:** todo (t001, t002, t003, t004 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Define same-query row-count metadata — **DONE** | 25m | — |
| t002 | Emit canonical counts from the ledger producer — **DONE** | 35m | t001 |
| t003 | Use canonical metadata in MCP text summaries — **DONE** | 50m | t002 |
| t004 | Adoption surface — **DONE** | 20m | t003 |
| t005 | Simplify | 20m | t004 |
| t006 | Test coverage | 20m | t004, t005 |
| t007 | Closeout | 10m | t006 |

## Definition of done

The ledger emits canonical row metadata from its existing single query execution. The optional wire contract and regenerated clients agree. MCP summaries use that metadata for all cases in w6/003 while preserving the public string payload and typed query values/caps. Legacy or null metadata never becomes an inferred count. Registry and REST/GraphQL controls pass; regression tests fail when the production fix is reverted. Each owning package passes its native gates with no backend OpenAPI drift. Adoption, simplify and coverage checks are complete. Production deployment equality is not asserted.

## Source + Goal linkage

- **Source:** w6/003, independently reproduced at main: multiline and short/blank tables miscount physical lines.
- **Goal linkage:** A1 — Agent-native accounting; reliable query counts let agents validate their accounting results.
- **Expected outcome:** Agents receive the canonical row count and the unchanged readable/raw query result through the shared MCP endpoint.
- **Why now:** The existing wire contract has no count, so fixing the adapter requires contract, producer and consumer tasks across package boundaries (>1h). Adoption surface is included because the MCP text summary is agent-facing.
