# w23 · m22 — Refuse NUL bytes in every string parameter by contract

**Worker:** worker1 **Goal:** a generated test sends U+0000 in every string parameter of every tool and route and asserts BAD_USER_INPUT, so new parameters are covered automatically and 5xx answers for a bad byte stop appearing **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Generate the string-parameter × NUL cases from the tool schemas | 45m | — |
| t002 | Fix the parameters the scan finds | 45m | t001 |
| t003 | Cover REST and GraphQL with the same cases | 30m | t002 |
| t004 | Simplify | 20m | t003 |
| t005 | Test coverage | 20m | t003 |
| t006 | Closeout | 15m | t004, t005 |

## Definition of done

- A test derives every string input from `MCP_TOOLS` schemas (top level and nested arrays/objects) and sends `"a\u0000b"` for each, asserting a `BAD_USER_INPUT` result naming the parameter, never a 5xx or `SERVICE_UNAVAILABLE`.
- The same cases run against the REST routes and GraphQL operations that take the parameter.
- The parameters left unverified by w23/210, 218 and 220 (`createPullRequest` fields, `entryHash`, `prNumber`, `sha`, `requestId`, `objectKey`) are covered.
- A new string parameter is covered without editing the test; a documented allowlist exists only for parameters where a NUL is legitimate (file content), each with its reason.

## Source + Goal linkage

- **Source:** `/pm-brainstorm w23` (2026-11-05), owner-approved: "them all to w23 and then /loopx w23", proposal 2. Follows [w23/210](../done/210.md), [w23/218](../done/218.md) and [w23/220](../done/220.md), each of which fixed one parameter family and left others unverified.
- **Goal linkage:** A1 — agent-native accounting. A 5xx for a bad byte reads as an outage and sends an agent into retry loops; a typed `BAD_USER_INPUT` lets it fix the argument.
- **Expected outcome:** NUL-byte findings stop appearing in MCP QA; new tools inherit the guarantee.
- **Why now:** three notes in one week came from the same class, and each fix was one guard per parameter; a schema-driven scan replaces the whack-a-mole.
- **Adoption surface omitted:** internal contract test; the only user-visible change is a clearer error code on malformed input, already covered by the `BAD_USER_INPUT` documentation.
