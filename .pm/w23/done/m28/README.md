# w23 · m28 — Give every paginated read one has-more envelope

**Worker:** worker1 **Goal:** An agent can tell from any paginated read whether more remains and what to ask next, on REST, GraphQL and MCP. **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Audit every paginated read — **DONE** | 40m | — |
| t002 | Define the envelope rule and document it — **DONE** | 30m | t001 |
| t003 | Apply the envelope to MCP tools and resources — **DONE** | 45m | t002 |
| t004 | Apply the envelope on REST and GraphQL and refresh the OpenAPI snapshot — **DONE** | 45m | t003 |
| t005 | Guard it with a registry check in the parity tests — **DONE** | 30m | t004 |
| t006 | Adoption surface — **DONE** | 20m | t005 |
| t007 | Simplify — **DONE** | 20m | t006 |
| t008 | Test coverage — **DONE** | 30m | t006 |
| t009 | Closeout — **DONE** | 15m | t008 |

## Definition of done

Every registered paginated read exposes the same has-more signal on REST, GraphQL and MCP, documented in `docs/mcp.md`, guarded by a failing-if-broken test; `yarn test` and the OpenAPI drift check pass; no existing field is renamed.

## Source + Goal linkage

- **Source:** `/pm-brainstorm w23` (2026-11-07), owner-approved: "them all for w23", proposal 2.
- **Goal linkage:** A1 — Agent-native accounting: agents stop under-reading or looping on mixed pagination styles.
- **Expected outcome:** Fewer truncated or repeated reads in agent sessions; one rule to learn.
- **Why now:** m21 and m23 established registry-plus-proof guards; pagination is the same class of gap and agents hit it on every list read.
- **Adoption surface:** included: agents touch this surface directly.

## Unblocked

Blocked 2026-11-07 on a public-contract decision (bare-array results leave no room for an in-body has-more field; see `done/t001.md`). Cleared 2026-11-07: the owner chose **option A, an additive signal beside the result** — REST gets `Link: rel="next"` and `X-Total-Count`/`X-Has-More` response headers; an MCP tool puts a sibling `page` object next to `result` in its envelope and an MCP resource puts it in the content `_meta`; GraphQL list fields keep their shape and carry it in response `extensions.page`. Rationale: nothing existing breaks (dashboard, mobile, CLIs, generated clients), and every paginated read is covered. Three channels, one rule (`hasMore`, `nextOffset` or `nextPage`, and `total` where known).

## Outcome

Every paginated read now says whether more remains on REST, GraphQL and MCP through option A (a signal beside the result), with no existing field or type changed. Two honest limits: page-and-limit reads cannot count what is left, so a full page reads `hasMore: true`; and a catalog page past the first with no `limit` carries no signal.
