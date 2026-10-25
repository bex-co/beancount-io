# w6 · m10 — List the connector in independent web directories

**Worker:** worker1 **Goal:** People comparing accounting MCP servers find accurate, usable remote listings on the eligible independent directories. **Status:** todo (6 tasks done; t010/t011 native accounting verified; t012 supported crawler/search correction is next)

**Implementation estimate:** ~2h, excluding external review queues and the standing closing tasks.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t009](done/t009.md) | Complete LobeHub publisher setup and submit remote listing — **DONE** | 45m | w6/m8/t001 |
| [t001](done/t001.md) | Submit or correct MCPServers.org's free remote listing — **DONE** | 30m | w6/m8/t001 |
| [t002](t002.md) | Submit or correct MCPMarket's free remote listing — **BLOCKED: free repository submission** | 30m | w6/m8/t001 |
| [t003](done/t003.md) | Establish LobeHub eligibility and prepare its supported connector listing — **DONE** | 45m | w6/m8/t001, t009 |
| [t013](done/t013.md) | Bind OAuth interaction routes to the signed-cookie interaction — **DONE** | 45m | — |
| [t010](done/t010.md) | Complete MCPServers.org advertised native accounting checks — **DONE** | 45m | t001, t013 |
| [t011](done/t011.md) | Complete LobeHub native OAuth and live metadata — **DONE** | 45m | t003, t009, t013 |
| [t012](t012.md) | Correct LobeHub crawler stdio deployment and verify search indexing | 30m | t003 |
| [t004](t004.md) | Verify the independent-directory listings after moderation | 15m | t001, t002, t003, t010, t011, t012, t013 |
| [t005](t005.md) | Adoption surface | 30m | t004, t009, t010, t011, t012, t013 |
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

The earlier exclusion of Claude/ChatGPT was the 2026-10-20 scope decision. The owner's 2026-10-23 all-inventory request now places those separate application follow-ups in [m11](../blocked/m11/README.md), without duplicating this milestone's targets.

## Historical native/review blocker snapshot — 2026-10-23 UTC

- **t009/t003:** account/GitHub/bex-co access and actual canonical publication now complete; both finite tasks are archived. The preferred HTTP URL and public44/64/4capability metadata are verified. No duplicate or prior GitHub decision remains.
- **t004 — LobeHub:** the public page retains an erroneous crawler stdio option that supported owner fields cannot erase. The actual native web OAuth flow is prepared for only the synthetic ledger and requests identity/offline/profile/email/read/write/admin; its final approval is pending. **Unblock/owners:** publisher approves that specific accounting grant; worker completes callback/native query/preview/unchanged-state; LobeHub removes/corrects the malformed crawler deployment through a supported path.
- **t001:** public search/detail metadata and endpoint/OAuth discovery are now verified; task archived under done/. Directory-advertised native installation/query/preview remains t004. No repeat or paid submission.
- **t002:** accepted original Free Queue receipt remains the baseline; latest complete query still has21results/End of results without the canonical hosted entry. **Unblock:** MCPMarket publishes an actual record, then worker verifies hosted metadata/connection. **Owners:** MCPMarket reviewers, then worker.
- **t003-t008:** retain their explicit native/publication and standing closing acceptance; they depend on the preceding blocked work. **Unblock:** the relevant actual publication/access conditions and dependent checks, not a prepared payload or an unrelated platform review. **Owners:** recorded publisher/platforms, then worker.

Every remaining task is now blocked or transitively deferred, so m10 returns to blocked/. This does not defer independent m11 work.

## Publication follow-through — 2026-10-24T19:58:05Z

MCPServers.org now exposes one canonical public Beancount.io hosted entry,
verified through the actual name query and detail page. t001 is done and archived.
The endpoint's unauthenticated401/OAuth discovery also matches the listing.
MCPMarket's complete21-result query still has no canonical hosted match and
retains its original receipt. t009's fresh GitHub connection page again asks
for the same broad scopes plus an explicit organization-access decision;
no Authorize or Grant is clicked. Only the affected external steps remain
blocked. t004 retains its actual native installation/connection acceptance.

