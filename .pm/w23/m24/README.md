# w23 · m24 — Replay the MCP contract against production in one command

**Worker:** worker1 **Goal:** One command checks the hosted endpoint against the documented MCP, REST and GraphQL contract and records the deployed revision. **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Write the replay harness | 40m | — |
| t002 | Probe the write-preview and input contracts | 45m | t001 |
| t003 | Replay the cases on REST and GraphQL | 30m | t002 |
| t004 | Wire the script into the QA skill | 15m | t003 |
| t005 | Simplify | 20m | t004 |
| t006 | Test coverage | 30m | t004 |
| t007 | Closeout | 15m | t006 |

## Definition of done

- `node scripts/contract-replay.mjs` against the hosted endpoint prints the deployed revision and a three-surface table covering the preview rule and the NUL contract.
- No credentials appear in the repository; the secret scan is clean.
- No second deployment is created.

## Source + Goal linkage

- **Source:** `/pm-brainstorm w23` (2026-11-07), owner-approved: "them all for w23 and then /loopx w23", proposal 2. The GraphQL live probes and the real-client MCP QA run were the verification steps still open after w23/m21 and m22.
- **Goal linkage:** A1 — Agent-native accounting; A3 — credibility. The hosted contract matches what the docs promise.
- **Expected outcome:** After a backend release one command confirms production behaves as documented.
- **Why now:** The preview and NUL changes shipped without a live check.
- **Adoption surface omitted:** internal QA tooling with no user- or agent-facing surface beyond the QA skill, which t004 updates.
