# w1 · m36 — Trim the MCP surface to what the Claude and ChatGPT directories accept

**Worker:** worker1 **Goal:** Every tool, annotation, description, and error message the hosted MCP endpoint exposes passes Claude's connector-directory review criteria and ChatGPT's app-submission guidelines. Any operation either directory would refuse is removed from MCP (or hidden from that host) with its reason on record. **Status:** in progress (t001–t002 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./done/t001.md) | Read both directories' policy text and decide every MCP tool's fate — **DONE** | 60m | — |
| [t002](./done/t002.md) | Remove API-key management from MCP — **DONE** | 60m | t001 |
| t003 | Remove or hide the other operations t001 rules out | 45m | t001 |
| t004 | Correct read-only and destructive annotations | 30m | t001 |
| t005 | Strip model-steering wording and upsell copy | 30m | t001 |
| t006 | Verify the trimmed surface on production | 20m | t002, t003, t004, t005 |
| t007 | Adoption surface | 30m | t006 |
| t008 | Simplify | 30m | t007 |
| t009 | Test coverage | 45m | t007, t008 |
| t010 | Closeout | 15m | t009 |

## Definition of done

- A decision table (in ADR 019's Amendments or a new ADR) lists every MCP tool with keep, relabel, remove, or host-hide. Each non-keep row cites the exact clause from Claude's connector review criteria or Directory Policy, or from OpenAI's app-submission guidelines, quoted from the source and not from a summary.
- `manageApiKeys` is gone from MCP. Its three verbs carry a documented `mcpExempt` credential-policy reason, the frozen parity baseline names the exception explicitly, and ADR 0008 and `docs/api-parity.md` record it. REST and GraphQL key management are unchanged.
- Every other tool t001 rules out is removed or hidden the same documented way. `surface-parity` stays at zero eligible gaps.
- Every remaining tool's `readOnlyHint` and `destructiveHint` match what it does. No tool mixes reads and writes. No server instruction, tool description, or error text steers the model's behavior or upsells a plan.
- `tools/list` from `https://beancount.io/api-gateway/mcp` shows the trimmed set, recorded with date and revision.

## Source + Goal linkage

- **Source:** user decision 2026-10-09: a public listing in Claude's connector directory and ChatGPT's app directory outranks every other goal, so an operation either directory would refuse is removed rather than defended. Requirements were researched the same day: claude.com/docs/connectors/building/submission and review-criteria, support.claude.com Directory Policy, and developers.openai.com/apps-sdk submission and app-submission guidelines.
- **Goal linkage:** **A3: community and distribution** (primary). The two largest agent hosts list Beancount.io where their users browse for connectors. **A1** (secondary): the remaining tools are better labelled for every host.
- **Expected outcome:** both submissions go in without a known review blocker on the tool surface. Signal: directory acceptance, then installs from directory traffic.
- **Why now:** the tool surface is the part of both submissions that only code can fix, and it gates the submission itself. The account-side work runs in parallel and is not tracked here: OpenAI organization verification, the reviewer account, listing copy, and the privacy policy. Adoption surface is included because the tool list, docs, and tool counts change for every connecting user.
