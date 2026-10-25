# w6 · m11 — Complete app-directory and remote-community distribution

**Worker:** worker1 **Goal:** Users discover the existing hosted connector through approved ChatGPT/Claude entries and an accurate remote-MCP community entry. **Status:** blocked (t001/t002 are publisher-confirmed in review; ChatGPT estimate2026-11-03, Claude has no supplied estimate; t003 actually submitted with green upstream check, documented Agent review opted in and waiver requested; awaiting maintainer decision/merge; closing tasks deferred)

**Implementation estimate:** ~2h15m plus closing work, excluding external review latency. No recurring polling job is created.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](t001.md) | Follow existing ChatGPT application through review/publication — **BLOCKED: in review, estimate2026-11-03** | 45m | — |
| [t002](t002.md) | Follow existing Claude connector application through review/publication — **BLOCKED: in review** | 45m | — |
| [t003](t003.md) | Submit to Awesome Remote MCP Servers and verify merged entry — **BLOCKED: submitted, check passed** | 45m | — |
| [t004](t004.md) | Adoption surface | 30m | t001, t002, t003 |
| [t005](t005.md) | Simplify | 30m | t004 |
| [t006](t006.md) | Test coverage | 45m | t004, t005 |
| [t007](t007.md) | Closeout | 15m | t006 |

## Definition of done

- Existing ChatGPT and Claude submissions are reused, required supported feedback is addressed, and both have actual approved public entries with verified native synthetic OAuth/query/preview paths.
- The remote-only community list has an accurate merged canonical entry and working setup links, without a duplicate contribution.
- The shared tracker retains actual submit/manage links, status, UTC last checked at, receipts/evidence and next actions. Publisher-confirmed submission, inspected review state and public publication remain distinct.
- All 17 tracker rows retain the execution owner below. Existing m8/m9/m10 and 041/042 publication gates remain open until their own acceptance holds; completing this milestone alone does not mean every w6 submission is finished.
- All standing closing tasks pass and mandatory archive moves are complete. Pending review, unavailable account access or unpaid fees are not completion.

## Source + Goal linkage

- **Source:** Explicit owner request on 2026-10-23: `$pm` to finish all submissions in `backend-cluster/backend-v2/docs/mcp-marketplaces.md` in w6; publisher confirms ChatGPT and Claude have already been submitted and supplies their concrete management URLs.
- **Goal linkage:** **A3 — Community & distribution** (primary), **A1 — Agent-native accounting** (secondary).
- **Expected outcome:** People find the hosted accounting connector in the two native app directories and the remote-service community list, then reach a real authenticated first query.
- **Why now:** Submitted applications need review ownership, while the existing queue conflated drafts/client tests with actual submission receipts. This work fills the newly authorized gaps and preserves existing channel owners.
- **Adoption surface:** included because the milestone adds public discovery and agent-facing connection paths. Existing host/registry work is reused.

## Full inventory ownership and execution order

The [m9/t011](../m9/done/t011.md) official Cursor application is submitted with an accepted receipt after explicit final agreement confirmation; vendor review/publication remains open. Docker [m9/t012](../m9/done/t012.md) is actually submitted as PR #6042 after the scoped native Gateway journey; review/publication remains separate. Cline [m9/t013](../m9/done/t013.md) is actually submitted as issue #3230 after native OAuth, SDK query/preview and Agent read-only verification. GitHub nomination [m9/t014](../m9/done/t014.md) is sent and archived. LobeHub [m10/t009](../m10/done/t009.md) completes the approved GitHub/bex-co connection and actual accepted/public publication; native accounting and crawler correction remain t004. Publisher reports t001 in review with estimated completion2026-11-03; publisher also reports t002 in review without an estimated completion date, and t003 remains independently submitted. Table order is priority, not a cross-platform dependency.

| Inventory target | Submission / receipt owner | Review, public verification or retained gate |
| --- | --- | --- |
| Cursor — official | [m9/t011](../m9/done/t011.md) | [m9/t003](../m9/done/t003.md) done; [m9/t016](../m9/t016.md) official review/public/native |
| Docker | [m9/t012](../m9/done/t012.md) | [m9/t002](../m9/done/t002.md) submission/private reviewer access complete; [m9/t017](../m9/t017.md) actual review/publication; [m9/t015](../m9/done/t015.md) current OAuth repair |
| Cline | [m9/t013](../m9/done/t013.md) | [m9/t004](../m9/t004.md), m9/t006 |
| GitHub curated gallery / VS Code | [m9/t014](../m9/done/t014.md) | [m9/t005](../m9/done/t005.md) done; [m9/t018](../m9/t018.md) approved/public/native; existing w1/m34/t003 native owner retained |
| LobeHub | [m10/t009](../m10/done/t009.md) accepted/public; [m10/t003](../m10/done/t003.md) eligible payload complete | [m10/t011](../m10/done/t011.md) native/live metadata; [m10/t012](../m10/t012.md) crawler correction/search |
| ChatGPT / OpenAI | Publisher-reported in review, received2026-10-25T05:13:44Z; estimated completion2026-11-03 | [m11/t001](t001.md), OpenAI review then public/native verification; no user action now |
| Claude | Publisher-reported in review, received2026-10-25T05:34:59Z; no supplied completion estimate | [m11/t002](t002.md), Claude review then public/native verification; no user action now |
| Awesome Remote MCP Servers | [m11/t003](t003.md) | Same task retains upstream receipt, review and merged entry |
| Glama | Existing ownership and synthetic-only read monitoring verified; Healthy/44tools. [m8/t003](../m8/t003.md) coordinates existing [w2/088](../../../w2/blocked/088.md) | w2/088 full healthy day, earliest recheck2026-10-25T07:01:01Z, independent [m8/t009](../m8/done/t009.md) native path, final [m8/t004](../m8/t004.md); renew monitoring credential before2026-11-23UTC; no duplicate listing |
| Smithery | [m8/t002](../m8/t002.md) | Removed legacy intake remains blocked; platform/publisher must provide a working supported replacement route |
| MCPServers.org | Canonical public listing verified; original Free $0 receipt retained | [m10/t001](../m10/done/t001.md) done; [m10/t010](../m10/done/t010.md) retains directory-advertised native checks |
| MCPMarket | Accepted Free Queue repository submission; preserve existing receipt | [m10/t002](../m10/t002.md), m10/t004; reviewer publication then endpoint/OAuth metadata and connection checks |
| MCP.so | [041](../041.md) | Explicit approval of the observed $39 fee or a documented free route; no payment authorized by this plan |
| PulseMCP | [042](../042.md) | Platform reopens supported submission/edit intake; no submission sent while paused |
| Official MCP Registry | Already published under completed w2/m36 | Existing release workflow/canonical record; no duplicate namespace or routine resubmission |
| cursor.directory — community | Already published under [m9/t003](../m9/done/t003.md) | Preserve published entry and completed native QA; separate from official Cursor submission |
| Windsurf / legacy Cascade | Source-backed unavailable marketplace route under [m9/t001](../m9/done/t001.md) | m9/t006 retains explicit eligibility/revisit evidence; manual remote configuration is not a catalog submission |

