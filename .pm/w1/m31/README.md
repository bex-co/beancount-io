# w1 · m31 — Advertise CIMD so Claude and ChatGPT identify themselves without registering

**Worker:** worker1 **Goal:** Production advertises Client ID Metadata Documents — the registration method the MCP spec prefers and Claude and ChatGPT choose — without breaking any DCR host, ending per-connection client-row growth from directory traffic **Status:** in progress (t001, t002 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./done/t001.md) | D6: advertise CIMD with the draft acknowledged — **DONE** | 30m | — |
| [t002](./done/t002.md) | CIMD fixtures: Claude Code's published document and a ChatGPT-style document — **DONE** | 45m | t001 |
| t003 | Consent and failure modes for CIMD clients | 30m | t002 |
| t004 | Conformance requires CIMD; verify on production | 20m | t003 |
| t005 | Adoption surface | 30m | t004 |
| t006 | Simplify | 30m | t005 |
| t007 | Test coverage | 45m | t005, t006 |
| t008 | Closeout | 15m | t007 |

## Definition of done

- `https://beancount.io/.well-known/oauth-authorization-server` advertises `client_id_metadata_document_supported: true`.
- Claude Code's published metadata document and a ChatGPT-shaped document authorize to consent in tests from arbitrary loopback ports / their documented redirects, with no client row created.
- Every w1/m30 DCR fixture still passes; unreachable, invalid, and special-use-address documents fail with defined OAuth errors.
- `yarn mcp:conformance https://beancount.io` passes including the CIMD check, and one real Claude Code connection on production used CIMD.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` for w1, 2026-10-06 — [ADR 019](../../../docs/adrs/ADR019-backend-v2-mcp-host-compatibility.md) D3–D9; code and production re-checked the same day: none of D3–D8 has landed, ADR status is Proposed, production discovery lacks `client_id_metadata_document_supported`.
- **Goal linkage:** **A1 — Agent-native accounting** and **A3 — Community & distribution**: the spec ranks CIMD above deprecated DCR, Claude and ChatGPT prefer it, and Claude's own docs warn of very large numbers of registered clients from directory traffic — rows our OAuth store never sweeps.
- **Expected outcome:** Claude and ChatGPT connect by URL identity; the consent page shows the domain vouching for the app; signals: CIMD sign-ins, flat OAuth client-table growth.
- **Why now:** ADR 019 orders D6 after D3 and D4 — enabling it first breaks Claude Code — so it starts only once w1/m30 is on production. Adoption surface is included: the docs must say which sign-in path each host takes.
