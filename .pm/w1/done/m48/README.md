# w1 · m48 — "The operator has not set this up" fails one way on REST, GraphQL and MCP

**Worker:** worker1 **Goal:** every feature that needs operator setup (object storage for uploads, the LLM key for AI features) fails with `CONFIGURATION_ERROR`, a hint naming what to set, and one non-500 HTTP status, on every surface, and the dashboard and `bea` show that hint instead of a generic failure. **Status:** done

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Map `CONFIGURATION_ERROR` to one non-500 HTTP status — **DONE** | 30m | — |
| t002 | A missing LLM key raises `CONFIGURATION_ERROR` with a hint — **DONE** | 30m | — |
| t003 | Parity tests for both setup errors on REST, GraphQL and MCP — **DONE** | 45m | t001, t002 |
| t004 | The dashboard and `bea` show the setup hint for `CONFIGURATION_ERROR` — **DONE** | 45m | t003 |
| t005 | Adoption surface — **DONE** | 20m | t004 |
| t006 | Simplify — **DONE** | 15m | t005 |
| t007 | Test coverage — **DONE** | 30m | t005, t006 |
| t008 | Closeout — **DONE** | 10m | t007 |

## Definition of done

- On `deploy/docker-mac/` with no AI key and no object storage, `suggest-categories` (and the other LLM-backed operations) and `generateTempAssetUploadUrl` both answer `CONFIGURATION_ERROR` with a hint naming the variables, identically on REST, GraphQL and MCP; the REST status is the chosen non-500 status, not 500.
- The dashboard shows the hint for these failures, and `bea` reports the code and hint in its JSON error envelope under `--json`.
- Genuine server failures still answer `INTERNAL_SERVER_ERROR` and 500 (test).
- `yarn test` in `backend-cluster/backend-v2` (parity gate included), dashboard checks and `make check-all` in `cli/` pass.

## Source + Goal linkage

- **Source:** [ADR029](../../../docs/adrs/ADR029-deploy-self-hosting-contract.md) (`Proposed`) Finding F4 and Decision 5. `/pm-brainstorm for w1`, 2026-11-14, item 5; routed by the user via `/pmx` the same day. Mobile already treats `CONFIGURATION_ERROR` as permanent on receipt scans ([w21/869](../../w21/done/869.md)).
- **Goal linkage:** **A1 — Agent-native accounting:** an agent reading the envelope can tell "set this variable" from "retry" or "report a bug"; also **A2** for self-hosters, for whom optional features start unconfigured.
- **Expected outcome:** a self-hoster or agent who hits an unconfigured feature reads which variable to set, on any surface, instead of an internal error. Signals: issue quality (fewer "500 on upload/AI" reports), fewer agent retries of permanent errors in MCP QA.
- **Why now:** it is a customer-facing behaviour change, so it must land on all three surfaces together, and it is a prerequisite for the ADR029 D6 self-host check. Adoption surface is included because error codes and statuses change for every client and agent.

## Out of scope

- Configuring AI or storage automatically.
- Other error categories.
