# w1 · m32 — A connector stays connected while it is used

**Worker:** worker1 **Goal:** Third-party MCP connections stop expiring on day 14 regardless of use: they last while used at least every 45 days, are re-approved yearly, and public-client refresh tokens always rotate (ADR 019 D5) **Status:** in progress (t001–t004 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./done/t001.md) | Lifetimes for third-party connections as reviewed code values — **DONE** | 30m | — |
| [t002](./done/t002.md) | Re-save the grant on refresh for every non-static client, capped at one year — **DONE** | 45m | t001 |
| [t003](./done/t003.md) | Rotate refresh tokens unconditionally for public clients — **DONE** | 30m | t001 |
| [t004](./done/t004.md) | Clock-driven lifetime tests — **DONE** | 45m | t002, t003 |
| t005 | Lifetime table and ADR status | 15m | t004 |
| t006 | Adoption surface | 30m | t005 |
| t007 | Simplify | 30m | t006 |
| t008 | Test coverage | 45m | t006, t007 |
| t009 | Closeout | 15m | t008 |

## Definition of done

- A DCR or CIMD connection that refreshes at least every 45 days keeps working until one year after authorization, then re-authorizes — proven by clock-driven tests.
- A connection idle for more than 45 days fails refresh with `invalid_grant`.
- Public-client refresh tokens rotate on every refresh at any chain age.
- Mobile and Discourse lifetimes are unchanged; the README lifetime table matches the code.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` for w1, 2026-10-06 — [ADR 019](../../../docs/adrs/ADR019-backend-v2-mcp-host-compatibility.md) D3–D9; code and production re-checked the same day: none of D3–D8 has landed, ADR status is Proposed, production discovery lacks `client_id_metadata_document_supported`.
- **Goal linkage:** **A1 — Agent-native accounting**: a bookkeeping connector's rhythm is the monthly close, and today every third-party connection breaks on day 14 however recently it was used, so the agent asks the person to reconnect mid-close.
- **Expected outcome:** A person who connects Claude or ChatGPT once keeps it working month to month; signals: fewer re-authorizations per active connection, longer connector retention.
- **Why now:** Independent of w1/m30 and w1/m31, so it can run in parallel; it is the most visible day-to-day failure for anyone already connected. The 45-day and one-year values are the product numbers ADR 019 D5 argues for. Adoption surface is included: users and host operators read the lifetime table.
