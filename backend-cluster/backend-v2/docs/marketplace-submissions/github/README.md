# GitHub curated approval; public discovery pending

Updated 2026-10-24 UTC; original dated observations below retain their limits. [GitHub's documented inclusion route](https://github.blog/ai-and-ml/generative-ai/how-to-find-install-and-manage-mcp-servers-with-the-github-mcp-registry/) asks publishers with an existing official-registry record to contact `partnerships@github.com`.
`nomination-email.md` records the public-safe request actually sent on
2026-10-23 at 20:30 UTC. The mail provider confirmed sending and the Sent
message was inspected; [receipt](./nomination-receipt.json). Recipient delivery,
reviewer acceptance and publication were not established by the sent receipt alone.
The later authenticated GitHub reply now confirms **review approval**; public
gallery publication remains pending, as recorded below.
Do not publish a duplicate official-registry namespace or package.

| Surface | Observed state |
| --- | --- |
| Official MCP Registry | `io.beancount/beancount` version 1.0.0 is public and names the canonical hosted URL. |
| Curated GitHub MCP Registry | GitHub confirms review approval in the original thread, received2026-10-24T03:54Z. They will publish within up to3business days and request no further action. Public listing is not yet verified. |
| VS Code public default gallery feed | Fresh2026-10-24T20:10:06Z name and identity queries each return200/zero records, so approval is not reported as publication. Earlier anonymous searches also returned HTTP200/zero records. All six pages of the observed latest-version feed contain 560 unique records and no canonical name, endpoint or repository match; see the [API evidence](#public-default-gallery-api--2026-10-21-utc). |
| Native VS Code gallery | The actual `@mcp` catalog reports 51 entries; 50 unique names were observed across overlapping viewports, with no Beancount match. This is not an exhaustive absence or name-filtered result. Installation and authenticated Copilot journey remain unverified; w1/m34/t003 retains shared rehearsal ownership. |

[VS Code's current discovery guide](https://code.visualstudio.com/docs/agent-customization/mcp-servers#find-another-server) documents gallery search with `@mcp` and Browse MCP Servers. After curated inclusion, check the native Beancount result, install from that actual entry, and complete the shared synthetic QA OAuth/query/preview rehearsal. Record client version, listing/feed URL, date and deployment revision availability.

`mcp.json` is a prepared direct HTTP configuration for a VS Code workspace's
`.vscode/mcp.json`. It is a distinct manual fallback and does not create or prove
a gallery listing. It contains no token and relies on the client's OAuth flow.
Use [the MCP guide](../../mcp.md) and the [reviewer rehearsal](../../mcp-marketplaces.md#reviewer-rehearsal); do not authorize an unrelated browser account or production ledger for this test.

## Native gallery observation — 2026-10-21 UTC

In VS Code **1.135.0**, a separate marketplace QA profile opens the real
Extensions panel. **Enable MCP Servers Marketplace → Enable**, followed by
**Filter Extensions → MCP Servers**, produces the `@mcp` query and a reported
51 entries at 19:17 UTC. Fifty unique visible names are collected across
overlapping scroll positions; none is Beancount. One reported entry is not
accounted for, so this does not establish exhaustive absence. No typed
Beancount name filter or direct registry-identity search is claimed.

The generic **Filter Extensions → Sort By → Name** menu later produces
`@mcp @sort:name` and **No MCP Servers found**. That unsupported-result
combination is not used as evidence of Beancount absence. Clearing the query
and choosing MCP Servers again restores `@mcp`. No server installation,
OAuth grant, accounting query or preview occurs. GitHub's inclusion request
remains unsent; native catalog observation does not imply curation acceptance.

Private accessibility snapshots, exact visible names and the sort observation
are retained under ignored
`backend-cluster/backend-v2/tmp/w6-cursor-client/`. This is separate evidence
from GitHub's web search and the existing official MCP Registry record.

## Public default gallery API — 2026-10-21 UTC

The installed first-party VS Code **1.135.0** build, commit
`08d4889f9ec4a1685d257b9b95de036c8e1ce1e5`, declares
`mcpGallery.serviceUrl = https://api.mcp.github.com` in
`Contents/Resources/app/product.json`. Its shipped
`out/vs/workbench/workbench.desktop.main.js` implementation selects API versions
`v0.1` then `v0`, requests `/{version}/servers` with `limit` and
`version=latest`, follows `cursor`, and URL-encodes `search` in
`mcpGalleryService.queryMcpServers`. These installed vendor files establish the
public query route.

At **21:41–21:43 UTC**, the following public GETs return JSON/HTTP 200 with no
Authorization header or account grant:

| Check | Request / pagination | Observed result |
| --- | --- | --- |
| Name | [`search=beancount`](https://api.mcp.github.com/v0.1/servers?limit=100&version=latest&search=beancount) | Zero records; metadata total 0. |
| Canonical registry identity | [`search=io.beancount%2Fbeancount`](https://api.mcp.github.com/v0.1/servers?limit=100&version=latest&search=io.beancount%2Fbeancount) | Zero records; metadata total 0. |
| Complete observed latest feed | [First page](https://api.mcp.github.com/v0.1/servers?limit=100&version=latest), then each returned `nextCursor` verbatim | Six pages: 100, 100, 100, 100, 100, 60 records; metadata total 560 throughout, 560 unique names and no final cursor. |

Every returned server record is checked for `beancount`,
`io.beancount/beancount`, `https://beancount.io/api-gateway/mcp` and
`bex-co/beancount-io`; each has zero matches. This completes the public API
name/identity and paginated-feed checks available without new client access.
It is a serial snapshot of that public default feed, with no atomic-snapshot
or future-absence claim.

The earlier **51-entry native UI** observation remains independent. The public
560-record feed does not establish the IDE's effective catalog, organization
policy, rendered name-filter result or installability, and does not explain the
different counts. [VS Code's official guide](https://code.visualstudio.com/docs/agent-customization/mcp-servers#find-another-server)
documents that organizations can restrict available servers. No IDE text input,
server install, OAuth, model call, accounting query, preview or inclusion request is added
by these public reads.

Raw public responses, exact page URLs/times/hashes and source excerpts are
retained under ignored
`backend-cluster/backend-v2/tmp/w6-final-actionability-audit-20261021/vscode-gallery/`
as `evidence.json`, `complete-catalog.json` and the eight response files.
The installed product SHA-256 is
`684c2361d7d1339ebcbb9d1f838f2d5461e5cd92489a686447d0cd69784434b4`;
the shipped workbench bundle is
`220fffacf7f4d666b992bbeea3587592a8c5712f82ff467ec805bda41c393ad8`.
Both empty search responses have SHA-256
`c37a8432dcde93cc295c25e6d46a59090d142d1fb56e250d13e79debc659ff38`.

The concrete next step requires an explicitly authorized operator to send the
prepared nomination, followed by GitHub's curation decision. After acceptance,
verify the actual feed/listing and native discovery, then the dedicated synthetic QA
OAuth/query/preview journey. The completed public API read needs no user-input
gate, and does not clear those separate publication and host-verification gates.

## Nomination sent — 2026-10-23 UTC

The documented one-off partnerships intake receives the actual sent request;
Gmail reports Message sent and the matching message is visible in Sent at
20:30 UTC. The public-safe receipt preserves recipient, subject, canonical
identity, sending evidence and its limits without private sender/mailbox IDs.
Earlier dated unsent statements describe the preparation history.

Immediately before sending, the official registry is active at version 1.0.0
and the canonical-identity query of the public default gallery API returns zero
records. Those are separate observations from review state and native client
rendering. The operator/sending gate is now cleared; GitHub curation and the
existing VS Code native discovery/OAuth/query/preview ownership remain open.
Do not send another nomination while this one awaits response.

## Recipient intake acknowledged — 2026-10-24 UTC observation

The actual nomination conversation now includes an automated reply from
`partnerships@github.com` with subject **[Request received] Beancount.io hosted
MCP — GitHub MCP Registry inclusion**. Its displayed send time is2026-10-23
20:30UTC. Gmail's expanded details show reply-to `partnerships@github.com`,
mailed-by `github.com` and signed-by `github.com`. The message confirms intake
received the request and that the team will review/respond.

This clears uncertainty over automated intake receipt, not human review,
eligibility, curation acceptance or public publication. No substantive feedback
is present in this observed reply. The [receipt](./nomination-receipt.json)
records the new observation while omitting the private support-ticket number,
mailbox/thread URL and publisher account details. No reply or duplicate
nomination was sent. Continue monitoring this existing request; actual GitHub/
VS Code public/native verification remains w6/m9/t006.

## Curator approval verified — 2026-10-24T20:10:06Z

Refreshing the **existing nomination conversation** exposes a new substantive
GitHub reply, received **2026-10-24T03:54Z** (October23,20:54 PDT; minute
precision). The expanded details show from/reply-to partnerships@github.com,
mailed-by github.com and signed-by github.com. GitHub confirms that Beancount.io
has been reviewed and approved for inclusion. Their team will add the server;
they ask for up to **3 business days** for it to appear and request no further
action from the submitter. No reply or repeated nomination is sent.

Actual public default-gallery API checks at20:10UTC still returnHTTP200 with
zero records for both beancount and io.beancount/beancount. The
[receipt](./nomination-receipt.json) retains exact query URLs/counts and approval
metadata, omitting the private support-ticket number, mailbox/thread URL and
publisher account details. This is **approved, pending public publication**.
The original sent/intake history above is preserved; its earlier no-feedback
limits are superseded by this reply.

Next verify public GitHub/VS Code discovery during the stated publication
window, then the actual native gallery-install/OAuth/query/preview journey under
w6/m9/t006 and existing w1/m34 ownership. No native discovery or connection is
inferred from approval or anonymous API absence.

## Public gallery follow-up — 2026-10-26T07:33:01Z

The public default gallery API name and canonical-identity searches both return
HTTP200 and zero records. [Exact requests, times and response hashes](../directories/review-followup-20261026.json)
retain this limited observation: these are two searches, not a fresh full-feed
scan or native IDE test. The authenticated curator approval receivedOct24 remains
valid; publication/native installation is still unverified. No new email,
nomination or scope request was sent. Follow actual publication/feedback, or the
recorded2026-10-29UTC manual check after the stated up-to3-business-day window.
