# w1 · m33 — Tools-only hosts can finish the bank flow and key management

**Worker:** worker1 **Goal:** ChatGPT and GitHub Copilot's cloud agent — hosts that consume tools, not resources — can complete every write whose required id is today listed only by a resource, and every tool declares the credential it needs (ADR 019 D7 + D2) **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./done/t001.md) | listBankConnections tool — **DONE** | 45m | — |
| [t002](./done/t002.md) | listStagedBankTransactions tool — **DONE** | 40m | — |
| [t003](./done/t003.md) | listPublicKeys tool — **DONE** | 30m | — |
| [t004](./done/t004.md) | tools/list size gate and ADR 0008 pointer — **DONE** | 20m | t001, t002, t003 |
| [t005](./done/t005.md) | Tools-only end-to-end journey test — **DONE** | 45m | t004 |
| [t006](./done/t006.md) | D2: securitySchemes on every MCP tool descriptor — **DONE** | 45m | — |
| [t007](./done/t007.md) | Adoption surface — **DONE** | 30m | t005, t006 |
| [t008](./done/t008.md) | Simplify — **DONE** | 30m | t007 |
| [t009](./done/t009.md) | Test coverage — **DONE** | 45m | t007, t008 |
| [t010](./done/t010.md) | Closeout — **DONE** | 15m | t009 |

## Definition of done

- `listBankConnections`, `listStagedBankTransactions`, and `listPublicKeys` exist as read-only tools with the same data and authorization as their resource twins, and the parity gate stays at zero gaps.
- A test drives bank sync → submit/discard → connection management → public-key delete through tools only, with resources disabled.
- Every tool in `tools/list` carries `securitySchemes` matching its op class.
- The `tools/list` size gate rose by exactly the measured amount; ADR 0008 points to ADR 019 D7.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` for w1, 2026-10-06 — [ADR 019](../../../../docs/adrs/ADR019-backend-v2-mcp-host-compatibility.md) D3–D9; code and production re-checked the same day: none of D3–D8 has landed, ADR status is Proposed, production discovery lacks `client_id_metadata_document_supported`.
- **Goal linkage:** **A1 — Agent-native accounting**: bank import is the onboarding path to a living ledger, and on tools-only hosts it dead-ends today because the ids it needs are reachable only through resources.
- **Expected outcome:** A ChatGPT or Copilot cloud-agent user can link, sync, review, and import bank transactions and manage keys end to end; signals: bank-import tool calls from tools-only hosts.
- **Why now:** Independent of the OAuth chain, so it runs in parallel; a ChatGPT directory review would hit this dead end. Adoption surface is included: tool counts and the tool table change on public docs.

## Closeout

Checked 2026-10-06 on `main` (`e3df700e` … `0e203700`):

- `listBankConnections`, `listStagedBankTransactions`, and `listPublicKeys` return their resource twins' data from the same service calls, are authorized like them (single-row tools carry the same PDP action; `listBankConnections` is held to `admin`), and join their verbs' REST and GraphQL rows; the parity gate is at zero gaps — `mcp-list-tools.test.ts`, `surface-parity`.
- A client that never reads a resource finishes bank sync → discard → account mapping → key deletion with ids from tool output — `tools-only-journey.test.ts`.
- Every tool in `tools/list` carries `securitySchemes` matching its op class, top-level and in `_meta` — `mcp-tool-list.test.ts`.
- The size gate rose with each change by its measured amount (64 → 72 KB, now on the raw wire response); ADR 0008 points to ADR 019 D7.

Deviation recorded in ADR 019: the two `admin`-class list tools are not annotated read-only (see t001). One ship went out red during the milestone (`e0976a28`, a prompt reflow breaking an asserted phrase), fixed in `e703f111`.
