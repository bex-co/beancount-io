# w2 · m29 — MCP onboarding in five minutes

**Worker:** worker2 **Goal:** a newcomer, human or agent, goes from a Beancount.io account to a connected MCP client in five minutes on hosted or self-hosted deployments: the key dialog hands them the exact setup, the CLI can write it, the discovery manifest is right on split hosts, and the guide opens with the steps instead of the model **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | API-key dialog shows a ready-to-paste MCP setup | 60m | — |
| t002 | Well-known manifest derives every URL from the issuer; conformance checks it | 45m | — |
| t003 | `bea cloud mcp config` prints the client configuration | 45m | t002 |
| t004 | Guide and READMEs open with a five-line quickstart | 45m | t001 |
| t005 | Adoption surface | 30m | t003, t004 |
| t006 | Simplify | 30m | t005 |
| t007 | Test coverage | 60m | t005 |
| t008 | Closeout | 15m | t007 |

## Definition of done

On a local docker-mac stack and against the hosted service: minting a key shows Claude Code, Cursor, and Claude Desktop setup with the real endpoint and the key filled in; `/.well-known/mcp.json` derives every URL from the issuer and `yarn mcp:conformance` checks it; `bea cloud mcp config --client claude-code` prints a connecting command and `--write` produces a working `.mcp.json` after confirmation; the MCP guide's first screen connects a newcomer and every code block runs as written; the root and backend READMEs point at that quickstart. Dashboard, CLI, and backend package checks pass.

## Source + Goal linkage

- **Source:** MCP field audit 2026-09-08 (this checkout `main@60dbd7fd`, run against a local docker-mac stack with four `bcio_` keys, ~220 tool/resource calls, and three Claude Code `-p` agent sessions). The key dialog shows only the plaintext; the manifest mixes dashboard and issuer origins; the CLI has no MCP verb; the guide's first screen is the credential model.
- **Goal linkage:** A2 (frictionless onboarding) and A3 (distribution) — the MCP server is the product's agentic front door, and the first five minutes decide whether a Claude Code or Cursor user keeps it.
- **Expected outcome:** "connect Claude Code to my ledger" is one dialog or one CLI command; self-hosters get a correct manifest without reading ADR 0009; the guide's quickstart is the thing people paste into issues and posts.
- **Why now:** sequenced after m26–m28 so the guide is rewritten once against the improved contract; the manifest fix is independent and cheap and unblocks the CLI command. Adoption surface task included because every task in the milestone is user-facing.
