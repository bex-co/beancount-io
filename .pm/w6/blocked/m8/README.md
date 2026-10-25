# w6 · m8 — Claim and publish the hosted connector on Smithery and Glama

**Worker:** worker1 **Goal:** Users find one accurate, owned, authenticated listing per platform for the existing hosted MCP endpoint. **Status:** blocked (t001/t003/t009 done; Smithery supported intake remains; dependent aggregate/closing tasks deferred)

**Implementation estimate:** ~3h, excluding external review queues and the standing closing tasks.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./done/t001.md) | Audit imported listings and prepare shared submission materials — **DONE** | 30m | — |
| [t002](./t002.md) | Publish or claim Smithery's existing hosted-server listing — **BLOCKED** | 45m | t001 |
| [t003](./done/t003.md) | Align the existing Glama connector after w2/088's ownership and health repair — **DONE** | 45m | t001, w2/088 |
| [t009](./done/t009.md) | Verify Glama native accounting independently of Smithery review — **DONE** | 45m | t001 |
| [t004](./t004.md) | Verify both public listings through fresh authenticated connections | 60m | t002, t003, t009 |
| [t005](./t005.md) | Adoption surface | 30m | t004, t009 |
| [t006](./t006.md) | Simplify | 30m | t005 |
| [t007](./t007.md) | Test coverage | 45m | t005, t006 |
| [t008](./t008.md) | Closeout | 15m | t007 |

## Definition of done

- Smithery and Glama each have one canonical, public listing for io.beancount/beancount pointing to https://beancount.io/api-gateway/mcp.
- The existing Glama connector is retained; w2/088's claim/test-profile/full-day health repair is reused and resolved rather than duplicated.
- Fresh OAuth, a known synthetic ledger query, and one supported write preview succeed through each published connection path; date, client/version, and deployed revision when exposed are recorded.
- Ownership, metadata, and authentication descriptions match the deployed surface. Submission receipts and pending review do not satisfy publication.
- The public MCP setup guide and marketplace inventory link to verified listings, and all standing closing tasks pass.

## Source + Goal linkage

- **Source:** Approved brainstorm item 3, materialized at the user's request `$pm 3,4,5,6,7 to w6` on 2026-10-20. The user excluded the previously proposed Claude and ChatGPT milestones. Builds on completed w2/m36 and w6/m7.
- **Goal linkage:** **A3 — Community & distribution** (primary), **A1 — Agent-native accounting** (secondary): distribute the existing accounting connector through supported catalogs and usable install paths.
- **Expected outcome:** A person browsing either catalog can discover Beancount.io and reach a first authenticated ledger query. Signals: listing referrals and successful first MCP connections.
- **Why now:** The official registry and OAuth surface already exist; these distributions can proceed while other channels review submissions. w6 has general-purpose capacity, and the existing Glama follow-up must retain one owner.
- **Adoption surface:** included because the milestone ships public listings and agent-facing connection instructions. Reuse existing host evidence and canonical setup guidance.

## Execution boundaries

- Reuse `backend-cluster/backend-v2/server.json`, `backend-cluster/backend-v2/docs/mcp.md`, and the shared inventory `backend-cluster/backend-v2/docs/mcp-marketplaces.md`; stage any public submission payload in the owning backend package. Preserve existing REST/GraphQL/MCP parity and documented credential policy.
- Use the hosted endpoint, dedicated QA account, and synthetic ledgers. A gateway/client rehearsal connects to that service; it does not provision another backend stack.
- Search for imported records before submitting. Follow documented marketplace submission routes rather than bulk unsolicited PRs/issues.
- Publisher account access, domain verification, operator contact, and review queues are concrete external gates. Prepare all independent repository work first; park any dependent task through /pm with its exact owner and unblock condition.
- No Claude/ChatGPT publication milestone, ClawHub skills publication, new accounting capability, or paid placement is added here.

## References

