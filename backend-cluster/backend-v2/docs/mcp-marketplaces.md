# Hosted MCP marketplace submissions

Updated **2026-10-25 UTC**. This is the single current operational inventory for
all 17 MCP distribution targets. Platform packets retain receipts, dated history,
native evidence and privacy limits. Reuse each existing application/listing;
a submission, approval, publication and native connection are separate outcomes.

## Submission status tracker

`last checked at` is the actual external observation or explicitly attributed
publisher confirmation in UTC, not this document's edit time. Preserve date-only
precision. Public search does not expose private moderation state or rejection.
Next manual dates below are worker follow-up triggers, not vendor promises or
automations; actual feedback/publication/failure can trigger work earlier.

Status baseline: 5 public entries (including LobeHub needing correction), 6 submitted,
2 in review, 1 approved pending publication, 2 not submitted because intake is blocked
or paused, and 1 source-backed no-marketplace target. `published` requires an
observed public record; it alone does not qualify an ADR019 supported host.

The operation column links actual manage/intake/install/PR/issue locations.
Where no active route or application-specific management URL exists, it says so.
Documentation links are supporting evidence, never an invented operation entry.
Owners below are the current follow-through tasks, with completed release/listing
baselines kept completed. Shared browser recovery is [044 done](../../../.pm/w6/done/044.md).

