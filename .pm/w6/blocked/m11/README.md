# w6 · m11 — Complete app-directory and remote-community distribution

**Worker:** worker1 **Goal:** Users discover the existing hosted connector through approved ChatGPT/Claude entries and an accurate remote-MCP community entry. **Status:** blocked (t010 accepted resubmission done; t001 in review/public/native; t002/t003 independent review/merge gates)

**Implementation estimate:** ~4h30m plus closing work, excluding external review latency. No recurring polling job is created.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](t001.md) | Follow existing ChatGPT application through review/publication — **BLOCKED: resubmitted, In review; public/native pending** | 45m | t010 |
| [t002](t002.md) | Follow existing Claude connector application through review/publication — **BLOCKED: in review** | 45m | — |
| [t003](t003.md) | Submit to Awesome Remote MCP Servers and verify merged entry — **BLOCKED: submitted, check passed** | 45m | — |
| [t008](done/t008.md) | Audit/fix annotations and regression coverage — **DONE** | 60m | — |
| [t009](done/t009.md) | Deploy and verify live annotations/explanations — **DONE** | 45m | t008 |
| [t010](done/t010.md) | Rescan/resubmit the original ChatGPT app — **DONE** | 30m | t009 |
| [t004](t004.md) | Adoption surface | 30m | t001, t002, t003 |
| [t005](t005.md) | Simplify | 30m | t004 |
| [t006](t006.md) | Test coverage | 45m | t004, t005 |
| [t007](t007.md) | Closeout | 15m | t006 |

## Definition of done

- Existing ChatGPT and Claude submissions are reused, required supported feedback is addressed, and both have actual approved public entries with verified native synthetic OAuth/query/preview paths.
- The remote-only community list has an accurate merged canonical entry and working setup links, without a duplicate contribution.
- The shared tracker retains actual submit/manage links, status, UTC last checked at, receipts/evidence and next actions. Publisher-confirmed submission, inspected review state and public publication remain distinct.
- All 20 tracker rows retain the execution owner below. Existing m8/m9/m10, m12, 047/042 and independent note 048 retain their own publication gates; completing this milestone alone does not mean every w6 submission is finished.
- All standing closing tasks pass and mandatory archive moves are complete. Pending review, unavailable account access or unpaid fees are not completion.

## Source + Goal linkage

- **Source:** Explicit owner request on 2026-10-23: `$pm` to finish all submissions in `backend-cluster/backend-v2/docs/mcp-marketplaces.md` in w6; publisher confirms ChatGPT and Claude have already been submitted and supplies their concrete management URLs.
- **Goal linkage:** **A3 — Community & distribution** (primary), **A1 — Agent-native accounting** (secondary).
- **Expected outcome:** People find the hosted accounting connector in the two native app directories and the remote-service community list, then reach a real authenticated first query.
- **Why now:** Submitted applications need review ownership, while the existing queue conflated drafts/client tests with actual submission receipts. This work fills the newly authorized gaps and preserves existing channel owners.
- **Adoption surface:** included because the milestone adds public discovery and agent-facing connection paths. Existing host/registry work is reused.

## Full inventory ownership and execution order

The [m9/t011](../m9/done/t011.md) official Cursor application is submitted with an accepted receipt after explicit final agreement confirmation; vendor review/publication remains open. Docker [m9/t012](../m9/done/t012.md) is actually submitted as PR #6042 after the scoped native Gateway journey; review/publication remains separate. Cline [m9/t013](../m9/done/t013.md) is actually submitted as issue #3230 after native OAuth, SDK query/preview and Agent read-only verification. GitHub nomination [m9/t014](../m9/done/t014.md) is sent and archived. LobeHub [m10/t009](../m10/done/t009.md) completes the approved GitHub/bex-co connection and actual accepted/public publication; native accounting and crawler correction remain t004. Owner reports t001 not approved on2026-10-31; t008–t010 own remediation/deployed verification/resubmission; publisher also reports t002 in review without an estimated completion date, and t003 remains independently submitted. Table order is priority, not a cross-platform dependency.

