# Hosted MCP marketplace submissions

Updated **2026-10-23 UTC**; each target's last check is recorded separately below.
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
remain unverified until separately observed. `not_submitted` means no submission
has been recorded. An existing imported listing does not imply an owner claim.

`last checked at` is UTC and records the external observation or explicitly
attributed publisher confirmation, not this document's edit time. Preserve
date-only precision where that is all the evidence supplies. `Not checked`
means the target's application/review state has not been checked. Public search
does not expose a private moderation queue; keep the pending receipt even when
search finds no match.

| Target | status | last checked at (UTC) | Submit / manage entry | Evidence and next check |
| --- | --- | --- | --- | --- |
| ChatGPT / OpenAI | `submitted` | 2026-10-23T21:22:14Z — exact management page, access limited | [Existing application](https://platform.openai.com/plugins/manage/plugin_asdk_app_6ad4537f69288191816f3fc04b1ac11a) | Publisher-confirmed submission is retained. The loaded page says the plugin is not found in the current organization; no accessible alternative organization is exposed. [Actual access observation](./marketplace-submissions/openai/README.md). Restore the original submitting account/organization, then inspect feedback; this is not an observed rejection. No duplicate application. |
| Official MCP Registry | `published` | 2026-10-23T08:22:04Z — public API | Publication uses the existing `Publish (mcp registry)` [workflow](https://github.com/bex-co/beancount-io/actions/workflows/publish-mcp-registry.yml), not a web submission form. | [Canonical record](https://registry.modelcontextprotocol.io/v0.1/servers/io.beancount%2Fbeancount/versions/latest) is active, latest version 1.0.0, with the canonical remote URL. Check record drift on release; imports into other galleries remain separate. |
| cursor.directory — community | `published` | 2026-10-22 — native/public observation | [Existing listing and install entry](https://cursor.directory/plugins/beancountio) | [Receipt and follow-through](./marketplace-submissions/cursor/directory/README.md): search, native OAuth/query/preview verified within documented limits. Monitor this listing; the official Cursor application below is separate. |
| Glama | `published_unhealthy` | 2026-10-22 — public observation | [Existing connector admin](https://glama.ai/mcp/connectors/io.beancount/beancount/admin) | [Public connector](https://glama.ai/mcp/connectors/io.beancount/beancount) exists, but health is Unhealthy and owner claim is incomplete. Complete claim and private Test Profile, then verify a full day of successful health checks. |
| MCPServers.org | `submitted` | 2026-10-22T02:59:01Z — public search | [Original submission form](https://mcpservers.org/submit); no application-specific management URL exposed | [Accepted free submission receipt](./marketplace-submissions/directories/mcpservers.json), submitted 2026-10-21. Review advertised within two weeks. [Latest recorded search](https://mcpservers.org/search?query=beancount) has no canonical match. Monitor approval email and public listing; do not resubmit. |
| MCPMarket | `submitted` | 2026-10-22T02:59:01Z — public search | [Original submission form](https://mcpmarket.com/submit); no application-specific management URL exposed | [Accepted Free Queue repository receipt](./marketplace-submissions/directories/mcpmarket.json), submitted 2026-10-21. Review advertised in 4–6 weeks. [Latest recorded search](https://mcpmarket.com/search?q=beancount) has no canonical match. Monitor approval email, then verify hosted endpoint/OAuth metadata; do not resubmit. |
| Claude | `submitted` | 2026-10-23T21:22:14Z — exact management page, access limited | [Existing connector application](https://claude.ai/directory/manage/beancount-io) | Publisher-confirmed submission is retained. The loaded page says the submission is not found in the current organization; the current identity differs from the publisher and exposes no switch to the original submitting identity. [Actual access observation](./marketplace-submissions/claude/README.md). Publisher restores original account/organization access or supplies feedback; no rejection or duplicate connector is claimed. |
| Cursor — official | `not_submitted` | 2026-10-23T20:17:19Z — signed-in publisher form | [Official publish form](https://cursor.com/marketplace/publish) | Real form fully prepared with the existing publisher identity; final Submit Application accepts Publisher Terms and awaits the exact execution-time confirmation required by the browser tool. No receipt or official review is claimed. Native/community QA remains complete. Continue other submissions while this decision is pending. |
| Docker | `not_submitted` | 2026-10-23 — current intake/dedup and native consent | [Upstream contribution PR entry](https://github.com/docker/mcp-registry/compare) | Current official requirements still require OAuth testing; no matching Beancount PR found. Fresh gateway consent identifies the official Docker callback and only the synthetic QA ledger with ledger.read/ledger.write. Exact new-access confirmation is pending; no grant, native query/preview or submission is claimed. [Prepared entry and history](./marketplace-submissions/docker/README.md). |
| Cline | `not_submitted` | 2026-10-23 — current template/dedup and native consent | [MCP submission issue form](https://github.com/cline/mcp-marketplace/issues/new?template=mcp-server-submission.yml) | Fresh official CLI wizard reaches actual Cline consent for only the synthetic QA ledger; native default identity/offline/read/write/admin scope awaits exact confirmation. Model-free public SDK execution using the same isolated OAuth settings is available, but no grant/native accounting result or issue submission is claimed. Required tested-install/stability assertions remain open. [Prepared issue and native checks](./marketplace-submissions/cline/README.md). |
| GitHub curated gallery / VS Code | `submitted` | 2026-10-23T20:30Z — actual sent-mail receipt | [Nomination email intake](mailto:partnerships@github.com); existing sent request, no web form | One-off nomination actually sent; Gmail confirmed Message sent and matching Sent message. [Public-safe receipt](./marketplace-submissions/github/nomination-receipt.json). Pre-send canonical default-gallery API query returned zero records. GitHub curation, recipient delivery/read and actual VS Code gallery/native connection remain unverified; follow this request rather than resubmit. |
| LobeHub | `not_submitted` | 2026-10-23T21:22:14Z — actual publisher sign-in page | Native `lhm` publisher CLI; actual sign-in at app.lobehub.com | Browser access is restored. The real unchecked Terms/Privacy checkbox is prepared, with the exact action-time confirmation pending. Native callback expired without authentication; restart it after confirmation, then verify GitHub/repository access and submit. No verified login, grant or accepted submission. [Prepared manifest and actual observations](./marketplace-submissions/lobehub/README.md). |
| Smithery | `blocked` | 2026-10-21 — signed-in publishing attempt | No supported replacement intake established; legacy publishing returns 403 | No successful submission recorded. Obtain a supported direct-directory intake/claim route; do not repeat the removed legacy wizard. |
| MCP.so | `blocked` | 2026-10-21 — submit form observation | [Remote submission form](https://mcp.so/submit) | No submission recorded; observed route requires $39. Proceed only with fee approval or a documented free route. |
| PulseMCP | `paused` | 2026-10-23 — public directory notice | No active submission/edit intake; [directory notice](https://www.pulsemcp.com/servers) | No submission sent. Check whether the vendor reopens submissions or offers a supported correction route. |
| Windsurf / legacy Cascade | `no_marketplace` | 2026-10-21 — vendor documentation | No supported marketplace submission entry established | Remote manual configuration is available; do not report that as a submitted listing. Reassess if an intake opens. |
| Awesome Remote MCP Servers | `submitted` | 2026-10-23T20:54:37Z — actual PR and upstream check | [Existing PR #2753](https://github.com/punkpeye/awesome-remote-mcp-servers/pull/2753) | Actual three-line Finance entry submitted; upstream check-submission passes. [Receipt and entry](./marketplace-submissions/awesome-remote/README.md). PR remains open/unmerged. Upstream requires the submitting account to star before merge; publisher preference is pending and no engagement action was performed. Await real review/merge, then verify public entry; do not resubmit. |

On each review pass, update the affected row's status, check time, evidence and
next action together. Keep original receipts and append dated observations to
the linked packet; do not replace submission history with a later search result.
Use `published` only after observing the actual public record. Record rejection
or requested changes explicitly when visible in the existing application.

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
| Glama / m8/t003, existing w2/088 | [Existing connector](https://glama.ai/mcp/connectors/io.beancount/beancount), OAuth badge; the 2026-10-22 observation remains Unhealthy, 0.0% over 18 days, latest displayed test 07:39 UTC. | The existing-record claim reaches publisher sign-in and free-account profile completion. Final Terms/Privacy acceptance is prepared and awaits action-time confirmation; neither account nor claim is completed. [FAQ](https://glama.ai/mcp/faq) and connector admin instructions require domain ownership and an authenticated test profile. w2/088 owns the claim, private synthetic QA profile and full day of successful health checks; m8 follows that repair. No duplicate connector is created. |
| Docker / m9/t002 | Catalog inclusion unverified; catalog fetch returned 403. | [Official contribution route](https://github.com/docker/mcp-registry): remote Streamable HTTP/OAuth entries are eligible; the [prepared entry](./marketplace-submissions/docker/README.md) passes the pinned upstream validator/catalog generator. Standalone gateway 0.44.1 reaches discovery, DCR and consent with explicit read/write scopes. The dedicated synthetic QA session is now ready; the new grant awaits approval, with no read/preview or submission yet. Complete the fresh native QA journey, then the documented review flow. |
| Cursor / m9/t003 | Official application unsent; community entry appears in New and supports the native install link. | The supported root multi-plugin index passes the official template validator on the actual repo. [Native Agent rehearsal](./marketplace-submissions/cursor/native-rehearsal-20261021.md) verifies scoped synthetic OAuth/discovery/query/dry-run with precise concurrent-QA/read limits and client cleanup; the official IDE is installed, and the [native desktop follow-through](./marketplace-submissions/cursor/native-desktop-rehearsal-20261022.md) now completes account sign-in, approved synthetic-only OAuth, 44-tool/8-resource discovery, Cash BQL and one dry-run preview. Both publisher identities sign in. [Official submission](https://cursor.com/marketplace/publish) still needs final Publisher Terms approval. The separate [cursor.directory listing](https://cursor.directory/plugins/beancountio) clears its scan/hidden banners and appears first in New by 21:55 UTC. Its verified URL-only install link adds the native User entry; native desktop discovery/query/preview now pass within documented visibility limits; the later typed name search finds the canonical entry at observed rank17 and follows it to the live install page. [Receipt, installation and limits](./marketplace-submissions/cursor/directory/README.md#scan-and-native-install-follow-through--2026-10-21-utc). The operator approves the native offline/admin scope for only the synthetic QA ledger and requests that the grant remain; official Publisher Terms approval is still separate. Do not resubmit the community listing. |
| Cline / m9/t004 | Public issue search and the exact Cline 4.1.25 catalog feed have no Beancount match (203 entries/149 MCP servers). The later native CLI Hub reports 149 Marketplace MCPs and its real `beancount` filter returns zero matches, with the installed task entry still visible. This is separate from the earlier blank extension panel. | [Marketplace instructions](https://github.com/cline/mcp-marketplace) require the submission template, a 400×400 PNG and verified README or `llms-install.md` installation. [Prepared icon, setup, native observations and issue fields](./marketplace-submissions/cline/README.md) are ready. Cline 4.1.25 accepts the URL-only configuration in its real Installed panel, and isolated CLI 3.0.73 reaches OAuth consent. The synthetic QA session is ready; the new grant and authenticated discovery/query/preview remain unverified. The inspected Hub views expose installation/tool configuration, not an authentication or manual-execution control. Required installation/stability confirmations remain unchecked and no issue was sent. |
| GitHub gallery / m9/t005 | [Gallery search](https://github.com/mcp?search=beancount) returned no MCPs; official registry publication already exists. | Follow [GitHub's registry inclusion process](https://github.blog/ai-and-ml/generative-ai/how-to-find-install-and-manage-mcp-servers-with-the-github-mcp-registry/). The curated gallery has a separate partnership intake; the [operator nomination](./marketplace-submissions/github/README.md) was actually sent on 2026-10-23 at 20:30 UTC, with [mail-provider receipt](./marketplace-submissions/github/nomination-receipt.json). Curation/publication and native VS Code verification remain separate external gates. |
| VS Code / m9/t005 | The installed 1.135.0 default gallery's [public API checks](./marketplace-submissions/github/README.md#public-default-gallery-api--2026-10-21-utc) at 21:41–21:43 UTC return HTTP 200/zero records for name and canonical identity; all six latest-feed pages contain 560 unique records with no name/endpoint/repository match. The earlier native `@mcp` result remains 51 entries/50 observed names, without exhaustive or typed-filter proof. | [VS Code MCP documentation](https://code.visualstudio.com/docs/agent-customization/mcp-servers#find-another-server) describes gallery/discovery and organization restrictions. Public API discovery is complete without a new account grant; effective native policy/rendering and install/OAuth/query/preview remain separate. Verify the actual gallery entry and fresh native QA journey after GitHub inclusion; a direct JSON config is not a gallery record. |
| Windsurf / m9/t001 | Current [Cascade docs](https://docs.windsurf.com/windsurf/cascade/mcp) redirect to Devin Desktop and state legacy Cascade has no MCP Marketplace/one-click install. | Cascade can use remote config. Do not claim a Cascade marketplace submission route. Revisit if the vendor opens one; Devin Local is a different product and requires a separate eligibility decision. |
| MCPServers.org / m10/t001 | At the 2026-10-22 02:59:01 UTC recheck, complete displayed [search](https://mcpservers.org/search?query=beancount) still shows one unrelated StdioA record and no canonical hosted connector match. | [Submission form](https://mcpservers.org/submit) offers a free $0 route and remote server option, optional registry name and required contact email; stated review within two weeks. Submitted through Free $0 with canonical registry name, endpoint and OAuth; UI confirmed success. [Public-safe receipt and payload](./marketplace-submissions/directories/mcpservers.json). Await moderation and verify the actual public listing/connection; no listing URL is exposed yet. |
| MCPMarket / m10/t002 | At 2026-10-22 02:59 UTC, the actual [search](https://mcpmarket.com/search?q=beancount) finishes at “End of results” after one Load More click, still with 21 entries and no canonical hosted connector match. This completes that displayed query, without establishing directory-wide absence, private review status or rejection. | Live [submit UI](https://mcpmarket.com/submit) distinguishes Remote MCP ($69, no free option shown) from GitHub repository (Free Queue $0; optional $29 priority). Submitted the canonical source repository through the genuine free queue; UI confirmed success, ~4–6 weeks. [Receipt, route correction and dated query evidence](./marketplace-submissions/directories/mcpmarket.json). Endpoint/OAuth were not separate free-form fields and must be verified in the actual published record. No repeat submission, payment or authenticated connection is claimed. |
| LobeHub / m10/t003 | [Search](https://lobehub.com/mcp?q=beancount) finds other Beancount projects; no matching bex-co hosted connector confirmed. | [Publisher guide](https://market.lobehub.com/s/publish-mcp) supports a remote `cloudEndpoint`. Requires Node ≥22, interactive login and GitHub connection, plus repository owner/push access. The [prepared remote manifest](./marketplace-submissions/lobehub/README.md) passes field/identifier/endpoint checks; actual CLI preflight reaches the login guard. Interactive sign-in requires explicit Terms/Privacy agreement, awaiting action-time approval; no grant, GitHub connection or submission occurred. Owner/push access and subsequent publication/QA proof remain open. |
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
This packet is preparation; it does not add Smithery, Glama, Cline or LobeHub to
the guide's verified host table. A directory that only links to the direct URL
is verified through the client it actually installs or recommends.
