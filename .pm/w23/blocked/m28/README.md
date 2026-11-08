# w23 · m28 — Give every paginated read one has-more envelope

**Worker:** worker1 **Goal:** An agent can tell from any paginated read whether more remains and what to ask next, on REST, GraphQL and MCP. **Status:** blocked (t001 done; t002 needs an owner decision)

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Audit every paginated read — **DONE** | 40m | — |
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

## Blocked

**Blocked 2026-11-07** — t002–t009, on a public-contract decision only the owner can make.

- **Blocker:** the audit (`done/t001.md`) shows REST v1 success bodies, GraphQL list fields and MCP resource contents are bare arrays or bare objects. A has-more signal cannot be added to a bare array without changing its top-level type, which breaks every existing REST consumer and the generated GraphQL clients used by the dashboard, mobile app and CLIs. The "only add fields" rule in this milestone therefore cannot be met in-body for ledgers, catalog, commits, collaborators or keys. Parity also cannot be met identically: there is no shared place for metadata on the three surfaces.
- **Options for the owner:**
  1. *Out-of-band, additive:* REST gets `Link: rel="next"` plus `X-Total-Count`/`X-Has-More` headers; MCP tools put a sibling `page` object beside `result` in the envelope and resources use content `_meta`; GraphQL lists keep their shape and expose the signal in response `extensions.page`. Nothing breaks; the three channels differ but carry one rule.
  2. *In-body for object results only:* add `hasMore`/`nextOffset` beside `total` on the journal reads, account journal and social lists (and fix social's `total`, which is only the page size), and leave bare-array reads as they are, documenting "a short page is the end" per read.
  3. *Versioned shape change:* new `v2` list shapes (`{items,page}`) on REST and new GraphQL page types, with the bare forms deprecated. Largest change.
- **Unblock:** the owner picks one option (recommended: 1 for the bare-array reads and 2's field for the object-shaped reads, since both are additive). Then re-plan t003–t005 against the chosen channel; t002 records the rule, and this milestone's `depends_on` order otherwise stands.
- **Shipped baseline:** t001 audit only; no code changed.