| Inventory target | Submission / receipt owner | Review, public verification or retained gate |
| --- | --- | --- |
| Muse | [m12/t001](../m12/t001.md), planned intake | [m12/t002](../m12/t002.md) review/public/native acceptance; independent of this milestone |
| Gemini Apps / Connected Apps Platform | [m12/t003](../m12/t003.md) console/domain/auth; [t004](../m12/t004.md) preview/review receipt | [m12/t005](../m12/t005.md) approval/publish/public/native; CLI Gallery is separate |
| Cursor — official | [m9/t011](../m9/done/t011.md) | [m9/t003](../m9/done/t003.md) done; [m9/t016](../m9/t016.md) official review/public/native |
| Docker | [m9/t012](../m9/done/t012.md) | [m9/t002](../m9/done/t002.md) submission/private reviewer access complete; [m9/t017](../m9/t017.md) actual review/publication; [m9/t015](../m9/done/t015.md) current OAuth repair |
| Cline | [m9/t013](../m9/done/t013.md) | [m9/t004](../m9/t004.md), m9/t006 |
| GitHub curated gallery / VS Code | [m9/t014](../m9/done/t014.md) | [m9/t005](../m9/done/t005.md) done; [m9/t018](../m9/t018.md) approved/public/native; existing w1/m34/t003 native owner retained |
| LobeHub | [m10/t009](../m10/done/t009.md) accepted/public; [m10/t003](../m10/done/t003.md) eligible payload complete | [m10/t011](../m10/done/t011.md) native/live metadata; [m10/t012](../m10/t012.md) crawler correction/search |
| ChatGPT / OpenAI | [t010 accepted resubmission](done/t010.md)2026-11-04; original1.0.0app independently In review / Not published | [m11/t001](t001.md), OpenAI review then public/native verification; no user action now |
| Claude | Publisher-reported in review, received2026-10-25T05:34:59Z; no supplied completion estimate | [m11/t002](t002.md), Claude review then public/native verification; no user action now |
| Awesome Remote MCP Servers | [m11/t003](t003.md) | Same task retains upstream receipt, review and merged entry |
| Awesome MCP Servers — general list | Independent [048](../048.md), PR18050 submitted2026-10-30 | Glama source intake is in review; complete its actual source checks/score badge, then maintainer merge and setup-link verification. Separate from remote-only PR2753 and independent of this milestone's reviews |
| Glama | Ownership, retained synthetic monitor and after-day follow-up [w2/088 done](../../../w2/done/088.md); canonical metadata [m8/t003 done](../m8/done/t003.md) | [m8/t009 native done](../m8/done/t009.md); final [m8/t004](../m8/t004.md) still depends on Smithery. Healthy/44tools; monitor renewal assessment2026-11-20UTC, expiry end11-23UTC; no duplicate listing |
| Smithery | [m8/t002](../m8/t002.md) | Removed legacy intake remains blocked; platform/publisher must provide a working supported replacement route |
| MCPServers.org | Canonical public listing verified; original Free $0 receipt retained | [m10/t001](../m10/done/t001.md) done; [m10/t010](../m10/done/t010.md) retains directory-advertised native checks |
| MCPMarket | Accepted Free Queue repository submission; preserve existing receipt | [m10/t002](../m10/t002.md), m10/t004; reviewer publication then endpoint/OAuth metadata and connection checks |
| MCP.so | [041 done](../../done/041.md), actual [PR6071](https://github.com/chatmcp/mcpso/pull/6071) submitted2026-10-25T07:03:59Z | [047](../047.md) owns maintainer review/import and actual public/native verification; website fee is not a prerequisite, no payment/login needed for the completed GitHub submission |
| PulseMCP | [042](../042.md), official registry prerequisite already met (active1.0.0) | Platform auto-import/reopening or supported correction, then public/native verification; no direct submission sent while paused and no user action now |
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

- **t001:** t008–t010 remediation/deploy/rescan/explanations and accepted original-app resubmission are complete. Actual readback2026-11-04T21:37:37.106Z: **In review / Not published**. **Unblock:** OpenAI supplies feedback/decision/publication; worker handles corrections and public/native verification. **Owners:** OpenAI reviewers, then worker. Next manual2026-11-09UTC or actual feedback earlier. No user input now; stale displayed Nov1estimate is not a reliable new deadline. Browser/login/scanner/final-confirmation conditions are cleared; no duplicate app.

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

## Reopened for actual annotation feedback — 2026-10-31 UTC

/pm unblocks this milestone because the owner supplied the concrete review feedback
and requested implementation. t008–t010 are inserted before closing tasks; t001's
future publication DoD remains unchanged and depends on accepted resubmission.
Other platform reviews never block this correction. Public notes retain redacted
reason/action facts only; no mailbox/account or credential content is copied.

## Current milestone block — 2026-10-31T08:48:22Z

All remaining tasks are blocked or depend on unresolved review/access gates.
t008/t009 are complete, archived and actually deployed; do not repeat the fix
or deployment. t010 cannot access the original application in this identity's
organization selector. **Unblock / owner:** publisher opens its original
submitting organization; worker rescans and resubmits the same app. t001 then
retains real review/public/native acceptance. t002/t003 keep their independent
review/merge conditions and closing tasks defer transitively. Independent m12
and newly due w6 review conditions continue, without waiting for this answer.

**Owner decision 2026-11-01:** defer the t010 original-organization access
discussion and handle the next independent unblock item. t010 and its dependent
review/publication work remain blocked with the same owner and access condition;
the shipped remediation is retained.

**Owner resumed 2026-11-02:** the owner requests direct resolution of the
original application again. t010 remains blocked on currently failing browser
startup and original-app access. Cross-browser crashes identify macOS
application-registration/bootstrap failure in the worker process context.
A supported loopback-only desktop-terminal MCP launcher is prepared; actual
HTTP initialization and25-tool discovery pass, while desktop-session browser
launch and original-organization access still need verification. This supersedes
the temporary discussion deferral without claiming a resubmission.


**Browser prerequisite cleared 2026-11-03UTC:** owner-started desktop MCP service
now opens the original application URL. t010 remains blocked only on fresh
publisher login/original submitting organization access before actual rescan and
resubmission. All44live tools/176boolean hints still match the prepared matrix.
The visible Chrome login window and persistent worker connection are retained;
no application detail access or accepted resubmission is inferred.


**Original-app access cleared 2026-11-03UTC:** t010 now reaches the same rejected
application and its editable1.0.0draft, with no metadata findings. The actual
rescan fails for missing scanning authorization. A synthetic-only ChatGPT
identity/offline/read/write/admin grant is ready on the real consent page; its
action-time confirmation is pending. t010 stays blocked on that exact approval
before callback/rescan/explanation verification/resubmission. The prior
browser/login blockers are resolved; review/public/native work still follows
accepted resubmission.


**Final submission ready 2026-11-03UTC:** t010 clears actual scanner authorization,
fresh scan and all 44-tool/176-hint verification. Every explanation is saved and
verified in private reviewer instructions; final submission context is filled.
Only action-time owner confirmation of the actual six final legal/compliance
declarations remains before Submit and accepted-receipt verification. Earlier
browser/login/scanner blocks are historical; t001 retains later review/public
and native acceptance.

**Accepted resubmission 2026-11-04UTC:** owner explicitly confirms the final
submission/declarations; worker submits the same original1.0.0app once. Plugins
list and version detail both show **In review / Not published** at
2026-11-04T21:37:37.106Z. [t010](done/t010.md) is done and archived with actual
receipt; t001 retains later review/public/native acceptance. Earlier access,
scanner and legal-confirmation blocks are cleared historical observations.
t002/t003 and the milestone's full DoD remain independent and unresolved.
