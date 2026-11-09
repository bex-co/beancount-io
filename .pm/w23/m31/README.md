# w23 · m31 — Validate every MCP tool result against its published outputSchema

**Worker:** worker1 **Goal:** A schema-validating MCP client can read every tool result, including write previews that report new bean-check errors, and a gate keeps it that way. **Status:** todo (t001 done)

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Declare `code` on the published bean-check error item — **DONE** | 40m | — |
| t002 | Build a schema-conformance fixture over every tool | 60m | t001 |
| t003 | Fix every extra key the handlers return beyond the published schema | 60m | t002 |
| t004 | Validate live tool results in yarn mcp:conformance | 45m | t002 |
| t005 | Adoption surface | 20m | t004 |
| t006 | Simplify | 20m | t005 |
| t007 | Test coverage | 30m | t005 |
| t008 | Closeout | 15m | t007 |

## Definition of done

A test drives every tool that publishes an `outputSchema` through an SDK `Client` with success, preview, refusal and populated `newErrors` results and validates each against the published schema; breaking the schema (removing `code` from the item) turns it red; `yarn mcp:conformance` validates live `tools/call` results; `yarn test` and `yarn typecheck` pass in backend-v2.

## Source + Goal linkage

- **Source:** [w23/230](../../230.md) (promoted), [w23/done/077](../../done/077.md) (same class on the error envelope), `/pm-brainstorm for w23` 2026-11-08, proposal 1.
- **Goal linkage:** A1 — Agent-native accounting.
- **Expected outcome:** SDK clients that validate `structuredContent` can read `validation.newErrors[]`, so agents can fix the errors a write would introduce instead of failing client-side.
- **Why now:** A real defect reproduced on production on 2026-11-08, and the second time the same class (`additionalProperties: false` against real results) has appeared; the existing test never sees a populated `newErrors`.
- **Adoption surface:** included: agents and integrators touch this surface directly.
