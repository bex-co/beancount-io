# w6 · m9 — Reach developer marketplaces and galleries

**Worker:** worker1 **Goal:** Developers discover and connect the hosted MCP server through the supported Docker, Cursor, Cline, and GitHub/VS Code galleries. **Status:** blocked (9 tasks done; current/native renewable OAuth follow-up 046 complete; remaining platform review/publication and native verification gates plus dependent closing tasks remain)

**Implementation estimate:** ~4½h, excluding external review queues and the standing closing tasks.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](done/t001.md) | Confirm developer-gallery eligibility and existing records — **DONE** | 30m | w6/m8/t001 |
| [t011](done/t011.md) | Submit official Cursor application and retain receipt — **DONE** | 30m | t001 |
| [t012](done/t012.md) | Complete required native checks and submit Docker contribution — **DONE** | 60m | t001 |
| [t013](done/t013.md) | Complete required native checks and send Cline submission — **DONE** | 60m | t001 |
| [t014](done/t014.md) | Send GitHub curated-gallery nomination and record delivery — **DONE** | 30m | t001 |
| [t002](done/t002.md) | Prepare and submit Docker's remote MCP catalog entry — **DONE** | 60m | t001, t012 |
| [t003](done/t003.md) | Package the remote connection for Cursor's official and community marketplaces — **DONE** | 60m | t001, t011 |
| [t004](t004.md) | Prepare Cline's eligible marketplace submission and remote connection evidence — **BLOCKED** | 45m | t001, t013 |
| [t005](done/t005.md) | Prepare GitHub inclusion and verify VS Code's discovery path — **DONE** | 45m | t001, t014 |
| [t015](done/t015.md) | Diagnose and repair the later Docker Gateway Unauthorized result — **DONE** | 30m | t012 |
| [t016](t016.md) | Follow official Cursor review/public/native availability — **BLOCKED** | 45m | t011 |
| [t017](t017.md) | Follow Docker review through public catalog installation — **BLOCKED** | 45m | t012 |
| [t018](t018.md) | Verify approved GitHub publication and native VS Code — **BLOCKED** | 45m | t014 |
| [t006](t006.md) | Verify publication and fresh discovery across eligible developer galleries | 30m | t002, t003, t004, t005, t015, t016, t017, t018 |
| [t007](t007.md) | Adoption surface | 30m | t006, t011, t012, t013, t014, t015, t016, t017, t018 |
| [t008](t008.md) | Simplify | 30m | t007 |
| [t009](t009.md) | Test coverage | 45m | t007, t008 |
| [t010](t010.md) | Closeout | 15m | t009 |

## Definition of done

- Docker MCP Catalog, Cursor Marketplace, cursor.directory, Cline Marketplace, and GitHub MCP Registry/VS Code discovery each have a dated eligibility and existing-record decision.
- Every confirmed eligible target has an accepted, public listing and a working discovery-to-OAuth-to-synthetic-query/preview path. A public gallery search is verified separately from generic client compatibility.
- Windsurf/Cascade's current submission route is checked. A source-backed unavailable route is recorded with a revisit condition; an account-access or review wait is blocked work, not an exclusion.
- The distribution uses the current io.beancount/beancount identity and single hosted endpoint, and public payload/evidence lives in the owning backend package.
- Temporary account, operator-contact, deployment, and review gates remain explicit until cleared. No submitted-but-unpublished eligible target is counted as done.

## Source + Goal linkage

- **Source:** Approved brainstorm item 4, materialized at the user's request `$pm 3,4,5,6,7 to w6` on 2026-10-20. The user excluded the previously proposed Claude and ChatGPT milestones. Builds on completed w2/m36 and w6/m7.
- **Goal linkage:** **A3 — Community & distribution** (primary), **A1 — Agent-native accounting** (secondary): distribute the existing accounting connector through supported catalogs and usable install paths.
- **Expected outcome:** Developers find Beancount.io in their existing tool's discovery flow and make a first authenticated MCP call. Signals: gallery installs and successful first queries.
- **Why now:** The shipped registry identity and host implementations make distribution the remaining work. Shared materials depend only on m8/t001, not on Smithery/Glama approval or the separate ClawHub release.
- **Adoption surface:** included because the milestone ships public listings and agent-facing connection instructions. Reuse existing host evidence and canonical setup guidance.

