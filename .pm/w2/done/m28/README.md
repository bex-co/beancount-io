# w2 · m28 — MCP results and failures an agent can act on

**Worker:** worker2 **Goal:** every MCP result reads as text a person would write and parses as data a program would use, every failure names a code and the next step, an agent session is not cut off by the transport's rate budget, and agents can write Beancount as Beancount **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Result shape: readable text, typed structuredContent, row counts, compact resources — **DONE** | 2h | — |
| t002 | Agent-shaped statement and overview summaries — **DONE** | 2h | t001 |
| t003 | One error envelope with codes and hints across tools and resources — **DONE** | 90m | t001 |
| t004 | Rate limiting an agent session survives — **DONE** | 60m | — |
| t005 | appendLedgerText: validated native Beancount writes — **DONE** | 2h | t003 |
| t006 | Adoption surface — **DONE** | 30m | t002, t004, t005 |
| t007 | Simplify — **DONE** | 30m | t006 |
| t008 | Test coverage — **DONE** | 60m | t006 |
| t009 | Closeout — **DONE** | 15m | t008 |

## Definition of done

Against a local docker-mac stack: BQL text content starts with a row count and contains the unescaped table; empty results say `0 rows`; resource JSON is compact and the starter ledger's balance-sheet summary is under 600 bytes with `?shape=fava` preserving today's payload; every tool and resource failure carries `{code, message, hint}` with correct JSON-RPC codes and no double prefixes; 200 reads in a minute complete without HTTP 429 and an over-budget write returns an in-band `RATE_LIMITED` result; `appendLedgerText` appends validated directives in date order with a REST twin. Surface-parity, op-class coverage, OpenAPI completeness, and `yarn mcp:conformance` pass.

## Verified

Against the `deploy/docker-mac` stack (all 7 services healthy), with a
ledger-pinned `bcio_` key and a read-only twin:

| DoD line | Observed |
| --- | --- |
| BQL text starts with a row count and holds the unescaped table | `3 rows` then the rendered table; `structuredContent` keeps the typed result |
| Empty results say `0 rows` | `0 rows — no postings matched` |
| Resource JSON is compact | trial balance 3,672 B compact vs 5,968 B pretty — 38.5% smaller |
| Balance-sheet summary under 600 bytes | 210 B, against 11,697 B for `?shape=fava`, which is unchanged |
| Every failure carries `{code, message, hint}` | tool refusals and resource reads alike; `FORBIDDEN`, `NOT_FOUND`, `UNBALANCED`, `BAD_USER_INPUT`, `RATE_LIMITED` all observed |
| Correct JSON-RPC codes, no double prefixes | missing file → `-32002`, pin violation → `-32003`, message unprefixed |
| 200 reads in a minute without HTTP 429 | 200/200 returned 200 in 48s |
| Over-budget write returns in-band `RATE_LIMITED` | HTTP 200, `isError`, `retryAfter: 57`; session stayed connected |
| `appendLedgerText` appends in date order | a February directive threaded between January and March at line 5; an unsorted file appended and said so in `appendedUnsorted` |
| REST twin | `POST /v1/ledgers/{owner}/{name}/directives/text` returned the same result; GraphQL `appendLedgerText` too |
| `yarn mcp:conformance` | **10 passed, 0 failed, 0 skipped** (check 10, result shape, is new here) |

Surface-parity, op-class coverage, OpenAPI completeness, and the frozen
parity baseline all pass: 279 suites / 4,388 tests green, plus `cli`'s
`make check-all` after resyncing its copy of the v1 spec.

Two deferred cleanups and one docs-adjacent finding went to `w2/012`,
`w2/013`, and `w2/014` rather than being silently dropped.

## Source + Goal linkage

- **Source:** MCP field audit 2026-09-08 (this checkout `main@60dbd7fd`, run against a local docker-mac stack with four `bcio_` keys, ~220 tool/resource calls, and three Claude Code `-p` agent sessions). Measured: JSON-wrapped tables in text content, `""` for empty results, four error dialects, a 5.9 KB trial balance for one transaction, a 429 after ~57 posts in one session, and agents avoiding the structured entry schema.
- **Goal linkage:** A1 (agent-native accounting) — result and error shape is what decides whether an agent's next call is right; native Beancount text is the write path agents already know from local ledgers, so hosted and local skills converge.
- **Expected outcome:** fewer tokens per call (compact JSON, summaries), fewer retries (hints), no mid-session disconnects, and a write tool the `beancount-*` skills can target on hosted ledgers as they do locally.
- **Why now:** depends on m26 (validation envelope, projected check) and m27 (annotations, instructions text that states budgets); the error envelope should land before the m29 onboarding surfaces document failure handling. Adoption surface task included because the milestone changes the documented result contract and adds a tool.
