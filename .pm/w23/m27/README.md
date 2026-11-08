# w23 · m27 — Replay the m23 and m26 contracts against production

**Worker:** worker1 **Goal:** One command also confirms the hosted endpoint refuses hostile arguments and keeps previews off the write bucket. **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Add hostile-argument cases to the MCP replay | 40m | — |
| t002 | Replay the same cases on REST and GraphQL | 30m | t001 |
| t003 | Probe that previews and writes use separate rate buckets | 40m | t001 |
| t004 | Update the QA skill and replay docs | 15m | t003 |
| t005 | Simplify | 20m | t004 |
| t006 | Test coverage | 30m | t004 |
| t007 | Closeout | 15m | t006 |

## Definition of done

- `node` replay against the hosted endpoint prints the deployed revision and a three-surface table covering the m23 boundary cases and the m26 preview-bucket probe.
- No credentials appear in the repository; `python3 scripts/scan-secrets.py` is clean.
- No second deployment is created.

## Source + Goal linkage

- **Source:** `/pm-brainstorm w23` (2026-11-07), owner-approved: "them all for w23", proposal 1. m24 covered only the preview and NUL contracts.
- **Goal linkage:** A1 — Agent-native accounting; A3 — credibility: the hosted contract matches what the docs promise.
- **Expected outcome:** After a backend release one command confirms production behaves as documented for hostile inputs and preview limits.
- **Why now:** m23 and m26 merged without a live check, the same gap m24 closed for m21 and m22.
- **Adoption surface:** omitted: internal QA tooling with no user- or agent-facing surface beyond the QA skill, updated in-milestone.
