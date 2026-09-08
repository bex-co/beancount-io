# w2 · m26 — MCP write path that cannot lose or silently break a ledger

**Worker:** worker2 **Goal:** an agent that writes through MCP never loses file content, never commits an unbalanced transaction by accident, sees bean-check's verdict in every write result, previews a real diff before committing, and can follow up on an edited entry with a hash that still resolves **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Fix renameLedgerFile data loss, guard includes, name the commit | 60m | — |
| t002 | Post-write validation in every write tool result | 90m | t001 |
| t003 | addLedgerEntries: refuse unbalanced transactions, allow one elided amount | 60m | t002 |
| t004 | editLedgerFiles dry_run returns the diff and projected errors | 60m | t002 |
| t005 | Fix the pull-request path and the stale editEntrySource hash | 60m | t001 |
| t006 | Optional userId on legacy resources; mask storage and Gitea internals | 45m | — |
| t007 | Adoption surface | 30m | t003, t004, t005, t006 |
| t008 | Simplify | 30m | t007 |
| t009 | Test coverage | 60m | t007 |
| t010 | Closeout | 15m | t009 |

## Definition of done

On a local docker-mac stack: renaming a non-empty ledger file preserves its content and either refuses or rewrites stale `include` lines; every write tool's result carries `wrote`, `entryHashes`, and `validation.newErrors`; `addLedgerEntries` refuses an unbalanced transaction unless `allowInvalid` is set and accepts one elided posting; `editLedgerFiles` `dry_run` returns a unified diff and projected errors without committing; `managePullRequests` create/read/reject work without `baseBranch`; `editEntrySource` returns the new hash; the two `{?userId}` resources read without it; and no AWS SDK or Gitea internal text reaches an MCP client. `yarn test`, `yarn test:integration`, the surface-guard suites, and `yarn mcp:conformance` pass.

## Source + Goal linkage

- **Source:** MCP field audit 2026-09-08 (this checkout `main@60dbd7fd`, run against a local docker-mac stack with four `bcio_` keys, ~220 tool/resource calls, and three Claude Code `-p` agent sessions). The rename data loss, the silent unbalanced write, the empty dry run, the broken PR path, the stale hash, and the leaked internals were all reproduced there; every agent run independently asked for a validation signal after writes.
- **Goal linkage:** A1 (agent-native accounting) — an agent maintaining a ledger end-to-end must be able to trust that a successful write is a valid write, and that a preview shows what a human would approve.
- **Expected outcome:** an agent using `editLedgerFiles`/`addLedgerEntries` learns about a broken ledger from the write result itself; rename is safe to use from any surface; the three audit tasks stop spending turns re-deriving bean-check by hand.
- **Why now:** the rename bug is a P0 data-loss path reachable from GraphQL, REST, and MCP today; the validation envelope is the prerequisite for m27's `checkLedger` tool and m28's error envelope, so it is sequenced first. Adoption surface task included because the milestone changes documented write behavior on every surface.