## Execution rules

- Use only the documented, specifically requested intake for each target. A supported upstream catalog PR/issue or one-off nomination is distinct from repository code shipping, which stays direct to main. No bulk, unrelated outreach, fake engagement or new paid placement.
- Carry existing authorization forward. Before declaring a blocker, inspect the actual current step, finish all independently authorized preparation, and name the precise unmet access, scope, mandatory approval or platform condition. Generic hypothetical terms are not proof that no action can proceed.
- An actual platform/tool approval requirement still applies. Keep any narrow question at the final concrete action and continue independent tasks while it is pending; never treat silence as approval. Do not infer payment approval or broader data access from this planning request.
- Close receipt-stage tasks on actual accepted receipts only; keep pending publication in the owning verification task. If a submission itself is blocked, it stays open with owner and **Unblock:** event. No supported target disappears or becomes done because its draft or compatibility test passed.
- The tracker is the current status source. Each actual review pass updates only observed rows and retains their real check time and evidence; document edits do not refresh unobserved statuses. No recurring monitoring automation is part of this request.

## Blocked

- **t001:** publisher reports **in review**, estimated completion**2026-11-03**, update received2026-10-25T05:13:44Z. This clears the current status-information request; original-organization UI access is not independently restored. **Unblock:** actual review feedback/decision/publication, or manual check on/after2026-11-03; worker then handles corrections and public/native verification. **Owners:** OpenAI reviewers, then worker. No publisher action is needed now; the estimated date is not guaranteed approval and no duplicate application is created.

- **t002:** publisher reports **in review**, update received2026-10-25T05:34:59Z; no completion estimate or requested changes supplied. The current status-information request is cleared, while original-account UI access is not independently restored. **Unblock:** actual review feedback/decision/publication, otherwise a manual check on2026-10-27UTC; worker then handles corrections and public/native verification. **Owners:** Claude reviewers, then worker. No user action now; manual date is internal, not a vendor promise or automation. No duplicate application.

- **t003:** actual PR #2753 and its green Check Submission result are recorded. **Unblock:** upstream resolves the existing waiver request and reviews/merges, then worker verifies the public entry/setup links. **Owners:** upstream maintainer, then worker. The one waiver request is already sent; no repeated comment or engagement action. No engagement operation is performed or fabricated, and no duplicate contribution is sent.
- **t004-t007:** all three implementation tasks still have unresolved access/publication conditions; adoption, simplify, coverage and closeout cannot establish the milestone DoD ahead of them. **Unblock:** complete actual t001-t003 review/publication/native outcomes, then perform each standing closing check in dependency order. **Owners:** implementation owners above, then worker. No closing task is marked done on a prepared or merely submitted listing.

## Current milestone placement — 2026-10-23 UTC

Every remaining task is blocked or transitively deferred, so m11 moves to blocked/. This does not stop the workstream loop from checking later inbox/blocked items whose exact unblock conditions changed. The public three-line PR is submitted and green; it is not counted as a merged listing.

## Community prerequisite follow-through — 2026-10-24T02:47:50Z

For t003, a concrete star-waiver request is posted on the existing PR and the
publicly documented 🤖🤖🤖 Agent-review title is applied. The renewed upstream
check passes; account stars, source diff and PR identity are unchanged. No
maintainer waiver or merge is yet observed. **Unblock/owners:** upstream
maintainer resolves that request and reviews/merges; worker verifies actual
publication and setup links. The existing original-account access conditions
for t001/t002 remain independent. No new message is needed until feedback.

## Cross-target operational ownership — 2026-10-24 UTC

w6/043 owns one consistent17target current tracker and dated next actions; w6/044 owns supported browser restoration; w6/045 owns reviewer/monitor expiry coordination without duplicating w2/088. m8/m9/m10 now contain independent native/correction tasks and return to the live queue. This milestone remains blocked only on its own original-account and maintainer/publication gates. No existing submission receipt, GitHub curator approval, publisher agreement or retained grant is reopened by this board arrangement.