- [Smithery publishing](https://smithery.ai/docs/build/publish)
- [Glama connector FAQ](https://glama.ai/mcp/faq)
- [Existing w2/088 health/claim follow-up](https://github.com/bex-co/beancount-io/blob/main/.pm/w2/done/088.md)

## Historical blocker snapshot

- **t003:** ownership and private synthetic-only read authentication are verified. Saving the Bearer API key produces a successful1348ms check at2026-10-24T07:01:01Z; public health is Healthy with44tools, and saved configuration survives reload. **Unblock:** Glama records a full healthy day, earliest recheck2026-10-25T07:01:01Z under w2/088, then worker completes original metadata/native acceptance. **Owners:** Glama for actual checks, worker for observation and dependent verification. Renew monitoring access before2026-11-23UTC. Account/domain/test-access preparation is complete.

- **t002:** the signed-in legacy Smithery wizard returns 403 “Updating servers has been removed”; the candidate listing remains not found. **Unblock:** a working supported direct-directory intake/claim route, followed by ownership/scan and fresh connection proof. **Owner:** Smithery/Arcade and publisher. Details and preserved packet: t002; d9c3490f0.

- **Milestone / t004–t008:** t002 and t003 are unresolved prerequisites. Fresh discovery-to-OAuth verification, adoption, simplification/coverage review and closeout depend on those actual listings; none is marked done. **Unblock:** resolve Smithery’s supported direct listing intake and existing w2/088 Glama claim/test-profile/full-day health, then complete each dependent task in order. **Owners:** platform/publisher for external gates; repository worker for dependent checks. All independent shared materials shipped in d9c3490f0.

## Current execution and blockers — 2026-10-24 UTC

The milestone returns from blocked/ because t009 is a newly isolated independent native task, based on already-observed ownership and authenticated health. This does not claim Smithery intake or the full-day condition cleared. t009 starts from done/t001 without waiting for either; use w6/044 if browser control is needed. t004 is final aggregate acceptance, not a gate on independent native work.

- **t002 — Unblock:** Smithery/Arcade supplies a supported surviving direct-directory route, then worker submits/claims and verifies. Owner: platform/publisher, then worker.
- **t003 — Unblock:** w2/088 records a full actual healthy day at or after2026-10-25T07:01:01Z, then worker aligns/verifies metadata. Owners: Glama for checks, worker for observation. Existing access/claim decisions are complete; w6/045 coordinates the2026-11-23UTC expiry.
- **t004–t008 — Unblock:** their own prerequisites and actual final native/public DoD hold. Owner: worker after the recorded platform gates.

The original public/native DoD and standing closing tasks are unchanged. Native evidence is updated in the host guide only when ADR019 fixtures and real-host proof support it.

## Blocked — 2026-10-25 UTC

t009 is implemented and shipped in b74835388 with actual Glama native
OAuth/discovery/query/valid preview and unchanged-state evidence. Every other
open task is blocked or depends on blocked work. The fresh primary Smithery
notice recheck still establishes no supported replacement intake; Glama's
full-day threshold is still in the future.

**Unblock:** Smithery/Arcade supplies a supported direct-directory intake for
t002, or w2/088 can actually establish one full healthy day at or after
2026-10-25T07:01:01Z for t003 (a later failure resets the window). Resume only
the tasks whose condition clears, then complete final aggregate/standing
acceptance. **Owners:** Smithery/Arcade for intake; Glama for actual monitoring;
worker for dated verification and follow-through. No remaining account/domain
or private monitoring-access approval is inferred. Other w6 tasks continue.

## Current remaining gate — 2026-10-25 UTC

Glama's prerequisite w2/088 is archived after the actual after-day follow-up,
and [t003](./done/t003.md) now verifies canonical metadata/ownership with no
rewrite needed. Existing native accounting t009 remains done. There is no
Glama account/domain/test-profile approval or health-day wait left.

**Blocked:** only t002's supported Smithery intake and t004–t008's transitive
implementation/closing conditions remain. **Unblock/owners:** Smithery/Arcade
provides a working direct-directory submission/claim route, then worker
completes t002 and performs the actual aggregate/standing checks. Original
public/native DoDs are retained; no dependent closing task is claimed done.
Keep existing Glama monitor/DNS proof, with renewal assessment2026-11-20UTC
or actual failure and expiry end2026-11-23UTC.

## Smithery direct-directory route — 2026-10-25 UTC

Glama remains complete. Smithery t002 still has no established surviving
intake; current primary notice/docs and the official public GitHub
organization/API offer no catalog-PR route. A public-metadata-only request
to the transition notice's contact is prepared under t002, with explicit
email authorization requested and no message sent. **Unblock:** publisher
authorizes that reviewed contact action, Smithery/Arcade supplies supported
intake or curated inclusion, and worker verifies the actual public/native
result. The complete original task/milestone DoDs remain unchanged.

## Smithery contact gate cleared — 2026-10-25T23:08:09Z

Publisher authorized the prepared request. Actual Gmail **Message sent**
confirms one public-metadata-only email to the official transition contact.
t002 now waits on Smithery/Arcade's supported intake or curated-inclusion
response, then worker public/native verification. No further publisher
authorization is pending, and no accepted listing submission is inferred.
Keep this request and original DoD; do not send a duplicate inquiry.
