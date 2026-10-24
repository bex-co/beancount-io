# w6 · m10 — List the connector in independent web directories

**Worker:** worker1 **Goal:** People comparing accounting MCP servers find accurate, usable remote listings on the eligible independent directories. **Status:** blocked (t009 native login complete; newly observed broad GitHub scope awaits its exact decision; existing free-submission review and publication gates remain)

**Implementation estimate:** ~2h, excluding external review queues and the standing closing tasks.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t009](t009.md) | Complete LobeHub publisher setup and submit remote listing — **BLOCKED** | 45m | w6/m8/t001 |
| [t001](t001.md) | Submit or correct MCPServers.org's free remote listing — **BLOCKED: submitted** | 30m | w6/m8/t001 |
| [t002](t002.md) | Submit or correct MCPMarket's free remote listing — **BLOCKED: free repository submission** | 30m | w6/m8/t001 |
| [t003](t003.md) | Establish LobeHub eligibility and prepare its supported connector listing — **BLOCKED** | 45m | w6/m8/t001, t009 |
| [t004](t004.md) | Verify the independent-directory listings after moderation | 15m | t001, t002, t003 |
| [t005](t005.md) | Adoption surface | 30m | t004, t009 |
| [t006](t006.md) | Simplify | 30m | t005 |
| [t007](t007.md) | Test coverage | 45m | t005, t006 |
| [t008](t008.md) | Closeout | 15m | t007 |

## Definition of done

- MCPServers.org and MCPMarket expose one accurate public listing each, submitted through their free routes.
- LobeHub's current eligibility is established from primary requirements. It has a live listing if eligible; a genuine unsupported route is recorded with evidence and a revisit condition.
- Names, repository/source links, official registry identity, endpoint, and OAuth instructions match the deployed connector.
- Every advertised connection path is checked against the hosted synthetic QA setup. Pending moderation, account access, or temporary fetch failures remain open.
- Public listing URLs, dates, and state are recorded in the shared inventory and the public MCP connection guide.

## Source + Goal linkage

- **Source:** Approved brainstorm item 5, materialized at the user's request `$pm 3,4,5,6,7 to w6` on 2026-10-20. The user excluded the previously proposed Claude and ChatGPT milestones. Builds on completed w2/m36 and w6/m7.
- **Goal linkage:** **A3 — Community & distribution** (primary), **A1 — Agent-native accounting** (secondary): distribute the existing accounting connector through supported catalogs and usable install paths.
- **Expected outcome:** People comparing MCP accounting connectors can move from a directory result to working setup instructions. Signals: referral visits and successful first connections.
- **Why now:** The shared packet makes these incremental distribution routes inexpensive. Free moderation queues can start without waiting for other marketplace approval; MCP.so and PulseMCP retain separate gates.
- **Adoption surface:** included because the milestone ships public listings and agent-facing connection instructions. Reuse existing host evidence and canonical setup guidance.

## Execution boundaries

- Reuse `backend-cluster/backend-v2/server.json`, `backend-cluster/backend-v2/docs/mcp.md`, and the shared inventory `backend-cluster/backend-v2/docs/mcp-marketplaces.md`; stage any public submission payload in the owning backend package. Preserve existing REST/GraphQL/MCP parity and documented credential policy.
- Use the hosted endpoint, dedicated QA account, and synthetic ledgers. A gateway/client rehearsal connects to that service; it does not provision another backend stack.
- Search for imported records before submitting. Follow documented marketplace submission routes rather than bulk unsolicited PRs/issues.
- Publisher account access, domain verification, operator contact, and review queues are concrete external gates. Prepare all independent repository work first; park any dependent task through /pm with its exact owner and unblock condition.
- No Claude/ChatGPT publication milestone, ClawHub skills publication, new accounting capability, or paid placement is added here.

## References

- [MCPServers.org submission](https://mcpservers.org/submit)
- [MCPMarket submission](https://mcpmarket.com/submit)
- [LobeHub marketplace eligibility to verify](https://lobehub.com/mcp)

## Historical block record — 2026-10-22 UTC

- **t001:** Free $0 submission succeeded on 2026-10-21; review advertised within two weeks. **Unblock:** moderator approval/public URL, then actual metadata/connection verification. **Owner:** MCPServers.org moderators, then repository worker. Do not duplicate the pending submission.

- **t002:** actual Free Queue repository submission succeeded; ~4–6 weeks stated. Live Remote MCP form costs $69 and was not submitted. **Unblock:** reviewers publish the source listing and the worker verifies/corrects actual hosted endpoint/OAuth metadata and setup. **Owner:** MCPMarket reviewers, then repository worker/publisher. No payment or duplicate submission.

- **t003:** supported remote manifest and CLI preflight are prepared; interactive login requires explicit Terms/Privacy agreement, with approval pending. **Unblock:** approve that actual agreement, complete user/GitHub access and repository permission checks, then actual publication and QA verification. **Owner:** publisher/operator, LobeHub and repository worker in that order. No grant or submission occurred.

- **Milestone / t004–t008:** every implementation task has an external prerequisite; public discovery and standing closing tasks are deferred transitively. **Unblock:** verify the actual published MCPServers.org/MCPMarket listings and resolve LobeHub account/agreement/publication, then complete the actual connection and closing checks. **Owners:** directory moderators, publisher/account holder and repository worker. Receipts/preparation: MCPServers.org 405b2b891; MCPMarket 32fe8a5cb; LobeHub ffefb6826. No paid placement or public-live listing is claimed.

## Current execution split — 2026-10-23 UTC

This milestone returns from `blocked/` because newly materialized submission/receipt work is independently actionable. The earlier all-tasks-blocked condition no longer describes the task set; it does not mean any publisher agreement, QA grant or external review has been completed. **Next:** t009 (actual LobeHub publisher setup/submission); the accepted MCPServers.org/MCPMarket receipts remain pending without resubmission.

An actual submission receipt closes only its receipt-stage task. Existing native/publication criteria and final verification remain required for this milestone's DoD. Preserve previous blocker history above; reassess concrete tool/account/access requirements at the actual action, carry prior authorization forward, and block only the affected step when a genuinely unmet condition remains. No task waits for another platform's review merely because it is later in the table.

The earlier exclusion of Claude/ChatGPT was the 2026-10-20 scope decision. The owner's 2026-10-23 all-inventory request now places those separate application follow-ups in [m11](../m11/README.md), without duplicating this milestone's targets.

## Blocked — current native login and remaining review, 2026-10-23 UTC

- **t009:** prior terms are approved and the actual publisher/CLI login succeeds. The real publish command requires verified GitHub connection; its newly shown OAuth request includes private repositories, Actions workflows and Gists, without a supported CLI narrowing option. **Unblock:** publisher decides that exact new scope or LobeHub supplies a narrower supported route; worker completes actual connection/repository checks and accepted submission. **Owners:** publisher/LobeHub, then worker. No GitHub/organization grant or plugin submission is claimed. See t009 and its dated packet.
- **t001/t002:** accepted original free submissions remain the baseline; no duplicate is sent. **Unblock:** moderators publish an actual record and worker verifies hosted metadata/connection. **Owners:** respective directory reviewers, then worker.
- **t003-t008:** retain their explicit native/publication and standing closing acceptance; they depend on the preceding blocked work. **Unblock:** the relevant actual publication/access conditions and dependent checks, not a prepared payload or an unrelated platform review. **Owners:** recorded publisher/platforms, then worker.

Every remaining task is now blocked or transitively deferred, so m10 returns to blocked/. This does not defer independent m11 work.
