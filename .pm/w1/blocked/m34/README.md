# w1 · m34 — Drive every named host through a real sign-in on the hosted endpoint

**Worker:** worker1 **Goal:** Dated, first-hand proof that each host ADR 019 names completes a real browser sign-in, a read, and a dry-run write against `https://beancount.io/api-gateway/mcp` — the evidence a curated directory submission needs **Status:** blocked — needs the deploy and the user's host accounts — see [Blocked](#blocked)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Claude (claude.ai connector) and Claude Code: real sign-in and a short journey — *Claude Code done 2026-10-08; claude.ai open* | 45m | — |
| t002 | ChatGPT developer-mode connector: real sign-in and a tools-only journey | 45m | — |
| t003 | Cursor and VS Code Copilot: real sign-in, including the VS Code fallback port | 45m | — |
| t004 | Record per-host status and update the docs | 30m | t001, t002, t003 |
| t005 | Adoption surface | 30m | t004 |
| t006 | Simplify | 30m | t005 |
| t007 | Test coverage | 45m | t005, t006 |
| t008 | Closeout | 15m | t007 |

## Definition of done

- Claude (claude.ai), Claude Code, ChatGPT developer mode, Cursor, and VS Code Copilot each completed a real sign-in, one read, and one `dry_run` write on the hosted endpoint, recorded with date and deployed revision.
- The VS Code run succeeded from a loopback port other than 33418.
- Muse is recorded as unverifiable with the reason; every gap found is a w1 inbox note.
- `docs/mcp.md` shows per-host status matching the recorded runs.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` for w1, 2026-10-06 — [ADR 019](../../../../docs/adrs/ADR019-backend-v2-mcp-host-compatibility.md) D3–D9; code and production re-checked the same day: none of D3–D8 has landed, ADR status is Proposed, production discovery lacks `client_id_metadata_document_supported`.
- **Goal linkage:** **A3 — Community & distribution**: ADR 019 notes no host was driven through a full browser sign-in; a directory reviewer will do exactly that, so this is the last gate before submitting. Secondary **A1**.
- **Expected outcome:** Users of each named host have a documented, verified connection path; the project can submit to Claude's and ChatGPT's directories with evidence; signals: per-host MCP sessions.
- **Why now:** Runs after w1/m30, w1/m31, and w1/m33 are on production. Needs the user for browser consent and host accounts, and follows `.pm/DO_NOT_DO.md` (hosted endpoint, QA account, synthetic ledgers — no second stack). Adoption surface is included: per-host docs change.

## Blocked

**Blocked 2026-10-06** — nothing in this milestone can run yet. *Update 2026-10-08: condition 1 is cleared. The deploy landed, w1/m30 was verified on production and closed, and conformance passes checks 11–16. Condition 2 still holds.*

1. **Production does not carry the work it verifies.** w1/m30 (D3, D4), w1/m31 (D6), and w1/m33 (D7, D2) are on `main` (through `5cb8f83e`) but not deployed: on 2026-10-06 `https://beancount.io/oauth/consent/requester` answered the site's HTML 404 and discovery still lacked `client_id_metadata_document_supported`.
2. **Every task is a real browser sign-in** with the dedicated QA account: consent in a browser, and host accounts (claude.ai, Claude Code, ChatGPT with developer mode, Cursor, VS Code with Copilot) that belong to the user.

**Unblock:** ~~the operator deploys backend-v2 and dashboard from `main` at or after `5cb8f83e`~~ (done 2026-10-08), and the user is available to complete the browser consents with those accounts — or supplies a way to drive them. w1/m30 t007 and w1/m31 t004 clear with the same deploy. **Who can clear it:** the deployment operator and account holder (the user).

- **Progress 2026-10-08:** condition 1 is cleared, and Claude Code's run is done (CIMD sign-in, a read, and a dry-run write; see [t001](./t001.md)). Still waiting on the user's accounts: claude.ai (t001), ChatGPT developer mode (t002), Cursor and VS Code Copilot (t003).