## Current publication outcome — 2026-10-24T21:27:16Z

LobeHub accepted publication and same-version owner update are verified; t009
and t003 are done/archived. The public claimed page shows44tools,64resource
templates and4prompts. t004 keeps real client accounting verification and the
known crawler-generated stdio correction. MCPMarket remains in its original
review queue. Prior LobeHub terms, publisher login and GitHub/bex-co permission
decisions are complete and are not requested again. Every other pending task
retains its actual acceptance; the milestone is not closed from publication alone.

## Current execution and blockers — 2026-10-24 UTC

The milestone returns from blocked/ for independent t010 MCPServers.org native checks and t012 LobeHub crawler/search correction. t011 retains LobeHub native accounting and live metadata provenance. These outcomes are extracted from the aggregate t004; none waits for MCPMarket moderation. LobeHub publisher/terms/GitHub/bex-co/publication are already complete.

- **t002 — Unblock:** MCPMarket publishes or supplies actionable review feedback on the original free repository submission; worker verifies/corrects hosted endpoint/OAuth and connection. Owners: MCPMarket, then worker. Review advertised4–6weeks from2026-10-21; no duplicate or paid submission.
- **t011 — Unblock:** supported browser control is restored/rechecked through044 and actual required synthetic-only accounting consent completes; worker verifies native query/preview/discovery. Owner: worker, publisher only for a genuinely unmet concrete authorization.
- **t012:** worker can inspect supported correction routes and prepare the exact fix now. If only LobeHub can change crawler data or indexing, park that affected step with its real request/route and **Unblock:** corrected public deployment/search behavior. Owner: LobeHub for platform-only changes, worker for verified results.
- **t004–t008 — Unblock:** all actual per-directory outcomes and closing prerequisites hold. Owner: worker. Preserve the original observable public/native DoD.

## Current native consent prerequisite — 2026-10-25 UTC

t013 is newly actionable after actual project-client onboarding exposes a
requester/callback mismatch consistent with a source-level interaction binding
gap. t010/t011 are deferred until its controlled regression/fix and precise
rollout/native acceptance. **Unblock/owner:** worker completes t013's verified
guard, then resumes these native checks; a genuine rollout gate is recorded
separately. This does not block independent supported crawler correction t012
or tracker/credential inbox work. No new scope or grant revocation is inferred.

## Consent source repair — 2026-10-25 UTC

t013's controlled real-provider proof and minimum guard are verified and
archived. Required rebased backend checks pass (389suites/6,971tests).
The available existing hosted-service deployment must resolve the shipped
public revision and pass health before t010/t011's fresh sequential native
acceptance. This precise rollout boundary satisfies t013's source task; it
does not close or claim the dependent native outcomes.

## Hosted/native follow-through — 2026-10-25T01:23:51.141Z

Actual existing-service deployment resolves861d10a5c, backend/ledger health
passes, and all three MCPServers.org installer-project native paths pass
query/one preview/unchanged-state checks. t010 is archived. This clears
t013's rollout gate and makes t011's independent LobeHub native journey
actionable; browser access and earlier scoped approvals are retained.
The LobeHub crawler correction and MCPMarket's original review remain separate.

## LobeHub native acceptance — 2026-10-25T01:41:31Z

Supported same-Connector automatic DCR resolves the concrete native client-auth
failure. Callback/tool sync and native five-call query/one-preview checks pass
with independent unchanged-state evidence. t011 is done/archived. Fresh
independent metadata replaces older resource/prompt freshness limits precisely;
native UI itself enumerates44tools only. Next independent pick is t012's
supported malformed crawler deployment/search correction; MCPMarket remains
in its original external free review.
