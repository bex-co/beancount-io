# Beancount.io hosted MCP connector

Canonical official registry identity: `io.beancount/beancount`.
Hosted endpoint: https://beancount.io/api-gateway/mcp
Source: https://github.com/bex-co/beancount-io
Connection guide: https://github.com/bex-co/beancount-io/blob/main/backend-cluster/backend-v2/docs/mcp.md

Install this MCP-only plugin, then authenticate through the client’s OAuth flow using a Beancount.io account. Choose the ledger access to grant. After authorization, ask the client to list your ledgers and run a read-only query against a synthetic QA ledger; preview proposed writes with dry_run before a separately authorized commit.

The configuration uses the server URL and OAuth discovery. It contains no API token, client secret, automatic tool approval, or local server process.

## Submission receipt — 2026-10-21 UTC

The manual form accepted the MCP-only submission. Its [Beancount.io result](https://cursor.directory/plugins/beancountio), observed at 21:51 UTC, states “Scanning your plugin…” and “This plugin is unpublished and hidden from the directory.” This is an accepted submission awaiting the platform security scan, not a public listing or a verified marketplace installation. Keep this receipt; do not resubmit while it is pending.

The submitted name is Beancount.io; homepage and repository are the canonical URLs above. Keywords are beancount, accounting, bookkeeping, mcp and oauth. The single MCP component is named `beancount`; its configuration is:

```json
{"mcpServers":{"beancount":{"url":"https://beancount.io/api-gateway/mcp"}}}
```

The result renders the intended per-server URL exactly. There is no command, args, environment credential, bundled skill or automatic approval. The form displayed no fee or agreement acceptance control, and the existing signed-in identity required no new access grant. The separate official Cursor application remains unsent pending Publisher Terms approval.

Before submission, the live catalog search for `beancount` exposed 50 links and no matching canonical identity, endpoint or repository. That bounded search is not an exhaustive absence claim. After the security scan, verify the public listing and native discovery-to-install path separately; reuse the scoped native-agent rehearsal only within its documented limits.

## Scan and native install follow-through — 2026-10-21 UTC

By 21:54 UTC the listing has removed both scan/hidden banners and exposes **Add to Cursor**. At 21:55 UTC, **Plugins → New** displays Beancount.io as its first entry, linking to `/plugins/beancountio`. The typed `beancount` search still returns 50 unrelated links without that entry; name-search indexing is not proven. A separate anonymous HTTP read returns 429 and the web reader cannot retrieve the URL, so anonymous HTML availability is not claimed from those failed checks.

The observed install link decodes to name `beancount` and exactly `{"url":"https://beancount.io/api-gateway/mcp"}`. Following it opens official Cursor IDE 3.24.18's native Remote HTTPS review with that URL and empty optional headers/client credentials. Install succeeds; the UI lists the User entry and then **Needs authentication**. The running workbench uses the fresh `w6cu` user-data and extensions directories, but this MCP setting is written to the shared User file `~/.cursor/mcp.json`; it is not workspace-local configuration. The resulting file contains only the expected URL-only `beancount` entry and no other server entry.

Native Authenticate reaches a fresh consent page identifying Cursor and a `www.cursor.com` return destination. It requests identity, offline access, ledger read/write and ledger administration. Only the dedicated synthetic QA ledger is selected; no grant is approved. This client request differs from the earlier narrowly scoped native-Agent companion rehearsal. At this earlier snapshot the new grant still needed action-time approval; the later approved run below supersedes that gate and the operator requests retention. No authenticated native IDE tool discovery, accounting query, dry-run preview or agent conversation is claimed here; the separate official desktop account sign-in page later reports All set, but the native account state remains unconfirmed. The unapproved MCP authorization wait times out after two minutes; renew it only after the exact access decision.

The private browser and native snapshots, screenshots, the decoded-link proof and the failed anonymous-read record were local scratch and are not kept in the repository. Preserve the accepted listing; the later approved native journey below retains its User entry and authorization at the operator's request. Do not replace the earlier pending-scan receipt or conflate community publication with the unsent official Cursor application.

## Approved native journey — 2026-10-22 UTC

The operator approves the exact native identity/offline/read/write/admin grant for only the synthetic QA ledger and explicitly requests no revocation after testing. The [completed desktop rehearsal](../native-desktop-rehearsal-20261022.md) verifies native account sign-in/onboarding, callback completion, 44 tools/8 resources, the actual Cash query, one balanced `dry_run: true` preview and a zero-row preview-payee check. Cash remains 49.75 USD before/after; native checks report OK. The connector and authorization remain installed. Structured commit/count equality and a literal `wrote` array are not visible in this host and are not claimed. This native QA gate is cleared; the official publisher agreement/review remains separate. A fresh typed `beancount` community search now returns the canonical entry at observed rank17, and clicking it resolves to the live listing with Add to Cursor and no scan/hidden banner. The earlier name-indexing gap is cleared.