## Execution boundaries

- Reuse `backend-cluster/backend-v2/server.json`, `backend-cluster/backend-v2/docs/mcp.md`, and the shared inventory `backend-cluster/backend-v2/docs/mcp-marketplaces.md`; stage any public submission payload in the owning backend package. Preserve existing REST/GraphQL/MCP parity and documented credential policy.
- Use the hosted endpoint, dedicated QA account, and synthetic ledgers. A gateway/client rehearsal connects to that service; it does not provision another backend stack.
- Search for imported records before submitting. Follow documented marketplace submission routes rather than bulk unsolicited PRs/issues.
- Publisher account access, domain verification, operator contact, and review queues are concrete external gates. Prepare all independent repository work first; park any dependent task through /pm with its exact owner and unblock condition.
- No Claude/ChatGPT publication milestone, ClawHub skills publication, new accounting capability, or paid placement is added here.

## References

- [Docker remote contributions](https://github.com/docker/mcp-registry/blob/main/CONTRIBUTING.md#-adding-a-remote-mcp-server)
- [Cursor plugins](https://prod.cursor.com/docs/plugins)
- [cursor.directory submissions](https://cursor.directory/plugins/new?type=mcp_server)
- [Cline submissions](https://github.com/cline/mcp-marketplace)
- [GitHub inclusion route](https://github.blog/ai-and-ml/generative-ai/how-to-find-install-and-manage-mcp-servers-with-the-github-mcp-registry/)

## Historical block record — 2026-10-22 UTC

- **t002:** validated payload, working temporary OCI catalog and standalone discovery/DCR are ready. The dedicated synthetic QA session is established and the consent page selected only that ledger with read/write scopes; no grant/read/preview or submission occurred. **Unblock:** the specific temporary access decision, fresh native OAuth and successful gateway query/preview/unchanged-state/callback, then documented upstream review. **Owner:** QA account holder, repository worker and Docker reviewers in that order. Other gallery preparations proceed independently.

- **t003:** the actual root multi-plugin index validates; the community listing appears in New and its real install link reaches the native client. The approved 2026-10-22 desktop journey completes synthetic-only identity/offline/read/write/admin OAuth,44 tools/8 resources, Cash BQL and one dry-run preview; Cash49.75USD before/after and preview-payee0rows. Native structured commit/count and literal wrote-array visibility limits are documented. The operator requests retention of this User entry and grant; no revocation is required. **Unblock:** separate official Publisher Terms approval, actual prepared application submission/receipt, then official platform review and the remaining gallery verification. The typed community name search now resolves the canonical entry, clearing the earlier indexing gap. **Owner:** publisher/operator, platform and repository worker. Native QA and nested repository format are cleared gates; w1/m34/t003's VSCode/fallback-port portion remains separate.

- **t004:** required icon/setup/issue payload is prepared. Real Cline 4.1.25 setup accepts the URL-only entry; isolated CLI 3.0.73 reaches native OAuth consent, and the dedicated synthetic QA session is available. The exact public catalog feed has no Beancount match across 203 entries/149 MCP servers; the blank native panel is not rendering proof. No grant was approved; required template confirmations stay unchecked. **Unblock:** the specific temporary access decision, fresh OAuth, authenticated discovery/query/preview/unchanged-state, then authorized submission and review. **Owner:** QA/client account holder, repository worker and Cline reviewers.

  Validation follow-through: the docs-only preparation CI exposes an existing
  oversized-request transport race. The test-only fix retains actual HTTP 413,
  response and route assertions; focused 12/12 and 20 repeated suites 240/240 pass,
  and raised/omitted-limit controls fail as expected. The native access and
  reviewer conditions above remain pending; details and original CI limits are
  recorded in [t004](t004.md#ci-validation-follow-through--2026-10-22-utc).
  Fresh Node 22 typechecking, the complete 373-suite / 6,479-test run on baseline
  `ae156599` plus this patch, and OpenAPI snapshot-drift validation pass. A later
  ledger-path rebase also passes typechecking and all nine affected suites / 325
  tests. Exact pushed `5b962094` subsequently passes
  [integration CI 39736952457](https://github.com/bex-co/beancount-io/actions/runs/39736952457),
  all 375 suites / 6,587 tests and one snapshot; that earlier gate is cleared.
  The later isolated CLI Hub displays the installed entry and 149 Marketplace
  MCPs; its real `beancount` filter returns zero Marketplace results. This does
  not replace the extension's earlier blank-panel observation or establish
  authentication/query/preview.

- **t005:** concrete GitHub nomination is prepared and unsent. Source-backed anonymous API checks of installed VS Code 1.135.0's public default feed return zero name/identity results; all six latest-feed pages contain 560 unique records with no canonical name/endpoint/repository match. This independent read substep is complete without a user-input gate. The earlier native `@mcp` snapshot remains 51 entries/50 observed names; effective organization policy, typed native filtering and install/Copilot OAuth/query/preview are not inferred from the public feed. **Unblock:** authorized operator request, curated acceptance and fresh native QA discovery/OAuth/query/preview under w1/m34/t003. **Owner:** publisher, GitHub reviewers and QA/client account holder.

  The [nomination evidence correction](done/t005.md#nomination-evidence-correction--2026-10-22-utc)
  removes its stale claim that Cursor native verification is still open and
  links the completed community OAuth/query/preview record. VS Code verification
  remains open; the corrected request is still unsent.

- **Milestone / t006–t010:** final publication verification and standing closing acceptance depend on unresolved t002–t005 gates. This does not prevent independent setup, payload validation or documentation substeps inside those tasks. **Unblock:** complete each gate and the actual accepted listing/connection journeys, then finish adoption/simplification/coverage/closeout. **Owners:** recorded account holder/publisher/platforms, then repository worker. Current preparation: Docker fbe47be0e, Cursor 7ed1cfe05, Cline 6e5a556b8 plus the native setup above, GitHub/VS Code bb3f23e4a. The separate community Cursor entry is observed in New and its native install link works; the native desktop query/preview also completes; official agreement/submission and remaining eligible gallery criteria stay open.

## Current execution split — 2026-10-23 UTC

This milestone returns from `blocked/` because newly materialized submission/receipt work is independently actionable. The earlier all-tasks-blocked condition no longer describes the task set; it does not mean any publisher agreement, QA grant or external review has been completed. **Next:** t011 (official Cursor application), then independent t012/t013/t014; each depends only on the already-done shared eligibility task.

An actual submission receipt closes only its receipt-stage task. Existing native/publication criteria and final verification remain required for this milestone's DoD. Preserve previous blocker history above; reassess concrete tool/account/access requirements at the actual action, carry prior authorization forward, and block only the affected step when a genuinely unmet condition remains. No task waits for another platform's review merely because it is later in the table.

The earlier exclusion of Claude/ChatGPT was the 2026-10-20 scope decision. The owner's 2026-10-23 all-inventory request now places those separate application follow-ups in [m11](../../m11/README.md), without duplicating this milestone's targets.

## Historical blocked receipt action — 2026-10-23T20:17:19Z

- **t011:** the actual complete official application is ready, and its final button accepts Publisher Terms. The browser tool requires the publisher's execution-time confirmation for that legal agreement; the exact question is pending and the live prepared page is retained. **Unblock:** publisher confirms this specific submission/terms action; worker clicks and verifies the real receipt. **Owners:** publisher, then worker. No official submission or platform review has begun. This does not defer t012, t013 or t014.

## Historical Docker receipt gate — 2026-10-23 UTC

- **t012:** current official intake/dedup is checked and the actual native consent page is ready for only the synthetic QA ledger with ledger.read/ledger.write, returning to mcp.docker.com. Browser confirmation for this new recipient's data access is pending. **Unblock:** the QA account holder approves that exact grant; worker completes callback/native accounting checks and sends the required upstream PR. **Owners:** QA account holder, worker, then Docker reviewers. No OAuth grant, native accounting success or submission is claimed. t013/t014 remain independent.

## Current Cline receipt gate — 2026-10-23 UTC

- **t013:** the fresh native wizard, strict task-local settings and current official template/dedup are verified. Real Cline consent is narrowed to the synthetic QA ledger, with native identity/offline/read/write/admin scopes and a local callback. Its exact new-access confirmation is pending. **Unblock:** approve that actual grant, then complete callback and model-free public-SDK native tool checks before truthful issue submission. **Owners:** QA account holder, worker, then Cline reviewers. t014 and later milestones remain independent; no provider credentials or model session are needed for these MCP calls.

## Blocked — remaining work after nomination submission, 2026-10-23 UTC

The GitHub nomination is sent and t014 is archived under done/. All remaining tasks are blocked or depend on an unresolved blocked task, so the milestone returns to blocked/ without affecting independent m10/m11 work.

- **t011:** completed on 2026-10-24T00:36:38Z after explicit confirmation and actual accepted receipt; archived under done/. Official review/publication remains under t003/t006.
- **t012:** completed on 2026-10-24T01:20:03Z after actual native Gateway checks and submitted PR #6042; archived under done/. Docker review, private reviewer access and publication remain under t002/t006.
- **t013:** completed on2026-10-24T01:43:48Z after approved native OAuth/discovery/query/preview and actual submission issue #3230; archived under done/. Review/publication remains under t004/t006.
- **t005:** the operator authorization/sending prerequisite is cleared by the actual sent-mail receipt. **Unblock:** GitHub accepts/publishes the record, then the worker verifies actual GitHub/VS Code discovery and the dedicated native journey under existing w1/m34/t003. **Owners:** GitHub reviewers, then QA/client account holder and worker.
- **t002-t004, t006-t010:** their original eligibility, actual public/native acceptance and closing criteria remain; new receipt tasks unblock their respective next phases, not other platforms' queues. **Unblock:** complete those specific receipt/native/publication prerequisites, then their dependent checks. **Owners:** stated publisher/QA/platform owners, then worker.

## Current Cursor outcome — 2026-10-24T00:36:38Z

The official application is actually submitted and t011 is archived. Its
separate community listing/native QA remains complete and retained. Vendor
review/publication is the remaining Cursor condition; no action-time terms
answer remains outstanding for this submitted application. Other targets keep
their own authorization/native/publication requirements and are processed next.

## Current Docker outcome — 2026-10-24T01:20:03Z

The actual three-file PR #6042 is open and mergeable. The finite native-check/
submit-and-receipt task t012 is archived; all original review/public-catalog
acceptance remains open in t002/t006. Local upstream validation/catalog/Go tests
and the actual Gateway query/preview/unchanged-state checks pass. No upstream
CI success, shared private reviewer credentials or public listing is asserted.
Proceed with the next independent client workflow while Docker reviews.

## Current Cline outcome — 2026-10-24T01:43:48Z

Actual submission issue #3230 is open and the finite receipt task t013 is
archived. CLI installation/browser OAuth, public native SDK44-tool/query/one
unchanged-state preview and a real Agent README/read-tool session are recorded
with distinct limits. No review approval or public listing is inferred.
**Unblock:** Cline reviewers approve/publish this existing issue, then the worker
verifies actual catalog discovery and the remaining original native acceptance
under t004/t006. Continue independent publisher/index workflows meanwhile.

## Cursor packaging triage closure — 2026-10-24 UTC

The original t003 acceptance now holds: valid hosted-only package, distinct
actual official/community submission records and completed native QA. It is
archived under done/ with evidence. Official review/publication and subsequent
actual official-gallery verification remain under t006; the milestone remains
blocked and its public-listing DoD is unchanged.

## Historical Docker private-review gate — 2026-10-24T01:50:07Z

The required private testing-credential form remains incomplete. A first-party
single-synthetic-ledger read/write/no-admin token draft with2026-10-31UTC expiry
is ready; no credential is generated/shared. t002 retains this mandatory step
and its exact new sharing decision, separate from completed client OAuth/t012.
**Unblock/owners:** account holder confirms the specific credential/private
Docker-review recipient, then worker verifies bounds and submits the form;
alternatively Docker reviewers waive or supply a supported replacement. t006
retains actual publication and catalog verification.

## GitHub preparation triage closure — 2026-10-24T02:34:06Z

The original t005 criteria hold on shipped evidence: canonical registry identity,
separate GitHub/VS Code discovery records and the actual sent nomination. It is
archived under done/ with the fresh active-registry/empty-default-feed control.
The public result remains pending curation. t006 explicitly owns GitHub
acceptance/publication and actual gallery installation/QA, alongside existing
w1/m34/t003 native ownership. The milestone stays blocked on those real outcomes.

## GitHub intake acknowledgment observed — 2026-10-24 UTC

The actual nomination thread contains GitHub's automated received-request
response with sender/reply-to partnerships@github.com and github.com signature.
The public-safe receipt is updated. No substantive feedback, new nomination,
human review decision or public inclusion is claimed; t006 retains curation
and actual public/native follow-through. Other gallery tasks remain independent.

## Docker private-review submission complete — 2026-10-24T19:52:18Z

**t002 is done and archived** after the approved synthetic-only read/write,
no-admin credential is created, its saved expiry/restriction verified and the
required Docker private form returns an accepted receipt. The public PR
checkbox is checked without credential content. The key expires at the end of
2026-10-31UTC and is retained privately; arrange renewal if review needs later
access. All finite t002 acceptance criteria now hold. Existing native QA is
retained; no new accounting request or real ledger write is made.

**Remaining unblock/owners:** Docker reviewers review/merge/publish PR #6042;
worker verifies actual public catalog discovery and native installation under
t006. Its latest update response is still open/unmerged/mergeable, not approved
publication. The previous native OAuth and private-sharing decisions are cleared
and are not requested again. Other independent targets continue.

## GitHub curator decision complete — 2026-10-24T20:10:06Z

The authenticated original-thread reply confirms review approval for inclusion,
with up to3business days before publication and no further submitter action.
Fresh public default-gallery name/identity searches still return200/zero.
t006 retains public/native verification; no task or milestone closes from the
approval alone. No reply or duplicate nomination is sent. The exact existing
ChatGPT/Claude management pages also remain inaccessible in the current
organizations; those independent access gates stay with m11.

## Current execution and blockers — 2026-10-24 UTC

The milestone returns from blocked/ for independent t015 Docker-session diagnosis/repair. No vendor gate is claimed cleared. Official Cursor t016, Docker t017, GitHub/VS Code t018 and existing Cline t004 now own their review/native outcomes independently; t006 only reconciles the completed outcomes. Existing cursor.directory publication/native QA stays complete.

- **t004 — Unblock:** actual Cline review feedback/publication, followed by verified advertised install/native path. Owners: Cline, then worker.
- **t016 — Unblock:** official Cursor review feedback/publication, then actual official install/native proof. Owners: Cursor, then worker.
- **t017 — Unblock:** Docker review/CI/merge/public catalog availability; coordinate independent t015 and reviewer credential note045. Owners: Docker, then worker.
- **t018 — Unblock:** already-approved GitHub entry becomes public, then existing VS Code native owner/worker verify. GitHub states up to3business days from the actual2026-10-24T03:54Z approval; no further nomination action is requested.
- **t006–t010 — Unblock:** actual per-platform outcomes and their closing dependencies hold. Owner: worker. Other platform reviews do not serialize independent work.

Read actual existing feedback/CI changes, correct supported payloads and record real receipt/public/native transitions. Preserve previously approved grants and never substitute generic client compatibility for the published installation path.

## Current native repair outcome — 2026-10-25 UTC

t015 is complete with actual Gateway discovery/query/preview and unchanged-state evidence. Its separate offline-renewal consent loop is an independent actionable inbox note w6/046, not hidden behind Docker review. All remaining tasks here depend on the recorded platform publication gates; re-triage milestone placement next.

## Blocked — 2026-10-25 UTC

t015's current-session repair and real native accounting checks ship in
fbf140b40. The separate renewable-consent reproduction is live as w6/046,
not deferred behind these platform reviews. Every remaining milestone task
is blocked or depends on these unchanged public/native publication gates.

- **t004 — Unblock:** Cline gives actual review feedback or publishes issue3230's entry; worker handles the resulting advertised public/native route. Owner: Cline, then worker. Latest actual issue remains open without comments.
- **t016 — Unblock:** Cursor gives actual feedback or publishes the already-accepted official application; worker verifies its official path. Owner: Cursor, then worker. Existing community/native work stays complete.
- **t017 — Unblock:** Docker maintainers approve the two existing action_required workflow runs, then review/merge/publish PR6042; worker addresses actual executed failures if any and verifies catalog installation. Both current runs have zero executed jobs; no failing code test is inferred. Owners: Docker maintainers, then worker. Accepted private reviewer access is complete.
- **t018 — Unblock:** GitHub publishes the already-approved entry (stated up to three business days), then existing VS Code owner/worker verifies actual public/native installation. Owners: GitHub, then worker/native owner.
- **t006–t010 — Unblock:** all required per-platform results and closing prerequisites actually hold; owner: worker after those gates.

Fresh public API/name checks on2026-10-25T00:11–00:13UTC retain the existing
receipts and zero GitHub gallery results; no duplicate application, comment or
nomination is needed. Continue m10 and the live inbox while these waits remain.

## Independent renewable-flow follow-through — 2026-10-25T02:38Z

[w6/046](../../done/046.md) now ships the controlled, green scope-upgrade fix in
37f5a25b6 and is parked on verified access to the existing deployment plus a
supported native refresh runtime. Its source work was performed independently
of Docker review. Hosted rollout and actual native refresh are still unproved;
this neither reopens t015 nor changes the platform publication gates above.

## Renewable native follow-up complete — 2026-10-26T08:18:07Z

[046](../../done/046.md) now has actual retained-grant scheduled renewal/reload,
restored 44 tools, exact JWT scope/pin andnine-call query/one-preview/unchanged-state
acceptance. Source `cd20fa75f` is deployed healthy and remote CI passes. Its
runtime is stopped with grant/store retained. This clears the independent
native follow-up; it does not close t017's actual Docker catalog review/import
or any other platform's public/native DoD.

## Current GitHub outcome — 2026-10-29 UTC

[t018](t018.md) verifies actual publication, native Gallery install and now
retained-session native accounting:44 tools, Cash49.75USD, exactly one dry-run
preview and independent unchanged commit/file/counts/Cash/errors. Browser
recovery is complete without publisher input. Its remaining gate is a fresh
browser/default/fallback callback: temporary Profiles share app authentication;
a short-path isolated official client launches, but native control cannot
select that separate instance. Owned runtime/listener stop with scratch,
profiles and grants retained. **Unblock:** supported isolated-instance UI access
or grant-preserving fresh authentication, then actual callback with33418occupied
and native discovery/read with w1/m34/t003. Independent Cursor/Cline/Docker
review gates and aggregate/standing closing criteria remain open.
