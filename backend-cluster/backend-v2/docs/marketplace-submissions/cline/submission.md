# [Server Submission]: Beancount.io hosted MCP

## GitHub Repository URL

https://github.com/bex-co/beancount-io/tree/main/backend-cluster/backend-v2

Setup README for this remote connector:
https://github.com/bex-co/beancount-io/blob/main/backend-cluster/backend-v2/docs/marketplace-submissions/cline/README.md

## Logo Image

https://raw.githubusercontent.com/bex-co/beancount-io/main/backend-cluster/backend-v2/docs/marketplace-submissions/cline/logo-400.png

## Installation Testing

- [x] I have tested that Cline can successfully set up this server using only the README.md and/or llms-install.md file
- [x] The server is stable and ready for public use

Installation was tested with the official Cline CLI3.0.73 native MCP add
wizard and browser OAuth, following the linked README. The operator completes
browser consent; an actual Cline Agent session then reads the README and runs
native read tools with automatic approval disabled. The public Cline SDK/core
0.0.95, using the same isolated OAuth settings/native transport, separately
verifies discovery and a dry-run preview. These are bounded actual checks,
not a claim that an Agent autonomously performed browser sign-in or that a
fresh authenticated VS Code extension journey was tested.

## Additional Information

Beancount.io exposes one existing hosted endpoint:
`https://beancount.io/api-gateway/mcp`, Streamable HTTP with OAuth. It queries and
edits hosted Beancount ledgers, including BQL, reports, files and bank imports.
It does not read local ledger files. Canonical official registry identity:
`io.beancount/beancount`; the official record and authorization guide are linked
from the setup README. Users approve their own ledger permissions. Use a
dedicated QA account and synthetic ledger for review; credentials are supplied
only through the platform's supported private channel if requested.

Validated on2026-10-24 UTC:

- Official CLI browser OAuth completes for only the synthetic QA ledger.
  Native default scopes: `openid offline_access ledger.read ledger.write ledger.admin`;
  individual scope switches are not offered by this client.
- Native public SDK discovers44tools and completes ledger/file/BQL reads.
- One `appendLedgerText` call with `dry_run: true`, `allowInvalid: false`
  returns no writes or new validation errors. Ledger commit/counts/file bytes
  are unchanged; Cash49.75USD and preview-payee0rows before/after.
- The actual Cline Agent reads the README and confirms zero errors/Cash49.75USD
  through native read tools. No model-driven accounting writes are approved.
- Fresh all-states issue search and all203public catalog entries (149MCP
  servers) contain no canonical match. The icon is verified400×400PNG.

[Exact native rehearsal and limits](https://github.com/bex-co/beancount-io/blob/main/backend-cluster/backend-v2/docs/marketplace-submissions/cline/native-rehearsal-20261024.md).
The deployed service does not expose a deployment revision in these responses.
Please review as the existing hosted OAuth connector; no local server process,
new dependency, API-key copy or credential embedded in this issue is required.
Review acceptance and public Marketplace availability remain unverified.
