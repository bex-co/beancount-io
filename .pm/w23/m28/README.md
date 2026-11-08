# w23 · m28 — Give every paginated read one has-more envelope

**Worker:** worker1 **Goal:** An agent can tell from any paginated read whether more remains and what to ask next, on REST, GraphQL and MCP. **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Audit every paginated read | 40m | — |
| t002 | Define the envelope rule and document it | 30m | t001 |
| t003 | Apply the envelope to MCP tools and resources | 45m | t002 |
| t004 | Apply the envelope on REST and GraphQL and refresh the OpenAPI snapshot | 45m | t003 |
| t005 | Guard it with a registry check in the parity tests | 30m | t004 |
| t006 | Adoption surface | 20m | t005 |
| t007 | Simplify | 20m | t006 |
| t008 | Test coverage | 30m | t006 |
| t009 | Closeout | 15m | t008 |

## Definition of done

Every registered paginated read exposes the same has-more signal on REST, GraphQL and MCP, documented in `docs/mcp.md`, guarded by a failing-if-broken test; `yarn test` and the OpenAPI drift check pass; no existing field is renamed.

## Source + Goal linkage

- **Source:** `/pm-brainstorm w23` (2026-11-07), owner-approved: "them all for w23", proposal 2.
- **Goal linkage:** A1 — Agent-native accounting: agents stop under-reading or looping on mixed pagination styles.
- **Expected outcome:** Fewer truncated or repeated reads in agent sessions; one rule to learn.
- **Why now:** m21 and m23 established registry-plus-proof guards; pagination is the same class of gap and agents hit it on every list read.
- **Adoption surface:** included: agents touch this surface directly.
