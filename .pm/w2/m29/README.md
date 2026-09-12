# w2 · m29 — MCP onboarding in five minutes

**Worker:** worker2 **Goal:** a newcomer, human or agent, goes from a Beancount.io account to a connected MCP client in five minutes on hosted or self-hosted deployments: the key dialog hands them the exact setup, the CLI can write it, the discovery manifest is right on split hosts, and the guide opens with the steps instead of the model **Status:** in progress — t001–t007 done and verified on a local stack; t008 waits on a hosted-deployment check

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | API-key dialog shows a ready-to-paste MCP setup — **DONE** | 60m | — |
| t002 | Well-known manifest derives every URL from the issuer; conformance checks it — **DONE** | 45m | — |
| t003 | `bea cloud mcp config` prints the client configuration — **DONE** | 45m | t002 |
| t004 | Guide and READMEs open with a five-line quickstart — **DONE** | 45m | t001 |
| t005 | Adoption surface — **DONE** | 30m | t003, t004 |
| t006 | Simplify — **DONE** | 30m | t005 |
| t007 | Test coverage — **DONE** | 60m | t005 |
| t008 | Closeout | 15m | t007 |

## Definition of done

On a local docker-mac stack and against the hosted service: minting a key shows Claude Code, Cursor, and Claude Desktop setup with the real endpoint and the key filled in; `/.well-known/mcp.json` derives every URL from the issuer and `yarn mcp:conformance` checks it; `bea cloud mcp config --client claude-code` prints a connecting command and `--write` produces a working `.mcp.json` after confirmation; the MCP guide's first screen connects a newcomer and every code block runs as written; the root and backend READMEs point at that quickstart. Dashboard, CLI, and backend package checks pass.

## Remaining before closeout

Everything is written, green, and verified against the `deploy/docker-mac`
stack. The definition of done also names **the hosted service**, and that half
needs production credentials this run does not have: minting a real key in the
hosted dashboard and pointing a client at `beancount.io`.

| DoD line | Verified locally |
| --- | --- |
| Minting a key shows Claude Code, Cursor, and Claude Desktop setup with the real endpoint and key | the panel renders all four tabs; endpoint comes from the deployment's own manifest, key from the mint response |
| `/.well-known/mcp.json` derives every URL from the issuer | live manifest names `:42601` (the API) while `links.dashboard` stays `:42600` |
| `yarn mcp:conformance` checks it | new check 11 passes and proves the advertised endpoint answers the MCP 401 challenge |
| Manifest under 8 KB | 7,749 bytes, down from ~20 KB |
| `bea cloud mcp config --client claude-code` prints a connecting command | printed, and the endpoint it names came from the live manifest |
| `--write` produces a working `.mcp.json` after confirmation | wrote one, preserved a neighbouring server, and that exact file connected and ran `checkLedger` |
| Guide's first screen connects a newcomer; every code block runs as written | the quickstart's CLI path was run end to end against the local stack |
| READMEs point at the quickstart; counts match | root and backend READMEs rewritten; 26 tools / 64 resource templates confirmed against `tools/list` and `resources/templates/list` |
| Dashboard, CLI, and backend package checks pass | dashboard 341 files / 3,824 tests + lint + build; cli 551 tests via `make check-all`; backend 279 suites / 4,392 tests |

One scope correction came out of the review and is recorded rather than papered
over: deriving the manifest from `oauth.issuer` is the real fix outside
production, but in production `config.ts` sets `oauthIssuer = dashboardUrl`, so
a production-mode split-origin deployment still cannot express its API origin.
That missing config concept is `w2/015`; the cross-package duplication of
client setup knowledge is `w2/016`.

## Source + Goal linkage

- **Source:** MCP field audit 2026-09-08 (this checkout `main@60dbd7fd`, run against a local docker-mac stack with four `bcio_` keys, ~220 tool/resource calls, and three Claude Code `-p` agent sessions). The key dialog shows only the plaintext; the manifest mixes dashboard and issuer origins; the CLI has no MCP verb; the guide's first screen is the credential model.
- **Goal linkage:** A2 (frictionless onboarding) and A3 (distribution) — the MCP server is the product's agentic front door, and the first five minutes decide whether a Claude Code or Cursor user keeps it.
- **Expected outcome:** "connect Claude Code to my ledger" is one dialog or one CLI command; self-hosters get a correct manifest without reading ADR 0009; the guide's quickstart is the thing people paste into issues and posts.
- **Why now:** sequenced after m26–m28 so the guide is rewritten once against the improved contract; the manifest fix is independent and cheap and unblocks the CLI command. Adoption surface task included because every task in the milestone is user-facing.