| Target | status | last checked at (UTC) | Operation / install / public entry | Current owner | Evidence / native boundary | Next action / manual trigger |
| --- | --- | --- | --- | --- | --- | --- |
| ChatGPT / OpenAI | `in_review` | 2026-10-25T05:13:44Z — publisher update received; latest direct UI access observation remains2026-10-24T20:07:11Z | [Existing application](https://platform.openai.com/plugins/manage/plugin_asdk_app_6ad4537f69288191816f3fc04b1ac11a) | [m11/t001](../../../.pm/w6/blocked/m11/t001.md); OpenAI reviewers, then worker | Publisher reports in review with estimated completion**2026-11-03**. [Current report and historical access evidence](./marketplace-submissions/openai/README.md). Worker has not independently viewed the review screen; no required changes were supplied. | No publisher action now. On actual review feedback/decision/publication, or manual check on/after2026-11-03, inspect this same application and handle corrections, then verify public/native availability. Date is an estimate without a supplied timezone; no approval, duplicate application or recurring monitor inferred. |
| Official MCP Registry | `published` | 2026-10-23T08:22:04Z — public API | [Publish workflow](https://github.com/bex-co/beancount-io/actions/workflows/publish-mcp-registry.yml); [active public record](https://registry.modelcontextprotocol.io/v0.1/servers/io.beancount%2Fbeancount/versions/latest) | Maintainer / existing release workflow; [w2/m36 completed baseline](../../../.pm/w2/done/m36/README.md) | Active 1.0.0 record, canonical remote URL. Registry publication does not establish another gallery's inclusion. | Trigger: server.json release, endpoint/OAuth metadata change or reported drift. Compare public record; bump immutable version and use the existing protected publish workflow when required. |
| cursor.directory — community | `published` | 2026-10-22 — native/public observation | [Public listing / actual install entry](https://cursor.directory/plugins/beancountio) | Worker / listing maintenance; [m9/t003 completed baseline](../../../.pm/w6/blocked/m9/done/t003.md) | [Existing publication, typed search and native desktop OAuth/query/preview evidence](./marketplace-submissions/cursor/directory/README.md). Official Cursor review is separate. | Trigger: release/endpoint/install-recipe change or reported install failure. Check the existing listing/native link; retain completed submission and grant. |
| Glama | `published` | 2026-10-25T07:27:41.741369Z — after-one-day scheduled health/public metadata readback | [Connector admin](https://glama.ai/mcp/connectors/io.beancount/beancount/admin); [public connector / Try in Browser](https://glama.ai/mcp/connectors/io.beancount/beancount); [private Test Profile](https://glama.ai/mcp/connectors/io.beancount/beancount/admin/test-profile) | [m8/t003 metadata done](../../../.pm/w6/blocked/m8/done/t003.md); [w2/088 health follow-up done](../../../.pm/w2/done/088.md) | Owned/Healthy, 44 tools, historical uptime6.1%over21days. [After-day observation](./marketplace-submissions/glama/health-followup-20261025.json): scheduled success07:20:43UTC, more than24hours after first success; all10visible recent checks pass, history is not exhaustive. [Native Inspector accounting](./marketplace-submissions/glama/native-rehearsal-20261025.json) remains complete. | After-day health/metadata and native accounting are complete; worker maintains this existing listing on release drift or actual failure. Synthetic ledger.read monitor expires end2026-11-23UTC; worker assesses by2026-11-20UTC per [045](../../../.pm/w6/done/045.md). Keep DNS proof and retained credentials; no new grant or setup decision pending. |
| MCPServers.org | `published` | 2026-10-25T01:23:51.141Z — actual three-client native accounting and independent unchanged-state control | [Public listing / install recipe](https://mcpservers.org/servers/github-com-bex-co-beancount-io-blob-main-backend-cluster-backend-v2-docs-mcp-md); [original free intake](https://mcpservers.org/submit) | Worker / maintenance; [m10/t010 completed native baseline](../../../.pm/w6/blocked/m10/done/t010.md) | Original free submission is public. add-mcp 2.6.0 installed project configs; [actual Codex/Claude Code/Cursor Agent acceptance](./marketplace-submissions/directories/native-install-rehearsal-20261025.json) has 16 calls/three previews/unchanged state. Cursor model visibility limits retained. | Trigger: advertised recipe/client/endpoint change or reported connection failure. Recheck the actual recommended client path; do not repeat submission or infer another desktop/ADR019 host fixture. |
| MCPMarket | `submitted` | 2026-10-24T19:58:05Z — complete browser query | [Original Free Queue intake](https://mcpmarket.com/submit); [public query](https://mcpmarket.com/search?q=beancount); no application-specific management URL exposed | [m10/t002](../../../.pm/w6/blocked/m10/t002.md); MCPMarket reviewers | [Accepted 2026-10-21 free repository receipt](./marketplace-submissions/directories/mcpmarket.json). Latest complete recorded query:21 results/End of results, no canonical hosted match. Review advertised4–6 weeks; endpoint/OAuth were not separate form fields. | On review/publication feedback or 2026-11-18 UTC, verify actual hosted metadata and native path. Advertised window ends 2026-12-02 UTC; absence is not rejection. Preserve the accepted free entry; no duplicate or paid Remote MCP/priority form. |
| Claude | `in_review` | 2026-10-25T05:34:59Z — publisher update received; latest direct UI access observation remains2026-10-24T20:07:11Z | [Existing connector application](https://claude.ai/directory/manage/beancount-io) | [m11/t002](../../../.pm/w6/blocked/m11/t002.md); Claude reviewers, then worker | Publisher reports in review; no completion estimate or requested changes supplied. [Current report and historical access evidence](./marketplace-submissions/claude/README.md). Worker has not independently viewed the review screen. | No publisher action now. On actual review feedback/decision/publication, otherwise manual2026-10-27UTC, follow this same application, handle corrections and verify public/native availability. Manual date is internal, not a vendor estimate or recurring monitor; no duplicate connector. |
| Cursor — official | `submitted` | 2026-10-24T00:36:38Z — actual accepted form receipt | [Existing application / receipt entry](https://cursor.com/marketplace/publish); no application-specific management URL exposed | [m9/t016](../../../.pm/w6/blocked/m9/t016.md); Cursor marketplace reviewers | [Actual accepted application receipt](./marketplace-submissions/cursor/submission-receipt.json), after the approved Publisher Terms step. Community publication and prior native QA are separate. | On vendor feedback/publication or manual 2026-10-27 UTC: inspect original application/public gallery, apply requested changes, then verify official install path. No repeat agreement or application. |
| Docker | `submitted` | 2026-10-26T07:40:36Z — healthy deployed repair; native observation in flight; listing review retains05:17:24UTC readback | [Existing PR6042](https://github.com/docker/mcp-registry/pull/6042); [private reviewer channel](https://forms.gle/6Lw3nsvu2d6nFg8e6) | [m9/t017](../../../.pm/w6/blocked/m9/t017.md) Docker maintainer review; [046 live](../../../.pm/w6/046.md) worker native renewal acceptance | [Actual earlier expiry](./marketplace-submissions/docker/secretservice-preflight-20261026.json) exposed an opaque refreshed token after successful save/reload. [Repair cd20fa75f](./marketplace-submissions/docker/refresh-resource-repair-20261026.json) passes398suites/7,463tests and is deployed healthy. Retained-grant native CE recovery runs through08:17:55UTC; full post-expiry acceptance remains unverified. | Worker completes the already-running actual-expiry rotation/reload, tools/query/one-preview/unchanged-state test. Separately Docker maintainers approve two action_required runs and review/merge PR6042. No new grant, reviewer-key rotation, duplicate submission or publisher input. |
| Cline | `submitted` | 2026-10-24T19:58:05Z — existing issue and comments | [Existing marketplace submission3230](https://github.com/cline/mcp-marketplace/issues/3230) | [m9/t004](../../../.pm/w6/blocked/m9/t004.md); Cline marketplace reviewers | [Submitted issue and precise CLI/SDK/Agent evidence](./marketplace-submissions/cline/README.md#submitted--2026-10-24-utc):44 tools/query/one preview, unchanged synthetic state; real Agent read check. Last recorded issue has no response/labels; authenticated extension install not claimed. | On maintainer feedback/publication or manual 2026-10-27 UTC: handle the existing issue, then verify actual public catalog/native installation. No duplicate issue or hidden extension-acceptance claim. |
| GitHub curated gallery / VS Code | `approved_pending_publication` | 2026-10-24T20:10:06Z — authenticated approval reply and fresh public API | [Existing nomination channel](mailto:partnerships@github.com); [public gallery](https://github.com/mcp?search=beancount); original private thread retained outside repo | [m9/t018](../../../.pm/w6/blocked/m9/t018.md); GitHub curators, then worker/native VS Code owner | [Authenticated curator approval](./marketplace-submissions/github/nomination-receipt.json) received 2026-10-24T03:54Z; allow up to 3 business days, no submitter action requested. Last public name/identity API reads return200/zero records. Approval is distinct from publication/native QA. | On publication/email or manual 2026-10-29 UTC after the stated window: verify GitHub/VS Code discovery, then native install/OAuth/query/preview including fallback-port policy. Use the existing thread if action is requested; no duplicate nomination. |
| LobeHub | `published_needs_correction` | 2026-10-25T01:46:45.207519Z — actual public search/deployment and sent correction readback | [Public listing](https://lobehub.com/mcp/beancount-io); [installation tab](https://lobehub.com/mcp/beancount-io?activeTab=deployment); [native Connector settings](https://app.lobehub.com/settings/connector); [sent correction](https://github.com/lobehub/lobehub/issues/18706#issuecomment-6392098911) | [m10/t012](../../../.pm/w6/blocked/m10/t012.md); LobeHub marketplace maintainers | Canonical entry first among5search results. [Native 44-tool/five-call/query/one-preview acceptance](./marketplace-submissions/lobehub/native-rehearsal-20261025.json) passes with unchanged state. Fresh independent44/64/4 definitions match published fields; native UI exposes tools only. | On maintainer correction/reply or manual 2026-10-27 UTC: remove generated bea-init stdio option through a supported route, preserve owned HTTP version/metadata and verify derived remote classification. [One exact request is sent/read back](./marketplace-submissions/lobehub/correction-request-20261025.json); it is not an applied fix. No duplicate comment/listing. |
| Smithery | `blocked` | 2026-10-25T23:08:09Z — actual Gmail Message sent after explicit publisher authorization; primary route check remains22:13UTC | No surviving supported direct-directory intake established; [existing request recipient](mailto:ani@smithery.ai) is named in the [transition notice](https://smithery.ai/future); original Sent message retained privately | [m8/t002](../../../.pm/w6/blocked/m8/t002.md); Smithery/Arcade response, then worker | [Authorized request/receipt](./marketplace-submissions/smithery/intake-recheck-20261025.json) confirms one Send, exact recipient/subject dedupe and approved-body readback. [Sent public metadata](./marketplace-submissions/smithery/directory-request.md) asks for supported submit/claim route or curated inclusion. No QA credential shared. Inquiry sent does not mean accepted submission or publication. | No publisher action now. Follow this SAME request on actual response/intake/curated inclusion, otherwise manual transition check2026-10-31UTC. Complete ownership/public/native acceptance through the supported route; do not resend, retry the removed wizard or create a speculative catalog PR. |
| MCP.so | `submitted` | 2026-10-25T07:04:22Z — actual GitHub PR state/files readback | [Submitted PR6071](https://github.com/chatmcp/mcpso/pull/6071); [public query](https://mcp.so/search?q=beancount) | [047 publication](../../../.pm/w6/blocked/047.md); [041 submission done](../../../.pm/w6/done/041.md); MCP.so maintainers, then worker | [Actual GitHub receipt](./marketplace-submissions/mcpso/submission-receipt.json): created07:03:59UTC, open/non-draft, eight-line canonical README entry. Public endpoint/docs/OAuth checks pass; no upstream status checks reported. No website login or payment. | On feedback/review/merge/import or manual2026-10-27UTC, handle this existing PR and verify actual public metadata/advertised native connection. Submitted is not approved/published. The optional39USD website route no longer blocks submission; no duplicate issue/comment or paid form. |
| PulseMCP | `paused` | 2026-10-25T07:34:40Z — actual official intake, complete browser name query and active registry readback | [Official paused intake/instructions](https://www.pulsemcp.com/submit); [complete name query](https://www.pulsemcp.com/servers?q=beancount); [active registry record](https://registry.modelcontextprotocol.io/v0.1/servers/io.beancount%2Fbeancount/versions/latest) | [042](../../../.pm/w6/blocked/042.md); PulseMCP ingestion/intake owner, then worker | [Fresh evidence](./marketplace-submissions/pulsemcp/intake-recheck-20261025.json): official interim registry-publication step already satisfied, active/latest1.0.0. Complete name query has one unrelated Beanquery result. No direct submission or canonical live listing observed. | No user action now. On automatic import/reopening/supported correction route or manual2026-11-01UTC, verify actual public metadata and native path. No reopening date promised; no duplicate registry release or speculative PR to the team's own server-implementation repository. |
| Windsurf / legacy Cascade | `no_marketplace` | 2026-10-21 — vendor documentation | No supported marketplace submission entry established | Worker / route-opening maintenance; [m9/t001 completed research baseline](../../../.pm/w6/blocked/m9/done/t001.md) | [Vendor evidence](https://docs.windsurf.com/windsurf/cascade/mcp) records no legacy Cascade marketplace/one-click install; the docs redirect to Devin Desktop. Manual remote config is separate from a listing. | Trigger: vendor opens a supported listing/marketplace route. Re-establish product eligibility then. No phantom submission; Devin Local is a separate product decision. |
| Awesome Remote MCP Servers | `submitted` | 2026-10-24T19:58:05Z — existing PR, comments, reviews and checks | [Existing PR2753](https://github.com/punkpeye/awesome-remote-mcp-servers/pull/2753); [existing single waiver request](https://github.com/punkpeye/awesome-remote-mcp-servers/pull/2753#issuecomment-6378906070) | [m11/t003](../../../.pm/w6/blocked/m11/t003.md); list maintainers | [Actual three-line contribution receipt](./marketplace-submissions/awesome-remote/README.md). Last readback: open/unmerged/mergeable, existing check green; no maintainer waiver decision/review. Agent review opt-in already applied. | On maintainer response/merge or manual 2026-10-27 UTC: address real feedback, verify merged public entry and its connection recipe. Keep the existing waiver request; no duplicate comment/contribution or manufactured engagement. |

Maintain the affected row's status, actual check time, owner and next action
together, and append new observations to its packet. Keep existing receipts;
search absence does not replace them. Docker reviewer and Glama monitor access
are coordinated through [045 coordination](../../../.pm/w6/done/045.md) under their existing
review/health owners. Keep credential values, private mailbox/form contents and
account identifiers out of the inventory. The 2026-10-25T01:58:28Z first-party metadata check confirms both retained keys
Active within their recorded bounds; its details are in the owning packets.
It does not refresh the separate platform-review/health observations above.
Native Docker OAuth renewal is the
separate [046](../../../.pm/w6/046.md), not rotation of its reviewer key.

## Canonical listing copy

Use [`../server.json`](../server.json) as the source for registry metadata.

| Field | Value |
| --- | --- |
| Name | Beancount.io |
| Registry name | `io.beancount/beancount` |
| Short description | Query, edit, and reconcile a hosted Beancount ledger: BQL, reports, files, and bank imports. |
| Endpoint | `https://beancount.io/api-gateway/mcp` |
| Transport | Streamable HTTP |
| Authentication | OAuth; sign in to Beancount.io and approve the requested ledger permissions. |
| Product | https://beancount.io/ |
| Source | https://github.com/bex-co/beancount-io/tree/main/backend-cluster/backend-v2 |
| Setup and authorization guide | https://github.com/bex-co/beancount-io/blob/main/backend-cluster/backend-v2/docs/mcp.md |
| Support | https://github.com/bex-co/beancount-io/issues |
| Icon | https://beancount.io/lgasset/logo.png (PNG; registry declares 256×256) |

Long description for forms:

> Connect an agent to a hosted Beancount.io ledger. Query transactions with BQL,
> read financial reports and ledger files, preview supported changes, and work
> with linked bank imports. Connect to the existing remote endpoint and sign in
> with OAuth. Access follows the signed-in person's ledger permissions and the
> approved scopes. This connector accesses hosted ledgers; it does not open a
> local ledger file on the agent's computer.

Use the version from `server.json` for the registry record. A repository commit
is not a deployed server version. Discover the actual tools, resources and
prompts from the authenticated service; do not copy a static capability count
into listings. Adapt an icon only when a directory requires another size.
Operator contact addresses and reviewer credentials are supplied privately by
the publisher account, never copied into this packet or public submissions.

## Reviewer rehearsal

1. Configure the canonical endpoint in the actual directory's supported client.
   Capture UTC date, directory URL, client/version and deployed revision if the
   service exposes it. Record “unavailable” for a revision that is not exposed.
2. An unauthenticated `initialize` must return 401 and a `WWW-Authenticate`
   protected-resource metadata URL. That metadata and the authorization-server
   discovery must return 200. A protected 401 is expected, not an uptime failure.
3. Follow the client's OAuth flow with the dedicated QA account. Check the
   client/redirect identity shown on Beancount.io's consent screen. Use only a
   synthetic QA ledger and the scopes needed for this rehearsal. Keep grants,
   tokens, cookies, contact details and account identifiers outside tracked files.
4. Initialize and enumerate the live tools/resources. Query the dedicated
   synthetic fixture and compare the result with its known expected balance or
   transaction. Fetch identifiers from the service; never paste a production
   ledger's data into a directory or review form.
5. Exercise one write-capable tool that actually supports `dry_run`, using its
   current schema and synthetic inputs. Confirm the preview and read back the
   unchanged ledger. Do not substitute a real write for an unsupported preview.
6. Save a public-safe result: listing URL, transport, client/version, OAuth and
   query outcome, preview outcome, date, revision availability, and any review or
   health gate. Remove private credentials/test-profile configuration from
   screenshots and logs. A pending submission is recorded as pending, not done.

[ADR 019](../../../docs/adrs/ADR019-backend-v2-mcp-host-compatibility.md) requires
host fixtures and real-host evidence before declaring a new host supported.
Submission and scoped native evidence do not automatically add Smithery, Glama,
Cline or LobeHub to the guide's verified host table. A directory that only links to the direct URL
is verified through the client it actually installs or recommends.
