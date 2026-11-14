# w23 · m44 — Get every MCP result to text-only and tools-only hosts in full

**Worker:** worker1 **Goal:** An agent on any MCP host gets every row, id and next step it needs. That holds whether the host hands the model only `content` (claude.ai), only tools (ChatGPT), or `structuredContent` (Claude Code), and a QA check keeps the channels from drifting apart again. **Status:** todo (t003, t004 done; t001, t002 blocked)

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Verify the text-block fix on claude.ai against the deployed revision | 30m | — |
| t002 | Check text against structuredContent in the MCP QA helper and contract replay | 45m | — |
| t003 | Page listStagedBankTransactions on every surface — **DONE** | 60m | — |
| t004 | Put a resource's page signal where a text-only reader sees it — **DONE** | 45m | — |
| t005 | Put the hint in the message of resource and prompt refusals | 30m | — |
| t006 | Close the resource-only gaps t001 finds | 60m | t001 |
| t007 | Adoption surface | 20m | t002, t003, t004, t005, t006 |
| t008 | Simplify | 20m | t007 |
| t009 | Test coverage | 30m | t007 |
| t010 | Closeout | 15m | t009 |

## Blocked

- **t001** (blocked 2026-11-13). The remaining check needs someone signed in to claude.ai: whether claude.ai's model can read a `beancount://` resource unprompted, plus recording t001's results in `docs/mcp.md`. The Playwright browser runs `--isolated`, so the earlier sign-in ended when the browser closed.
  - **Already verified on 2026-11-13.** Production runs `f58c89d64`: a tool refusal now ends with the serialized envelope line that commit added (for example, `readLedgerFiles` on a missing path). On claude.ai, with the Beancount.io connector, `getLedgerContext` on the QA ledger `puncsky/mcp-agent-eval` reached the model as `getLedgerContext: ok` followed by the full JSON, and the model listed its 5 payees and 12 accounts. Before the fix it saw only `getLedgerContext: ok`.
  - **Unblock:** a claude.ai sign-in on the QA account in the headed Playwright browser. Only the owner can do this. Then run steps 3 and 4. t006 depends on the answer; t002–t005 proceed without it.
- **t002** (blocked 2026-11-13). The check shipped in `b8e931fb0`. `qa-contract-replay.mjs` has a `channel` row, the fake deployment's `summary` mode fails it while every other row passes, and making `textCarries` always pass turns three tests red. What remains is the acceptance check "a replay against the current server passes". It cannot run here because the repository-root `.env` `QA_MCP_TOKEN` has expired (production answers `401`).
  - **Unblock:** a fresh short-lived `bcio_` key for the QA account in `./.env` as `QA_MCP_TOKEN`. Only the owner can mint one. Then run `node .agents/skills/qa-shared/scripts/qa-contract-replay.mjs` and confirm `| channel | ok |`.

## Definition of done

- On claude.ai, against a recorded deployed revision, an agent reads the rows of `getLedgerContext`, `listLedgerFiles` and `listStagedBankTransactions` (or a synthetic ledger's equivalent with a payload over 400 characters) from the text block alone.
- `qa-contract-replay.mjs` fails when any replayed tool's text block carries less than its `structuredContent`.
- `listStagedBankTransactions` returns a bounded page with a `page` signal to an agent following its description, on MCP, REST and GraphQL alike, while the dashboard's Bank Sync page still lists every staged row.
- A paginated resource whose body is a bare array says whether more remains in content a text-only reader receives.
- A resource or prompt refusal's JSON-RPC `message` carries its hint.
- Every resource a served prompt tells an agent to read names a tool that does the same, or the prompt says what to do without it; any tool twin t006 adds keeps REST/GraphQL/MCP parity.
- `yarn test` passes in backend-v2.

## Source + Goal linkage

- **Source:** A user report (2026-11-08): on claude.ai, `listStagedBankTransactions` answered `42 items` and `listBankConnections` answered `ok`, so the weekly bank-import routine could not see a transaction id. The root cause shipped in `f58c89d64`: a payload over 400 characters reached the text block as its summary line alone. The 2026-11-13 review of the rest of the MCP surface found the remaining side channels this milestone closes.
- **Goal linkage:** A1 — Agent-native accounting. The MCP endpoint is how hosted agents keep a ledger, and claude.ai and ChatGPT are the hosts most users reach it from.
- **Expected outcome:** A claude.ai or ChatGPT user can run bank import, review and close-month playbooks end to end, with the same ids and next steps a Claude Code user gets. A future change that moves data into a side channel fails QA before it ships.
- **Why now:** The fix that made text blocks carry the payload also exposes their size. `listStagedBankTransactions` has no limit, so a first bank sync with months of history now arrives whole in the text block. Our QA used Claude Code, which reads `structuredContent`, so the summary-only text shipped in September and went unnoticed until a user hit it.
- **Adoption surface:** included. The work changes what agents receive and what `docs/mcp.md`, the served prompts and the server instructions promise.
