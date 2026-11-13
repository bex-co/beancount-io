# w23 · m31 — Validate every MCP tool result against its published outputSchema

**Worker:** worker1 **Goal:** A schema-validating MCP client can read every tool result, including write previews that report new bean-check errors, and a gate keeps it that way. **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Declare `code` on the published bean-check error item — **DONE** | 40m | — |
| t002 | Build a schema-conformance fixture over every tool — **DONE** | 60m | t001 |
| t003 | Fix every extra key the handlers return beyond the published schema — **DONE** | 60m | t002 |
| t004 | Validate live tool results in yarn mcp:conformance — **DONE** | 45m | t002 |
| t005 | Adoption surface — **DONE** | 20m | t004 |
| t006 | Simplify — **DONE** | 20m | t005 |
| t007 | Test coverage — **DONE** | 30m | t005 |
| t008 | Closeout — **DONE** | 15m | t007 |

## Definition of done

A test drives every tool that publishes an `outputSchema` through an SDK `Client` with success, preview, refusal and populated `newErrors` results and validates each against the published schema; breaking the schema (removing `code` from the item) turns it red; `yarn mcp:conformance` validates live `tools/call` results and passes against the deployed endpoint once the fix is deployed; `yarn test` and `yarn typecheck` pass in backend-v2.

## Source + Goal linkage

- **Source:** `w23/230` (promoted), `w23/done/077` (same class on the error envelope), `/pm-brainstorm for w23` 2026-11-08, proposal 1.
- **Goal linkage:** A1 — Agent-native accounting.
- **Expected outcome:** SDK clients that validate `structuredContent` can read `validation.newErrors[]`, so agents can fix the errors a write would introduce instead of failing client-side.
- **Why now:** A real defect reproduced on production on 2026-11-08, and the second time the same class (`additionalProperties: false` against real results) has appeared; the existing test never sees a populated `newErrors`.
- **Adoption surface:** included: agents and integrators touch this surface directly.

## Unblocked

**Unblocked 2026-11-12** — blocked from 2026-11-08 only on a production deploy of the `597aa09dc` fix (t001 `597aa09dc`, t002 `96659bced`, t003 `6232ea5cd`, t004 `2320ccc40`, t005 `d15738bf3`, t006 `5279fa7b5`, t007 `fdfcf5bc5`). Production now serves the new build (`tools/list` 45 tools, with `revertCommit`): `yarn mcp:conformance https://beancount.io --ledger <qa-owner>/mcp-agent-eval` passes 17, fails 0 and skips 1 (check 5 needs the read-only variable), so check 17 passes, and checks 3 and 18, which still failed on 2026-11-12 before the deploy, pass too.

## Closed

**Closed 2026-11-12** — definition of done verified: the conformance test drives every tool that publishes an `outputSchema` (t002, t007); live `yarn mcp:conformance` check 17 passes against the deployed endpoint (17 passed, 0 failed, 1 skipped); in `backend-cluster/backend-v2` `yarn typecheck` exits 0 and `yarn test` passes (472 suites, 10523 tests), and `CI (backend parity)` is green on `013668f5`.
