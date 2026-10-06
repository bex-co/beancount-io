# w1 · m30 — Every named MCP host can register and reach a consent page that says who is asking

**Worker:** worker1 **Goal:** Cursor and VS Code Copilot stop failing at registration, the consent page names the requester as the MCP spec requires, and CI and `mcp:conformance` catch the host-gating failures ADR 019 found — the first link in ADR 019's D3 → D4 → D6 chain **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Re-verify ADR 019's 2026-09-25 facts and accept it | 60m | — |
| t002 | Host registration fixtures for every named host | 45m | t001 |
| t003 | D3: registrations that state no application_type are native | 30m | t002 |
| t004 | D4 backend: the interaction endpoint names who is asking | 45m | t003 |
| t005 | D4 dashboard: consent shows the redirect host, the self-asserted name, and a loopback warning | 60m | t004 |
| t006 | D8: conformance checks what hosts gate on | 30m | — |
| t007 | Verify on production after the deploy | 30m | t005, t006 |
| t008 | Adoption surface | 30m | t007 |
| t009 | Simplify | 30m | t008 |
| t010 | Test coverage | 45m | t008, t009 |
| t011 | Closeout | 15m | t010 |

## Definition of done

- Every named host's documented payload registers and authorizes in `oidc-route.test.ts`, including Cursor's three URIs with no `application_type` and VS Code from a loopback port other than 33418.
- `GET /api-gateway/oauth/interaction/:uid` returns the redirect URI, self-asserted client name, CIMD host, and loopback-only flag; `/oauth/consent` renders them in every locale.
- `yarn mcp:conformance https://beancount.io` passes the five new metadata checks against production.
- On production, a Cursor- and a VS Code-shaped registration reach a consent page showing the redirect host and the labelled client name (recorded with revision and date).
- ADR 019 is Accepted, with any fact that moved since 2026-09-25 amended.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` for w1, 2026-10-06 — [ADR 019](../../../docs/adrs/ADR019-backend-v2-mcp-host-compatibility.md) D3–D9; code and production re-checked the same day: none of D3–D8 has landed, ADR status is Proposed, production discovery lacks `client_id_metadata_document_supported`.
- **Goal linkage:** **A1 — Agent-native accounting** (primary): coding-agent hosts that use DCR — Cursor today fails before reaching consent, VS Code whenever its preferred port is busy — can connect. **A3** (secondary): the consent display is a spec requirement every curated directory review will check.
- **Expected outcome:** A developer adds `https://beancount.io/api-gateway/mcp` in Cursor or VS Code Copilot and lands on a consent page that says which app is asking; signals: successful DCR registrations and MCP sessions from those hosts.
- **Why now:** D6 (CIMD, w1/m31) must not land before D3 and D4 — enabling CIMD first breaks Claude Code's sign-in — so this is the head of the chain. Adoption surface is included: the milestone changes a page every connecting user sees and adds per-host setup docs.
