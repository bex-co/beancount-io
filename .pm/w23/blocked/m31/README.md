# w23 · m31 — Validate every MCP tool result against its published outputSchema

**Worker:** worker1 **Goal:** A schema-validating MCP client can read every tool result, including write previews that report new bean-check errors, and a gate keeps it that way. **Status:** blocked (t001–t007 done)

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
| t008 | Closeout (blocked) | 15m | t007 |

## Definition of done

A test drives every tool that publishes an `outputSchema` through an SDK `Client` with success, preview, refusal and populated `newErrors` results and validates each against the published schema; breaking the schema (removing `code` from the item) turns it red; `yarn mcp:conformance` validates live `tools/call` results and passes against the deployed endpoint once the fix is deployed; `yarn test` and `yarn typecheck` pass in backend-v2.

## Source + Goal linkage

- **Source:** `w23/230` (promoted), `w23/done/077` (same class on the error envelope), `/pm-brainstorm for w23` 2026-11-08, proposal 1.
- **Goal linkage:** A1 — Agent-native accounting.
- **Expected outcome:** SDK clients that validate `structuredContent` can read `validation.newErrors[]`, so agents can fix the errors a write would introduce instead of failing client-side.
- **Why now:** A real defect reproduced on production on 2026-11-08, and the second time the same class (`additionalProperties: false` against real results) has appeared; the existing test never sees a populated `newErrors`.
- **Adoption surface:** included: agents and integrators touch this surface directly.

## Blocked

**Blocked 2026-11-08** — what is blocked: t008 Closeout, and with it the milestone, because every other task is done and shipped (t001 `597aa09dc`, t002 `96659bced`, t003 `6232ea5cd`, t004 `2320ccc40`, t005 `d15738bf3`, t006 `5279fa7b5`, t007 `fdfcf5bc5`).

**Blocker:** the definition of done requires `yarn mcp:conformance` check 17 to pass against the deployed endpoint, and production still serves the build before `597aa09dc`. Rerun on 2026-11-08 after the last push: check 17 fails with `data/result/validation/newErrors/0 must NOT have additional properties` (the w23/230 signature); checks 1–16 pass. The code fix and its guards are on `main`; only the deploy is missing.

**Unblock:** the backend-v2 build containing `597aa09dc` is deployed to production. Verify with `yarn mcp:conformance https://beancount.io --token "$QA_MCP_TOKEN" --read-only-token "$QA_MCP_TOKEN_READONLY" --ledger <qa-owner>/mcp-agent-eval` (credentials from the gitignored `.env`); check 17 must pass. Then `/pm unblock w23/m31` and close t008 (w23/230 was already closed on 2026-11-08 because its fix and tests are on `main`). Who can clear it: whoever deploys backend-v2 to production (a deploy this repository's worker cannot run).
