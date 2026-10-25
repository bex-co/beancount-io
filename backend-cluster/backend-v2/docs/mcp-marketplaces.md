# Hosted MCP marketplace submissions

Updated **2026-10-25 UTC**; each target's last check is recorded separately below.
This is the shared submission packet for w6/m8–m10, 041 and 042, plus subsequent
directory submissions. A submission, registry import, or supported transport does not prove
a public listing or a successful sign-in. Recheck the target before submitting;
reuse an existing record instead of creating a duplicate.

## Submission status tracker

The submit/manage links below lead to the actual operation entry, not a setup
guide. Existing application and listing links take precedence over a new form.
Publisher sign-in may be required. External contribution PRs and nomination
emails are submission routes; listing those routes does not mean they were sent.

`status` describes the last known submission or listing state. `submitted` means
a receipt or publisher confirmation exists; approval and public availability
remain unverified until separately observed. `approved_pending_publication` means
the vendor has explicitly approved the entry, while its public record is still
unverified. `not_submitted` means no submission
has been recorded. An existing imported listing does not imply an owner claim.

`last checked at` is UTC and records the external observation or explicitly
attributed publisher confirmation, not this document's edit time. Preserve
date-only precision where that is all the evidence supplies. `Not checked`
means the target's application/review state has not been checked. Public search
does not expose a private moderation queue; keep the pending receipt even when
search finds no match.

