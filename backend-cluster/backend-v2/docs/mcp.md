# Beancount.io MCP guide

[Beancount.io](https://beancount.io/) exposes a remote Model Context Protocol (MCP) server that lets an
agent query a ledger, read and edit its files, fetch reports, and work with linked
banks. It runs inside `backend-v2` at **`/api-gateway/mcp`**. The agent connects to
a Beancount.io deployment; this endpoint does not open a local `.bean` file on
the agent's machine.

This guide describes the implementation in this repository, reviewed on
2026-09-16. It explains the surface rather than counting it: `tools/list` and
`resources/templates/list` are the inventory, and they are what your deployment
actually serves. A number written down here only says when someone last looked.
This document is not a production availability check.

## Connect a client

Use a client that supports **Streamable HTTP**. For a deployment at
`https://books.example.com`, the endpoint is:

```text
https://books.example.com/api-gateway/mcp
```

The shorter `/mcp` path is not registered by the backend. Choose one of the two
credential flows below. A credential may be pinned to a single ledger,
identified as `owner/name` (for example `alice/books`), or left unpinned;
an unpinned credential selects its ledger per call with `ledger: "owner/name"`
on tools and with the `{owner}/{name}` components of resource URIs.

### Personal API key

1. Sign in to your deployment and open `/settings/api-keys` (Personal access
   tokens). Creating a key requires a paid plan.
2. Give the key a name, select `ledger.read` to start with queries and reports,
   and optionally fill **Ledger restriction (optional)** with `alice/books`.
   A pinned key defaults every call to that ledger and cannot widen past it; an
   unpinned key works too, but must then select `ledger: "owner/name"` on each
   ledger tool call and name the ledger in resource URIs.
3. Copy the plaintext key when it is shown. Only its digest and display prefix
   are stored, so the plaintext cannot be retrieved later.
4. Add the endpoint and bearer header to your MCP client's private configuration.

For clients accepting the `mcpServers` JSON format:

```json
{
  "mcpServers": {
    "beancount": {
      "type": "http",
      "url": "https://books.example.com/api-gateway/mcp",
      "headers": {
        "Authorization": "Bearer bcio_replace_with_your_ledger_scoped_key"
      }
    }
  }
}
```

Configuration syntax varies by client; the URL, transport, and HTTP header are
the parts to preserve. Keep the real key out of committed configuration files.

An API key can also be created through `POST /api-gateway/v1/api-keys` using an
authorized browser session or an API-audience OAuth credential with admin
capability. The request body includes `name`, `scopes`, and
`ledgerScope: "alice/books"`; `expiresAt` is optional. See the
[key schemas](../src/features/apikeys/api/api-key-schemas.ts). An API key cannot
create another API key.

MCP itself has no key-management tool. Creating, listing, and revoking keys
happens in the dashboard, the CLI, REST, or GraphQL. The connector directories
forbid an app to handle access credentials, and a key minted through a
connector would outlive revoking that connector
([ADR 019](../../../docs/adrs/ADR019-backend-v2-mcp-host-compatibility.md#amendments),
2026-10-09).

### OAuth

For clients supporting OAuth discovery, configure the same MCP URL and start the
client's authorization flow:

1. An unauthenticated MCP request receives `401` and a `WWW-Authenticate` header
   pointing to `{issuer}/.well-known/oauth-protected-resource`.
2. That document identifies the MCP resource and authorization server. The
   client discovers the authorization, registration, and token endpoints.
3. The client identifies itself — by the URL of a published client metadata
   document (CIMD) when it supports one, as Claude, Claude Code, ChatGPT, and
   VS Code do, or by dynamic client registration otherwise — then requests
   scopes in authorization code flow with PKCE. In the browser, sign in and review the
   request on `/oauth/consent`: the page shows where you will be returned, the
   name the app gave itself, the domain publishing its metadata when it used
   CIMD, and a warning when the app only returns to your own computer. Select
   one ledger or explicitly choose **All accessible ledgers**, then approve. The
   client chooses the requested scopes; the page displays them and lets you
   approve or cancel.
4. The client exchanges the code and sends the access token as a bearer on
   subsequent MCP requests. Clients requesting `offline_access` can use refresh
   tokens to obtain new access tokens.

A client that requests `offline_access` gets a refresh token whether or not it
also sends `prompt=consent`, because a third-party app always sees the consent
page. Some clients, such as MCP Python SDK 1.x hosts, leave that prompt out.

A connection lasts while it is used. Access tokens expire after an hour; a
refresh token lasts 45 days and is replaced on every refresh, so a client that
refreshes at least every 45 days — a monthly close is enough — stays connected
without asking you again. A connection is re-approved once a year: one year
after you consented, the client sends you back to `/oauth/consent`. Unused for
45 days, it does the same sooner. Revoking the connection stops it refreshing
at once; an access token already issued still runs out its hour.
The full lifetime table is in the backend
[README](../README.md#session-lifetimes).

This discovery sequence follows the
[MCP authorization specification](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization).
Beancount's provider implements it in
[`oidc-route.ts`](../src/features/oauth/api/oidc-route.ts).

The OAuth resource/audience must be **`{issuer}/api-gateway/mcp`**, and a ledger-restricted token
carries its selected `ledger_id`. Application API/mobile tokens targeting
`{issuer}/v1` do not authenticate to MCP. A browser session token or cookie also
does not authenticate to MCP, even though a browser session is used to approve
the OAuth grant.

A refresh request that omits `resource` retains the API audience already
authorized in its refresh grant, including when `openid` is present. It also
retains the approved ledger boundary and cannot increase scopes. An explicit
resource still undergoes the same audience checks. This supports released hosts
such as Docker Gateway, whose refresh request omits the parameter; it does not
change authorization-code exchanges or identity-only clients.

The reverse holds too: an MCP token does not authenticate to REST or GraphQL.
Sent there, it is refused with `UNAUTHENTICATED` "This token was issued for the
MCP endpoint (`/api-gateway/mcp`) and is not accepted here", so a client knows
to switch credentials rather than resend it. Any other credential header that
does not resolve (expired, revoked, malformed, another resource's) is refused as
"not accepted", not as missing. This includes the reads a public ledger serves
without a credential: on a private ledger, a request that sent no credential is
asked for one ("Authentication required"), and a request whose credential was
refused is told so.

### Per-host notes

Each host below has a fixture in
[`oidc-route.test.ts`](../src/features/oauth/api/__tests__/oidc-route.test.ts).
The fixture registers the host the way the host documents, then authorizes
with the redirect the host really uses. A host without a fixture is not called
supported here
([ADR 019](../../../docs/adrs/ADR019-backend-v2-mcp-host-compatibility.md) D8).
Claude Code signed in for real against `https://beancount.io` through its
CIMD document on 2026-10-08. On 2026-10-16, OpenClaw 2026.10.4 (through
dynamic registration) and Hermes Agent v0.22.2 (through its CIMD document)
each signed in, read the ledger, and previewed a write with `dry_run`. The
Cursor desktop 3.24.18 community connection completed native OAuth, a synthetic
balance query and a dry-run preview on 2026-10-22. Its
[dated desktop record](./marketplace-submissions/cursor/native-desktop-rehearsal-20261022.md)
preserves the approved grant's retention and native-card visibility limits.
The VS Code gallery installation completed a synthetic read and dry-run preview
with an existing signed-in account on 2026-10-29. A fresh sign-in with the
default callback port occupied remains unverified. See the
[VS Code native acceptance record](./marketplace-submissions/github/native-accounting-acceptance-20261029.json).

| Host                                | Identifies itself by                                            | Redirect the fixture authorizes with                                                                                  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Claude (claude.ai, Desktop, mobile) | CIMD; the fixture covers its DCR fallback                       | `https://claude.ai/api/mcp/auth_callback`                                                                             | Add the endpoint as a custom connector.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Claude Code                         | Its CIMD document, or DCR                                       | Loopback on an ephemeral port                                                                                         | `claude mcp add --transport http beancount <endpoint>`, then sign in from `/mcp`.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ChatGPT                             | CIMD; DCR otherwise                                             | `https://chatgpt.com/connector_platform_oauth_redirect`                                                               | Calls tools only. Every id a tool argument needs is returned by another tool. ChatGPT cannot send an API key.                                                                                                                                                                                                                                                                                                                                                                                                            |
| Cursor                              | DCR, with no `application_type`                                 | `cursor://anysphere.cursor-mcp/oauth/callback` (also registers `localhost:8787` and `www.cursor.com`)                 | Add the endpoint as a remote server in `mcp.json`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| GitHub Copilot in VS Code           | CIMD, or DCR with no `application_type`                         | `http://127.0.0.1:33418/`, or any loopback port when 33418 is busy                                                    | Add the endpoint as an `http` server in `mcp.json`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| OpenClaw                            | DCR, with no `application_type`                                 | `http://127.0.0.1:8989/oauth/callback`; a per-requester gateway uses `https://<its public origin>/oauth/mcp/callback` | `openclaw mcp add beancount --url https://beancount.io/api-gateway/mcp --transport streamable-http --auth oauth`, then `openclaw mcp login beancount`. Keep `--transport`: without it OpenClaw uses SSE. Resources and prompts arrive as `beancount__resources_*` and `beancount__prompts_*` tools.                                                                                                                                                                                                                      |
| Hermes Agent                        | Its CIMD document (`nousresearch.github.io`); DCR as a fallback | `http://127.0.0.1:27890/callback`, or the next of ports 27890–27894                                                   | Under `mcp_servers` in `~/.hermes/config.yaml`, add `beancount` with `url: https://beancount.io/api-gateway/mcp` and `auth: oauth`, then run `hermes mcp login beancount` in a terminal. Resources and prompts arrive through `list_resources`, `read_resource`, `list_prompts`, and `get_prompt`. `--flow device` is not supported; on a headless machine, paste the redirect URL back at the login prompt. Install Hermes with its own installer: the older PyPI package has no MCP support without the `[mcp]` extra. |

A host that registers through DCR without stating `application_type` is
treated as a native app. That is what lets custom-scheme and loopback
redirects such as Cursor's and VS Code's register. GitHub Copilot's cloud
agent does not support OAuth for remote servers, so use a personal API key in
a header there.

### From the MCP Registry

Beancount.io publishes the hosted endpoint to the official MCP Registry
(`registry.modelcontextprotocol.io`) as **`io.beancount/beancount`** (see
[Publishing the registry listing](#publishing-the-registry-listing)). Clients,
subregistries, and aggregators may import that record on their own schedules.
The [marketplace inventory and submission packet](./mcp-marketplaces.md) tracks
actual directory records and external review gates separately; registry
publication does not establish gallery inclusion.
The entry names `https://beancount.io/api-gateway/mcp` and nothing else:
no header and no package, so a client that installs it meets the same `401` and
discovery chain as one configured by hand, and signs in with the OAuth flow
above. Claude Code and Codex do not browse the registry; configure them with the
URL as described earlier in this section.

You can connect directly while a directory listing is under review or has
outdated instructions. In a client that supports remote MCP over HTTP and OAuth,
add `https://beancount.io/api-gateway/mcp` as an HTTP server and sign in when
prompted. In VS Code, run **MCP: Add Server** and choose **HTTP**. On LobeHub,
choose **Connect via HTTP**. The listing's **Manual stdio** option points to
`bea init`, which creates a local ledger.

A self-hosted deployment is not in the listing; configure its URL by hand.

To inspect the published entry:

```bash
curl -fsS "https://registry.modelcontextprotocol.io/v0.1/servers/io.beancount%2Fbeancount/versions/latest" \
  | jq '{_meta, server: (.server | {name, version, remotes})}'
```

## The agent happy path

Five calls cover almost every session. Each links to the section that defines it.

1. **Read.** `listLedgers`, then `getLedgerContext` for the open accounts,
   currencies and payees, then `listLedgerEntries` (or `runBqlQuery`) for the
   entries you need. Every entry carries an `entry_hash`.
2. **Preview.** Send the write you intend with `dry_run: true`, for example
   `addLedgerEntries` with `{"entries": [...], "dry_run": true}`. Approve it only
   when the result says `valid: true` ([the preview rule](#the-preview-rule)).
3. **Commit.** Send the identical call with `dry_run: false`, then call
   `checkLedger` to confirm the ledger is still clean.
4. **Retry safely.** Add a new `requestId` to an entry write. If the reply is
   lost, resend the same call with the same id: the first result comes back and
   nothing is written twice
   ([retry-safe entry writes](#retry-safe-entry-writes-requestid)).
5. **Edit one entry.** Take its `entry_hash` from `listLedgerEntries`, read
   `getEntryContext` for the current `sha256sum`, and send both with
   `updateEntrySource` or `deleteEntrySource`. A `CONFLICT` means the entry
   changed since you read it: read it again and resend. When its hint says to
   send the same call again, other writes kept landing first; resend it as is
   ([failure codes](#failure-codes)).

## Permissions and ledger boundaries

The current implementation computes cumulative capabilities from the grant:

| Scope          | Capability                                                                        |
| -------------- | --------------------------------------------------------------------------------- |
| `ledger.read`  | Query and read ledger content.                                                    |
| `ledger.write` | Read plus ordinary writes, including file edits and bank imports.                 |
| `ledger.admin` | Read, write, and administrative operations, including bank-connection management. |

These are credential ceilings. The protected service also checks the caller's
current relationship to the ledger or other target. Bank access, for example,
requires the ledger's administrator relationship even for bank reads. Possessing
a scope does not grant ownership or collaborator access. The capability rules
live in [`identity.ts`](../src/server/api/identity.ts); final decisions live in
the [authorization service](../src/server/api/authorization/authorization-service.ts).

Ledger tools accept an optional `ledger` argument (`owner/name`). A pinned
credential defaults to its pin and cannot select another ledger. An unpinned
credential must select a ledger explicitly. A ledger is spelled exactly
`owner/name`: one `/`, no spaces and no URL characters. The owner is
case-insensitive (`Alice/books` is `alice/books`) and the name is
lowercase-only. A value that breaks the spelling is `BAD_USER_INPUT` naming the
slug rule it failed, the same on every surface; `Select a ledger using ledger:
owner/name` means no ledger was named at all. Resource URIs select the ledger
with `owner/name` under the same restriction. Account tools need no ledger —
except creation: `createLedger` is refused with `FORBIDDEN` for a pinned
credential, because a created ledger would land outside the pin, where the
creating credential could never see, use, or delete it.
The OAuth consent page offers a single-ledger restriction or explicit account-wide
access, including ledgers accessible in the future and account operations allowed
by the requested scopes. Neither choice is selected automatically. Account-wide
approval works before creating a ledger; choosing to create the first ledger
returns to the same interaction. The backend rejects an omitted choice or a
combined ledger pin and account-wide choice. Refresh preserves the chosen
restriction and the MCP audience.

The registry lists all tools regardless of the caller's permissions; discovery
is not proof that a call is authorized. Identity is resolved for each HTTP
request, and protected services authorize each operation. Revoked API keys and
removed ledger access are checked on subsequent requests. OAuth access tokens
are validated as signed JWTs; revoking a refresh token does not immediately
invalidate an already issued access token. Access tokens normally last one hour.

## How a request reaches the ledger

```text
MCP client
  -> POST /api-gateway/mcp
  -> resolveIdentity (optional ledger pin)
  -> per-request McpServer and StreamableHTTPServerTransport
  -> registered tool or resource handler
  -> rate limiter + operation classification
  -> protected application service + authorization decision
  -> ledger service / repository / bank provider
  -> MCP result
```

[`mcp-route.ts`](../src/features/ai-agent/api/mcp-route.ts) builds the request's
`ToolContext` with its identity, ledger ID, and application services. The
[composition root](../src/server/api/composition-root.ts) registers the tools and
resources from feature descriptors and wraps their handlers with the common
operation gate.

For example, `runBqlQuery` calls `LedgerShellService.queryShellText`, which
authorizes the caller and delegates through the ledger API client.
`readLedgerFiles` and the `…LedgerFiles` write tools use `LedgerRepoService`. GraphQL and REST
use these same services. MCP is an adapter to those capabilities; the client's
agent decides which calls to make.

Each request gets a fresh server and transport, with
`sessionIdGenerator: undefined`, and the server is closed after handling it.
There is no persistent MCP session ID, standalone GET stream, or resource
subscription channel. Authenticated non-POST requests (`GET`, `DELETE`,
`OPTIONS`, `PUT`, `PATCH`) return `405` with `Allow: POST`. POST responses can still use SSE framing.
This is compatible with the optional GET stream in the
[Streamable HTTP specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports).

## Tools

Call `tools/list` for the deployed input and output schemas. Arguments below are
the principal inputs; inspect the schema before constructing a call.

| Tool                            | Inputs and behavior                                                                                                                                                                                                                                                                                                                                                                                                       | Capability         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `runBqlQuery`                   | `{ "query": "BALANCES" }`; returns formatted query output as a string, cut at 1,000 rows or 100 KB with a closing `[truncated: …]` line.                                                                                                                                                                                                                                                                                  | Read               |
| `runBqlQueryStructured`         | `{ "query": "BALANCES" }`; returns column metadata (`dtype` labels) and rows, or a structured text result, matching REST JSON and GraphQL `queryShell`.                                                                                                                                                                                                                                                                   | Read               |
| `listLedgers`                   | Optional `page`, `limit` (at most 100); omit both for every ledger. A pinned credential returns its one ledger. Start here, then `getLedgerContext`.                                                                                                                                                                                                                                                                      | Read               |
| `checkLedger`                   | `{}`; bean-check errors with file and line, entry counts, and the latest commit, in one call. Call after any write.                                                                                                                                                                                                                                                                                                       | Read               |
| `getLedgerContext`              | Optional `payeeLimit`; attributes, open accounts, currencies, payees, years, and source files with counts.                                                                                                                                                                                                                                                                                                                | Read               |
| `listLedgerEntries`             | Optional `account`, `filter`, `time`, `directiveTypes`, `transactionSubtypes`, `documentSubtypes`, `customSubtypes`, `limit`, `offset`; journal entries with the `entry_hash` other tools take. `include_source` adds each entry's `source` (`path`, `lineno`, `text`, `sha256sum`, the text and checksum `getEntryContext` returns), or `null` for a copy or a managed price line; at most 200 entries per page with it. | Read               |
| `getEntryContext`               | `entryHash` or `entry_hash` from `listLedgerEntries`; the source context around one entry — read before editing it. `generated_from` names the source of a plugin or pad copy. `not_booked: true` marks a transaction the ledger could not book; no balance counts it.                                                                                                                                                    | Read               |
| `listLedgerFiles`               | Optional `dir_path`; lists one directory level, directories first. A trailing `/` is ignored, so `Reports/` lists `Reports`. A `dir_path` that does not exist, or names a file, is `NOT_FOUND`.                                                                                                                                                                                                                                                                                     | Read               |
| `readLedgerFiles`               | `files: [{ path, start_line?, end_line? }]`; returns text and line-range metadata.                                                                                                                                                                                                                                                                                                                                        | Read               |
| `appendLedgerText`              | `text`, optional `path`, `dry_run`, `allowInvalid`, `requestId`; appends Beancount directive text, routed by type and date and inserted in date order.                                                                                                                                                                                                                                                                    | Write              |
| `addLedgerEntries`              | `entries: [{type, entry}]`, optional `dry_run`, `allowInvalid`, `requestId`; appends structured directives, routed by type and date. A preview returns the per-file entry text. `custom`/`query`/`option`/`plugin` have no typed form — add them as raw text.                                                                                                                                                             | Write              |
| `refreshManagedPrices`          | Optional `ledger`; re-fetches every managed price include (`include "https://beancount.io/prices/BTC-USD"`) now and returns each source's status. Never edits the ledger.                                                                                                                                                                                                                                                 | Write              |
| `createLedgerFiles`             | `description` or `message`, `files: [{ path, content }]`, optional `dry_run`; creates new files in one commit.                                                                                                                                                                                                                                                                                                            | Write              |
| `updateLedgerFiles`             | `description` or `message`, `files: [{ path, old_string, new_string } \| { path, content }]`, optional `dry_run`; replaces exact text or whole files in one commit.                                                                                                                                                                                                                                                       | Write              |
| `deleteLedgerFiles`             | `description` or `message`, `files: [{ path }]`, optional `dry_run`; deletes files in one commit.                                                                                                                                                                                                                                                                                                                         | Write              |
| `updateEntrySource`             | `entryHash`, `sha256sum`, `newContent`, optional `dry_run`; replaces one entry's source. A preview returns the stored replacement.                                                                                                                                                                                                                                                                                        | Write              |
| `deleteEntrySource`             | `entryHash`, `sha256sum`, optional `dry_run`; deletes one entry's source.                                                                                                                                                                                                                                                                                                                                                 | Write              |
| `deleteEntrySources`            | `entries: [{entryHash, sha256sum}]`, optional `dry_run`; deletes entries' source in one commit.                                                                                                                                                                                                                                                                                                                           | Write              |
| `moveEntrySources`              | `entries: [{entryHash, sha256sum}]`, `toPath`, optional `includeFrom`, `allowInvalid`, `dry_run`; moves entries' source text into another file in one commit, adding its include to `includeFrom` when the ledger does not load it yet. A preview returns each moved entry's text and reports the same `validation` the commit will.                                                                                      | Write              |
| `renameAccount`                 | `from`, `to`, optional `allowInvalid`, `dry_run`; renames an account and every account under it across the loaded files in one commit, and moves the bank mappings that name it. A preview lists every changed line and mapping and reports the same `validation` the commit will.                                                                                                                                        | Write              |
| `renameLedgerFile`              | `oldPath`, `newPath`, optional `message`, `updateIncludes`, `dry_run`; moves a file, rewriting includes. A preview names the move plus the rewritten include lines and reports the same `validation` the commit will.                                                                                                                                                                                                     | Write              |
| `revertCommit`                  | `sha` (a commit from the `commit` of a write result, or `main` for the latest), optional `message`, `dry_run`; undoes one commit as a new commit, setting each file it touched back to its parent's contents, and moves back the bank mappings a `renameAccount` commit moved. A preview lists the files and mappings and reports `validation`. Refused with `CONFLICT` when a later commit changed any of them.          | Write              |
| `syncBankTransactions`          | `itemId`, optional `dry_run`; pulls new transactions from a linked bank into staging.                                                                                                                                                                                                                                                                                                                                     | Write              |
| `importStagedBankTransactions`  | `transactions: [{ transactionId, targetAccount, sourceAccount? }]`, optional `filename`, `dry_run`; writes staged transactions into the ledger.                                                                                                                                                                                                                                                                           | Write              |
| `discardStagedBankTransactions` | `transactionIds`, optional `dry_run`; removes staged transactions.                                                                                                                                                                                                                                                                                                                                                        | Write              |
| `reconcileBankAccounts`         | `itemId`, optional `dry_run`; re-reads which accounts a bank shares and can delete ones it no longer shares.                                                                                                                                                                                                                                                                                                              | Admin              |
| `mapBankAccount`                | `accountId`, `ledgerAccount`; points a bank account at a ledger account.                                                                                                                                                                                                                                                                                                                                                  | Admin              |
| `setBankAccountCurrency`        | `accountId`, `currency`; sets a bank account's currency.                                                                                                                                                                                                                                                                                                                                                                  | Admin              |
| `refreshBankConnection`         | `itemId`; re-reads a connection's health.                                                                                                                                                                                                                                                                                                                                                                                 | Admin              |
| `unlinkBankConnection`          | `itemId`, optional `dry_run`; severs a linked bank.                                                                                                                                                                                                                                                                                                                                                                       | Admin              |
| `listBankConnections`           | `{}`; linked bank connections and their accounts (with mapping) — the `banks` and `bank-accounts` resources as a tool. Each row's own `id` is what the bank tools take as `itemId` or `accountId`; the rows' `itemId` and `accountId` fields are Plaid's.                                                                                                                                                                 | Admin              |
| `listStagedBankTransactions`    | Optional `accountId`, `page`, `limit` (at most 100); transactions staged for import, newest first, with the ids `importStagedBankTransactions` and `discardStagedBankTransactions` take — the `bank-transactions/unsynced` resource as a tool. Omit `page` and `limit` for every row (`page` alone reads pages of 30); after importing or discarding a page, read page 1 again.                                           | Read               |
| `updateLedger`                  | `name`, `description`, `private`, optional `dry_run`; renames a ledger or changes its description or visibility. A preview returns the current→new diff, with a flip to public called out. Commits echo `dry_run: false`.                                                                                                                                                                                                 | Admin              |
| `deleteLedger`                  | Optional `dry_run`; permanently deletes a ledger, including its history and linked-bank cleanup. A preview returns the destroy summary — identity, emptiness, size, and warnings. Commits echo `dry_run: false`.                                                                                                                                                                                                          | Admin              |
| `setLedgerCollaborator`         | `collaborator`, optional `permission` (read, write, or admin; omitted uses the repository default), `dry_run`; grants or changes access. A preview returns the would-be grant, current→requested. Commits echo `dry_run: false`.                                                                                                                                                                                          | Admin              |
| `removeLedgerCollaborator`      | `collaborator`, optional `dry_run`; revokes access. A preview returns the would-be revocation. Commits echo `dry_run: false`.                                                                                                                                                                                                                                                                                             | Admin              |
| `leaveLedger`                   | Optional `dry_run`; removes the caller's own access. A preview returns the would-be self-removal. Commits echo `dry_run: false`.                                                                                                                                                                                                                                                                                          | Admin              |
| `setLedgerStar`                 | `starred`; stars or unstars a ledger for the caller. No `dry_run`: starring is an instantly reversible personal toggle, so there is nothing worth previewing.                                                                                                                                                                                                                                                             | Write              |
| `createLedger`                  | `name`, optional `description`, `private`, `template` or `setup`, `currency`, `requestId`; creates a ledger. See [ledger lifecycle](#ledger-lifecycle).                                                                                                                                                                                                                                                                   | Admin              |
| `previewLedgerSetup`            | `setup`; resolves a setup specification and bean-checks its files without creating anything. See [ledger lifecycle](#ledger-lifecycle).                                                                                                                                                                                                                                                                                   | Admin              |
| `createPullRequest`             | `title`, `description`, `clearCommitMessage`, `changes: [{ path, content }]`, optional `baseBranch` (default `main`); proposes the changes as a pull request. See [pull requests](#pull-requests).                                                                                                                                                                                                                        | Write              |
| `mergePullRequest`              | `prNumber`; merges an open pull request. See [pull requests](#pull-requests).                                                                                                                                                                                                                                                                                                                                             | Write              |
| `rejectPullRequest`             | `prNumber`; closes an open pull request without merging. See [pull requests](#pull-requests).                                                                                                                                                                                                                                                                                                                             | Write              |
| `generateTempAssetUploadUrl`    | Optional `filename`, `mimeType`; issues an upload URL and `objectKey` for a statement or receipt. See [temporary asset upload and download](#temporary-asset-upload-and-download).                                                                                                                                                                                                                                        | Read, write budget |
| `parseFile`                     | `objectKey`, `fileFormat`; extracts statement rows from an uploaded file. See [parse uploaded statements](#parse-uploaded-statements).                                                                                                                                                                                                                                                                                    | Read, write budget |
| `parseReceipt`                  | `objectKey`, optional `ledger`; extracts a receipt and recommends accounts. See [parse receipts and recommend accounts](#parse-receipts-and-recommend-accounts).                                                                                                                                                                                                                                                          | Read, write budget |
| `insertReceiptTransaction`      | `receiptObjectKey`, `input`, optional `requestId`; stores the receipt and writes its transaction. See [insert receipt transactions](#insert-receipt-transactions).                                                                                                                                                                                                                                                        | Write              |

Tools with their own sections rather than a row here: `createLedger` and
`previewLedgerSetup` (Ledger lifecycle), `createPullRequest`, `mergePullRequest`
and `rejectPullRequest` (Pull requests), `generateTempAssetUploadUrl`,
`parseFile`, `parseReceipt` and `insertReceiptTransaction` (the temporary asset,
statement and receipt sections).

The implementation is listed in
[`mcp-tools.ts`](../src/features/ai-agent/api/mcp-tools.ts).

`initialize` advertises `listChanged: false` for tools, resources and prompts:
the endpoint is POST-only and stateless, so it never pushes list-change
notifications — list again to see a change.

The three `list…` tools exist for hosts that call tools but never read
resources, such as ChatGPT and GitHub Copilot's cloud agent: every id a tool
takes is also returned by some tool
([ADR 019](../../../docs/adrs/ADR019-backend-v2-mcp-host-compatibility.md) D7).
Each `tools/list` entry also declares `securitySchemes` — OAuth 2 with the
scope its most privileged operation needs (`ledger.read`, `ledger.write`, or
`ledger.admin`) — top-level and mirrored in `_meta`, as OpenAI's Apps SDK
reads it to decide when to link an account (D2). The declarations are derived
from the authorization table, never written by hand. The scope is the one the
operation's credential check requires, not its rate budget: a
**Read, write budget** row above accepts a `ledger.read` grant and declares
`ledger.read`, while each call spends the write budget
([Results and failures](#results-and-failures)).
MCP has no API-key tool: keys are minted and revoked on REST and GraphQL
(ADR 019), so a credential cannot mint another through this endpoint.

### Write-flag spellings

Two flags appear on the write tools, and both spellings of each work
everywhere the flag exists, on MCP, REST, and GraphQL alike — a call
pasted from another surface need not be respelled. Passing both
spellings with two different values is refused with `BAD_USER_INPUT`
rather than guessed; omitting both leaves the flag off.

| Flag                  | MCP                                | REST                                                                      | GraphQL                            |
| --------------------- | ---------------------------------- | ------------------------------------------------------------------------- | ---------------------------------- |
| Preview               | `dry_run`, or `dryRun`             | bodies take `dryRun`, bank queries take `dry_run`; each accepts the other | `dryRun`, or `dry_run`             |
| Commit despite errors | `allowInvalid`, or `allow_invalid` | `allowInvalid`, or `allow_invalid`                                        | `allowInvalid`, or `allow_invalid` |

On REST the flag goes where the route reads it: the JSON body, or the query
on the bank writes. Sent in the other place, it is refused with
`VALIDATION_FAILED` rather than ignored.

The preview flag is offered on twenty-two listed tools: the twelve
ledger writes (`appendLedgerText`, `addLedgerEntries`,
`createLedgerFiles`, `updateLedgerFiles`, `deleteLedgerFiles`,
`updateEntrySource`, `deleteEntrySource`, `deleteEntrySources`,
`moveEntrySources`, `renameAccount`, `renameLedgerFile`,
`revertCommit`), the five bank tools that move state
(`syncBankTransactions`, `importStagedBankTransactions`,
`discardStagedBankTransactions`, `reconcileBankAccounts`,
`unlinkBankConnection`), and the five lifecycle mutations
(`updateLedger`, `deleteLedger`, `setLedgerCollaborator`,
`removeLedgerCollaborator`, `leaveLedger`).

### The preview rule

A preview never refuses for new bean-check errors; only the commit does.
The ten tools that project a write through bean-check and refuse its commit
(`appendLedgerText`, `addLedgerEntries`, `createLedgerFiles`,
`updateLedgerFiles`, `deleteLedgerFiles`, `updateEntrySource`,
`deleteEntrySource`, `deleteEntrySources`, `moveEntrySources`,
`renameAccount`) answer a `dry_run` with success, the diff, per-file text or
changed lines, `newErrors`, and `valid`. `valid` is `true` only when
bean-check ran and the write adds no error, so an agent approves a preview
only when `valid` is `true`, then re-issues the identical call with
`dry_run: false`. The same call without `dry_run` is refused (`UNBALANCED` or
`VALIDATION_FAILED`) unless `allowInvalid` records it deliberately. The same
holds on REST (`dryRun`) and GraphQL, which carry `valid` next to `newErrors`.
A preview also writes nothing.

Each `newErrors` item is `{message, source?, code?}`: the message, the
`file:line` of the offending directive when bean-check reports one, and the
engine's stable error `code` (for example `E1001`) when it has one. A
preview and a refusal commit nothing, so the entry and text writes
(`appendLedgerText`, `addLedgerEntries`, `updateEntrySource`,
`deleteEntrySource`, `deleteEntrySources`, `moveEntrySources`), an
`updateLedgerFiles` `old_string`/`new_string` edit and a `remove_includes`
file delete name each error at its line in the file as it stands, not where
the entries, edited lines or include lines they add or remove above it would
move it. An error inside the written text keeps its line in that text, as the
preview shows it; a file written whole with `content` is all written text. A
committed `allowInvalid` write reports the line the error has once written.
The published `outputSchema` declares all three, and a client that validates
`structuredContent` against it accepts the result; a key the schema omitted
would make that client reject the whole preview.

An error is new only when the ledger did not already have it. Errors match on
message and file, not line, so an error the write merely moves is not new,
while a second copy of a known message is. The match leaves out the parts of
a message that a write can change without causing the error: the entry's
`(date, "narration")` tag, the figure a failing balance assertion reached
(`got …`, or `accumulated …` for the zero balance `check_drained` checks on
a close), and a lot error's available units (`available …`) or number of
matching lots (`… lots match`). A changed account, expected amount or
requested amount still makes the error new. The commodity plugins' errors
match on what they are about. `check_commodity`'s missing-commodity error
matches on its currency alone, because it names whichever account uses the
currency first, so opening an account that sorts before that one, or
renaming that one, reports none as new. `onecommodity`'s error matches on
its account and its set of currencies, in any order and in any file, because
it sits on the account's last entry. A new undeclared currency, or a third
currency in a mixed account, still counts. Three more plugin errors match on
their message in any file, because each is issued once per thing and placed
by a rule that reads entries across files, as stock Beancount places it, so
a write in one file can move it into another. `coherent_cost`'s `Currency
'<currency>' is used both with and without cost` sits on the first
transaction by date that holds the currency without a cost, so an earlier
one in another file, or deleting the first one, moves it. `unique_prices`'
`Disagreeing price entries` sits on the day's first price by line, whatever
its file, so lines written above one price move it to the other's file. Its
message names no pair or day, so it matches on the message alone.
`noduplicates`' `Duplicate entry: …` for a balance, note or event sits on
the later copy by date and line, so lines written above one copy move it. A
second currency held both ways, a second disagreeing pair or day, or a third
copy still counts. `moveEntrySources` matches an
error inside a moved entry in `toPath`, where the entry goes, so moving an
entry that already has an error reports none as new; a second copy of its
message, or an error the move causes elsewhere such as a balance assertion
it breaks, still counts. Only the ledger knows which lines moved, so MCP
reports the ledger's verdict for a committed move as well as its preview, as
REST and GraphQL do (w31/126).

`renameLedgerFile` and `revertCommit` project bean-check the same way but
never refuse the commit for new errors: each reports the verdict, in the
preview and in the commit alike, and takes no `allowInvalid`. A file rename
projects over the files the move would leave, and the moved file's own errors
go with it to its new path, so renaming a file that carries errors reports
none as new. A revert projects over the files the undo would leave; it is
refused for a conflict with a later commit, never for new errors. It carries
no entry map, so undoing a move reports an error a moved entry already had as
new, in the file it returns to; `errorsBefore` and `errorsAfter` stay equal. The bank
tools and the lifecycle and collaborator tools preview a summary (a sync
count, a destroy summary, a would-be grant), not a bean-check projection, so
`valid` does not apply to them. The registry in
`src/features/ai-agent/api/__tests__/write-preview-matrix.test.ts` classifies
every tool with a preview flag and names the parity tests that prove the rule;
adding a write tool with `dry_run` fails it until the tool is classified.
`preview-commit-differential.test.ts` runs the file tools, the file rename and
the revert twice on identical ledgers, once as a dry run and once as a commit,
and fails when the verdicts differ; every projection tool has a case there or
a written reason in the registry.
The three config-only bank tools (`mapBankAccount`,
`setBankAccountCurrency`, `refreshBankConnection`) publish no preview
argument, and neither does `setLedgerStar` — starring is an instantly
reversible personal toggle, so there is nothing worth previewing.
The matching REST surface is the eleven write bodies (file `PUT` and
`DELETE`, entries, directive text, the entry-source update, delete and
delete-many, the entry move, the account and file renames, and the revert),
the five bank-query routes, the five lifecycle bodies (ledger update and
delete, collaborator set and remove, leave) — bodies take `dryRun`
and each accepts the other spelling — and, accepting `false` and
refusing `true`, the three config routes; the star routes refuse the
key outright. GraphQL offers it on the nine write mutations (bulk entries,
directive text, the three entry-source edits, the entry move, the account and
file renames, and the revert), the five lifecycle mutations, and the five bank
writes — sync, submit, delete, reconcile and unlink — whose results carry the
same preview fields; the unlink mutation stays a `Boolean` and answers `true`
from a preview that runs every check (w1/211). The errors flag is offered on the ten tools whose commit
is refused for new errors: the entry writes, the entry-source edits and move,
and the account rename on all three surfaces, while `createLedgerFiles`,
`updateLedgerFiles` and `deleteLedgerFiles` take `allow_invalid` on MCP and
REST. The bank and lifecycle writes, `renameLedgerFile` and `revertCommit` take
no errors flag.

#### Lifecycle preview shapes

A lifecycle preview runs the commit's checks under the commit's
authority and changes nothing; a commit echoes the flag off
(`dry_run: false`) with no preview. `updateLedger` renders the
current→new diff over the provided fields only, with a flip to
public called out; a rename onto a name another ledger holds, or
onto a renamed ledger's former name, is refused with the commit's
`CONFLICT`, and the ledger's current name renders no rename.
`deleteLedger` renders the destroy summary —
identity, emptiness, size, and warnings covering permanence and
linked-bank cleanup. `setLedgerCollaborator` renders the would-be
grant, current→requested, under the same plan-limit check the commit
enforces, and says when the name may not belong to a known user.
`removeLedgerCollaborator` and `leaveLedger` render the would-be
revocation and self-removal, saying plainly when no current access
could be confirmed. `setLedgerStar` takes no flag (above).
`createLedger` keeps its separate `previewLedgerSetup` tool rather
than the flag — the older precedent this milestone did not revisit.

### Moving entries to another file (w1/m45)

`moveEntrySources` (REST `POST …/entries/move`, GraphQL
`moveLedgerEntrySources`) moves entries into another ledger file in one
commit. Each entry's source text leaves its file (an entry in a `pushtag` or
`pushmeta` scope keeps that scope's tags and metadata, written onto the
entry, below) and is appended to `toPath` in ledger order (by file path, then line), after a blank line and
in `toPath`'s own line ending; `toPath` is created when absent. The include
line goes after `includeFrom`'s last `include`, or at its end when it has none,
and a new `toPath` must be a portable name, as `createLedgerFiles` requires. Entries are addressed as the entry-source
edits address them, `entries: [{entryHash, sha256sum}]` under either hash
spelling, and `listLedgerEntries` with `include_source` returns both for a
whole page. At most 1000 entries move per call.

Entries in a file the ledger does not load would count nowhere, so an unloaded
`toPath` needs `includeFrom`: a file the ledger loads, which gains
`include "<toPath>"`, relative to its own folder, in the same commit. When
`toPath` is already loaded, no include line is added.

`pushtag` and `pushmeta` apply by position, and only within the file that
holds them, so their statements stay behind when an entry inside their scope
moves. The move writes that scope onto the entry instead (w31/016):

- The pushed tags go on the header of a transaction, note or document, after
  its last token and before its comment. Tags the entry already writes are
  not repeated.
- Each pushed metadata key goes on an indented line right under the header,
  with its latest pushed value, unless the entry sets that key itself. This
  applies to every directive, as the ledger engine reads `pushmeta`; stock
  Beancount gives pushed metadata only to transactions.
- An entry outside every scope moves byte for byte.

A moved entry therefore keeps its tags, its metadata and its hash. A scoped
entry's text and `sha256sum` change, though, so take the new `sha256sum` from
`getEntryContext` or `listLedgerEntries` with `include_source` before editing
it.

A relative `document` filename resolves against the folder of the file that
declares it, as an include does, so a document entry moving to another folder
would name a file that is not there. The move rewrites it to name the same
repository file from `toPath`'s folder (w31/133): `"receipt.txt"` in
`books/docs.bean` moved to `main.bean` reads `"books/receipt.txt"`, and a
leading `./` is kept. A root-anchored or URL filename, a move within one
folder, and a filename that names no file in the repository are left as
written. The filename is part of a document's hash, so a rewritten entry's
`movedHashes` (and MCP `entryHashes`) entry is its new hash, the one
`getEntryContext` resolves after the commit; a preview reports the same one.

It refuses, writing nothing:

- no entries, or a `toPath` that is not a `.bean` or `.beancount` repository
  path (`BAD_USER_INPUT`);
- an unloaded `toPath` without `includeFrom`, or an `includeFrom` the ledger
  does not load (`BAD_USER_INPUT`, naming `includeFrom` as the fix);
- an entry that already lives in `toPath` (`BAD_USER_INPUT`);
- a stale `sha256sum` for any listed entry (`CONFLICT`): the whole move is
  refused, not the rest of it;
- other writes that changed a file the move touches before each of its 3
  attempts could commit (`CONFLICT`, with a hint to send the same call again;
  see [entry source](#update-or-delete-entry-source));
- a `toPath` or `includeFrom` the ledger cannot read as text
  (`BAD_USER_INPUT`);
- an entry in a managed price include (`OPERATION_NOT_ALLOWED`);
- a credential that cannot write the ledger's files (`FORBIDDEN`);
- a move that adds a bean-check error the ledger did not have
  (`VALIDATION_FAILED`, naming each new error), unless `allowInvalid`. An
  error a moved entry already had goes with it to `toPath` and is not new.

`dry_run` returns `preview` (each moved entry's file and the text `toPath`
receives), `movedHashes`, `includeAdded` and `validation`. A commit returns the
same plus `commit`, and `revertCommit` on that sha undoes it. An entry's hash
is its text, so a moved entry keeps its hash unless an identical entry
elsewhere changes its position among its twins.

#### Recipe: split a ledger by year

1. List the year's transactions with their source, a page at a time:
   `listLedgerEntries` with `time: "2025"`, `directiveTypes: ["Transaction"]`,
   `include_source: true` and `limit: 200`, then `offset: 200` and so on until
   `total` is reached. Keep each entry's `entry_hash` and `source.sha256sum`;
   skip an entry whose `source` is `null` (a plugin's or a pad's copy).
2. Preview the move: `moveEntrySources` with those `entries`,
   `toPath: "2025.bean"`, `includeFrom: "main.bean"` and `dry_run: true`.
   Go on only when `validation.valid` is `true`.
3. Repeat the call without `dry_run`. It returns `commit`; `main.bean` now
   ends with `include "2025.bean"`.
4. For more than 1000 entries, move the rest in further calls. `2025.bean` is
   loaded after the first, so they need no `includeFrom`.
5. To undo a move, call `revertCommit` with its `commit` sha.

### Renaming an account (w1/m43)

`renameAccount` (REST `POST …/rename-account`, GraphQL `renameLedgerAccount`)
renames one account, and every account under it, across the files the ledger
loads, in one commit. It changes account tokens outside strings and comments,
on whole names: renaming `Assets:Check` leaves `Assets:Checking` alone, and
`Assets:Check:Old` becomes `<to>:Old`. Payees, narrations, string metadata,
`note` text and comments keep the old name, and a file the ledger does not load
is not touched. A comment is a `;` comment or a line Beancount skips whole: one
that starts with `*`, `#`, `:`, `!`, `&`, `?` or `%`, where a `"` opens no
string.

The account's statements move with it (w31/149). Beancount's
`option "documents"` names a folder whose subfolders are named for accounts: a
file in `<root>/Assets/Bank/Checking/` named `YYYY-MM-DD.<anything>` is a
document of `Assets:Bank:Checking`, but only while some entry names that
account, so a folder left under the old name drops every statement in it
without an error. For each documents root `main.bean` declares, the rename
moves every file under the folder of `from`, its descendants' folders included,
to the same place under the folder of `to`, bytes unchanged, in the same
commit. A file the ledger loads stays where its `include` names it, and a root
with no folder for the account changes nothing.

`to` may be any name stock Beancount loads, and that includes non-Latin
components after the first: `Expenses:Food:日本` renames to
`Expenses:Food:食品` or `Expenses:Food:Japan` and back. The root is a capital
letter followed by letters, digits or hyphens. The first component starts with
a capital letter or a digit. Each later component starts with a capital
letter, a digit or a non-ASCII character. ASCII inside a component is limited
to letters, digits and hyphens, and a name holds no spaces or control
characters. `from` may also be a name only the hosted engine loads, whose root
or first component starts with a non-ASCII character, such as `Expenses:日本`.
Renaming it to a name stock Beancount loads is how a ledger gets rid of it.

It refuses, writing nothing:

- a `from` or `to` that breaks those rules, such as `Expenses:Food:coffee`
  or a `to` of `Expenses:日本` (`BAD_USER_INPUT`, with the rule in the
  message), or the same account twice (`BAD_USER_INPUT`);
- a `to` under another root, such as `Assets:` to `Liabilities:`
  (`BAD_USER_INPUT`); that is a reclassification that changes how reports read
  the account, not a rename;
- a `to`, or any name a descendant would take, that the ledger already uses
  (`BAD_USER_INPUT`), because renaming onto it would merge two accounts;
- a `to` whose documents folder already holds a file, when the rename has
  files to move there (`BAD_USER_INPUT`, naming the file), because the move
  would merge two folders;
- a `from` no loaded file names (`NOT_FOUND`, with a hint to read the ledger's
  accounts first);
- a credential that cannot write the ledger's files (`FORBIDDEN`);
- a rename that adds a bean-check error the ledger did not have
  (`VALIDATION_FAILED`), unless `allowInvalid`. An error the ledger already
  had that names the account, or one under it, goes with it to the new name,
  so renaming an account whose balance assertion is off reports none as new;
- a rename that another write overtook (`CONFLICT`): any commit to a file the
  rename touches, between its read and its commit, refuses the whole rename,
  even a `note` on another account. The tool takes no `sha`; send the same
  call again, and it re-reads the files and renames on their current content
  (w31/130).

`dry_run` returns what the commit would do: `accounts` (each `from`/`to` pair,
descendants included), `files` (each changed line, `before` and `after`),
`documents` (each moved file's `from` and `to` path), `bankMappings` and
`validation`. The message counts the moves: `1 line in 1 file, 1 document
moved`. A commit returns the same plus `commit`; `revertCommit` on that sha
undoes it, putting each moved file back and each moved bank mapping too.

Bank-account mappings that name a renamed account move with it, for every
member of the ledger, after the files commit: otherwise the next sync would
post to an account that no longer exists. The result names only the caller's
own bank accounts; another member's mapping appears with `plaidAccount: null`.
If updating the mappings fails, the commit stands, each mapping says
`updated: false`, and the message names how many still point at the old
account, to fix with `mapBankAccount`.

Reverting the rename moves the mappings back the same way (w31/150).
`revertCommit` (REST `POST …/revert-commit`, GraphQL `revertLedgerCommit`)
returns `bankMappings` beside `files`, in the shape a rename returns: each
mapping, every member's, that names an account the commit renamed, with
`from` the name it holds now and `to` the name the revert gives it back. A
preview lists them with `updated: false` and moves nothing; a commit moves them
after the files commit. A mapping that names an account the rename did not
touch, such as one opened under the new name later, stays where it is. If
updating them fails, the revert stands, each says `updated: false`, and the
MCP `summary` names each one still on the new name, to fix with
`mapBankAccount`. Reverting that revert renames the account again, and its
mappings with it. A commit counts as a rename when its subject is the one
`renameAccount` writes, `Rename <from> to <to>` (or git's default
`Revert "…"` of one), and every file it modified is exactly that rename of its
parent, so a message alone moves nothing. Any other commit returns
`bankMappings: []`.

### Tools renamed on 2026-10-18

Seven tools used to take an `operation` argument and run one of several
operations. OpenAI's app-directory review asks for each operation as its own
tool, so each operation now has its own tool with its own input schema and
annotations ([ADR 019](../../../docs/adrs/ADR019-backend-v2-mcp-host-compatibility.md),
2026-10-18 amendment). The old names are gone; a client that cached them gets
`NOT_FOUND` and should list tools again. Each new tool takes its old
operation's arguments without `operation`. For the file tools, drop
`operation` from each `files` item too: a `replace` item becomes an
`updateLedgerFiles` item with `content`.

| New tool                        | Was: tool and `operation`                |
| ------------------------------- | ---------------------------------------- |
| `syncBankTransactions`          | `manageBankImport` `sync`                |
| `importStagedBankTransactions`  | `manageBankImport` `submit`              |
| `discardStagedBankTransactions` | `manageBankImport` `discard`             |
| `reconcileBankAccounts`         | `manageBankConnection` `reconcile`       |
| `mapBankAccount`                | `manageBankConnection` `map_account`     |
| `setBankAccountCurrency`        | `manageBankConnection` `set_currency`    |
| `refreshBankConnection`         | `manageBankConnection` `refresh`         |
| `unlinkBankConnection`          | `manageBankConnection` `unlink`          |
| `createLedger`                  | `manageLedgers` `create`                 |
| `updateLedger`                  | `manageLedgers` `update`                 |
| `deleteLedger`                  | `manageLedgers` `delete`                 |
| `setLedgerCollaborator`         | `manageLedgerCollaborators` `update`     |
| `removeLedgerCollaborator`      | `manageLedgerCollaborators` `delete`     |
| `leaveLedger`                   | `manageLedgerCollaborators` `leave`      |
| `createPullRequest`             | `managePullRequests` `create`            |
| `mergePullRequest`              | `managePullRequests` `approve`           |
| `rejectPullRequest`             | `managePullRequests` `reject`            |
| `createLedgerFiles`             | `editLedgerFiles` `create`               |
| `updateLedgerFiles`             | `editLedgerFiles` `update` and `replace` |
| `deleteLedgerFiles`             | `editLedgerFiles` `delete`               |
| `updateEntrySource`             | `editEntrySource` `update`               |
| `deleteEntrySource`             | `editEntrySource` `delete`               |
| `deleteEntrySources`            | `editEntrySource` `delete_many`          |

File edits lose one thing: an `editLedgerFiles` call could mix creates,
updates, and deletes in one commit. Each file tool still commits all of its
own files together, so a mixed change is now one commit per kind.

### Writing directives as Beancount text

`appendLedgerText` takes the text you would write into a file:

```json
{
  "text": "2026-01-02 * \"Cafe\" \"Coffee\"\n  Expenses:Food   4.50 USD\n  Assets:Cash    -4.50 USD"
}
```

It parses the text into directives and refuses anything that is not one —
prose, a diff, JSON — before writing. That check is a line classifier, narrower
than Beancount's grammar: it reads `YYYY-MM-DD` dates and a quoted string on one
line, so `2026/11/12 event "x" "y"` (a date stock accepts) and a narration that
runs onto a second line are refused as "not a Beancount directive", with a hint
naming the way out (`updateLedgerFiles`, which takes both; `addLedgerEntries` for
a narration with a line break). It also refuses `option`, `plugin` and
`include` lines with `BAD_USER_INPUT` naming the line: they reconfigure the
whole ledger rather than record an entry, so change them deliberately with
`updateLedgerFiles`. `pushtag`/`poptag` and `pushmeta`/`popmeta` around
entries are applied to them as the engine reads them in place — the tag
written onto each enclosed transaction, note and document (the directives
Beancount tags from the stack), each key's latest pushed value under each
enclosed directive's header, so a key pushed again holds until its own
`popmeta` and the earlier value comes back after it — and the statements
themselves are not written, because each entry moves to its date position; a
push that is never popped, or a pop with no push left to close, is refused
naming the line. Each directive goes to the file the
ledger's own `bcio` options assign its type and date, unless `path` names one
(a `custom "budget"` is a budget, so `budget_file` routes it, while any other
`custom` goes to `default_file`), and is inserted after the last directive
dated on or before it rather than at the end of the file. When that directive is of another kind and org headings
follow it, the new one goes under them, so the starter ledger's first
transaction lands under `* Transactions`, not among the opens (w23/076). The
target file's own `pushtag` and `pushmeta` apply by position, so an entry is
never left inside a scope the file opened, where it would take that scope's
tag or metadata (w31/015). Dated before a scope's first entry, it goes above
the push. Dated strictly inside a scope, it is written between a `poptag #t`
or `popmeta key:` that closes the scope and the same pushes, with the same
values and in the same order, after it. The stored entry carries exactly the
tags and metadata its text does, and the file stays in date order. A
`path` must be a file the ledger loads — one of its
`source-files` — or the call is refused as `BAD_USER_INPUT`: an entry written
anywhere else would never appear in a report. Create and `include` a new file
first. A file the routing rules pick that nothing includes — a new year's file
under per-year includes — gains an `include` in `main.bean` in the same commit,
and the message says so ("main.bean now includes txns/2027.bean"); a glob
include that already covers it needs nothing (w23/062). An option's file is a
path from the ledger root, read the way Beancount reads an `include` in
`main.bean`, so `./txns/{year}.bean` routes to `txns/2026.bean`. One that
leads outside the ledger (`../x.bean`, `/x.bean`) is refused as
`BAD_USER_INPUT` naming the option, whose `custom "beancountio-option"` line
is what to fix (w31/152). The same applies to `addLedgerEntries`. A file whose own directives are out of date order gets
them appended, and says so in `appendedUnsorted`.

Before committing, it bean-checks the projected ledger. The ledger's check is
stock beancount's: where the pinned engine loads text stock `bean-check`
refuses, the ledger reports stock's error itself, at its line, like any
bean-check error. Among those constructs are an unquoted booking method
(`open Assets:Stock ABC STRICT`, where the grammar wants `"STRICT"`), a second
`commodity` directive for one currency, a metadata key repeated on one
transaction or one posting, a negative price (`10 EUR @ -1.10 USD`) and an
account with a colon after it (`Assets:Cash:`). The ledger lists them, with
stock's message for each, under
[stock errors the engine does not raise](../../ledger/README.md#validation-stock-errors-the-engine-does-not-raise).
Stock tests a repeated key by object identity, so it accepts a repeated
`TRUE`, a repeated one-character string or a repeated account name, and so does
the ledger; a repeated key on an `open` or `commodity` is accepted by both.
New errors are a refusal — `UNBALANCED` when a transaction does not balance —
unless `allowInvalid` records them deliberately. `dry_run` returns the unified diff
and the projected errors without committing, with `valid: false` when there are
new errors: every write preview (`appendLedgerText`, `addLedgerEntries`, the
`…LedgerFiles` tools) reports errors instead of refusing and carries `valid`,
which is what to gate on. At most 50 directives per call.

Prefer it over `updateLedgerFiles` for adding directives: `updateLedgerFiles`
replaces file contents, so appending with it means reading, concatenating, and
writing the whole file back — which is how entries end up at the bottom of
`main.bean` out of order. Use the `…LedgerFiles` tools to restructure files and
`updateEntrySource` to change a directive that already exists.

Like entry writes, the `…LedgerFiles` tools refuse a change that would add
bean-check errors the ledger did not have (`VALIDATION_FAILED`, naming each
error) on the commit; a `dry_run` returns them instead of refusing, as
`appendLedgerText` does (w1/037): `validation.newErrors` lists them and
`validation.valid` is `false`, so gate a preview on `valid`, not on `isError`.
Errors the ledger already had never block. Pass `allow_invalid: true` (REST: `allowInvalid`) to commit it
deliberately — for example one step of a multi-step restructuring that is only
valid once the next step lands, or write the steps as one batch. The result
still reports the errors under `validation.newErrors`. REST `PUT`/`DELETE
…/files/{path}` behave the same.

### Reading and editing files

Paths are relative to the ledger repository. Use `listLedgerFiles` to discover
them. Line ranges in `readLedgerFiles` are 1-based and inclusive; the response
contains `startLine`, `endLine`, `totalLines`, and raw `content`. It does not
prefix every line of the content with a line number.

One tool per kind of change, each batching its files into one commit:

| Tool                | Each `files` item                                                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createLedgerFiles` | `path`, `content`: a new file's text.                                                                                                                                  |
| `updateLedgerFiles` | `path` with either `old_string`, `new_string` (an exact replacement; the old text must occur once) or `content` (the complete replacement text) and an optional `sha`. |
| `deleteLedgerFiles` | `path` and an optional `sha`.                                                                                                                                          |

The commit message travels as `description` on these three tools and as
`message` on REST, GraphQL, and `renameLedgerFile` — and every one of the
four accepts both spellings, so one argument pastes across all of them.
Two different texts in one call are refused with `BAD_USER_INPUT` rather
than guessed. The three file tools require one of the two on MCP; rename,
REST, and GraphQL leave both optional and default per operation
(`Create/Update/Delete <path>`, `Rename a → b`). A message that is blank once
trimmed counts as omitted: it takes that default where the message is
optional, and the MCP file tools refuse it with `BAD_USER_INPUT`, so no commit
is ever blank (w1/212). `addLedgerEntries`,
`appendLedgerText`, and the
entry-source tools take neither: they compose the message from the
operation and its content (`Add <date> "<payee>"`, `Add N directives to <file>`,
`Update …`, `Delete …`), so a caller message would
duplicate what the server counts.

`readLedgerFiles` returns each file's blob `sha`. Pass it back on a `content`
rewrite or a delete: if another writer committed since you read the file, the
write is refused as `CONFLICT` — "`<path>` changed since you read it" — and
nothing changes. A `dry_run` is refused the same way, as is a REST `PUT` or
`DELETE` preview with a stale `sha` (w1/219). Without `sha`, a whole-file `content` write or a delete
replaces whatever is there now, including changes you never saw. An
`old_string` edit is guarded by its own text, which must still match. When
another write commits first, an `old_string` edit or a create is applied again
to what landed and checked again against it: one that would add bean-check
errors there is refused with `VALIDATION_FAILED` unless `allow_invalid` is set,
nothing is committed, and the other write stays (w31/132).

A `.bean` or `.beancount` file that the write creates or rewrites but no loaded
file includes is named in `notLoaded`, and the summary says its entries don't
count and were not checked. The write is neither refused nor the file included:
add the `include` line to a loaded file yourself (w1/227). REST `PUT` and the
GraphQL file create and update return the same `notLoaded`. To split existing
entries into a new file, `moveEntrySources` with `includeFrom` moves them and
adds the include in one commit, so no orphan is ever committed (w1/m45).

Several items may name the same file. They apply in order, each exact-text
replacement matching the text the items before it produced, and the file is
committed once with the result, so the preview's diff is what lands. A path
may not be created twice, created and then deleted, or changed after it is
deleted in one call; those are refused as `BAD_USER_INPUT` before anything is
read.

`main.bean` is the ledger's entry point, so deleting it (`deleteLedgerFiles`,
REST `DELETE`, GraphQL `deleteLedgerFile`) and renaming it away are refused as
`BAD_USER_INPUT`; replace its content to rewrite it. A preview of any change
that would leave the ledger without it reports that as a new error.

Deleting any other file still `include`d by another ledger file is refused
the same way on all three delete spellings, naming the includers: remove the
include from the including file(s) first, then delete. An include counts the
way the ledger loads it — its target resolves to the deleted path relative
to the directory of the file that declares it — and glob includes never
count. The files whose includes count are every `.bean`/`.beancount` file,
loaded or not, and every other file the ledger loads, such as a `.txt` that
`main.bean` includes; a file the ledger never loads, such as a README that
quotes an include line, never counts (w31/023). `remove_includes`
(`removeIncludes` on REST and GraphQL) drops those exact include lines in the
same commit; otherwise drop the include with `updateLedgerFiles` first, then
delete.

A file that is not valid UTF-8 (a Windows-1252 export, say) reads back from
`readLedgerFiles` and REST `GET …/files/{path}` with `lossy: true`: its
undecodable bytes show as U+FFFD, and GraphQL `getLedgerFile` returns the exact
bytes as base64. Anything that would rewrite such a file from that text — an
`old_string` edit, `appendLedgerText`/`addLedgerEntries`, or an include rewrite
in `renameLedgerFile` — is refused as `BAD_USER_INPUT` naming the file, so no
write replaces bytes it never touched. Replacing the whole content, deleting
the file, and renaming it (which moves its bytes unchanged) still work.

Send plain UTF-8 text, not base64. For example, these are arguments to
`updateLedgerFiles` for a preview; use an existing path and exact text from your
own ledger:

```json
{
  "description": "Correct a transaction narration",
  "dry_run": true,
  "files": [
    {
      "path": "main.bean",
      "old_string": "\"Grocery shooping\"",
      "new_string": "\"Grocery shopping\""
    }
  ]
}
```

Each created or replaced file, including the complete result of an exact-text
replacement, must be at most **1 MiB (1,048,576 UTF-8 bytes)**. The same size
check applies to a preview. Reads of existing larger files remain available;
generated directive appends are a separate operation and may grow a ledger file
beyond this explicit-file limit. The complete JSON request has an independent
**2 MiB** cap, including JSON escaping, the protocol envelope and all batch
items. Split large batches into separate requests. A request over it is refused
with HTTP 413 and JSON-RPC `-32600` "the body exceeds the 2 MiB limit".

`dry_run` defaults to `false`. With `true`, the tool reads existing files as
needed, checks replacement matches, constructs operations, and runs the same
write authorization and repository-path validation as the commit — a caller
the commit would refuse for authorization or path reasons is refused by the
preview too (new bean-check errors are reported, not refused). The preview returns the
operation `count` and paths plus a unified `diff` per touched file and
bean-check's verdict over the projected content (`validation` with
`errorsBefore`, `errorsAfter`, `newErrors`, and `valid`), so review the diff and
the new errors, and proceed only when `valid` is `true`, before re-issuing the same call with `dry_run: false`. It does
**not** exercise the final repository commit, so a successful preview still
does not guarantee that applying the edit will succeed.

Applying the edit calls `LedgerRepoService.changeFiles` and creates an atomic
commit whose message is the `description` verbatim. Existing-file operations include
the fetched file SHA. The MCP handler does not present an approval dialog;
confirmation behavior belongs to the client. These details come from the
[file-edit implementation](../src/features/ai-agent/tools/edit-ledger-files-tool.ts).

### Bank import workflow

Link a new bank in the browser first; MCP has no tool for the bank-link widget.
The connection/account metadata reads below require `ledger.admin`. A
`ledger.write` credential can perform the import steps when the needed IDs and
mappings are already known. Both still require the current bank relationships.
After linking:

1. Read the `banks` and `bank-accounts` resources, or call
   `listBankConnections`, to find connection IDs and ledger-account mappings.
   A connection's own `id` (pitm*…) and an account's own `id` (pacc*…) are
   the ids the bank tools take; the rows' `itemId` and `accountId` fields are
   Plaid's, and the tools answer them `NOT_FOUND` (w1/224).
2. Call `syncBankTransactions` with the connection's `id` as `itemId` to pull
   bank transactions into staging.
3. Read `bank-transactions/unsynced` or call `listStagedBankTransactions`
   (optionally with an account's `id` as `accountId` to select one bank
   account, and a `limit` of at most 100 to read a large staging area in
   pages; imported and discarded rows leave the list, so read page 1 again
   after each import rather than the next page). Select the
   transactions and accounts to
   book; the suggestion resources can help categorize them.
4. Call `importStagedBankTransactions` with
   `transactions: [{ transactionId, targetAccount, sourceAccount? }]`.
   Optional `filename` selects an existing ledger file.
5. Call `discardStagedBankTransactions` with `transactionIds` to remove
   unwanted staged transactions.

To book a whole backlog to one account, repeat one `targetAccount`. The import
takes its target per row on REST and GraphQL as on MCP and has no "default
target" argument; the dashboard's Bank Sync table does the same for a selection
with its _Set for selected_ control. Read a page of `listStagedBankTransactions`
(a `limit` of at most 100) and send one `importStagedBankTransactions` whose
`transactions` carry each row's `transactionId` (not its `id`) and the same
`targetAccount`, an account the ledger already has, such as
`Expenses:Uncategorized`. Leave `sourceAccount` out, so each row is booked from
the account its bank account maps to, and preview the call with `dry_run: true`
first. Imported rows leave the staging list, so read page 1 again and repeat
until a page comes back with fewer rows than `limit`. A row that should go
elsewhere, because a suggestion or you picked a better account, keeps its own
`targetAccount` in the same call.

An import whose reply was lost has still landed, and sending it again is
refused with `BAD_USER_INPUT` ("already synced to ledger", or "already in the
ledger" when the staged row was re-created) rather than written twice. The
refusal's hint says to confirm with `listLedgerEntries` or `checkLedger`.
Unlike the entry-write tools, the import takes no `requestId`: the staged
transaction is its own idempotency key.

Every bank id argument above also accepts the snake_case spelling the tools
historically took (`item_id`, `account_id`, `transaction_ids`, and the
submit-item `transaction_id`/`target_account`/`source_account` triple plus
`mapBankAccount`'s `ledger_account`), so ids paste straight from the
resources that report them. Passing both spellings with two different ids
is refused with `BAD_USER_INPUT` rather than guessed. REST and GraphQL
take the camelCase spelling only, as they always have.

`syncBankTransactions`, `importStagedBankTransactions`,
`discardStagedBankTransactions`, `reconcileBankAccounts`, and
`unlinkBankConnection` accept `dry_run: true` to invoke their service preview
paths. `mapBankAccount`, `setBankAccountCurrency`, and `refreshBankConnection`
have no preview contract and publish no `dry_run` argument, so passing one is
refused as an undeclared argument before any bank service runs. Each tool's
input schema is in [`bank-import-tool.ts`](../src/features/ai-agent/tools/bank-import-tool.ts)
(`BANK_OPERATIONS`).

### Asset and archive URL discovery

`beancount://assets/download-url{?ledgerRepoId,filename}` returns
`{ "downloadUrl": "..." }` for a repository asset. Both arguments are required;
`ledgerRepoId` is the positive numeric repository ID, and `filename` is a path
relative to its asset directory. The service resolves the ledger, enforces the
credential pin and file-read permission, and signs the URL. REST exposes this
at `GET /api-gateway/v1/asset-download-url` with the same query arguments.
An ID the caller cannot use is refused the same way whether a ledger has it or
not, and the refusal never names the ledger the ID resolved to: `UNAUTHENTICATED`
for an anonymous caller, `FORBIDDEN` for a credential without `ledger.read` or
one pinned to another ledger, and `NOT_FOUND` "Ledger not found" otherwise.

`beancount://{owner}/{name}/archive-download-url` returns the existing HTTP URL
for `main.zip`, on the server's public origin. For an MCP caller the
URL is `{issuer}/api-gateway/mcp/archive/{owner}/{name}/main.zip`, a streaming
route under the MCP resource: fetch it with `Authorization: Bearer` and the same
MCP credential (audience `{issuer}/api-gateway/mcp`) or a personal API key, at
any archive size ([ADR 0007](../../../docs/adrs/ADR007-backend-v2-mcp-surface.md)
amendment). A browser session is refused there with `UNAUTHENTICATED`, as on the
JSON-RPC endpoint; the credential pin, per-ledger read authority and the shared
archive-download budget apply as on the REST download. REST and GraphQL callers
still get the v1 URL. Every archive fetch checks access again and returns a
`private, no-store` response. Credentials are never embedded in archive URLs.

Asset URLs use object-storage signatures and their configured expiry. Previously
issued asset URLs remain usable until that expiry; relationship revocation
prevents issuing new URLs. Archive URLs instead require current authorization
at download time. These resources discover URLs.

For direct archive delivery, read
`beancount://{owner}/{name}/archive/{archive}`. It returns an MCP resource
`blob` containing base64-encoded archive bytes, with the upstream `mimeType`.
The original Content-Disposition value is retained in
`_meta["beancount/contentDisposition"]`. Decode `blob` to save the archive.

`{archive}` is a branch, tag, or commit followed by `.zip` or `.tar.gz`. Any
other name is refused with `BAD_USER_INPUT` before the repository is contacted.
A reference that names no branch, tag, or commit — including a well-formed but
unknown full commit SHA — answers `NOT_FOUND` promptly. `SERVICE_UNAVAILABLE`
means the repository host itself failed, and only that is worth a retry.

The blob is capped at 8 MiB of archive bytes. A resource read is one JSON-RPC
message, so the archive is held whole in memory, and base64 adds a third. A
larger archive is refused with `OPERATION_NOT_ALLOWED` (JSON-RPC `-32003`) as
soon as its `Content-Length` or the bytes read so far pass the cap, and the
error's `hint` names `beancount://{owner}/{name}/archive-download-url`. The URL
that resource returns to an MCP caller streams at any size with the same MCP
credential, an OAuth token or a personal API key, as above, so a client
connected only through MCP OAuth needs no other credential to download a larger
archive; a browser session is refused there. The URL names `main.zip`, and its
last path segment takes any other `<ref>.zip` or `<ref>.tar.gz`. The cap applies
only to the `archive/{archive}` blob.

MCP and both REST spellings share the existing 30-downloads-per-minute
credential bucket; a refused read still spends one. Every download checks
current ledger access. REST streams the response from Gitea; MCP buffers it,
up to the cap, to produce a base64 resource payload. GraphQL's deliberate
raw-byte exclusion remains unchanged.

### Pull requests

Read `beancount://{owner}/{name}/pull-request{?prNumber}` to inspect metadata,
file statistics, and the full diff. This requires repository read authority.

Three tools, each requiring repository write authority and a `ledger` target
(`owner/name`), which may be omitted for a pinned credential:

- `createPullRequest` requires `title`, `description`, `clearCommitMessage`, and
  `changes: [{ "path": "...", "content": "..." }]`. Each content value is the
  complete replacement file text; empty title/description and a missing commit
  message are refused. `baseBranch` defaults to `main` — say so when the
  target is not `main`. Before opening the PR the service verifies the branch
  differs from base and refuses a diff-less branch unless `fastForward: true`
  skips verification. The changes land as one commit on a new `pr-patch-*`
  branch made from `baseBranch` in the same request, so the branch exists only
  if the whole change was committed. The result carries the PR's actual `baseBranch`/`headBranch`
  refs — use those to follow up, not the requested names.
- `mergePullRequest` requires `prNumber` and merges the PR (GraphQL and REST
  call this operation approve).
- `rejectPullRequest` requires `prNumber` and closes it without merging.

Reviews apply immediately; preview is unsupported. Repository refusals return
`success: false`; MCP additionally reports `isError` with code
`OPERATION_NOT_ALLOWED` and retains the domain payload under
`structuredContent.result`. A create failure names the step that failed
(`reading main.bean`, `committing the changes to new branch …`, `opening the pull request`) and
Gitea's reason when it gave one. When the repository server itself fails
(5xx or unreachable), every surface answers `SERVICE_UNAVAILABLE` with that
message, and its hint says whether a retry can help. A failed commit
leaves no branch, and a failure after it (an empty diff, opening the PR) deletes
the branch it made (best effort), so no partial changes are left behind.
Unsafe repository-relative paths are rejected before a branch is created.

REST uses `/api-gateway/v1/ledgers/{owner}/{name}/pull-requests` for creation,
`/{prNumber}` for inspection, and `/{prNumber}/approve` or `/{prNumber}/reject`
for review. The three mutations use POST; review bodies are `{}`.

### Ledger lifecycle

`createLedger`, `updateLedger`, and `deleteLedger` require administrative
authority and apply changes immediately. Creation can be previewed first with
`previewLedgerSetup`; `updateLedger` and `deleteLedger` take `dry_run` and
return a preview of the change instead of applying it.

- `previewLedgerSetup` requires `setup`, the same setup specification
  `createLedger` accepts ([ADR 026](../../../docs/adrs/ADR026-dashboard-onboarding.md)). It creates nothing and
  returns the resolved `preset`, `operatingCurrency`, and `historyStart`, the
  `accounts` the ledger would open, and the `files` it would write, keyed by
  path, plus `validation: { ok, errors }` — bean-check's verdict on those
  files, run by the ledger service before anything exists. `createLedger`
  with a `setup` runs the same check and refuses with `VALIDATION_FAILED` on
  `setup` when the new ledger would not load. A specification `createLedger`
  would refuse — an unknown preset or capability, an unsupported currency, an
  invalid date, a known opening on `Equity:OpeningBalances` itself — is
  refused here with the same `setup` validation error. It needs the same
  account authority as creation.
- `setup.modules` adds personal-only account groups to a `personal@1`
  ledger, each at most once: `investments@1`, `rental-property@1` (with an
  optional `propertyName`, an ASCII account component defaulting to
  `Property1`), and `side-business@1`. The files never depend on module
  order, and `accounts` may name a selected module's account. A module with
  another preset, an unknown or repeated module, or a misplaced or invalid
  `propertyName` is refused with the same `setup` validation error on REST,
  GraphQL (`LedgerSetupModuleInput`), and MCP.
- `createLedger` requires `name` and accepts `description`, `private`, and either
  `template` (`STARTER` or `SAMPLE`) or `setup`; passing both is a validation
  error, and omitting both selects starter files. `setup` takes a `preset` and
  optional `title`, `operatingCurrency`, `historyStart`, `capabilities`, and
  `accounts`. Names use lowercase
  letters, numbers, and underscores joined by single hyphens, up to 100
  characters — the name the ledger is stored under. A name the service would
  store differently (`x-`, `-x`, `a--b`) is refused, naming the form to use
  (w23/064); the same rule applies to `updateLedger`'s `name`. Creation
  uses the authenticated account and accepts no `ledger` selector; a
  ledger-pinned credential is refused with `FORBIDDEN` — use a credential
  without a ledger pin to create ledgers.
- `createLedger` also accepts `currency`, an ISO 4217 code that becomes a
  starter ledger's `operating_currency`; omitted or null keeps `USD`, so a
  request without it creates exactly the starter files it always did. It is
  refused with a `currency` validation error when it is not a supported code
  (the list the profile's `defaultCurrency` is checked against), with `template:
SAMPLE` (the demonstration ledger stays in `USD`), or with `setup` (use
  `setup.operatingCurrency`). Creation never reads the profile
  `defaultCurrency`; clients prefill the field from it.
- `createLedger` also accepts `requestId` (1–200 characters) for safe retries.
  Repeating a creation with the same `requestId` and the same inputs returns
  the ledger the first call created instead of creating a second one; reusing
  it with different inputs is a validation error, and a repeat while the first
  call is still running is a conflict. A call that fails — a plan limit, a
  refused name, an outage — releases its `requestId`, so repeating it runs the
  creation again. A successful `requestId` is remembered for 24 hours.
- `private` controls who can read the ledger. On create, an omitted or null
  value keeps it private; `false` publishes it: its transactions, balances,
  files and full commit history, with each commit's author name and email,
  become readable by anyone with the link and by search engines (w23/241). The
  `dry_run` preview of that change carries the same words as a warning.
- `updateLedger` accepts `ledger` and optional `name`, `description`, and `private`;
  an omitted field stays as it is.
- A name another ledger holds is a `CONFLICT` on create or rename. So is a
  renamed ledger's former name: the repository host keeps it as a redirect to
  the renamed ledger, so the name stays taken though no ledger has it, and the
  refusal (reason code `LEDGER_NAME_RESERVED`) names the ledger it redirects to
  (w23/061). Renaming a ledger back to its own former name is allowed.
- `deleteLedger` takes `ledger` and optional `dry_run`, and returns
  `{ "ledgerId": "owner/name" }`; a preview returns `{ "ledgerId", "preview" }`.

For update/delete, unpinned credentials must supply `ledger`; pinned credentials
may omit it and cannot select another ledger. Creation and update return ledger
metadata and clone URLs. REST exposes `POST /api-gateway/v1/ledgers/preview`,
`POST /api-gateway/v1/ledgers`, and
`PUT`/`DELETE /api-gateway/v1/ledgers/{owner}/{name}`; GraphQL exposes the
`previewLedgerSetup` query and the `createLedger`, `updateLedger`, and
`deleteLedger` mutations.

Deletion uses the same cleanup sequence as GraphQL: it attempts remote bank
revocation, then deletes local bank metadata and the repository. If repository
deletion fails, local metadata rolls back, but earlier bank revocations cannot
be undone. If the preliminary repository-ID lookup fails, bank cleanup is
skipped and repository deletion still proceeds.

### SSH public keys

MCP has no SSH-key tool or resource. An SSH key registered on the account is an
access credential, which the connector directories forbid an app to handle
([ADR 019](../../../docs/adrs/ADR019-backend-v2-mcp-host-compatibility.md#amendments), 2026-10-09). List, add, and remove keys in the dashboard, with GraphQL, or at
`/api-gateway/v1/public-keys` and `/api-gateway/v1/public-keys/{keyId}`.

### Collaborator changes

Each tool requires `ledger.admin` and the current relationship for its
operation. Supply `ledger: "owner/name"` for an unpinned credential; a pinned
credential can omit it.

| Tool                       | Arguments                                                                    | Effect                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `setLedgerCollaborator`    | Required `collaborator`; optional `permission` (`read`, `write`, or `admin`) | Add or update membership, subject to the existing collaborator limit. Omitted or null permission uses the repository default. |
| `removeLedgerCollaborator` | Required `collaborator`                                                      | Remove that member.                                                                                                           |
| `leaveLedger`              | No collaborator or permission argument                                       | Remove the authenticated caller. Owners cannot leave their own ledger.                                                        |

These tools take `dry_run` (`dryRun` on GraphQL) and preview the change
without applying it. Undeclared arguments are rejected. Only an explicit collaborator can leave: the
owner, or a reader of a public ledger who holds no grant, gets
`OPERATION_NOT_ALLOWED` saying why, while a caller who cannot see the ledger
still gets `NOT_FOUND` (w23/063). A membership removal affects the next
protected call.

## Undo a change

Every write that makes a commit returns its sha as `commit`: the file tools
(`createLedgerFiles`, `updateLedgerFiles`, `deleteLedgerFiles`),
`addLedgerEntries`, `appendLedgerText`, `renameLedgerFile`, the entry-source
edits (`updateEntrySource`, `deleteEntrySource`, `deleteEntrySources`),
`insertReceiptTransaction` and `revertCommit` itself, with the same field on
their REST and GraphQL twins (REST file `PUT`/`DELETE`, GraphQL
`createLedgerFile`, `updateLedgerFile` and `deleteLedgerFile`). A preview has
none, and a write that landed but lost its answer names none rather than a
wrong one. `revertCommit` takes that sha (or `main` for the latest commit),
previews with `dry_run`, and commits the undo as one new commit that sets each
file the commit touched back to its parent's contents; its own result carries
the new `commit`. It is refused with `CONFLICT` naming the file when a later
commit changed any file the revert would touch, so an undo never discards newer
work, and a merge or root commit cannot be reverted. Undoing a `renameAccount`
commit also moves back the bank mappings it moved, and lists them in
`bankMappings` ([Renaming an account](#renaming-an-account-w1m43)).

## Resources

Resources provide URI-addressed context, separate from `tools/call`, following
MCP's [resource model](https://modelcontextprotocol.io/specification/2025-11-25/server/resources).
Discover them with **`resources/templates/list`**, then instantiate a URI and
send `resources/read`. Templates are the complete inventory. `resources/list`
enumerates instances rather than templates, and returns a narrower set: each of
the credential's ledgers' static reads — `source-files`,
`statements/income-statement`, `statements/balance-sheet`, `accounts`,
`metadata`, `payees`, `errors` — plus up to the capped number of its source
files. A template with a required argument a URI cannot guess, such as
`{archive}` or `{prNumber}`, is not enumerable and appears only in the template
list. Clients vary in how they expose these reads to an agent.

A `{?name,…}` suffix marks the query-string names a template reads — not
that they are optional. Several are effectively required: `pull-request`
needs `prNumber`, `commit-details` needs `sha`, `social/profile` needs
`username`, `collaborators/permission` needs `collaborator`,
`asset-download-url` needs `ledgerRepoId`, `temp-assets/download-url`
needs the object key, `suggest-categories` needs `transactions`,
`narration-transactions` needs `narration`.
Reading one bare refuses with `BAD_USER_INPUT` naming the missing name — for
example `prNumber is required` (w1/187); add it and read again (w23/107). A
name that is present but malformed keeps the validator's own message, prefixed
with the name.

Ledger-scoped templates start with `beancount://{owner}/{name}/`. The following table
lists the accounting and bank suffixes; replace the braces with your ledger and resource values.

| Family                                   | URI suffixes                                                                                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vocabulary (11)                          | `payees`, `narrations`, `currencies`, `tags`, `links`, `years`, `commodities`, `events{?account,filter,time}`, `errors`, `attributes`, `managed-prices`                         |
| Analysis without required arguments (10) | `overview`, `documents`, `trial-balance`, `holdings`, `capital-gains`, `interval-totals`, `account-last-entries`, `entries-count`, `postings-per-account`, `account-directives` |
| Analysis with required arguments (6)     | `account-report/{accountName}`, `register/{account}`, `payee-transactions/{payee}`, `narration-transactions{?narration}`, `payee-accounts/{payee}`, `entry-context/{entryHash}` |
| Bank connections and accounts (4)        | `banks`, `banks/{itemId}`, `banks/{itemId}/accounts`, `bank-accounts`                                                                                                           |
| Bank staging and suggestions (3)         | `bank-transactions/unsynced{?accountId,page,limit}`, `bank-transactions/suggested-categories{?accountId}`, `banks/{itemId}/suggested-mapping`                                   |
| File contents (1)                        | `files/{+path}`                                                                                                                                                                 |

The file template uses reserved expansion, `{+path}`, so nested paths work:
`beancount://alice/books/files/2026/september.bean`. It returns `text/plain`;
JSON resources return `application/json` as text inside the MCP `contents`
array; archive resources return binary blobs as described above. Read a URI through MCP, not with an ordinary HTTP GET to `beancount://`.

Journal resources are `journal`, `plaintext-journal`, `account-journal`, and
`source-files` under `beancount://{owner}/{name}/`. REST uses the same suffixes.
Journal subtype filters (`directiveTypes`, `transactionSubtypes`,
`documentSubtypes`, `customSubtypes`) are JSON-encoded string arrays in URL
parameters, for example `directiveTypes=%5B%22Transaction%22%5D`. Empty arrays
are preserved. Values match case-insensitively, so `"transaction"` (the
spelling `addLedgerEntries` takes) selects the same entries as `"Transaction"`.
`directiveTypes` takes `Transaction`, `Balance`, `Commodity`, `Close`, `Custom`,
`Document`, `Event`, `Note`, `Open`, `Pad`, `Price`, and `Query`; `transactionSubtypes`
takes `cleared`, `pending`, and `other`; `documentSubtypes` takes `discovered`
and `linked`; `customSubtypes` takes `budget`. Any other value is refused with
`BAD_USER_INPUT` on every surface, rather than matching nothing.
A stored query (`2026-01-05 query "<name>" "<BQL>"`) is a `Query` entry carrying
`name` and `query_string`, as Fava's journal lists it, never a `Custom`.
The `filter` argument is a Fava advanced-filter expression, identical on REST,
GraphQL, MCP tools, and MCP resources. `#tag` and `^link` match exactly; bare
or `"quoted"` words match narration/payee (transactions) or comment (notes);
`field:value` looks up `account` (posting accounts included), `tag`, `link`,
`payee`, `narration`, `date`, or entry metadata; `field>100` compares amounts
and bare `>100` matches posting units; both compare the absolute value, so
thresholds are non-negative (`<0` matches nothing); `any(...)`/`all(...)` scope a
test to postings; `-` negates, `,` is OR, juxtaposition is AND, parentheses group.
Quote values holding a colon, a space, or a leading digit —
`account:"Assets:Bank:Checking"`, `date:"2026"` — there are no escape
sequences. An unparseable filter is refused with `BAD_USER_INPUT` naming the
fix (quote the value, drop a stray `#`/`^` after a colon), never silently
treated as match-all or match-none.
Plaintext journal's text holds the ledger's transactions, balance assertions and
pads only, the same text the dashboard's Export journal downloads: no `open`,
`close`, `commodity`, `price`, `event`, `note`, `document` or `custom`
directives. It is not a copy of the ledger, and its `total` is not
`listLedgerEntries`'s: a ledger's prices, and with them every market valuation,
its commodity declarations, events, custom directives, closes and real open dates
are absent. Read `source-files` (or `readLedgerFiles`), or the archive, for a full
copy (w23/239).
Plaintext journal returns `{ "content": "...", "total": N, "truncated": … }`
and takes `limit` (1–1,000 entries) and `offset`. Every page keeps the
ledger's option header, so each one parses on its own; but a page past the
first carries no balances from before it, so its balance assertions, pads and
lot reductions validate only across the whole export (w1/232). A `time` window
read in one page does carry them, as opening `S` summaries, and checks on its
own. `total` counts the
entries the filters select and `truncated` says whether more remain. Without
`limit`, the MCP resource returns the first 200 entries — a whole ledger's text
can run to hundreds of kilobytes — while REST and GraphQL return every entry,
the export the dashboard downloads.

Account journal requires `account`, accepts `filter`, `time`, `limit`, `offset`,
`conversion`, the AccountFilter `filter_account` (or `filterAccount`),
and `with_children` (or `withChildren`), and defaults to 20 entries, offset 0,
`with_children=true`, and `conversion=at_cost`. Both spellings of the two
params work on every surface — the camel twins are accepted on the MCP
resource and REST query, the snake twins on the GraphQL input — and passing
both spellings with two different values is refused with `BAD_USER_INPUT`
rather than guessed. Source files returns filenames
from the ledger service, rather than a repository directory listing.

Additional report resources are `overview`, `documents`, `accounts`,
`statements/income-statement`, and `statements/balance-sheet` under
`beancount://{owner}/{name}/`. Statements and overview accept `account`, `filter`,
`time`, `conversion`, and `interval`; defaults are `USD` and `monthly`, matching
GraphQL. Events and documents accept `account`, `filter`, and `time`. Event
reads retain date order; omitting filters returns every Event directive. For
example, `beancount://alice/main/events?time=2016` selects that year. Accounts accept
`status=open` or `status=closed`; other values return all accounts as in GraphQL.

`entries-count` and `postings-per-account` accept the same optional `account`,
`filter`, and `time` arguments. Time filters use the Fava-compatible clamped
report stream (including generated opening/transfer entries). An account filter
on `postings-per-account` selects matching entries and counts every posting on
those entries, including counterpart accounts; zero-count accounts are omitted
and rows are sorted by account name.

`entries-count` leaves out managed price feed directives, the `price` entries a
`https://beancount.io/prices/<ALIAS>` include supplies: the plan limit reads this
report, and a feed must not look like it consumed the directive allowance
(ADR 015 §9). `listLedgerEntries`, the journal and BQL do include them, so on a
ledger with a feed the Price count here, and the sum over the twelve types, is
lower than their count of price directives and than the unfiltered
`listLedgerEntries` `total`; every other type agrees. The `entriesCount` that
`checkLedger` returns is this same report, and GraphQL's
`getLedgerEntriesCountPerType` says the same in its description (w23/236).

By default (`shape=summary`) REST and MCP return each statement as totals
and the nonzero accounts behind them, in one stated `currency`. Whatever the
other currencies hold is not added in, but it is not hidden either: when the
stated currency leaves something out, the summary carries `otherCurrencies`, a
map from each other currency or commodity to the amount its headline number
excludes — net worth on the balance sheet and overview, `net` on the income
statement, each interval's `total` — so `conversion=units` on a ledger with
stocks lists them there. The balance sheet adds `valuation`: `units`
(positions unconverted), `cost` (booked cost), or `latest-price` (a currency
conversion or `at_value`, priced as of `asOf`: the latest price on or before
it). A
conversion to a currency the ledger has no prices for converts nothing, so it
reads `units` and reports in the currency the data does carry.
`conversion=units_by_cost` reads `units` too: its balances are raw units keyed
by cost currency — `VTI {EUR}` for units held at a EUR cost, `EUR {}` for units
held without one — so a client can tell cash from a cost-basis holding in the
same currency; read it with `shape=fava` to keep every key per account. `asOf` is both
the position cut-off and the price date, so a historical window shows its positions at
the prices recorded by its last day (w1/193). `netWorth` is always
`assets + liabilities`, on the same basis as `byAccount`. The income
statement's `period` gives `to`, the statement's last day, and `time`, the
selection as requested. `from` is `null` because chart buckets carry only
their end dates.

Summary amounts are JSON numbers, so a client can compare and add them without
parsing: `assets`, `liabilities`, `equity`, `netWorth`, `income`, `expenses`,
`net`, every `byAccount` balance, the overview's `series`, each interval's
`total`, and every `otherCurrencies` value. A JSON number is a double, which
holds about 15 significant digits whatever the magnitude, so a small amount
with many decimals runs out of digits long before 2^53. An amount of up to
15 significant digits is exact; a longer one reads as the
nearest double, and nothing marks it. `0.123456789012345678` of an 18-decimal
token reads `0.12345678901234568`, and `90071992547409.93 USD` reads
`90071992547409.94`. For the exact decimal, read the statement or overview
with `shape=fava`, read holdings, or query with `runBqlQueryStructured`: each
returns decimal strings (w31/147).

Prices come from the ledger's `price` directives alone, on the statements, the
overview and holdings alike, as in stock beancount without the `implicit_prices`
plugin: an `@` annotation on a posting is not a price (w1/229). A holding with no
directive is valued at cost, and holdings answers `valuation: "partial"` naming
the missing leg. A position with no cost basis has no cost to fall back on: it
stays in its own units, and its `missing_price_summary` line says `shown in
units` instead of `valued at cost` (w1/266). Under a currency conversion a
holding is valued at its commodity's own quote in that currency when the
ledger has one, as `bea report holdings` and stock beancount convert it, and
only otherwise through the currency it was costed in: 10 VT bought at 90 EUR
in a USD ledger that quotes VT at 110 USD is worth 1,100 USD, with no VT
quote in EUR needed. Its cost basis still converts through that cost
currency, and stays in it, with that leg named missing, when the cost
currency has no quote in the conversion currency (w1/290).

Holdings agree with `bea report holdings` on three more rules (w1/292). A
`price` directive of zero is a quote: a delisted share quoted at `0 USD` is
worth nothing, not its cost or an older quote. A group is left out only when
every lot in it is sold: +2 HOOL held long and -2 HOOL held short net to
0 HOOL but stay, with their -40 USD cost basis and a null `average_cost`. A
group merged from lots costed in different currencies shows the latest of
their quotes, and of two quotes from one day, the quote of the lot whose cost
currency sorts first.

When an explicit currency `conversion` did not reach everything, the summary
also carries `missingPrices`: one `{from, to}` leg per currency that stayed
unconverted because the ledger has no price path to `to` — the same shape holdings
returns. `?conversion=EUR` on a ledger that names EUR but has no price path to it
answers in `USD` with `missingPrices: [{"from": "USD", "to": "EUR"}]` rather than
passing for a EUR report; a currency the ledger never names is refused with
`BAD_USER_INPUT` "Unsupported conversion". The field is present only then; it is absent for `units`, `at_cost`,
`at_value`, `units_by_cost`, an omitted conversion, and a fully converted report. The raw
`shape=fava` payloads and GraphQL return the chart data unchanged: their
currency-keyed balances already show which currencies were not converted.

Income-statement and overview summaries use the currency observed in their
reported balances. When those maps contain no currency, valuation strategies
(`units`, `at_cost`, `at_value`, `units_by_cost`) use the USD fallback; an explicit currency such
as `EUR` remains the fallback requested.

With `shape=fava`, statement and overview payloads retain the ledger service's
snake-case field names on REST/MCP. GraphQL exposes camel-case equivalents, including
`balance_children` → `balanceChildren`, `has_txns` → `hasTxns`, and
`account_balances` → `accountBalances`. Currency and account dictionary keys,
and decimal strings inside them, are unchanged.

The trial balance (`beancount://{owner}/{name}/trial-balance`, REST
`GET /api-gateway/v1/ledgers/{owner}/{name}/trial-balance`, GraphQL
`getLedgerTrialBalance`) returns the five account trees and the two lines
that make valued roots net. `valuation_adjustment` (GraphQL
`valuationAdjustment`) is what valuing moves: a holding's unrealized gain, a
currency's translation, at cost a priced exchange's conversion (w1/291).
`rounding_residual` (GraphQL `roundingResidual`) is the rounding Beancount's
tolerance accepted in transactions no price weighs: two `3.333 USD` legs
against `-6.67 USD` leave `0.004 USD` there, not in the valuation line
(w1/305). Every balance map the ledger service returns drops a currency that
nets to zero, so a line with nothing in it is `{}` under every conversion;
both are `null` under `units` and `units_by_cost`.
`bea report trial-balance --json` spells the same zero `{"USD": "0"}` under a
currency conversion, the operating-currency default included, as it spells
its other headline totals, and `{}` under `at_cost` and `at_value`. The two
spellings are deliberate and mean the same zero: read a missing currency as
zero instead of comparing keys (w31/032). With a time filter the hosted
rounding line starts at the period's first day, because the hosted opening
balances net the earlier transactions.

Collaborator reads also require `ledger.admin` and current administrative
access, even though they do not modify data:

- `beancount://{owner}/{name}/collaborators{?page,limit}` lists members and their
  permissions, defaulting to page `1` and limit `10`, at most 50 per page.
- `beancount://{owner}/{name}/collaborators/permission{?collaborator}` reads one
  member's permission and user information. `collaborator` is required and
  must be the owner or a collaborator; any other name, whether or not the
  account exists, answers `NOT_FOUND` with the same message.

Optional user fields omitted in REST/MCP appear as `null` when selected in
GraphQL. The workflow preserves its existing behavior: a failed per-member
permission request omits that member from listing, while a failed standalone
permission request fails the call.

Ledger metadata is available at `beancount://{owner}/{name}/metadata`.

The ledger's effective core options are at `beancount://{owner}/{name}/options`
(REST `GET /api-gateway/v1/ledgers/{owner}/{name}/options`; GraphQL
`getLedgerOptions(ledgerId)` or the nested `Ledger.options`). All three return
the same ten camel-case fields: `title`, `nameAssets`, `nameEquity`,
`nameExpenses`, `nameIncome`, `nameLiabilities`, `accountCurrentConversions`,
`accountCurrentEarnings`, `renderCommas`, and `operatingCurrency`. Values are
what the ledger resolves, Beancount's defaults included, so no option lines
need parsing. `operatingCurrency` lists the currencies the ledger declares it
reports in, and may be empty. It is not the `currencies` vocabulary, which
lists every currency a posting uses. The read follows the same reports-read
access as the statements. It is a resource only: no tool returns it, and the
`getLedgerContext` vocabulary does not include it.

Account discovery resources need no ledger target:

- `beancount://catalog/ledgers{?page,limit}` lists accessible ledgers.
- `beancount://catalog/ledgers/owned{?page,limit}` lists owned ledgers.
- `beancount://catalog/ledgers/search{?q,topic,includeDesc,uid,priorityOwnerId,teamId,starredBy,private,isPrivate,template,archived,mode,exclusive,sort,order,page,limit}` searches with the GraphQL search contract.
  Two parameters concern visibility, and they differ: `private` is an
  inclusion toggle (default `true`, so private ledgers the caller can read
  appear beside public ones; `false` drops them), while `isPrivate` is an
  exclusive filter (`true` returns only private ledgers, `false` only public
  ones). `private=true` therefore changes nothing against the default, and a
  broad query can fill its page with public ledgers before any private one;
  use `isPrivate=true` to list only the caller's private ledgers. REST and
  GraphQL take the same two parameters with the same meaning.

A pinned credential receives only its ledger from accessible listing (page one;
subsequent pages are empty). Owned/search results omit other ledgers from the
returned upstream page. Unpinned credentials use the caller's account catalog.

The legacy `ledgerMeta` shape is available at
`GET /api-gateway/v1/legacy/ledger-meta`. Its optional `userId` is a compatibility
argument; authentication determines the caller. The legacy metadata and journal operations
preserve the historical default: omitted `ledgerId` uses the credential pin,
then the caller's first ledger if unpinned. Explicit targets still cannot expand
a pin. Ordinary MCP ledger tools continue to require an explicit target for an
unpinned credential.

Legacy `journalEntries` is available at
`GET /api-gateway/v1/legacy/journal-entries`. It accepts `first`, `after`,
`last`, `before`, `detailed`, `searchQuery`, `accountFilter`, `amountMin`,
`amountMax`, `entryTypes`, `sortBy`, `sortOrder`, and `groupBy` as query
parameters. `entryTypes` is a JSON-encoded string array. The response preserves
legacy posting conversions, computed fields, and `pageInfo`; its ledger is the
credential pin or the caller's first ledger, as in GraphQL.

Boolean query values are `true` or `false`. REST exposes the same owned/search
operations at `/api-gateway/v1/ledgers/owned` and `/api-gateway/v1/ledgers/search`.

Analysis resources accept their supported optional `account`, `filter`, `time`,
`interval`, `conversion`, and `accountName` inputs as URL query parameters. The
resource template advertises each read's accepted names. For example:

```text
beancount://alice/books/interval-totals?time=2026&interval=month&conversion=USD
```

Encode path values and query values using standard URL encoding. Some required
arguments occupy a path position, such as
`account-report/Expenses%3AGroceries?time=2026`. Unknown or repeated query
parameters are refused before the report runs.

Bank connection/account resources require admin capability. Staged transactions
and suggestions use read capability, with current bank and ledger relationships
checked separately. The two bank suggestion resources also require AI-use
authority. A read resource can invoke suggestion services; do not assume every
resource is a static stored document.
See [`mcp-resources.ts`](../src/features/ai-agent/api/mcp-resources.ts) for the
catalog and service calls.

### Balance-sheet current earnings

Read `beancount://alice/main/statements/balance-sheet?time=2025&conversion=at_cost`
from either Codex or Claude Code. The equivalent REST read is
`GET /api-gateway/v1/ledgers/alice/main/statements/balance-sheet?time=2025&conversion=at_cost`.
Add `shape=fava` for the full trees and interval series; GraphQL exposes these
through `getLedgerBalanceSheet`.

Balance-sheet equity includes the selected period's income and expenses in
`Equity:Earnings:Current`, using the ledger's configured `name_equity` and
`account_current_earnings` names. Time-filtered reports carry earlier earnings
in previous earnings.
Equity chart points include earnings through each interval end. This is a
report-only view: it writes no closing transactions and leaves the journal,
income statement, and trial balance unchanged. Account and advanced filters
still select their existing scope; a filtered subset need not reconcile as a
complete ledger. Currency conversion and price-date rules remain as described
above.

### Transaction lookups

`narration-transactions{?narration}` returns the latest exact narration match,
or JSON `null` when no transaction matches. Supply `narration` explicitly:
an empty string is a valid narration, and a matching transaction keeps
`narration:""` in its result. Omitting the parameter is an argument error.
For example, read this URI through `resources/read`, replacing `alice/main`
with your selected ledger:

```text
beancount://alice/main/narration-transactions?narration=
```

For nonempty text, percent-encode the value once. Both the query form and the
existing path alias remain supported:

```text
beancount://alice/main/narration-transactions?narration=Buying%20groceries
beancount://alice/main/narration-transactions/Buying%20groceries
```

Both forms use the same read permissions and return one latest transaction,
including its date, payee, narration and postings. The REST query parameter and
GraphQL `narration` argument accept the same explicit empty string. An unmatched
payee or narration returns JSON `null` on REST/MCP and a nullable field without
errors on GraphQL; genuine service failures remain errors. Discover the
canonical template with `resources/templates/list` in Claude Code, Codex or any
other MCP client.

## Prompts

Four prompts bring the `beancount-*` ledger playbooks to agents that cannot read
`skills/`. A prompt is text the user selects. It does no ledger work itself: each
call it tells the agent to make is authorized when that tool or resource runs,
with the credential's scopes and ledger restriction.

| Prompt               | Arguments (all optional)                                        | What it asks the agent to do                                                                                                                                                                                                                                                                  |
| -------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spending-report`    | `period` (`2026-08`, `last quarter`), `question`, `ledger`      | Answer spending questions without writing, showing the BQL behind every figure                                                                                                                                                                                                                |
| `close-month`        | `month` (`YYYY-MM`), `ledger`                                   | Walk a month-end close and report unverified accounts and unpinned assertions instead of claiming a finished close                                                                                                                                                                            |
| `reconcile-account`  | `account`, `period`, `statement` (CSV or pasted text), `ledger` | Classify every difference against one statement, then append missing entries and a balance assertion after confirmation                                                                                                                                                                       |
| `categorize-imports` | `item_id`, `ledger`                                             | Categorize staged bank transactions into existing accounts, flag duplicates, and submit after confirmation. `item_id` is the connection's own `id` (pitm\_…), not its Plaid `itemId`. Listing linked banks needs `ledger.admin`; otherwise pass `item_id` or work with what is already staged |

An argument sent as an empty string — or whitespace-only for free-text arguments
— counts as omitted, so a client form that submits an unfilled field gets the
same playbook as one that leaves it out. `month` must be `YYYY-MM` and `ledger`
must be `owner/name`; any non-empty malformed value (including whitespace) is
refused rather than folded into the playbook. A credential restricted to one
ledger is told that ledger, and a `ledger` argument outside the restriction is
named as refused.

**Selecting a prompt does not approve its writes.** A playbook that writes shows
the proposed entries and waits for an explicit yes, and a read-only credential
stays read-only whatever the answer.

### Using prompts from a client

- **Claude Code** lists each prompt as a slash command, such as
  `/mcp__beancount__spending-report 2026-08`. Arguments are positional in the
  order shown above, so `reconcile-account` takes `account` before `period`.
  Paste a multi-line statement in your next message rather than on the command
  line.
- **Codex** 0.154.0 documents MCP tools but not prompts. Retrieve the playbook
  with `prompts/get` as shown in
  [Inspect the protocol with curl](#inspect-the-protocol-with-curl), and send its
  text as your first message.

Clients with MCP prompt support offer the same four prompts in their own picker.
The [MCP agent journeys](./mcp-agent-eval.md) run all four playbooks through both
clients.

## Inspect the protocol with curl

Set `BEANCOUNT_MCP_URL` to your full endpoint and `BEANCOUNT_MCP_TOKEN` to a
ledger-scoped credential in your local environment. The following requests only
discover capabilities and query balances. The balance query as written assumes a
credential pinned to one ledger; with an unpinned credential, add
`"ledger": "owner/name"` to its `arguments` (the call then refuses with
`Select a ledger using ledger: owner/name` instead of guessing):

```bash
mcp_post() {
  curl --silent --show-error --no-buffer --max-time 30 \
    --header "Authorization: Bearer $BEANCOUNT_MCP_TOKEN" \
    --header 'Content-Type: application/json' \
    --header 'Accept: application/json, text/event-stream' \
    --header "MCP-Protocol-Version: ${BEANCOUNT_MCP_VERSION:-2025-11-25}" \
    --data "$1" \
    "$BEANCOUNT_MCP_URL"
}

mcp_post '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"beancount-guide","version":"1.0.0"}}}'
```

Read `result.protocolVersion` from the initialization response and set
`BEANCOUNT_MCP_VERSION` to that negotiated value before continuing:

```bash
mcp_post '{"jsonrpc":"2.0","method":"notifications/initialized"}'
mcp_post '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
mcp_post '{"jsonrpc":"2.0","id":3,"method":"resources/templates/list"}'
mcp_post '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"runBqlQuery","arguments":{"query":"BALANCES"}}}'
```

A client without a prompt picker retrieves a [prompt](#prompts)'s text and
sends it as its first message. With `jq` installed:

```bash
mcp_post '{"jsonrpc":"2.0","id":6,"method":"prompts/get","params":{"name":"spending-report","arguments":{"period":"2026-08"}}}' \
  | sed -n 's/^data: //p' | jq -r '.result.messages[0].content.text'
```

For a credential pinned to `alice/books`, a resource read is:

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "resources/read",
  "params": { "uri": "beancount://alice/books/trial-balance" }
}
```

The SDK may frame a response as SSE (`event: message`, then `data: {...}`), so
the entire response body is not necessarily a JSON document. An accepted
notification returns `202` without a body. A full client should use an MCP SDK
to handle framing, initialization, and version negotiation.

## Results and failures

The common [rate limiter](../src/server/api/rate-limit.ts) counts calls per
credential and operation. Default budgets are 300 read, 60 write, and 30 admin
calls per minute; minting an API key on GraphQL or REST carries a
five-per-minute override. These are
operation-class budgets, not one combined allowance for the entire MCP endpoint.

A `dry_run` (or `dryRun`) preview of a write draws on its own bucket, three
times as wide as the write it previews: 180 previews per minute per credential
and tool against 60 commits, so a preview never spends the commit's budget and
an agent can preview freely before it commits. The bucket is keyed like the
commit's and is the same on REST, GraphQL and MCP. Only a boolean `true` on
`dry_run` or `dryRun` earns it, and only a write operation: a read keeps its
read budget and an admin operation (such as deleting a ledger) keeps its admin
budget, preview or not. An operation with a deliberately small write budget
keeps the ratio, three times its own. A preview still runs the full
authorization and bean-check projection, so it is limited, just not against the
commit.

The MCP endpoint itself also carries a read-class transport budget, and the
handshake — `initialize`, its acknowledgement, `tools/list`,
`resources/templates/list`, `prompts/list`, and `ping` — is charged to a
separate, far larger bucket instead of the session's own. A long session is
therefore bounded by the work it does, not by how many JSON-RPC messages it
took to do it, while a client that only ever posts `{"method":"ping"}` is still
bounded by something. `prompts/get` and `resources/list` are deliberately
charged as work: one is the caller choosing to do something, the other
enumerates ledgers and source files.

### The result envelope

The text block leads with what a person would read, and `structuredContent` is
what a program parses. Both carry the whole result, because some clients hand
the model only the text block (claude.ai's connector does). Every tool's text
block except `runBqlQuery`'s is a lead line followed by `structuredContent`
serialized as compact JSON on the last line. The lead line is, for example, a
count (`42 items`, `12 files`, `1000 rows (truncated)`), a write's `summary`,
or `<tool>: ok`. A failure leads with `CODE: message`, `Hint: …` and, when
present, `Retry after: Ns`; its last line carries the same envelope, including
`newLedgerErrors`, `limitOwner`, and any payload the refusal attached. A
paginated read's last line includes its `page` signal. Older servers ended a
long success at the lead line and left the data in `structuredContent` only.

`runBqlQuery` leads its text block with the canonical row count
from the same query execution, followed by the rendered table. Multiline cells
and directive postings do not add result rows. `structuredContent.result`
remains the exact rendered string, including embedded and trailing newlines, up
to a ceiling: past 1,002 lines (header, separator, and 1,000 rows) or 100 KB,
the text is cut at a line boundary and ends with a `[truncated: showing the
first N of M lines (B of T bytes) …]` line. The lead line then reads
`3209 rows (output truncated; …)`. The count is still the whole result's. Add
`LIMIT` or a narrower `WHERE` to see the rest; `runBqlQueryStructured` stops at
the same 1,000 rows (`truncated: true`, no total).
REST and GraphQL `queryShellText` return the full text.

A zero-row result renders as the empty string on every surface — no
headers, no marker — which is what stock beanquery prints (nothing), so
the shared renderer keeps it as the established empty marker rather
than inventing headers (w23/168). The count travels beside the text
instead: MCP's text block leads with `0 rows`, GraphQL `queryShellText`
exposes the same count as `rowCount`, and REST clients read it from the
JSON table's rows (REST `text/plain` is the raw rendering). Errors throw
rather than rendering empty, so `""` with `rowCount: 0` unambiguously
means zero rows.

The query travels in a POST body end to end, so it meets no URL-length
ceiling: bulk `OR` chains and long literals run as written on every surface,
up to 262144 bytes (256 KiB of UTF-8) of query text. A longer query is refused
with `BAD_USER_INPUT` (`BQL query is N bytes, over the limit of 262144.`, hint
`Split the query into smaller ones.`) before authorization, identically on
REST, GraphQL and MCP. Within that size, what is bounded is how deep the
engine would recurse: a run of one operator at one parenthesis level is at
most 500 long (an `OR` list of up to 501 comparisons), and a query holds at
most 2,000 operators. Past those the query is refused with `BAD_USER_INPUT`;
write a longer list as `x IN (…)`, whose members are not operators, so the list
is exempt from both operator limits (w1/213). It is not exempt from the byte
cap: every member is query text and counts toward the 262144 bytes.

When an older ledger service omits count metadata, or reports an unknown count,
the text begins `BQL result — row count unavailable` and preserves the readable
result. `runBqlQueryStructured` returns a table with column metadata instead: its `rowCount` counts
the rows returned, capped at 1,000, and `truncated` says whether rows were
dropped. Text results retain their full count.

BQL `dtype` labels currently come from the ledger service's inference, not a
native expression schema. Numeric-looking or date-looking text and renamed
projections can be labelled incorrectly; empty or entirely null columns fall
back to column names. Scalar text and decimal strings preserve their values,
including leading zeros and precision. Do not convert an identifier to a number
solely because its inferred `dtype` says `Decimal`. A NULL cell, such as a
missing payee or price, `SELECT NULL` or a `sum` over an empty filter, is
returned as `null` by REST JSON and `runBqlQueryStructured`, and stays distinct
from an empty string `""`; GraphQL `queryShell` keeps `""` for a NULL cell so its
generated clients are unchanged. To tell them apart on GraphQL, test in the
query: `WHERE payee IS NULL` counts the missing ones. REST JSON, GraphQL
`queryShell` and `runBqlQueryStructured` share the same producer metadata and
this [known type limitation](../../ledger/README.md#bql-column-types).

An inventory cell, such as `sum(position)` or the running `balance` (also
`JOURNAL`'s), holds the lots still held. The text table lists each lot's units
(`5 VTI, 3 VTI`), and the structured result sums them per currency
(`{"VTI": "8"}`). A lot that a sale emptied is left out, as stock leaves it
out: after the 5 VTI lot is sold, the cell reads `3 VTI`, not `0 VTI, 3 VTI`.
An inventory with nothing left is blank (`{}` structured). Neither form shows
a lot's cost, because the engine's inventory cell carries none, where stock
prints `3 VTI {110.00 USD}`. For costs, select `position` per posting (each
lot with its cost and date, `3 VTI {110.00 USD, 2026-01-03}`), or
`cost(sum(position))` for the total cost (`330.00 USD`).

A selected `description` cell joins the payee and narration with ` | ` and
leaves out an empty one, as stock does: `* "Shop" ""` reads `Shop`,
`* "" "Rent"` reads `Rent`, and `* "" ""` reads `""`. A filter, grouping or
expression on `description` still sees the engine's text, which keeps the
separator (`Shop | `), so `WHERE description = 'Shop'` misses that
transaction. Filter on `payee` and `narration`, which match exactly
(`WHERE payee = 'Shop'`). See the
[ledger notes](../../ledger/README.md#bql-description-with-an-empty-payee-or-narration).

```json
{ "ok": true, "result": "tool-specific payload" }
```

A failure sets the MCP result's **`isError: true`** and carries one envelope on
every tool:

```json
{
  "ok": false,
  "error": {
    "code": "UNBALANCED",
    "message": "Transaction does not balance: residual 5 USD",
    "hint": "Postings do not sum to zero. Add the missing posting, elide one amount, or pass `allowInvalid: true` to record it deliberately."
  }
}
```

Branch on `error.code`; `error.hint` names the next call to make. `retryAfter`
is present only for `RATE_LIMITED`. A limit a plan sets also carries
`error.limitOwner`, on `RESOURCE_LIMIT_REACHED` and on the AI allowance's
`RATE_LIMITED`: `REQUESTER` when it is the credential's own plan, `LEDGER_OWNER`
when it is the ledger owner's, so only they can lift it. A limit no plan sets has
none. REST returns the same value in `error.metadata` and GraphQL in its
extensions (ADR 001 D13). A `VALIDATION_FAILED` from a write that
would break the ledger also carries `error.newLedgerErrors`: each new error as
`message (file:line)`, joined by `; `. That is the same string REST returns in
`error.metadata` and GraphQL in its extensions (w23/077). The published error
schema lists only the fields every refusal has, and admits these others.
Arguments that do not match a tool's
published input schema are refused the same way, before any work runs:
`BAD_USER_INPUT` with a message of the form `path: reason`, where `path` names
the field (`files.0.start_line` for a nested one). An unknown tool name answers
`NOT_FOUND`. Check `isError` first — HTTP 200 does not
mean the tool succeeded.

Each tool advertises an object `outputSchema`: `ok` is required, with optional
`result` and `error`. Its fields are intentionally undocumented there — the
envelope is identical on every tool, so describing it once here costs one copy
instead of one per tool in each `tools/list`. The runtime success/failure
convention is stronger than that published schema because the SDK requires an
object schema here. See
[`types.ts`](../src/features/ai-agent/tools/types.ts) and MCP's
[structured tool results](https://modelcontextprotocol.io/specification/2025-11-25/server/tools#structured-content).

### Argument limits

Every argument is checked before the tool runs, on MCP and equally on REST and
GraphQL, and a value that breaks one rule is refused as `BAD_USER_INPUT` naming
the parameter. Nothing is stripped or truncated.

- A bank id (`itemId`, `accountId`, `transactionIds`) may not be empty or
  blank (w1/189); an optional account filter left empty still means every
  account.
- A string may not contain a NUL (U+0000) or an unpaired surrogate (text that
  is not valid Unicode). Ledger file text (`content`, `text`, `newContent`, and
  `files[]` `content`/`old_string`/`new_string`) may contain a NUL, because a
  ledger file stores it, but never an unpaired surrogate.
- A string is at most 1048576 characters; ledger file text is at most 8388608
  characters (a ledger file itself is capped at 1 MiB).
- A BQL `query` (`runBqlQuery`, `runBqlQueryStructured`) is at most 262144
  bytes of UTF-8, tighter than the string limit; its operators are bounded too
  (see [the result envelope](#the-result-envelope)).
- An array has at most 10000 members.
- Objects and arrays nest at most 32 levels.
- A file path is relative to the ledger root, with folders separated by `/`.
  A leading, trailing or doubled `/`, a `.` or `..` part, a `\`, or a path
  inside `.git` is refused, and the message quotes the path and names the rule,
  so a call with several paths (`oldPath` and `newPath`, `files[]`) shows which
  one to fix. A path may start with `./`, which means the ledger root, and a
  `listLedgerFiles` `dir_path` may end in one `/`, which names that folder.

Send a larger input in several calls. These ceilings are far above normal use,
so a refusal means the argument is malformed.

### Pagination

A paginated read tells the caller whether more remains, without changing the
shape of its result (most are bare arrays, so a field could not be added).
The signal rides beside the result, in one shape on every surface:

| Surface      | Where                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------- |
| MCP tool     | `structuredContent.page`, next to `ok` and `result`                                             |
| MCP resource | the content's `_meta.page`, and a second content item `{"page": …}` (`application/json`)        |
| REST         | `X-Has-More`, `X-Total-Count` (only when the total is known) and `Link: <…>; rel="next"`        |
| GraphQL      | the response's `extensions.page`, keyed by each field's response key (its alias, if it has one) |

A resource's first content item stays byte-identical to the REST body; the
second carries only the signal, so a host that shows content text and not
`_meta` still learns whether more remains.

The `page` object holds `returned` (entries in this page), `hasMore`, and, when
they apply, `limit`, `offset` or `page` (where this page began), `total` (the
whole filtered count, only where the read knows it), and `nextOffset` or
`nextPage` (only when `hasMore`). Reads paged by `offset` and `limit` know their
`total` or whether they were cut off, so `hasMore` is exact. Reads paged by
`page` and `limit` cannot count what is left: `hasMore` is true when the page
came back full, so a final page of exactly `limit` entries reads `hasMore: true`
and the next page is empty.

| Read                                          | Paged by         | `hasMore` is              |
| --------------------------------------------- | ---------------- | ------------------------- |
| `listLedgerEntries`, journal, account journal | `offset`/`limit` | exact (`total`)           |
| plaintext journal                             | `offset`/`limit` | exact (`truncated`)       |
| feed                                          | `offset`/`limit` | exact (`total`)           |
| `listLedgers`, owned and searched ledgers     | `page`/`limit`   | "the page came back full" |
| staged bank transactions                      | `page`/`limit`   | "the page came back full" |
| commits, collaborators, public keys           | `page`/`limit`   | "the page came back full" |
| followers, following, starred ledgers         | `page`/`limit`   | "the page came back full" |

`listLedgers` and `listStagedBankTransactions` called with neither `page` nor
`limit` return every row and report `hasMore: false`; the dashboard's Bank
Sync table reads the staging area that way. Importing or discarding staged
rows removes them from the list, so an agent that acts on one page reads
page 1 again rather than the next page. `listLedgers`, the owned ledgers, and `listStagedBankTransactions` called with
a `page` but no `limit` read pages of 30. Ledger search never
returns every match: without a `limit` it reads pages of 30, so a full first
page reads `hasMore: true` with `nextPage: 2`, and any `limit` up to 100 is
served in full. Public keys also read pages of 30 without a `limit`; they
exist on REST and GraphQL only. Followers, following and starred lists keep
their `total`, which counts only the entries returned in that page.

### Failure codes

The same codes reach resource reads and prompt fetches, as the JSON-RPC error's
`data`. The message reads like a tool refusal's text, `CODE: message` then
`Hint: …` (and `Retry after: Ns` when present), so a host that shows only the
message still reads what to do next; a client's SDK adds exactly one
`MCP error <n>:` prefix. That covers the two mistakes a client makes before any
handler runs: a resource URI matching no template, under `beancount://` or any
other scheme, answers `NOT_FOUND` (`-32002`) with a hint naming
`resources/templates/list`, and a malformed `month` or `ledger` argument to a
prompt answers `BAD_USER_INPUT` (`-32602`) naming the argument. A resource URI
that matches a template but is malformed — an unknown or repeated query
parameter, a `#` fragment, or invalid percent encoding — also answers
`BAD_USER_INPUT` (`-32602`), with a hint naming what the template accepts, and
so does a string that does not parse as a URI at all, with a hint giving the
`beancount://` shape.

A refusal quotes at most 120 characters of any value it echoes: a longer run
ends in `…`. Control characters other than tab and line feed come back escaped
as `\uXXXX`. REST and GraphQL apply the same rule (w1/225).

A `NOT_FOUND` on a bank connection, pull request, commit, branch, archive or user carries its own hint naming where that id comes from (for example `listBankConnections`), instead of the fallback that points at `listLedgers`, `listLedgerFiles` and `listLedgerEntries`. The sentence travels in `error.hint` on MCP and in the same metadata on REST and GraphQL.

| `error.code`             | JSON-RPC | What it means and what to do                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BAD_USER_INPUT`         | `-32602` | An argument is wrong. `tools/list` publishes each tool's input schema.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `VALIDATION_FAILED`      | `-32602` | A field failed a business rule. The message names the field path. On `entries`, it names each bean-check error the write would add; fix the entries, or pass `allowInvalid: true` to record them anyway.                                                                                                                                                                                                                                                                                          |
| `UNBALANCED`             | `-32602` | Postings do not sum to zero. Add a posting, elide an amount, or pass `allowInvalid: true`.                                                                                                                                                                                                                                                                                                                                                                                                        |
| `NOT_FOUND`              | `-32002` | No such ledger, file, entry, or revision. `listLedgers` and `listLedgerFiles` say what exists.                                                                                                                                                                                                                                                                                                                                                                                                    |
| `FORBIDDEN`              | `-32003` | The credential lacks authority, or a pinned credential named another ledger. The hint names what would be accepted — the credential types or scope the operation takes, or that it reaches only your own account; for a ledger permission, read the ledger's `metadata` (w1/206).                                                                                                                                                                                                                 |
| `UNAUTHENTICATED`        | `-32003` | The credential expired or was revoked. Re-run the OAuth flow, or use a live API key.                                                                                                                                                                                                                                                                                                                                                                                                              |
| `PREMIUM_REQUIRED`       | `-32003` | The operation needs a paid plan on the credential's account.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `RESOURCE_LIMIT_REACHED` | `-32003` | A limit is reached. Remove something; `limitOwner`, when present, says whose plan set it.                                                                                                                                                                                                                                                                                                                                                                                                         |
| `OPERATION_NOT_ALLOWED`  | `-32003` | The ledger's current state forbids it.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `CONFLICT`               | `-32000` | Something changed since you read it. Re-read with `getEntryContext` and resend the fresh `sha256sum`. `addLedgerEntries` and `appendLedgerText` take no `sha` and retry a lost race themselves: from them it means every attempt lost, so send the same call again (with its `requestId`). `renameAccount` and `renameLedgerFile` take no `sha` either: from them it means another write changed a file the rename touches, nothing was renamed, and the same call sent again re-reads the files. The entry-source edits, deletes and move also run again on a lost race: a `CONFLICT` from them whose hint says to send the same call again means every attempt lost and nothing was written. |
| `RATE_LIMITED`           | `-32000` | Over budget. Wait `retryAfter` seconds; batch writes rather than looping.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `SERVICE_UNAVAILABLE`    | `-32000` | A dependency is down, or the ledger did not answer before its deadline (30 seconds for a read, 90 for a write). Retry with backoff; the request is not the problem. After a timeout a write may already have committed: re-read the ledger before repeating it, or resend an entry write with the same `requestId` ([retry-safe entry writes](#retry-safe-entry-writes-requestid)).                                                                                                               |
| `CONFIGURATION_ERROR`    | `-32000` | The deployment is missing configuration it needs (object storage for uploads, an LLM key for AI features). Do not retry: the hint names the variables the operator must set. REST answers `503`.                                                                                                                                                                                                                                                                                                  |
| `INTERNAL_SERVER_ERROR`  | `-32000` | Server-side failure. Retry once; changing the request will not help. In production its message is always `Internal server error`, whatever the failure said (w1/189).                                                                                                                                                                                                                                                                                                                             |

| Symptom                                                                                             | Meaning and next step                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTML or an SSR error after posting to `/mcp`                                                        | Use `/api-gateway/mcp` and check proxy routing.                                                                                                                                                                                                                                                           |
| `401` with `resource_metadata`                                                                      | Missing/invalid credential, browser session, expired OAuth token, or wrong OAuth audience. Follow discovery or supply a valid key. A bearer that was sent and rejected adds `error="invalid_token"` to the challenge (RFC 6750); no credential, or a browser session, gets the plain challenge (w1/206).  |
| Tool error requesting a ledger                                                                      | Pass `ledger: "owner/name"` when using an unpinned credential. A refusal that names a slug rule means the value was malformed, not missing.                                                                                                                                                               |
| `403`, JSON-RPC error with `id: null`                                                               | The request carried an `Origin` header outside the trusted set (any `beancount.io` host, `localhost` or `127.0.0.1` on any port). Browser pages on other sites cannot call the endpoint; native and server-side clients send no `Origin` and are unaffected. An anonymous request still gets `401` first. |
| `405`, `Allow: POST`, on any authenticated non-POST method (GET, DELETE, HEAD, OPTIONS, PUT, PATCH) | Expected behavior; use Streamable HTTP POST.                                                                                                                                                                                                                                                              |
| `400`/`406` before tool execution                                                                   | Check JSON-RPC, protocol version, content type, and both Accept values.                                                                                                                                                                                                                                   |
| `isError: true`                                                                                     | Read `structuredContent.error.code` and follow `error.hint`; the table above lists every code.                                                                                                                                                                                                            |
| Resources appear absent                                                                             | Call `resources/templates/list`; verify the client supports resource reads.                                                                                                                                                                                                                               |
| OAuth metadata returns `503 oauth_not_configured`                                                   | Fix the deployment's signing configuration. A valid API key can still authenticate independently of OAuth.                                                                                                                                                                                                |

## Deployment and diagnostics

The backend needs its normal PostgreSQL, Redis, ledger, and repository services.
Apply database migrations, including the API-key tables, before testing keys.
In production, configure `DASHBOARD_URL` as the public OAuth front door and
provide `OAUTH_JWKS` as a complete private ES256/P-256 JWKS with a `kid` per key.
Missing or malformed signing configuration disables OAuth routes and discovery.
Development uses an ephemeral signing key, so restarting the backend invalidates
existing development OAuth access tokens.

Route `/api-gateway/*` and the discovery paths under `/.well-known/*` to the
backend, and consent pages to the dashboard. Preserve authorization headers and
SSE responses. See the [OAuth deployment contract](../README.md#oauth-deployment-contract)
and [well-known path inventory](../../../docs/adrs/ADR009-backend-v2-well-known-paths.md).

`/.well-known/mcp.json` is a Beancount discovery manifest with the endpoint and
descriptor-derived tool, resource and prompt catalogs. Each prompt lists its
arguments by name, description and requiredness, as `prompts/list` does. Its
`auth.scopes` field lists the `ledger.*` scope names above; OAuth
protected-resource metadata remains the authoritative source when requesting
permissions.

From `backend-cluster/backend-v2/`, run:

```bash
yarn mcp:conformance https://books.example.com
BEANCOUNT_MCP_TOKEN=… yarn mcp:conformance https://books.example.com
```

The authenticated checks read `QA_MCP_TOKEN` (or `BEANCOUNT_MCP_TOKEN`) and
`QA_MCP_READ_ONLY_TOKEN` from the repository root's `.env` first and the
environment second, so the credential need not appear on the command line;
`--token` and `--read-only-token` still override both (w1/188). The read-only
variable has that one spelling: when it is unset but a name such as
`QA_MCP_TOKEN_READONLY` or `QA_MCP_READONLY_TOKEN` is set, the command prints one
line naming the variable it reads (never a value), and the checks that need the
read-only credential skip (w23/235).

The [conformance script](../scripts/mcp-conformance.ts) checks the unauthenticated
challenge, discovery, method handling (`GET`, `DELETE`, `OPTIONS` and `PUT` must all be
`405` with `Allow: POST`), initialization/tool schemas, error masking, and canonical
path. Check 18 needs no credential: it sends an anonymous cross-origin request
and requires the 401's `WWW-Authenticate` to be listed in
`Access-Control-Expose-Headers`, since a browser-hosted client can read only the
headers a response exposes and otherwise cannot find where to sign in. It also reads the authorization-server metadata the way a
host does and checks what hosts refuse to start a sign-in without: PKCE `S256`,
`authorization_response_iss_parameter_supported` (ChatGPT's stable redirect), a
registration endpoint (DCR hosts such as Cursor), `none` at the token endpoint
(public clients, and Claude's CIMD condition), a protected-resource
`resource` equal to the probed URL, and `client_id_metadata_document_supported`
(Claude, ChatGPT, and VS Code otherwise register a client per connection)
([ADR 019](../../../docs/adrs/ADR019-backend-v2-mcp-host-compatibility.md)
D6, D8). Checks requiring absent credentials are **skipped**, not passed. It
registers no client, does not complete browser OAuth, and does not verify all
resource reads.

With `--token`, check 17 also validates real results against the `outputSchema`
that `tools/list` publishes, the way the MCP SDK client does: a `runBqlQuery`
read and one `appendLedgerText` `dry_run` preview that reports a new bean-check
error, so nothing is written. A result with a key its schema forbids fails the
check. A refused call carries no structured result to compare and is reported as
not compared, not as a pass.

With `--token`, check 19 previews `revertCommit` with `sha: "main"` and
`dry_run: true`, so it undoes nothing. It passes when the preview names the
files the newest commit touched. A refusal that answers the request (a
credential without `ledger.write`, a merge or root commit at `main`, no `main`
branch, a rate limit) is a skip. Any other error fails the check, because it
means no commit can be undone on that deployment (w23/242).

A credential that is not pinned to one ledger needs `--ledger owner/name` so the
read, preview and refusal checks (5, 10, 17 and 19) can name the ledger they use.
Without it they skip.

An optional `--read-only-token` checks refusal of a file write. Supply only a
credential restricted to `ledger.read`: the probe attempts a real create-file
operation and does not set `dry_run`. Do not supply a write/admin credential to
that flag.

Conformance says whether a client can connect. To see whether real coding agents
complete ordinary ledger tasks through the surface — correct answers, the right
ledger changes, and the calls, time, and cost it took — run the
[MCP agent journeys](./mcp-agent-eval.md) with Claude Code and Codex.

### Publishing the registry listing

The listing is [`server.json`](../server.json) at this package's root: name,
title, a description of at most 100 characters, `version`, the repository, an
icon, and one `streamable-http` remote at `https://beancount.io/api-gateway/mcp`.
A test in [`well-known-route.test.ts`](../src/features/well-known/api/__tests__/well-known-route.test.ts)
fails if its name or remote URL drifts from what `/.well-known/mcp.json`
advertises. The listing's `version` is its own lifecycle: it moves with every
listing edit (see below) and is not compared with the manifest's or the MCP
`serverInfo` version, which only change when the server's contract does.

The registry grants the `io.beancount/*` namespace to whoever proves control of
`beancount.io`. The backend can prove it over HTTP: `MCP_REGISTRY_AUTH_PROOF`
holds the public half of an Ed25519 key as the record
`v=MCPv1; k=ed25519; p=<base64 public key>`, and the backend serves it at
`GET /.well-known/mcp-registry-auth`. Unset, the route answers 404 — a self-host
must not serve Beancount.io's key, because that would let Beancount.io publish
under the self-host's namespace. The registry also accepts a DNS TXT record with
the same content at the domain apex. Production currently proves control that
way: the `beancount.io` zone in Cloudflare carries the record as an apex TXT, so
publishing does not depend on a backend redeploy. Either proof may be served;
both must hold the same public key.

Generate the key pair with OpenSSL 3 (macOS's system LibreSSL lacks Ed25519 in
`genpkey`; `brew install openssl@3` and call that binary):

```bash
openssl genpkey -algorithm Ed25519 -out key.pem
# MCP_REGISTRY_AUTH_PROOF — the public record production serves
echo "v=MCPv1; k=ed25519; p=$(openssl pkey -in key.pem -pubout -outform DER | tail -c 32 | base64)"
# MCP_REGISTRY_PRIVATE_KEY — 64 hex characters, the GitHub environment secret
openssl pkey -in key.pem -noout -text | grep -A3 "priv:" | tail -n +2 | tr -d ' :\n'
```

Keep `key.pem` and the hex private key out of the repository.

Publishing runs in GitHub Actions. The `Publish (mcp registry)` workflow
([`publish-mcp-registry.yml`](../../../.github/workflows/publish-mcp-registry.yml))
validates `server.json` on every pull request or push that touches it, and
publishes on a push to `main` whose commits changed it, or on a
`workflow_dispatch` with `publish` set. The publish job runs under the
`mcp-registry-publish` environment, whose secret `MCP_REGISTRY_PRIVATE_KEY` is
the hex private key; restrict that environment to `main` and add a required
reviewer. Before signing in, the job finds the proof — the HTTP record if
production serves it, otherwise the apex TXT record — and checks that the
registry does not already have this version; it then signs in with the
matching `mcp-publisher login http` or `login dns`.

Published versions are immutable. To change anything in the listing, bump
`version` in `server.json` — the registry marks the highest semantic version
`latest` — or the publish fails with a message saying so.

To publish by hand instead, from `backend-cluster/backend-v2/`:

```bash
mcp-publisher validate server.json
# `login dns` while production does not serve the HTTP record
mcp-publisher login http --domain beancount.io --private-key "$MCP_REGISTRY_PRIVATE_KEY"
mcp-publisher publish server.json
```

Verify either path:

```bash
curl -fsS https://beancount.io/.well-known/mcp-registry-auth  # or: dig +short TXT beancount.io
curl -fsS "https://registry.modelcontextprotocol.io/v0.1/servers/io.beancount%2Fbeancount/versions/latest" \
  | jq '{_meta, server: (.server | {name, version, remotes})}'
```

## Implementation references

| Source                                                                                                                                 | Responsibility                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [MCP route](../src/features/ai-agent/api/mcp-route.ts)                                                                                 | Authentication, ledger binding, HTTP methods, transport lifecycle.                                         |
| [Composition root](../src/server/api/composition-root.ts)                                                                              | Tool/resource registration, per-call gates, MCP result shaping.                                            |
| [Tool descriptors](../src/features/ai-agent/api/mcp-tools.ts) and [tool implementations](../src/features/ai-agent/tools/)              | Deployed tool names, schemas, execution.                                                                   |
| [Resource descriptors](../src/features/ai-agent/api/mcp-resources.ts)                                                                  | URI templates and application-service reads.                                                               |
| [Identity](../src/server/api/identity.ts) and [authorization](../src/server/api/authorization/authorization-service.ts)                | Credential capabilities and current resource authority.                                                    |
| [OAuth routes](../src/features/oauth/api/oidc-route.ts) and [discovery manifest](../src/features/well-known/api/well-known-route.ts)   | Authorization flow and public metadata.                                                                    |
| [ADR 0007](../../../docs/adrs/ADR007-backend-v2-mcp-surface.md) and [ADR 0008](../../../docs/adrs/ADR008-backend-v2-surface-parity.md) | Transport decisions and the tools/resources split; historical counts may differ from the current registry. |

### Repository history resources

All three require repository read access to the URI's ledger:

- `beancount://{owner}/{name}/latest-commit{?branchName}` returns the latest
  commit, or `null` for an empty repository. `branchName` defaults to `main`.
- `beancount://{owner}/{name}/commits{?branch,page,limit}` returns commit history.
  Defaults are `main`, page `1`, and limit `30`; a page holds at most 50, so
  page through with `page`.
- `beancount://{owner}/{name}/commit-details{?sha}` requires `sha` and returns
  metadata, parents, file statistics, and a unified diff.

Percent-encode branch names and SHA query values when constructing a URI.
A `branchName`, `branch` or `sha` with a space or line break is refused as
`BAD_USER_INPUT` naming it, because no branch or SHA holds one. Git revision
syntax that takes a space still works on a single line: inside a `@{…}` or
`^{…}` group, and after `:/`.

### Public configuration reads

`beancount://configuration/health` returns the JSON string `"OK"`, matching
GraphQL `health` and `GET /api-gateway/v1/health`. This is an application probe,
not a check of database or ledger-service readiness.

`beancount://configuration/feature-flags{?userId}` matches GraphQL
`featureFlags(userId: ...)` and `GET /api-gateway/v1/feature-flags?userId=...`.
The legacy `userId` argument is optional and does not change the result, which
is the same for every caller: `spendingReportSubscription` (always `false`),
`emailDelivery` (whether this deployment can send mail) and `selfHost` (whether
the operator runs this stack for their own users).

These REST and GraphQL reads allow anonymous callers. MCP still requires its
transport credential, but neither resource requires ledger scopes or a ledger
target. The REST OpenAPI security alternatives explicitly mark anonymous access;
protected ledger routes continue to require credentials.

The plan-tier catalog (GraphQL `allTierQuotas`, anonymous
`GET /api-gateway/v1/tier-quotas`) is not on MCP: the connector directories forbid
an app to display subscription plans ([ADR 019](../../../docs/adrs/ADR019-backend-v2-mcp-host-compatibility.md#amendments), 2026-10-09).

### Account profile

`beancount://account/profile{?userId}` matches GraphQL `userProfile` and
`GET /api-gateway/v1/user-profile`. Omit `userId` to read the caller's profile;
an explicit ID must name that same user. The account service enforces read
capability and exact-self authorization independently of a credential's ledger
pin. Results include identity fields, locale, report status, subscription tier,
ledger limits, whether the user has ever subscribed, and `defaultCurrency` — the
saved currency preference a creation flow suggests first ([ADR 026](../../../docs/adrs/ADR026-dashboard-onboarding.md#language-formatting-and-currency)),
or `null`. It is written only through GraphQL `updateProfile`, which keeps its
REST and MCP exclusion; sent alone it leaves the names unchanged, `null` clears
it, and an unsupported code is refused. `createLedger` and `previewLedgerSetup`
never read it: an omitted `setup.operatingCurrency` is always ADR026's default.

A missing user returns JSON `null`. The REST and GraphQL identity probes also
return `null` anonymously without loading account data. The MCP transport
continues to require a credential.

### Account deletion

MCP has no account-deletion tool. Deleting an account is irreversible, and a
connector directory reviewer's test of every tool would run it ([ADR 019](../../../docs/adrs/ADR019-backend-v2-mcp-host-compatibility.md#amendments), 2026-10-09). Delete the
account in the dashboard, with GraphQL `deleteAccount`, or with
`DELETE /api-gateway/v1/account`.

### Public social lists

The MCP resources below match public REST routes and GraphQL list queries:

| Resource                                  | REST GET route                                | GraphQL query         |
| ----------------------------------------- | --------------------------------------------- | --------------------- |
| `beancount://social/followers`            | `/api-gateway/v1/social/followers`            | `getUserFollowers`    |
| `beancount://social/following`            | `/api-gateway/v1/social/following`            | `getUserFollowing`    |
| `beancount://social/starred-repositories` | `/api-gateway/v1/social/starred-repositories` | `getUserStarredRepos` |

Every route/resource requires a `username` query argument and accepts `page`
and `limit`, defaulting to 1 and 20, at most 50 per page. Encode query values once. Responses retain
user/repository fields and ISO timestamps. `total` is the returned page's size,
not the overall collection size. The shared service currently returns an empty
page on upstream failure, so an empty result does not establish that the user
has no followers or stars. REST/GraphQL allow anonymous requests; MCP retains
its transport credential requirement but needs no ledger scope or target.

`beancount://social/profile{?username}` matches GraphQL `getUserProfile(username: ...)`
and `GET /api-gateway/v1/social/profile?username=...`. It returns the public profile,
follow status when authenticated, activities, and repositories. Under the existing
GraphQL contract, viewing your own username uses your authenticated Gitea client
and may include private activities/repositories; other usernames and anonymous
views use the public client. This existing self-enrichment is independent of
ledger scopes/pins. Activity and repository reads retain their 20/50 limits.

GraphQL represents an anonymous `isFollowing` as null; REST omits it. A failed
activity or repository read falls back to an empty collection independently;
failing to fetch the profile itself fails the operation on every adapter.

### Ledger stars

`setLedgerStar({ starred: true, ledger: "owner/name" })` stars a ledger for the
caller; `starred: false` removes the star. A pinned credential may omit `ledger`.
The REST equivalents are `PUT` and `DELETE` on
`/api-gateway/v1/ledgers/{owner}/{name}/star`, matching GraphQL `starLedger` and
`unstarLedger`. These operations require write capability and current read
access to the target, with ledger pins enforced on each call. No preview is
supported.

All surfaces preserve `{ success, isStarred, message }`. Upstream write failures
return `success:false`; MCP also marks the call as an error while retaining
that result. Authorization refusals occur before the upstream write. Repeated
starring retains one star, and access is checked again before unstar.

### Temporary asset upload and download

`generateTempAssetUploadUrl` accepts optional `filename` and `mimeType` and
returns `uploadUrl`, `objectKey`, and `expiresIn` (seconds). A given `mimeType`
is signed into the URL, and the result carries `uploadHeaders`
(`{"Content-Type": <mimeType>}`): PUT the bytes with exactly those headers, or
the store refuses the upload (w1/231). An upload that declared no type is read
by its key's extension, which keeps the filename's. Then use the object key in an ingestion
operation or read `beancount://temp-assets/download-url{?objectKey,s3ObjectKey,receiptObjectKey}` to obtain a
`downloadUrl` and its `expiresIn`.

The upload URL mints the canonical spelling, `objectKey`. The parse
operations historically spell it `s3ObjectKey` and the insert path
`receiptObjectKey`; every spelling works at every key input on MCP, REST,
and GraphQL alike — a key pasted from another tool need not be respelled.
Passing two spellings with two different keys is refused with
`BAD_USER_INPUT` rather than guessed; omitting the key is refused as
missing.

The existing policy requires read capability for both operations, including URL
creation. Neither requires a ledger target. Keys are bound to the authenticated
user; foreign, permanent, and malformed references receive a concealed denial.
The upload tool has no preview. Issuing a URL does not upload data or establish
that an object exists. URLs retain their configured lifetime once issued. A key
whose object is absent — issued but never uploaded, or already consumed by a
receipt insert, which promotes and deletes the upload — gets the same
`NOT_FOUND` "Temporary asset not found" as an unknown key, before any model
call or charge (w1/190).

### AI CFO usage

Monthly AI CFO usage against the plan limit is not on MCP; the connector
directories forbid an app to display subscription plans or promote upgrades
([ADR 019](../../../docs/adrs/ADR019-backend-v2-mcp-host-compatibility.md#amendments), 2026-10-09). GraphQL `aiCfoUsage` and `GET /api-gateway/v1/account/ai-cfo-usage` keep it.

### Parse uploaded statements

Call `parseFile` with `s3ObjectKey` — or `objectKey` or `receiptObjectKey`, as at every key input — and `fileFormat` after uploading a file.
It returns `rows`, each containing `date`, `payee`, `description`, and numeric
`amount`, matching GraphQL's file parser. It preserves the caller-supplied format
and uses the stored MIME type. No ledger selector is needed, including for an
unpinned credential. The existing policy allows read capability and requires
ownership of the temporary upload.
The operation checks quota first and charges the actor for completed extraction;
it does not insert ledger entries and has no preview mode.

### Suggest transaction categories

Read `beancount://{owner}/{name}/import/suggest-categories` with a
`transactions` query parameter carrying a JSON-encoded array of
`{rowIndex, date, payee, description, amount}` objects — the same shape GraphQL
`suggestTransactionCategories` accepts, with at least 1 and at most 500
transactions per read; split a larger import into several reads. An empty or
longer list is refused with `BAD_USER_INPUT` before any ledger or model work. The result is an
array of `{rowIndex, targetAccount, confidence, source, reasoning?}`
suggestions drawn from the ledger's open accounts and recent transaction
history; ledgers using an auto-accounts plugin may receive accounts outside the
current list. Requires read capability plus current content and AI-write access
to the selected ledger, and consumes AI quota on completion. REST serves the
same contract at
`POST /api-gateway/v1/ledgers/{owner}/{name}/import/suggest-categories`.

### Parse receipts and recommend accounts

`parseReceipt` accepts `objectKey` — `s3ObjectKey` and `receiptObjectKey`
work too, as at every key input — and optional `ledger: "owner/name"`. Only pinned credentials can omit the ledger. The upload
must be a caller-owned temporary image or PDF, and the caller must retain read
access to the selected ledger's contents and assets. Existing read-capability
policy is preserved.

The result contains `date`, `payee`, `description`, `amount`, and optional
`sourceAccount`/`targetAccount`. An unknown date is null. Missing recommendations
are omitted in REST/MCP and null in GraphQL. Closed accounts are excluded from
the recommendation input. Extraction and recommendation token usage is charged
together to the actor after successful completion. This operation does not
insert a transaction and offers no preview.

### Insert receipt transactions

`insertReceiptTransaction` promotes a confirmed receipt into the ledger:
`receiptObjectKey` (or `objectKey` or `s3ObjectKey`, as at every key input)
names the caller-owned temporary upload, and `input` carries
`date`, `payee`, `description`, an arbitrary-count `postings` array of
`{account, amountNumber, amountCurrency}` string-decimal legs, and
`documentAccount`. Optional `ledger` follows the standard selection contract.
Optional `requestId` makes a retry promote the receipt and post the entry
once (see [Retry-safe entry writes](#retry-safe-entry-writes-requestid)).
The ledger's `receipt_storage` beancountio-option decides the strategy: S3
storage promotes the object and writes one transaction with a receipt URL in
its metadata; git storage commits the receipt bytes into the repository and
writes a link-tagged document plus transaction pair. The receipt is stored at
`<receipt_base_folder>/<date>-<payee>-<id><ext>` (`documents/` by default).
The folder is a path from the ledger root, read like a routing option's file,
so `./receipts` and `receipts/` both store in `receipts/`. One that leads
outside the ledger (`../x`, `/x`) or that a new file can't be stored under is
refused as `BAD_USER_INPUT` naming the option, before anything is stored
(w31/153). The document directive is routed like any other (`document_file`, else
`default_file`) and names the receipt relative to that file's directory, the
way Beancount resolves it, so a document routed to `books/docs.bean` reads
`../documents/…`. Requires write capability
with current content and asset write access; unowned temporary keys are
concealed as not found. The result is `{success}`. No preview; a failed entry
write keeps the temporary upload for retry.

`renameLedgerFile` accepts `oldPath`, `newPath`, optional `message` (or
`description`), optional `updateIncludes`, optional `dry_run`, and optional
`ledger`. Pinned
credentials may omit the ledger; unpinned callers must select it. The
protected workflow validates both repository-relative paths and moves the
file preserving its content in one atomic commit (default message
`Rename oldPath → newPath`). When `oldPath`
is still `include`d, the rename is refused unless `updateIncludes: true`
rewrites those lines in the same commit. An include counts when its target
resolves to `oldPath` the way the ledger loads it, relative to the directory of
the file that declares it, so `include "x.bean"` in `d/inc.bean` names
`d/x.bean`. Includes count in the same files as for delete: every
`.bean`/`.beancount` file and every other file the ledger loads (w31/023). A
rewritten include names `newPath` relative to that same directory, keeps a
leading `./` or `/`, and is escaped so it reads back as the same path. A glob include cannot be rewritten for one file: when `oldPath`
matches a glob that `newPath` would not, the rename is refused even with
`updateIncludes`. The moved file's own relative includes are held to the same
rule: a move to another folder that would point them elsewhere is refused
without `updateIncludes` and rewritten with it, and a glob in the moved file
is refused. So are its relative `document` filenames, which resolve against
its folder too (w31/133): each one that names a file in the repository is
refused without `updateIncludes`, naming it, and with it is rewritten to name
that same file from the new folder, listed in `preview`. A root-anchored or
URL filename, and one that names no file, are left as written. The result contains `message`, `oldPath`, `newPath`,
`updatedIncludes`, and `preview`; on MCP, the write outcome's `wrote` names
`newPath`, the removed `oldPath`, and every file whose include was rewritten,
and is empty on a preview (w1/186). Write capability and current content-write
access are required.

With `dry_run: true` the workflow runs every check the commit runs, then
returns the move plus the `updateIncludes` rewrites — a `Would rename …`
message with the rewritten include lines per file in `preview` — without
committing anything. A missing source, an occupied target, and a
still-included path refuse on a preview exactly as on a commit.

A commit that another write overtook is refused with `CONFLICT` and moves
nothing: a write that changed the file, or a file whose `include` the rename
rewrites, between the rename's read and its commit. The tool takes no `sha`;
send the same call again, and it re-reads the files (w31/130).

This operation exposes GraphQL's existing contract: it has no caller-supplied
SHA. Repository conflicts remain errors.

Deleting a still-included file is refused with the same include counting —
there is no `updateIncludes` for delete; `remove_includes` drops the include
lines instead (see above).

### Update or delete entry source

Three tools reach the existing journal service:

- `updateEntrySource`: `entryHash`, `sha256sum`, and `newContent`; returns
  `message`, `newSha256sum`, and `newEntryHash` — the request's `entryHash` is
  stale after the commit, so use `newEntryHash` for the next edit.
  `newContent` must be exactly one dated directive with its indented lines
  (comments may surround it); an `option`, `plugin` or `include` line, a
  second entry, or nothing at all is refused as `BAD_USER_INPUT`. Its date is
  spelled `YYYY-MM-DD`: an entry written `2026/08/25` or `2026-8-25` (both
  dates to Beancount) is served as written, but an edit that keeps that
  spelling is refused naming the rewrite (`write 2026/08/25 as 2026-08-25`),
  which loads the same entry. Text that is the entry's own, byte for byte,
  writes nothing, whatever its date spelling: the result says
  `unchanged: true` with a `No change` message, lists no file in `wrote` and
  carries no `commit` (a preview says `Would change nothing`).
- `deleteEntrySource`: `entryHash` and `sha256sum`; returns `message` and
  `entryHash`.
- `deleteEntrySources`: `entries: [{entryHash, sha256sum}]`; returns `message`
  and `deletedCount`.

Every `entryHash` above also accepts the `entry_hash` spelling list output
uses, on REST, GraphQL, and MCP alike — paste the hash straight from
`listLedgerEntries` into `getEntryContext`, `updateEntrySource`,
`deleteEntrySource`, or `deleteEntrySources`. Passing both spellings with two
different hashes is refused with `BAD_USER_INPUT` rather than guessed.

Use the current source checksum returned by entry context. Each tool accepts
only its own arguments, optional `dry_run`, and optional `ledger`; a pinned
credential may omit the ledger. Current content-write access is required. Each
delegates source validation and mutation to the ledger service. With
`dry_run: true` the tool resolves the slice and runs every check the commit
runs, then returns what it would change — a `Would …` message and the
affected text per file in `preview` — without committing anything: no slice
touched, no files reported written, no new hashes minted (an update still
names the hash the entry would carry, for the next edit).

An edit or delete that would leave the ledger with a bean-check error it did
not have — deleting an entry a balance assertion depends on, or re-dating it
past one — is refused before anything is committed, with `VALIDATION_FAILED`
and each new error named in `newLedgerErrors`, the same refusal
`addLedgerEntries` gives (w21/m1). When the only new error is imbalance, the
refusal is `UNBALANCED` with the residual instead, as on add. Errors the
ledger already had never block. Pass `allowInvalid: true` to commit the write
anyway. A preview is not refused for those errors: it returns them in
`validation.newErrors` with `valid: false` (see [the preview rule](#the-preview-rule)).

The check judges exactly the content the commit writes. When another write
changes a file that an edit, delete or move touches after the check read it,
the write runs again from the start: it re-reads the ledger, finds the entries
by the same `entryHash` and `sha256sum`, and checks against what landed, up to
3 attempts. So a refusal, and the `validation` an `allowInvalid` commit
reports, describe the ledger the write lands on. An entry that the other write
changed is still a `CONFLICT` to re-read. Only when every attempt loses is the
call refused with `CONFLICT` and nothing written; its hint says to send the
same call again. As with the entry writes, a write to a file this one does not
touch is not checked against. REST and GraphQL behave the same (w31/131).

### Insert structured directives

`addLedgerEntries` accepts `entries: [{type, entry}]`, optional `dry_run`,
and optional `ledger`.
Only pinned credentials can omit the ledger. It supports transaction, commodity,
price, note, balance, open, close, pad, budget, document, and event directives using
the REST input shapes. GraphQL instead uses an uppercase enum and a payload field
named after the directive; its budget interval enum maps to lowercase here.
Postings carry lot cost, price, and annotations on all three surfaces. `cost`
is the lot basis (`{number currency [, date] [, label]}`, e.g.
`{100 USD, 2024-01-15, "lot-a"}`), which booking matches against; `price` is a
per-unit market annotation (`@`), and `totalPrice` the whole-posting price
(`@@`). Cost and price are different facts: cost says what was paid for the
lot, price says what one unit was worth. A posting takes at most one price —
`price` with `totalPrice` is refused — and cost, like either price, needs
units. Postings take string-valued `meta`, written beneath the posting line;
so does every directive but a budget — `open`, `close`, `commodity`, `price`,
`balance`, `note`, `event`, `document`, `pad` and the transaction — written
quoted as given, beneath the directive (a value that is not a string, a key
the parser reserves such as `filename` or `lineno`, or a key shorter than two
characters such as `k`, is refused naming it). That
is what lets an agent record the keys other tools read, such as a commodity's
`price:` for bean-price or an open's `account:` for importers, without writing
raw text. Posting `tags` and `links` are refused (w23/171). An `open` takes
`booking`, one of the six methods beancount books with (`STRICT`,
`STRICT_WITH_SIZE`, `NONE`, `FIFO`, `LIFO`, `HIFO`); anything else is refused,
`AVERAGE` included, because stock beancount cannot reduce a position booked
that way (w31/146). A `balance` takes `tolerance`, a plain-decimal slack
rendered `~`. A `pad` takes `sourceAccount`.
A budget's account must be one the ledger opens, a parent of one (a budget on
`Expenses:Food` covers its children), or one the same call opens. bean-check
never reads a `custom "budget"` account, so otherwise the budget would match no
report. `addLedgerEntries`, `appendLedgerText`, and `updateEntrySource` refuse
any other account on commit with `VALIDATION_FAILED` naming it and the nearest
opened accounts, and report it as `valid: false` on a `dry_run` preview, unless
`allowInvalid` records it anyway (w23/071, w23/221, w31/094, w31/096).

The tool uses the real entry writer, including file routing and the normal web
quota policy. A routed file nothing includes is included from `main.bean` in
the same commit, and the summary says so (w23/062). Every write result carries the write outcome first: a `summary`
of what was written and how many new bean-check errors it introduced, then
`wrote` (files touched), `entryHashes`, and `validation` (`errorsBefore`,
`errorsAfter`, `newErrors`) — learn about a broken ledger from the write
result itself instead of re-reading the errors resource. `addLedgerEntries`
and `appendLedgerText` return one hash per entry they committed, in request
order — what `getEntryContext`, `updateEntrySource` and `deleteEntrySource`
take — and REST and GraphQL return the same `entryHashes` (w23/060). The
list is empty on a dry run, or when the hashes could not be resolved after
the commit; the write still stands. When bean-check cannot
run before or after the write, `validation` adds `checked: false` and
`checkError`, and the summary says the ledger is unverified instead of
claiming no new errors; the write itself still stands. A file write's preview
and its pre-commit gate read it the same way: when the ledger's current errors
cannot be read they cannot tell an error the write adds from one the ledger
already had, so both say `checked: false` (REST adds the same two fields to a
file write's answer) and the commit is not refused on it. A transaction with at
most one amount omitted is written elided; any other imbalance is refused with
`UNBALANCED`. Like `appendLedgerText`, it bean-checks the projected ledger
before committing: entries that would add new errors — a second `open` for an
account already open, a balance against an account never opened — are refused
with `VALIDATION_FAILED`, the message naming each new error (w0/m2).
`allowInvalid: true` records either deliberately. It is
distinct from raw file editing. REST and MCP impose no separate batch-size
limit beyond the shared ledger contract. Optional null fields are treated as
absent. Transaction metadata accepts string-valued objects on all three
surfaces. Ledger-side date, posting, and quota validation still applies.
With `dry_run: true` the tool runs every check the commit runs, then returns
what it would append — a `Would add …` message and the per-file entry text in
`preview` — without committing anything: no entries written, `entryHashes`
empty, and `wrote` naming at most the entry point the batch would newly
include. The `UNBALANCED` and `VALIDATION_FAILED` refusals above apply to the
commit only: a preview of the same entries succeeds and returns the errors in
`validation.newErrors` with `validation.valid: false`, so approve only a
preview whose `valid` is `true` before re-issuing it with `dry_run: false`
(w23/219).

Two entry writes at once both land. `addLedgerEntries` and `appendLedgerText`
take no `sha`: when another write commits between their read and their commit,
they re-read the files, run bean-check and the balance check again against what
landed, and commit on top of it, up to 3 attempts. An `UNBALANCED` or
`VALIDATION_FAILED` refusal therefore applies to the fresh content. Only when
every attempt loses is the call refused with `CONFLICT`: none of its directives
were committed, and the hint says to send the same call again, with the same
`requestId` if it carries one. REST and GraphQL behave the same (w31/007).

### Retry-safe entry writes (`requestId`)

`addLedgerEntries`, `appendLedgerText`, and `insertReceiptTransaction` take an
optional `requestId` (1–200 characters), as do their REST and GraphQL twins and
the legacy `addEntries` (w3/m61). It copies ledger creation's contract
(ADR026). Send a new id for each write, and reuse it only to retry that write
after a timeout or a dropped reply (a ledger timeout answers `SERVICE_UNAVAILABLE` with a hint saying so):

- Within 24 hours, the same id with the same request returns the first
  result without writing again. The validation in a replayed MCP result is
  read afresh.
- The same id with a different request is refused with `VALIDATION_FAILED`.
- A repeat while the first attempt is still writing is `CONFLICT`. Wait a few
  seconds and send the same call with the same id.
- A write that is refused or fails releases its id, so the retry runs again.
- Without an id, nothing changes: the write is not deduplicated.

Ids are scoped to the caller and the ledger. A dry run is never deduplicated
and records nothing, but it answers as its commit would, so a `valid: true`
preview never carries an id its commit would reject. It refuses an id outside
1–200 characters (w1/195), and an id already used for a different write,
including the other kind of entry write, with the same `VALIDATION_FAILED`. A
preview of the write its id already made does not project a second copy: it
says the commit returns the first result and writes nothing, with an empty
diff or preview (w31/136). If the server's idempotency store is unreachable,
the write still goes ahead, unprotected, rather than failing, and a preview
runs as if the id were new. The dashboard and the mobile app send an id with
every entry save.

### Legacy transaction insertion

The legacy entry tool left the MCP surface (compat-only exemption): agents
should use `addLedgerEntries` for modern structured directives. The REST twin
`POST /api-gateway/v1/legacy/entries` and GraphQL `addEntries` remain for older
clients: supply `entriesInput` with `type: "Transaction"`, date, flag, meta,
narration, payee, and postings containing account and amount strings. Legacy
metadata is required but ignored, including its filename; the writer still uses
ledger routing rules. Amounts such as `1,000.25 EUR` retain their historical
conversion. Other directive types are refused.

Optional `ledgerId` preserves the legacy order: explicit target, credential pin,
then the caller's first accessible ledger. This compatibility operation retains
that fallback rather than the modern tools' explicit-selection requirement.
Current target write authorization and normal web quotas still apply. The result
is `{data:"",success:true}`. No preview is offered.
