# w2 · m28 — MCP results and failures an agent can act on

**Worker:** worker2 **Goal:** every MCP result reads as text a person would write and parses as data a program would use, every failure names a code and the next step, an agent session is not cut off by the transport's rate budget, and agents can write Beancount as Beancount **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Result shape: readable text, typed structuredContent, row counts, compact resources | 2h | — |
| t002 | Agent-shaped statement and overview summaries | 2h | t001 |
| t003 | One error envelope with codes and hints across tools and resources | 90m | t001 |
| t004 | Rate limiting an agent session survives | 60m | — |
| t005 | appendLedgerText: validated native Beancount writes | 2h | t003 |
| t006 | Adoption surface | 30m | t002, t004, t005 |
| t007 | Simplify | 30m | t006 |
| t008 | Test coverage | 60m | t006 |
| t009 | Closeout | 15m | t008 |

## Definition of done

Against a local docker-mac stack: BQL text content starts with a row count and contains the unescaped table; empty results say `0 rows`; resource JSON is compact and the starter ledger's balance-sheet summary is under 600 bytes with `?shape=fava` preserving today's payload; every tool and resource failure carries `{code, message, hint}` with correct JSON-RPC codes and no double prefixes; 200 reads in a minute complete without HTTP 429 and an over-budget write returns an in-band `RATE_LIMITED` result; `appendLedgerText` appends validated directives in date order with a REST twin. Surface-parity, op-class coverage, OpenAPI completeness, and `yarn mcp:conformance` pass.

## Source + Goal linkage

- **Source:** MCP field audit 2026-09-08 (this checkout `main@60dbd7fd`, run against a local docker-mac stack with four `bcio_` keys, ~220 tool/resource calls, and three Claude Code `-p` agent sessions). Measured: JSON-wrapped tables in text content, `""` for empty results, four error dialects, a 5.9 KB trial balance for one transaction, a 429 after ~57 posts in one session, and agents avoiding the structured entry schema.
- **Goal linkage:** A1 (agent-native accounting) — result and error shape is what decides whether an agent's next call is right; native Beancount text is the write path agents already know from local ledgers, so hosted and local skills converge.
- **Expected outcome:** fewer tokens per call (compact JSON, summaries), fewer retries (hints), no mid-session disconnects, and a write tool the `beancount-*` skills can target on hosted ledgers as they do locally.
- **Why now:** depends on m26 (validation envelope, projected check) and m27 (annotations, instructions text that states budgets); the error envelope should land before the m29 onboarding surfaces document failure handling. Adoption surface task included because the milestone changes the documented result contract and adds a tool.