| Target | status | last checked at (UTC) | Submit / manage entry | Evidence and next check |
| --- | --- | --- | --- | --- |
| ChatGPT / OpenAI | `submitted` | 2026-10-24T20:07:11Z — exact management page, access limited | [Existing application](https://platform.openai.com/plugins/manage/plugin_asdk_app_6ad4537f69288191816f3fc04b1ac11a) | Publisher-confirmed submission is retained. The loaded page says the plugin is not found in the current organization; no accessible alternative organization is exposed. [Actual access observation](./marketplace-submissions/openai/README.md). Restore the original submitting account/organization, then inspect feedback; this is not an observed rejection. No duplicate application. |
| Official MCP Registry | `published` | 2026-10-23T08:22:04Z — public API | Publication uses the existing `Publish (mcp registry)` [workflow](https://github.com/bex-co/beancount-io/actions/workflows/publish-mcp-registry.yml), not a web submission form. | [Canonical record](https://registry.modelcontextprotocol.io/v0.1/servers/io.beancount%2Fbeancount/versions/latest) is active, latest version 1.0.0, with the canonical remote URL. Check record drift on release; imports into other galleries remain separate. |
| cursor.directory — community | `published` | 2026-10-22 — native/public observation | [Existing listing and install entry](https://cursor.directory/plugins/beancountio) | [Receipt and follow-through](./marketplace-submissions/cursor/directory/README.md): search, native OAuth/query/preview verified within documented limits. Monitor this listing; the official Cursor application below is separate. |
| Glama | `published` | 2026-10-25T00:19:03Z — public connector and native inspector accounting | [Existing connector admin](https://glama.ai/mcp/connectors/io.beancount/beancount/admin); [native inspector](https://glama.ai/mcp/inspector) | Owned/Healthy;44tools. Actual listing-linked native OAuth discovers44tools/8resources/64templates/4prompts, queries Cash49.75USD and completes one valid note dry-run with zero new errors/wrote[]. Native commit/counts and independent file-hash controls are unchanged. [Evidence and single-line-form limitation](./marketplace-submissions/glama/native-rehearsal-20261025.json). Full healthy day remains w2/088, earliest2026-10-25T07:01:01Z; private read-only synthetic monitor expires2026-11-23UTC. |
| MCPServers.org | `published` | 2026-10-25T01:23:51.141Z — actual three-client native accounting and independent unchanged-state control | [Published canonical entry](https://mcpservers.org/servers/github-com-bex-co-beancount-io-blob-main-backend-cluster-backend-v2-docs-mcp-md); [original intake](https://mcpservers.org/submit) | Original Free $0 record and add-mcp2.6.0 project installation are retained. Codex, Claude Code and Cursor Agent native routes now complete OAuth/query/one dry-run each:16actual accounting calls, Cash49.75USD, identical commit/counts and independent file hash. [Exact native evidence and Cursor model-visibility limits](./marketplace-submissions/directories/native-install-rehearsal-20261025.json). t001/t010 archived. No new desktop/host fixture or duplicate submission. |
| MCPMarket | `submitted` | 2026-10-24T19:58:05Z — complete browser query | [Original submission form](https://mcpmarket.com/submit); no application-specific management URL exposed | [Accepted Free Queue repository receipt and dated rechecks](./marketplace-submissions/directories/mcpmarket.json), submitted 2026-10-21. Review advertised in 4–6 weeks. Actual browser [search](https://mcpmarket.com/search?q=beancount) completes 21 results after one Load More, ending at End of results, without the canonical hosted connector. This is not private moderation status or directory-wide absence. Preserve the original receipt, follow approval/publication, then verify hosted metadata and connection; do not resubmit. |
| Claude | `submitted` | 2026-10-24T20:07:11Z — exact management page, access limited | [Existing connector application](https://claude.ai/directory/manage/beancount-io) | Publisher-confirmed submission is retained. The loaded page says the submission is not found in the current organization; the current identity differs from the publisher and exposes no switch to the original submitting identity. [Actual access observation](./marketplace-submissions/claude/README.md). Publisher restores original account/organization access or supplies feedback; no rejection or duplicate connector is claimed. |
| Cursor — official | `submitted` | 2026-10-24T00:36:38Z — actual accepted form receipt | [Original application/receipt entry](https://cursor.com/marketplace/publish); no application-specific management URL exposed | Final Publisher Terms action explicitly confirmed and Submit Application completed. The real page displays Thanks for applying and confirms receipt. [Public-safe receipt](./marketplace-submissions/cursor/submission-receipt.json). Await vendor feedback/review, then verify actual official publication; no duplicate application. Community/native QA and retained grant remain separate. |
| Docker | `submitted` | 2026-10-25T00:28:48Z — native repair and upstream review readback | [Existing PR #6042](https://github.com/docker/mcp-registry/pull/6042) | Native Unauthorized reproduced and current same-client synthetic read/write OAuth repaired; actual Gateway query/one dry-run/unchanged-state pass. [Repair and renewal limits](./marketplace-submissions/docker/native-repair-20261025.json); offline renewal consent remains w6/046. Both upstream workflow runs await maintainer approval (action_required/zero jobs), not executed test failures. Private reviewer form remains accepted; synthetic read/write/no-admin key expires end2026-10-31UTC. Review/public catalog/native installation remain m9/t017; no duplicate submission. |
| Cline | `submitted` | 2026-10-24T19:58:05Z — existing issue and comments | [Existing submission #3230](https://github.com/cline/mcp-marketplace/issues/3230) | Official CLI OAuth and native SDK44-tool/query/one dry-run checks pass with unchanged synthetic ledger state. A real Cline Agent reads the setup README and verifies zero errors/Cash49.75USD with automatic approval disabled. [Receipt and precise native limits](./marketplace-submissions/cline/README.md#submitted--2026-10-24-utc). Fresh readback remains open with zero comments and no labels. Follow this existing issue for review and actual public-catalog publication; no duplicate submission or authenticated extension claim. |
| GitHub curated gallery / VS Code | `approved_pending_publication` | 2026-10-24T20:10:06Z — authenticated approval reply and fresh public API | [Original nomination intake](mailto:partnerships@github.com); existing thread, no web form | GitHub's actual reply, received2026-10-24T03:54Z, confirms review approval and publication within up to3business days, with no further submitter action. Expanded sender details are mailed-by/signed-by github.com. [Approval and public readback](./marketplace-submissions/github/nomination-receipt.json). Fresh public default-gallery name and identity searches each return200/zero records. Actual public publication and native VS Code install/OAuth/query/preview remain t006; no duplicate nomination or new reply. |
| LobeHub | `published_needs_correction` | 2026-10-25T01:41:31Z — native OAuth/tool sync/accounting plus fresh metadata controls | [Canonical listing](https://lobehub.com/mcp/beancount-io); [installation tab](https://lobehub.com/mcp/beancount-io?activeTab=deployment); [native Connector settings](https://app.lobehub.com/settings/connector) | Same Connector automatic DCR repairs client authentication; native44tools/five calls/one dry-run pass, Cash49.75USD and ledger state unchanged. [Evidence and supported recovery](./marketplace-submissions/lobehub/native-rehearsal-20261025.json). Independent fresh44/64/4definitions match the published manifest; native UI enumerates tools only. t011 done. Malformed crawler stdio and canonical name search remain t012. Publisher/GitHub approvals and existing grants are retained. |
| Smithery | `blocked` | 2026-10-24T07:10:37Z — primary notice and publish-documentation recheck | No supported replacement intake established; legacy publishing attempt on2026-10-21 returned403 | The [current official notice](https://smithery.ai/future) retains a curated direct-URL directory while ending proxy/account/API/CLI services on2026-10-31. [Publish documentation](https://smithery.ai/docs/build/publish) still describes the legacy proxy wizard/CLI, without establishing a surviving direct-directory intake. No new publishing attempt or successful submission; obtain a supported replacement route before proceeding. |
| MCP.so | `blocked` | 2026-10-24T07:10:37Z — public remote/repository form route recheck | [Remote submission form](https://mcp.so/submit?type=remote-server) | The previously prepared browser form and name query remain documented. Fresh public Remote Server and repository forms both expose the one-time $39 paid action; neither establishes a supported free route. Final paid action is unperformed; exact spending decision is pending. [Prepared form and limits](./marketplace-submissions/mcpso/README.md). No payment, accepted submission or public listing is claimed. |
| PulseMCP | `paused` | 2026-10-23 — public directory notice | No active submission/edit intake; [directory notice](https://www.pulsemcp.com/servers) | No submission sent. Check whether the vendor reopens submissions or offers a supported correction route. |
| Windsurf / legacy Cascade | `no_marketplace` | 2026-10-21 — vendor documentation | No supported marketplace submission entry established | Remote manual configuration is available; do not report that as a submitted listing. Reassess if an intake opens. |
| Awesome Remote MCP Servers | `submitted` | 2026-10-24T19:58:05Z — existing PR, comments, reviews and checks | [Existing PR #2753](https://github.com/punkpeye/awesome-remote-mcp-servers/pull/2753) | The documented automated-agent review title is applied to the same three-line contribution. A [single waiver request](https://github.com/punkpeye/awesome-remote-mcp-servers/pull/2753#issuecomment-6378906070) asks maintainers to accept without changing account stars. The existing Check Submission remains successful (7seconds). Fresh readback remains open/unmerged/mergeable, with only the prior own waiver comment, no submitted reviews and no maintainer response or accepted waiver. [Receipt and limits](./marketplace-submissions/awesome-remote/README.md). Follow real review/merge and verify the merged public entry; no duplicate contribution or engagement operation. |

On each review pass, update the affected row's status, check time, evidence and
next action together. Keep original receipts and append dated observations to
the linked packet; do not replace submission history with a later search result.
Use `published` only after observing the actual public record. Record rejection
or requested changes explicitly when visible in the existing application.

## Native OAuth acceptance

The2026-10-25 [cross-flow consent repair](./marketplace-submissions/directories/oauth-interaction-binding-20261025.json)
is deployed through the existing service at public source861d10a5c. The
MCPServers.org installer projects now pass actual Codex, Claude Code and
Cursor Agent [native accounting checks](./marketplace-submissions/directories/native-install-rehearsal-20261025.json).
Fresh Claude Code/Cursor requester/callbacks match; native payloads and
independent read controls prove unchanged synthetic state. LobeHub m10/t011
now passes its own native acceptance; m10/t012 retains crawler/search correction. Existing grants remain retained.

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

## Target inventory

The publisher/operator owns account access, domain proofs and external review;
the repository worker owns artifacts and verification. “Unverified” below means
no reliable catalog result was obtained, rather than an assertion of absence.

| Target / owner task | Existing record and current evidence | Route, gate and next action |
| --- | --- | --- |
| Official MCP Registry / w2/m36 | Published as [`io.beancount/beancount`](https://registry.modelcontextprotocol.io/v0.1/servers/io.beancount%2Fbeancount/versions/latest). | Existing canonical record. Other directories' imports are checked separately. |
| Smithery / m8/t002 | The signed-in URL publishing flow accepts the canonical endpoint, then returns HTTP 403: “Updating servers has been removed.” The candidate record remains not found; no successful scan or public listing is established. | [Lifecycle notice](https://smithery.ai/future): proxy, accounts, API and CLI stop October 31, 2026; a curated directory with direct vendor URLs remains. The completed legacy-wizard attempt does not establish a surviving intake route. Smithery/Arcade or the publisher must provide a supported direct-directory submission/claim route, then complete applicable ownership/scan and synthetic OAuth/query/preview checks. The alternate GitHub grant was canceled and no support email was sent; repeating the unchanged wizard is not the next step. |
| Glama / m8/t003, existing w2/088 | [Existing connector](https://glama.ai/mcp/connectors/io.beancount/beancount) displays Ownership verified, Healthy and44tools; historical uptime3.2% over20days. | DNS proof remains published. Private API Key/Bearer monitoring is configured with synthetic-only ledger.read and actually succeeds at2026-10-24T07:01:01Z. [Dated evidence and renewal deadline](./marketplace-submissions/glama/README.md). Ten displayed recent scheduled checks succeed through19:53:19UTC. w2/088 still requires a full healthy day, earliest recheck2026-10-25T07:01:01Z; then original metadata acceptance applies. Native Glama Inspector OAuth/query/note-preview now passes under m8/t009; actual UI/structured-log and independent read controls are in [dated evidence](./marketplace-submissions/glama/native-rehearsal-20261025.json). No full healthy-day completion is inferred. |
| Docker / m9/t002 completed; m9/t006 follows publication | [Actual PR #6042](https://github.com/docker/mcp-registry/pull/6042) is open/unmerged/mergeable; three files,39additions. | [Dated native rehearsal](./marketplace-submissions/docker/native-rehearsal-20261024.md) completes scoped OAuth, Gateway discovery/query/one preview and unchanged-state proof. Required private reviewer credential form now has an accepted receipt; [scope, expiry and limits](./marketplace-submissions/docker/README.md#private-reviewer-access-submitted--2026-10-24t195218z). Public PR checklist is complete. t002 submission acceptance holds; Docker review/CI, actual publication and public catalog/native installation remain under t006. |
| Cursor / m9/t003 | Official application submitted with an actual accepted receipt on 2026-10-24; community entry appears in New and supports the native install link. | The supported root multi-plugin index passes the official template validator on the actual repo. [Native Agent rehearsal](./marketplace-submissions/cursor/native-rehearsal-20261021.md) verifies scoped synthetic OAuth/discovery/query/dry-run with precise concurrent-QA/read limits and client cleanup; the official IDE is installed, and the [native desktop follow-through](./marketplace-submissions/cursor/native-desktop-rehearsal-20261022.md) now completes account sign-in, approved synthetic-only OAuth, 44-tool/8-resource discovery, Cash BQL and one dry-run preview. Both publisher identities sign in. [Official submission receipt](./marketplace-submissions/cursor/submission-receipt.json) is accepted after explicit final agreement confirmation; vendor review/publication remains pending. The separate [cursor.directory listing](https://cursor.directory/plugins/beancountio) clears its scan/hidden banners and appears first in New by 21:55 UTC. Its verified URL-only install link adds the native User entry; native desktop discovery/query/preview now pass within documented visibility limits; the later typed name search finds the canonical entry at observed rank17 and follows it to the live install page. [Receipt, installation and limits](./marketplace-submissions/cursor/directory/README.md#scan-and-native-install-follow-through--2026-10-21-utc). The operator approves the native offline/admin scope for only the synthetic QA ledger and requests that the grant remain; the official submission is now accepted and its vendor review/publication remains separate. Do not resubmit the community listing. |
| Cline / m9/t004 | [Actual submission #3230](https://github.com/cline/mcp-marketplace/issues/3230) is open; the pre-submit all-states issue search and203-entry/149-MCP public feed found no canonical match. | The current required400×400icon and tested-install/stability fields were submitted with explicit stage limits. [Native evidence](./marketplace-submissions/cline/native-rehearsal-20261024.md) records actual CLI OAuth, public native SDK44-tool discovery/query/one unchanged-state preview, and a real Agent README/read-tool check with automatic approval disabled. The human completed browser consent; no autonomous fresh Agent installation, SDK resource enumeration or authenticated extension test is claimed. Review and public discovery/install verification remain open. |
| GitHub gallery / m9/t005 | [Gallery search](https://github.com/mcp?search=beancount) returned no MCPs; official registry publication already exists. | Follow [GitHub's registry inclusion process](https://github.blog/ai-and-ml/generative-ai/how-to-find-install-and-manage-mcp-servers-with-the-github-mcp-registry/). The curated gallery has a separate partnership intake; the [operator nomination](./marketplace-submissions/github/README.md) was actually sent on 2026-10-23 at 20:30 UTC, with [mail-provider receipt](./marketplace-submissions/github/nomination-receipt.json). Curation/publication and native VS Code verification remain separate external gates. |
| VS Code / m9/t005 | The installed 1.135.0 default gallery's [public API checks](./marketplace-submissions/github/README.md#public-default-gallery-api--2026-10-21-utc) at 21:41–21:43 UTC return HTTP 200/zero records for name and canonical identity; all six latest-feed pages contain 560 unique records with no name/endpoint/repository match. The earlier native `@mcp` result remains 51 entries/50 observed names, without exhaustive or typed-filter proof. | [VS Code MCP documentation](https://code.visualstudio.com/docs/agent-customization/mcp-servers#find-another-server) describes gallery/discovery and organization restrictions. Public API discovery is complete without a new account grant; effective native policy/rendering and install/OAuth/query/preview remain separate. Verify the actual gallery entry and fresh native QA journey after GitHub inclusion; a direct JSON config is not a gallery record. |
| Windsurf / m9/t001 | Current [Cascade docs](https://docs.windsurf.com/windsurf/cascade/mcp) redirect to Devin Desktop and state legacy Cascade has no MCP Marketplace/one-click install. | Cascade can use remote config. Do not claim a Cascade marketplace submission route. Revisit if the vendor opens one; Devin Local is a different product and requires a separate eligibility decision. |
| MCPServers.org / m10/t001 done; m10/t004 follows native QA | [Canonical public entry](https://mcpservers.org/servers/github-com-bex-co-beancount-io-blob-main-backend-cluster-backend-v2-docs-mcp-md) is present in the complete2-result name query. | Original Free $0 route is now published with the canonical endpoint, OAuth, source/docs and registry identity. [Dated public metadata and401/200 discovery evidence](./marketplace-submissions/directories/mcpservers.json). t001 is archived. The add-mcp2.6.0 recipe generates correct project configs for Codex/Claude Code/Cursor, with bounded native host recognition. Fresh client-specific OAuth/query/preview remains t004; installer output alone is not authenticated discovery. |
| MCPMarket / m10/t002 | At 2026-10-23 21:35 UTC, the actual browser [search](https://mcpmarket.com/search?q=beancount) finishes at “End of results” after one Load More click, still with 21 entries and no canonical hosted connector match. This completes that displayed query, without establishing directory-wide absence, private review status or rejection. | Live [submit UI](https://mcpmarket.com/submit) distinguishes Remote MCP ($69, no free option shown) from GitHub repository (Free Queue $0; optional $29 priority). Submitted the canonical source repository through the genuine free queue; UI confirmed success, ~4–6 weeks. [Receipt, route correction and dated query evidence](./marketplace-submissions/directories/mcpmarket.json). Endpoint/OAuth were not separate free-form fields and must be verified in the actual published record. No repeat submission, payment or authenticated connection is claimed. |
| LobeHub / m10/t003 done; m10/t004 follows native/correction | [Canonical public claimed entry](https://lobehub.com/mcp/beancount-io) is live at1.0.0; exact HTTP configuration and44/64/4definitions verified. | Actual official publish and supported owner update accept the canonical organization repo and manifest. [Provenance and remaining limitations](./marketplace-submissions/lobehub/README.md). t009 receipt and t003 eligibility/payload acceptance hold. t004 retains the unsupported crawler stdio cleanup and actual native synthetic OAuth/query/preview. No repeated GitHub grant, duplicate listing or fresh accounting grant is implied by publication. |
| MCP.so / 041 | [Search](https://mcp.so/search?q=beancount) finds other projects, not this hosted endpoint. | [Remote submission form](https://mcp.so/submit) requires a $39 one-time fee at this check. Payment is not approved. Unblock only with explicit fee approval or a documented free route. |
| PulseMCP / 042 | Beancount.io inclusion unverified. Registry publication is not proof of import. | [PulseMCP](https://www.pulsemcp.com/): both new server submissions and edits are paused. Wait for an actual reopen or supported correction route; no submission sent. |

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
