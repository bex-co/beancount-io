# Cursor marketplace preparation

This package contains one hosted MCP connection with URL-based OAuth discovery.
`official/` follows Cursor's `.cursor-plugin/plugin.json` and `mcp.json` format;
`directory/` supplies the separate `.mcp.json` detected by cursor.directory.
Neither package contains skills, a local server, API keys or automatic approvals.
The canonical registry identity remains `io.beancount/beancount`.

Checked 2026-10-21 UTC against the [official plugin reference](https://prod.cursor.com/docs/reference/plugins), [official template](https://github.com/cursor/plugin-template) and [community submission instructions](https://github.com/cursor/community-plugins#submit-a-plugin).
The repository-root `.cursor-plugin/marketplace.json` indexes the nested official
package using Cursor's supported multi-plugin layout. The unmodified official
template validator passes against both a fresh fixture and this repository; its
only warning is the absence of hooks, which this MCP-only package does not use.
The index contains one MCP-only plugin and does not publish the development or
customer skill trees. Format validation does not establish marketplace acceptance.

## Current official review/public check — 2026-10-28 UTC

The actual official gallery's search field is filled with beancount and shows
**No results found**. The publish URL displays its generic application form;
it exposes no existing private review status. A bounded seven-day vendor-mail
search identifies no relevant directory feedback. These observations do not
replace the accepted Oct24receipt or constitute rejection. [Current evidence](./review-followup-20261028.json)
records the exact controls and limits. No form, agreement, grant or native
rehearsal is repeated. Next: real feedback/publication, otherwise manualOct31UTC;
then verify the official advertised install path independently of cursor.directory.

## Separate publication records

| Destination | State / next action |
| --- | --- |
| [Official Cursor](https://cursor.com/marketplace/publish) | Submitted on 2026-10-24T00:36:38Z after the publisher's explicit final agreement confirmation. The actual page displays Thanks for applying and confirms receipt; [public-safe receipt](./submission-receipt.json). No application ID or specific management URL is exposed. Vendor review/publication remains pending; do not resubmit. |
| [cursor.directory](https://cursor.directory/plugins/new?type=mcp_server) | The [Beancount.io listing](https://cursor.directory/plugins/beancountio) clears its scan/hidden banners by 21:54 UTC and appears first under the directory’s New sort. Add to Cursor opens the correct native review and installs the URL-only User entry; the newly approved native OAuth and [desktop query/preview](./native-desktop-rehearsal-20261022.md) now pass, with precise host visibility limits. [Dated receipt and limits](./directory/README.md#scan-and-native-install-follow-through--2026-10-21-utc). No duplicate submission or data PR is needed. |

Cursor IDE 3.24.18 is now installed from the official vendor download after disk
image, code-signature and Gatekeeper checks. Its separate, fresh QA profile opens
the workbench and accepts the actual community install link. The [native desktop Agents conversation](./native-desktop-rehearsal-20261022.md) completes the synthetic query/preview; w1/m34/t003 retains its combined VS Code/fallback-port acceptance.

The native Cursor Agent companion loaded the actual local plugin, completed
OAuth and performed a synthetic query plus one `dry_run: true` preview against
the canonical endpoint. The [dated rehearsal](./native-rehearsal-20261021.md)
records the client versions, scope narrowing, observed results and verification
limits. This is local native-agent compatibility evidence, not a marketplace
installation or publication receipt. Keep account identifiers and credentials
outside these public files.

## Official submission accepted — 2026-10-24T00:36:38Z

The publisher explicitly confirms the actual displayed terms/submission action.
The worker clicks Submit Application once and the real form replaces the fields
with **Thanks for applying** and **We've received your submission**. The live
receipt is retained; it exposes no application ID or dedicated management URL.
[submission-receipt.json](./submission-receipt.json) records public-safe evidence.
This clears the finite submission/receipt task. Vendor review, approval and
official marketplace availability remain unverified under the original gallery
verification tasks. The separate community listing and retained native QA grant
are preserved; no second application is submitted.
