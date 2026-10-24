# w6 · m9 — Reach developer marketplaces and galleries

**Worker:** worker1 **Goal:** Developers discover and connect the hosted MCP server through the supported Docker, Cursor, Cline, and GitHub/VS Code galleries. **Status:** blocked (t001/t011/t012/t013/t014 done; official Cursor/Docker review and other native/publication gates remain)

**Implementation estimate:** ~4½h, excluding external review queues and the standing closing tasks.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](done/t001.md) | Confirm developer-gallery eligibility and existing records — **DONE** | 30m | w6/m8/t001 |
| [t011](done/t011.md) | Submit official Cursor application and retain receipt — **DONE** | 30m | t001 |
| [t012](done/t012.md) | Complete required native checks and submit Docker contribution — **DONE** | 60m | t001 |
| [t013](done/t013.md) | Complete required native checks and send Cline submission — **DONE** | 60m | t001 |
| [t014](done/t014.md) | Send GitHub curated-gallery nomination and record delivery — **DONE** | 30m | t001 |
| [t002](t002.md) | Prepare and submit Docker's remote MCP catalog entry — **BLOCKED** | 60m | t001, t012 |
| [t003](t003.md) | Package the remote connection for Cursor's official and community marketplaces — **BLOCKED** | 60m | t001, t011 |
| [t004](t004.md) | Prepare Cline's eligible marketplace submission and remote connection evidence — **BLOCKED** | 45m | t001, t013 |
| [t005](t005.md) | Prepare GitHub inclusion and verify VS Code's discovery path — **BLOCKED** | 45m | t001, t014 |
| [t006](t006.md) | Verify publication and fresh discovery across eligible developer galleries | 30m | t002, t003, t004, t005 |
| [t007](t007.md) | Adoption surface | 30m | t006, t011, t012, t013, t014 |
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

- **t003:** the actual root multi-plugin index validates; the community listing appears in New and its real install link reaches the native client. The approved 2026-10-22 desktop journey completes synthetic-only identity/offline/read/write/admin OAuth,44tools/8resources, Cash BQL and one dry-run preview; Cash49.75USD before/after and preview-payee0rows. Native structured commit/count and literal wrote-array visibility limits are documented. The operator requests retention of this User entry and grant; no revocation is required. **Unblock:** separate official Publisher Terms approval, actual prepared application submission/receipt, then official platform review and the remaining gallery verification. The typed community name search now resolves the canonical entry, clearing the earlier indexing gap. **Owner:** publisher/operator, platform and repository worker. Native QA and nested repository format are cleared gates; w1/m34/t003's VSCode/fallback-port portion remains separate.

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

  The [nomination evidence correction](t005.md#nomination-evidence-correction--2026-10-22-utc)
  removes its stale claim that Cursor native verification is still open and
  links the completed community OAuth/query/preview record. VS Code verification
  remains open; the corrected request is still unsent.

- **Milestone / t006–t010:** final publication verification and standing closing acceptance depend on unresolved t002–t005 gates. This does not prevent independent setup, payload validation or documentation substeps inside those tasks. **Unblock:** complete each gate and the actual accepted listing/connection journeys, then finish adoption/simplification/coverage/closeout. **Owners:** recorded account holder/publisher/platforms, then repository worker. Current preparation: Docker fbe47be0e, Cursor 7ed1cfe05, Cline 6e5a556b8 plus the native setup above, GitHub/VS Code bb3f23e4a. The separate community Cursor entry is observed in New and its native install link works; the native desktop query/preview also completes; official agreement/submission and remaining eligible gallery criteria stay open.

## Current execution split — 2026-10-23 UTC

This milestone returns from `blocked/` because newly materialized submission/receipt work is independently actionable. The earlier all-tasks-blocked condition no longer describes the task set; it does not mean any publisher agreement, QA grant or external review has been completed. **Next:** t011 (official Cursor application), then independent t012/t013/t014; each depends only on the already-done shared eligibility task.

An actual submission receipt closes only its receipt-stage task. Existing native/publication criteria and final verification remain required for this milestone's DoD. Preserve previous blocker history above; reassess concrete tool/account/access requirements at the actual action, carry prior authorization forward, and block only the affected step when a genuinely unmet condition remains. No task waits for another platform's review merely because it is later in the table.

The earlier exclusion of Claude/ChatGPT was the 2026-10-20 scope decision. The owner's 2026-10-23 all-inventory request now places those separate application follow-ups in [m11](../m11/README.md), without duplicating this milestone's targets.

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
