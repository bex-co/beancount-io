# Beancount.io MCP guide

Beancount.io exposes a remote Model Context Protocol (MCP) server that lets an
agent query a ledger, read and edit its files, fetch reports, and work with linked
banks. It runs inside `backend-v2` at **`/api-gateway/mcp`**. The agent connects to
a Beancount.io deployment; this endpoint does not open a local `.bean` file on
the agent's machine.

This guide describes the implementation in this repository, reviewed on
2026-09-07. It covers 24 tools and 66 resource templates. Use `tools/list` and
`resources/templates/list` to discover what your deployment actually serves;
this document is not a production availability check.

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
create another API key, including through MCP's `createApiKey` tool.

### OAuth

For clients supporting OAuth discovery and dynamic client registration, configure
the same MCP URL and start the client's authorization flow:

1. An unauthenticated MCP request receives `401` and a `WWW-Authenticate` header
   pointing to `{issuer}/.well-known/oauth-protected-resource`.
2. That document identifies the MCP resource and authorization server. The
   client discovers the authorization, registration, and token endpoints.
3. The client registers, then requests scopes in authorization code flow with
   PKCE. In the browser, sign in and review the requested permissions on
   `/oauth/consent`. Select one ledger or explicitly choose **All accessible
   ledgers**, then approve. The client chooses the requested scopes; the page
   displays them and lets you approve or cancel.
4. The client exchanges the code and sends the access token as a bearer on
   subsequent MCP requests. Clients requesting `offline_access` can use refresh
   tokens to obtain new access tokens.

This discovery sequence follows the
[MCP authorization specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization).
Beancount's provider implements it in
[`oidc-route.ts`](../src/features/oauth/api/oidc-route.ts).

The OAuth resource/audience must be **`{issuer}/api-gateway/mcp`**, and a ledger-restricted token
carries its selected `ledger_id`. Application API/mobile tokens targeting
`{issuer}/v1` do not authenticate to MCP. A browser session token or cookie also
does not authenticate to MCP, even though a browser session is used to approve
the OAuth grant.

## Permissions and ledger boundaries

The current implementation computes cumulative capabilities from the grant:

| Scope          | Capability                                                                                |
| -------------- | ----------------------------------------------------------------------------------------- |
| `ledger.read`  | Query and read ledger content.                                                            |
| `ledger.write` | Read plus ordinary writes, including file edits and bank imports.                         |
| `ledger.admin` | Read, write, and administrative operations, including key and bank-connection management. |

These are credential ceilings. The protected service also checks the caller's
current relationship to the ledger or other target. Bank access, for example,
requires the ledger's administrator relationship even for bank reads. Possessing
a scope does not grant ownership or collaborator access. The capability rules
live in [`identity.ts`](../src/server/api/identity.ts); final decisions live in
the [authorization service](../src/server/api/authorization/authorization-service.ts).

Ledger tools accept an optional `ledger` argument (`owner/name`). A pinned
credential defaults to its pin and cannot select another ledger. An unpinned
credential must select a ledger explicitly. Resource URIs select the ledger
with `owner/name` under the same restriction. Account tools need no ledger.
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
`readLedgerFiles` and `editLedgerFiles` use `LedgerRepoService`. GraphQL and REST
use these same services. MCP is an adapter to those capabilities; the client's
agent decides which calls to make.

Each request gets a fresh server and transport, with
`sessionIdGenerator: undefined`, and the server is closed after handling it.
There is no persistent MCP session ID, standalone GET stream, or resource
subscription channel. Authenticated `GET` and `DELETE` requests
return `405` with `Allow: POST`. POST responses can still use SSE framing.
This is compatible with the optional GET stream in the
[Streamable HTTP specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports).

## Tools

Call `tools/list` for the deployed input and output schemas. Arguments below are
the principal inputs; inspect the schema before constructing a call.

| Tool                    | Inputs and behavior                                                                                                                          | Capability |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `runBqlQuery`           | `{ "query": "BALANCES" }`; returns formatted query output as a string.                                                                       | Read       |
| `runBqlQueryStructured` | `{ "query": "BALANCES" }`; returns typed column metadata and rows, or a structured text result, matching REST JSON and GraphQL `queryShell`. | Read       |
| `listLedgerFiles`       | Optional `dir_path`; lists one directory level, directories first.                                                                           | Read       |
| `readLedgerFiles`       | `files: [{ path, start_line?, end_line? }]`; returns text and line-range metadata.                                                           | Read       |
| `editLedgerFiles`       | `description`, `files`, optional `dry_run`; batches create/update/replace/delete operations into one commit.                                 | Write      |
| `listApiKeys`           | `{}`; lists the caller's key metadata, never plaintext.                                                                                      | Admin      |
| `createApiKey`          | `name`, `scopes`, optional `ledger_scope` and `expires_at`; returns plaintext once. Requires OAuth on MCP and a paid plan.                   | Admin      |
| `revokeApiKey`          | `id`, the `akey_…` identifier, not the secret; revokes an owned key.                                                                         | Admin      |
| `manageBankImport`      | `operation: sync / submit / discard`, operation-specific arguments, optional `dry_run`.                                                      | Write      |
| `manageBankConnection`  | `operation: reconcile / map_account / set_currency / refresh / unlink`, operation-specific arguments.                                        | Admin      |

The implementation is listed in
[`mcp-tools.ts`](../src/features/ai-agent/api/mcp-tools.ts).
MCP key creation accepts `ledger_scope` / `ledgerScope` and ISO 8601
`expires_at` / `expiresAt`. Supplying both aliases requires matching values.
An omitted or blank ledger restriction inherits the caller's pin; an omitted
expiry creates a key without an expiry. A new key cannot exceed its creator's
scopes or widen its ledger restriction. MCP list/create/revoke results use
`key_prefix`, `ledger_scope`, `last_used_at`, `expires_at`, `revoked_at`, and
`created_at` for REST/GraphQL's camelCase fields; `revoked` remains available
for compatibility. Only creation returns the plaintext key.

### Reading and editing files

Paths are relative to the ledger repository. Use `listLedgerFiles` to discover
them. Line ranges in `readLedgerFiles` are 1-based and inclusive; the response
contains `startLine`, `endLine`, `totalLines`, and raw `content`. It does not
prefix every line of the content with a line number.

File-edit operations have these shapes:

| Operation | Required fields besides `operation` and `path`                               |
| --------- | ---------------------------------------------------------------------------- |
| `create`  | `content`: new file text.                                                    |
| `update`  | `old_string`, `new_string`: exact replacement; the old text must occur once. |
| `replace` | `content`: complete replacement text.                                        |
| `delete`  | None.                                                                        |

Send plain UTF-8 text, not base64. For example, these are arguments to
`editLedgerFiles` for a preview; use an existing path and exact text from your
own ledger:

```json
{
  "description": "Correct a transaction narration",
  "dry_run": true,
  "files": [
    {
      "operation": "update",
      "path": "main.bean",
      "old_string": "\"Grocery shooping\"",
      "new_string": "\"Grocery shopping\""
    }
  ]
}
```

`dry_run` defaults to `false`. With `true`, the tool reads existing files as
needed, checks replacement matches, constructs operations, and runs the same
write authorization and repository-path validation as the commit before
returning their count and paths — a caller the commit would refuse is refused
by the preview too. It does **not** produce a text diff, validate Beancount
syntax, check whether a create target already exists, or exercise the final
repository commit, so a successful preview still does not guarantee that
applying the edit will succeed.

Applying the edit calls `LedgerRepoService.changeFiles` and creates an atomic
commit with message `AI edit: {description}`. Existing-file operations include
the fetched file SHA. The MCP handler does not present an approval dialog;
confirmation behavior belongs to the client. These details come from the
[file-edit implementation](../src/features/ai-agent/tools/edit-ledger-files-tool.ts).

### Bank import workflow

Link a new bank in the browser first; MCP has no tool for the bank-link widget.
The connection/account metadata reads below require `ledger.admin`. A
`ledger.write` credential can perform the import steps when the needed IDs and
mappings are already known. Both still require the current bank relationships.
After linking:

1. Read the `banks` and `bank-accounts` resources to find connection IDs and
   ledger-account mappings.
2. Call `manageBankImport` with `operation: "sync"` and `item_id` to pull bank
   transactions into staging.
3. Read `bank-transactions/unsynced` (optionally `?accountId=...` to select one
   bank account). Select the transactions and accounts to
   book; the suggestion resources can help categorize them.
4. Call `manageBankImport` with `operation: "submit"` and
   `transactions: [{ transaction_id, target_account, source_account? }]`.
   Optional `filename` selects an existing ledger file.
5. Use `operation: "discard"` with `transaction_ids` to remove unwanted staged
   transactions.

`sync`, `submit`, and `discard` accept `dry_run: true` to invoke their service
preview paths. Bank-connection `reconcile` and `unlink` also accept previews.
`map_account`, `set_currency`, and `refresh` have no preview contract and reject
`dry_run: true` before invoking a bank service. Omit the flag or set it to false
to apply these operations immediately.
Inspect the [bank tool dispatcher](../src/features/ai-agent/tools/bank-import-tool.ts)
for the arguments each operation requires.

### Asset and archive URL discovery

`beancount://assets/download-url{?ledgerRepoId,filename}` returns
`{ "downloadUrl": "..." }` for a repository asset. Both arguments are required;
`ledgerRepoId` is the positive numeric repository ID, and `filename` is a path
relative to its asset directory. The service resolves the ledger, enforces the
credential pin and file-read permission, and signs the URL. REST exposes this
at `GET /api-gateway/v1/asset-download-url` with the same query arguments.

`beancount://{owner}/{name}/archive-download-url` returns the existing HTTP URL
for `main.zip`. Fetch that URL using the same session cookie, OAuth bearer
token, or API key. Every archive fetch checks access again and returns a
`private, no-store` response. Credentials are never embedded in archive URLs.

Asset URLs use object-storage signatures and their configured expiry. Previously
issued asset URLs remain usable until that expiry; relationship revocation
prevents issuing new URLs. Archive URLs instead require current authorization
at download time. These resources discover URLs.

For direct archive delivery, read
`beancount://{owner}/{name}/archive/{archive}`. The compatibility spelling is
`beancount://legacy/ledgers/{ledgerId}/archive/{archive}`, with the slash in
`ledgerId` encoded as `%2F`. Both return an MCP resource `blob` containing
base64-encoded archive bytes, with the upstream `mimeType`. The original
Content-Disposition value is retained in
`_meta["beancount/contentDisposition"]`. Decode `blob` to save the archive.

Both MCP spellings and both REST spellings share the existing 30-downloads-per-
minute credential bucket. Every download checks current ledger access. REST
streams the response; MCP buffers it to produce a base64 resource payload.
GraphQL's deliberate raw-byte exclusion remains unchanged.

### Pull requests

Read `beancount://{owner}/{name}/pull-request{?prNumber}` to inspect metadata,
file statistics, and the full diff. This requires repository read authority.

`managePullRequests` requires repository write authority and a `ledger` target
(`owner/name`), which may be omitted for a pinned credential:

- `create` requires `title` and `changes: [{ "path": "...", "content": "..." }]`.
  Each content value is the complete replacement file text. Optional
  `description` defaults to empty and `baseBranch` defaults to `main`.
- `approve` requires `prNumber` and merges the PR.
- `reject` requires `prNumber` and closes it without merging.

Reviews apply immediately; preview is unsupported. Domain failures return
`success: false`; MCP additionally reports `isError` and retains the domain
payload under `structuredContent.result`. Creation can leave a branch with
partial file changes if an upstream operation fails after branch creation.
Unsafe repository-relative paths are rejected before a branch is created.

REST uses `/api-gateway/v1/ledgers/{owner}/{name}/pull-requests` for creation,
`/{prNumber}` for inspection, and `/{prNumber}/approve` or `/{prNumber}/reject`
for review. The three mutations use POST; review bodies are `{}`.

### Ledger lifecycle

`manageLedgers` requires administrative authority and applies changes
immediately. It offers no preview.

- `create` requires `name` and accepts `description`, `private`, and `template`
  (`STARTER` or `SAMPLE`; omission selects starter files). Names use lowercase
  letters, numbers, hyphens, and underscores, up to 100 characters. Creation
  uses the authenticated account and accepts no `ledger` selector; the existing
  account policy also permits creation with a ledger-pinned admin credential.
- `update` accepts `ledger` and optional `name`, `description`, and `private`.
- `delete` accepts only `ledger` and returns `{ "ledgerId": "owner/name" }`.

For update/delete, unpinned credentials must supply `ledger`; pinned credentials
may omit it and cannot select another ledger. Creation and update return ledger
metadata and clone URLs. REST exposes `POST /api-gateway/v1/ledgers` and
`PUT`/`DELETE /api-gateway/v1/ledgers/{owner}/{name}`.

Deletion uses the same cleanup sequence as GraphQL: it attempts remote bank
revocation, then deletes local bank metadata and the repository. If repository
deletion fails, local metadata rolls back, but earlier bank revocations cannot
be undone. If the preliminary repository-ID lookup fails, bank cleanup is
skipped and repository deletion still proceeds.

### SSH public keys

These account operations use the authenticated caller and require administrative
account authority. They accept no user or ledger selector. A ledger pin does
not prevent the caller from managing their own SSH public keys.

- Read `beancount://account/public-keys{?page,limit}` to list keys.
- Read `beancount://account/public-key{?keyId}` to inspect a key by ID.
- Call `managePublicKeys` with `operation: "create"`, `key`, and `title` to add
  an SSH public key. Optional `readOnly` defaults to `false`.
- Call `managePublicKeys` with `operation: "delete"` and `keyId` to remove it.

Creation returns the ID, fingerprint, public key, title, creation time, and
optional last-use time; deletion returns `{ "id": ... }`. These changes apply
immediately and offer no preview. Key validity, uniqueness, and ownership use
the same repository-service checks as GraphQL. REST exposes the same operations
at `/api-gateway/v1/public-keys` and `/api-gateway/v1/public-keys/{keyId}`.

### Collaborator changes

`manageLedgerCollaborators` requires `ledger.admin` and the current relationship
for its selected operation. Supply `ledger: "owner/name"` for an unpinned
credential; a pinned credential can omit it.

| Operation | Arguments                                                                    | Effect                                                                                                                        |
| --------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `update`  | Required `collaborator`; optional `permission` (`read`, `write`, or `admin`) | Add or update membership, subject to the existing collaborator limit. Omitted or null permission uses the repository default. |
| `delete`  | Required `collaborator`                                                      | Remove that member.                                                                                                           |
| `leave`   | No collaborator or permission argument                                       | Remove the authenticated caller. Owners cannot leave their own ledger.                                                        |

These operations apply immediately; preview is not supported. Extra branch
arguments and `dry_run` are rejected. A membership removal affects the next
protected call.

## Resources

Resources provide URI-addressed context, separate from `tools/call`, following
MCP's [resource model](https://modelcontextprotocol.io/specification/2025-11-25/server/resources).
Discover them with **`resources/templates/list`**, then instantiate a URI and
send `resources/read`. This server does not enumerate instances with
`resources/list`; an empty result there does not mean resources are unavailable.
Clients vary in how they expose these reads to an agent.

Ledger-scoped templates start with `beancount://{owner}/{name}/`. The following table
lists the accounting and bank suffixes; replace the braces with your ledger and resource values.

| Family                                  | URI suffixes                                                                                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vocabulary (10)                         | `payees`, `narrations`, `currencies`, `tags`, `links`, `years`, `commodities`, `events`, `errors`, `attributes`                                           |
| Analysis without required arguments (6) | `trial-balance`, `interval-totals`, `account-last-entries`, `entries-count`, `postings-per-account`, `account-directives`                                                         |
| Analysis with required arguments (5)    | `account-report/{accountName}`, `payee-transactions/{payee}`, `narration-transactions/{narration}`, `payee-accounts/{payee}`, `entry-context/{entryHash}` |
| Bank connections and accounts (4)       | `banks`, `banks/{itemId}`, `banks/{itemId}/accounts`, `bank-accounts`                                                                                     |
| Bank staging and suggestions (3)        | `bank-transactions/unsynced{?accountId}`, `bank-transactions/suggested-categories{?accountId}`, `banks/{itemId}/suggested-mapping`                        |
| File contents (1)                       | `files/{+path}`                                                                                                                                           |

The file template uses reserved expansion, `{+path}`, so nested paths work:
`beancount://alice/books/files/2026/september.bean`. It returns `text/plain`;
JSON resources return `application/json` as text inside the MCP `contents`
array; archive resources return binary blobs as described above. Read a URI through MCP, not with an ordinary HTTP GET to `beancount://`.

Journal resources are `journal`, `plaintext-journal`, `account-journal`, and
`source-files` under `beancount://{owner}/{name}/`. REST uses the same suffixes.
Journal subtype filters (`directiveTypes`, `transactionSubtypes`,
`documentSubtypes`, `customSubtypes`) are JSON-encoded string arrays in URL
parameters, for example `directiveTypes=%5B%22Transaction%22%5D`. Empty arrays
are preserved. Plaintext journal returns `{ "content": "..." }`.

Account journal requires `account`, accepts `filter`, `time`, `limit`, `offset`,
`with_children`, and `conversion`, and defaults to 20 entries, offset 0,
`with_children=true`, and `conversion=at_cost`. Source files returns filenames
from the ledger service, rather than a repository directory listing.

Additional report resources are `overview`, `documents`, `accounts`,
`statements/income-statement`, and `statements/balance-sheet` under
`beancount://{owner}/{name}/`. Statements and overview accept `account`, `filter`,
`time`, `conversion`, and `interval`; defaults are `USD` and `monthly`, matching
GraphQL. Documents accept `account`, `filter`, and `time`. Accounts accept
`status=open` or `status=closed`; other values return all accounts as in GraphQL.

`entries-count` and `postings-per-account` accept the same optional `account`,
`filter`, and `time` arguments. Time filters use the Fava-compatible clamped
report stream (including generated opening/transfer entries). An account filter
on `postings-per-account` selects matching entries and counts every posting on
those entries, including counterpart accounts; zero-count accounts are omitted
and rows are sorted by account name.

Statement and overview payloads retain the ledger service's snake-case field
names on REST/MCP. GraphQL exposes camel-case equivalents, including
`balance_children` → `balanceChildren`, `has_txns` → `hasTxns`, and
`account_balances` → `accountBalances`. Currency and account dictionary keys,
and decimal strings inside them, are unchanged.

Collaborator reads also require `ledger.admin` and current administrative
access, even though they do not modify data:

- `beancount://{owner}/{name}/collaborators{?page,limit}` lists members and their
  permissions, defaulting to page `1` and limit `10`.
- `beancount://{owner}/{name}/collaborators/permission{?collaborator}` reads one
  member's permission and user information. `collaborator` is required.

Optional user fields omitted in REST/MCP appear as `null` when selected in
GraphQL. The workflow preserves its existing behavior: a failed per-member
permission request omits that member from listing, while a failed standalone
permission request fails the call.

Ledger metadata is available at `beancount://{owner}/{name}/metadata`.
Account discovery resources need no ledger target:

- `beancount://catalog/ledgers{?page,limit}` lists accessible ledgers.
- `beancount://catalog/ledgers/owned{?page,limit}` lists owned ledgers.
- `beancount://catalog/ledgers/search{?q,topic,includeDesc,uid,priorityOwnerId,teamId,starredBy,private,isPrivate,template,archived,mode,exclusive,sort,order,page,limit}` searches with the GraphQL search contract.

A pinned credential receives only its ledger from accessible listing (page one;
subsequent pages are empty). Owned/search results omit other ledgers from the
returned upstream page. Unpinned credentials use the caller's account catalog.

The legacy `ledgerMeta` shape is available at
`beancount://legacy/ledger-meta{?userId,ledgerId}` and
`GET /api-gateway/v1/legacy/ledger-meta`. Its required `userId` is a compatibility
argument; authentication determines the caller. The legacy metadata and journal operations
preserve the historical default: omitted `ledgerId` uses the credential pin,
then the caller's first ledger if unpinned. Explicit targets still cannot expand
a pin. Ordinary MCP ledger tools continue to require an explicit target for an
unpinned credential.

Legacy `journalEntries` is available at `beancount://legacy/journal-entries`
and `GET /api-gateway/v1/legacy/journal-entries`. It accepts `first`, `after`,
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
beancount://alice/books/trial-balance?time=2026&interval=month&conversion=USD
```

Encode path values and query values using standard URL encoding. Required
arguments retain their existing path position, such as
`account-report/Expenses%3AGroceries?time=2026`. Unknown or repeated query
parameters are refused before the report runs.

Bank connection/account resources require admin capability. Staged transactions
and suggestions use read capability, with current bank and ledger relationships
checked separately. The two bank suggestion resources also require AI-use
authority. A read resource can invoke suggestion services; do not assume every
resource is a static stored document.
See [`mcp-resources.ts`](../src/features/ai-agent/api/mcp-resources.ts) for the
catalog and service calls.

## Inspect the protocol with curl

Set `BEANCOUNT_MCP_URL` to your full endpoint and `BEANCOUNT_MCP_TOKEN` to a
ledger-scoped credential in your local environment. The following requests only
discover capabilities and query balances:

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
calls per minute; `createApiKey` has a five-per-minute override. These are
operation-class budgets, not one combined allowance for the entire MCP endpoint.

Tool results normally contain both a text block with serialized JSON and
`structuredContent` with the same object:

```json
{ "ok": true, "result": "tool-specific payload" }
```

Handled execution failures use `{ "ok": false, "error": "reason" }` and set
the MCP result's **`isError: true`**. Errors caught at the registry gate can
instead return `isError: true` with only text content. Check `isError` first;
do not assume `structuredContent` is always present or that HTTP 200 means the
tool succeeded. Resource-read failures use JSON-RPC errors rather than this tool
envelope.

Each tool advertises an object `outputSchema`: `ok` is required, with optional
`result` and `error`. The runtime success/failure convention is stronger than
that published schema because the SDK requires an object schema here. See
[`types.ts`](../src/features/ai-agent/tools/types.ts) and MCP's
[structured tool results](https://modelcontextprotocol.io/specification/2025-11-25/server/tools#structured-content).

| Symptom                                           | Meaning and next step                                                                                                              |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| HTML or an SSR error after posting to `/mcp`      | Use `/api-gateway/mcp` and check proxy routing.                                                                                    |
| `401` with `resource_metadata`                    | Missing/invalid credential, browser session, expired OAuth token, or wrong OAuth audience. Follow discovery or supply a valid key. |
| Tool error requesting a ledger                    | Pass `ledger: "owner/name"` when using an unpinned credential.                                                                     |
| `405`, `Allow: POST`, on authenticated GET/DELETE | Expected behavior; use Streamable HTTP POST.                                                                                       |
| `400`/`406` before tool execution                 | Check JSON-RPC, protocol version, content type, and both Accept values.                                                            |
| `isError: true`                                   | Read the tool's error; check arguments, scopes, current access, and rate limits.                                                   |
| Resources appear absent                           | Call `resources/templates/list`; verify the client supports resource reads.                                                        |
| OAuth metadata returns `503 oauth_not_configured` | Fix the deployment's signing configuration. A valid API key can still authenticate independently of OAuth.                         |

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
descriptor-derived tool/resource catalogs. Its current `auth.scopes` field
contains the old `read`/`write` labels; use OAuth protected-resource metadata and
the `ledger.*` scope names above when requesting permissions.

From `backend-cluster/backend-v2/`, run:

```bash
yarn mcp:conformance https://books.example.com
yarn mcp:conformance https://books.example.com --token "$BEANCOUNT_MCP_TOKEN"
```

The [conformance script](../scripts/mcp-conformance.ts) checks the unauthenticated
challenge, discovery, method handling, initialization/tool schemas, error masking,
and canonical path. Checks requiring absent credentials are **skipped**, not
passed. It does not complete browser OAuth or verify all resource reads.

An optional `--read-only-token` checks refusal of a file write. Supply only a
credential restricted to `ledger.read`: the probe attempts a real create-file
operation and does not set `dry_run`. Do not supply a write/admin credential to
that flag.

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
  Defaults are `main`, page `1`, and limit `30`.
- `beancount://{owner}/{name}/commit-details{?sha}` requires `sha` and returns
  metadata, parents, file statistics, and a unified diff.

Percent-encode branch names and SHA query values when constructing a URI.

### Public configuration reads

`beancount://configuration/health` returns the JSON string `"OK"`, matching
GraphQL `health` and `GET /api-gateway/v1/health`. This is an application probe,
not a check of database or ledger-service readiness.

`beancount://configuration/feature-flags{?userId}` matches GraphQL
`featureFlags(userId: ...)` and `GET /api-gateway/v1/feature-flags?userId=...`.
The legacy `userId` argument is required (and may be empty), but currently does
not change the static `{ "spendingReportSubscription": false }` result.

These REST and GraphQL reads allow anonymous callers. MCP still requires its
transport credential, but neither resource requires ledger scopes or a ledger
target. The REST OpenAPI security alternatives explicitly mark anonymous access;
protected ledger routes continue to require credentials.

`beancount://configuration/tier-quotas` returns the public quota catalog, matching
GraphQL `allTierQuotas` and anonymous `GET /api-gateway/v1/tier-quotas`. Every row
includes `tier`, `maxLedgers`, `maxCollaboratorsPerLedger`, `aiCfoTokensMax`, and
`maxDirectives`. A limit of `-1` means unlimited. This static catalog does not
read a customer's subscription or contact Stripe.

### Account profile

`beancount://account/profile{?userId}` matches GraphQL `userProfile` and
`GET /api-gateway/v1/user-profile`. Omit `userId` to read the caller's profile;
an explicit ID must name that same user. The account service enforces read
capability and exact-self authorization independently of a credential's ledger
pin. Results include identity fields, locale, report status, subscription tier,
ledger limits, and whether the user has ever subscribed.

A missing user returns JSON `null`. The REST and GraphQL identity probes also
return `null` anonymously without loading account data. The MCP transport
continues to require a credential.

### Account deletion

`deleteAccount` takes an empty object and matches GraphQL `deleteAccount` and
`DELETE /api-gateway/v1/account`. It permanently deletes the authenticated
account, with no user/ledger selector or preview. The existing credential policy
allows session and OAuth identities; API keys are refused even with an admin
scope. The operation's `admin` classification is audit/rate metadata, not a new
scope requirement. A ledger pin does not change which account is deleted.

All adapters call the existing account service: cancel active subscriptions,
attempt bank disconnection, remove local account-related rows and the ledger
user, then clear email-token storage. A failed subscription cancellation stops
later cleanup. A failed ledger-user deletion rolls back local transactional
rows; earlier external cancellation or disconnection cannot be rolled back.
Email-token cleanup happens after that transaction. These cross-system partial
failure boundaries are shared with GraphQL.

### Public social lists

The MCP resources below match public REST routes and GraphQL list queries:

| Resource                                  | REST GET route                                | GraphQL query         |
| ----------------------------------------- | --------------------------------------------- | --------------------- |
| `beancount://social/followers`            | `/api-gateway/v1/social/followers`            | `getUserFollowers`    |
| `beancount://social/following`            | `/api-gateway/v1/social/following`            | `getUserFollowing`    |
| `beancount://social/starred-repositories` | `/api-gateway/v1/social/starred-repositories` | `getUserStarredRepos` |

Every route/resource requires a `username` query argument and accepts `page`
and `limit`, defaulting to 1 and 20. Encode query values once. Responses retain
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
returns `uploadUrl`, `objectKey`, and `expiresIn` (seconds). PUT the bytes to the
returned URL with the supplied MIME type. Then use the object key in an ingestion
operation or read `beancount://temp-assets/download-url{?objectKey}` to obtain a
`downloadUrl` and its `expiresIn`.

The existing policy requires read capability for both operations, including URL
creation. Neither requires a ledger target. Keys are bound to the authenticated
user; foreign, permanent, and malformed references receive a concealed denial.
The upload tool has no preview. Issuing a URL does not upload data or establish
that an object exists. URLs retain their configured lifetime once issued.

### AI CFO usage

Read `beancount://account/ai-cfo-usage` for `aiCfoTokensUsed` and
`aiCfoTokensMax`, matching GraphQL's `aiCfoUsage` fields. Usage is for the current
UTC billing month and the authenticated account. Read capability is required;
API keys and ledger-pinned credentials retain the existing account-read policy.
No user or ledger selector is accepted. This read does not consume AI tokens.

### Parse uploaded statements

Call `parseFile` with `s3ObjectKey` and `fileFormat` after uploading a file.
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
`suggestTransactionCategories` accepts, with no batch minimum. The result is an
array of `{rowIndex, targetAccount, confidence, source, reasoning?}`
suggestions drawn from the ledger's open accounts and recent transaction
history; ledgers using an auto-accounts plugin may receive accounts outside the
current list. Requires read capability plus current content and AI-write access
to the selected ledger, and consumes AI quota on completion. REST serves the
same contract at
`POST /api-gateway/v1/ledgers/{owner}/{name}/import/suggest-categories`.

### Parse receipts and recommend accounts

`parseReceipt` accepts `objectKey` (GraphQL/REST's `s3ObjectKey`) and optional
`ledger: "owner/name"`. Only pinned credentials can omit the ledger. The upload
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
`receiptObjectKey` names the caller-owned temporary upload, and `input` carries
`date`, `payee`, `description`, an arbitrary-count `postings` array of
`{account, amountNumber, amountCurrency}` string-decimal legs, and
`documentAccount`. Optional `ledger` follows the standard selection contract.
The ledger's `receipt_storage` beancountio-option decides the strategy: S3
storage promotes the object and writes one transaction with a receipt URL in
its metadata; git storage commits the receipt bytes into the repository and
writes a link-tagged document plus transaction pair. Requires write capability
with current content and asset write access; unowned temporary keys are
concealed as not found. The result is `{success}`. No preview; a failed entry
write keeps the temporary upload for retry.

`renameLedgerFile` accepts `oldPath`, `newPath`, optional `message`, and optional
`ledger`. Pinned credentials may omit the ledger; unpinned callers must select
it. The protected workflow validates both repository-relative paths and delegates
the existing repository rename operation. The result contains `oldPath` and
`newPath`. Write capability and current content-write access are required.

This operation exposes GraphQL's existing contract: it has no caller-supplied
SHA or preview flag. Repository conflicts remain errors. It does not rewrite
Beancount include directives that refer to the old filename.

### Update or delete entry source

`editEntrySource` exposes three operations through the existing journal service:

- `update`: `entryHash`, `sha256sum`, and `newContent`; returns `message`,
  `entryHash`, and `newSha256sum`.
- `delete`: `entryHash` and `sha256sum`; returns `message` and `entryHash`.
- `delete_many`: `entries: [{entryHash, sha256sum}]`; returns `message` and
  `deletedHashes`.

Use the current source checksum returned by entry context. Each branch accepts
only its own arguments and optional `ledger`; a pinned credential may omit the
ledger. Current content-write access is required. The operation delegates source
validation and mutation to the ledger service and does not support preview.

### Insert structured directives

`addLedgerEntries` accepts `entries: [{type, entry}]` and optional `ledger`.
Only pinned credentials can omit the ledger. It supports transaction, commodity,
price, note, balance, open, close, budget, document, and event directives using
the REST input shapes. GraphQL instead uses an uppercase enum and a payload field
named after the directive; its budget interval enum maps to lowercase here.

The tool uses the real entry writer, including file routing and the normal web
quota policy, and returns `success` and an optional `message`. It is distinct from
raw file editing. REST and MCP impose no separate batch-size limit beyond the
shared ledger contract. Optional null fields are treated as absent. Transaction
metadata accepts string-valued objects on all three surfaces. Ledger-side date,
posting, and quota validation still applies.
There is no preview argument.

### Legacy transaction insertion

`addLegacyEntries` mirrors GraphQL `addEntries`: supply `entriesInput` with
`type: "Transaction"`, date, flag, meta, narration, payee, and postings containing
account and amount strings. Legacy metadata is required but ignored, including
its filename; the writer still uses ledger routing rules. Amounts such as
`1,000.25 EUR` retain their historical conversion. Other directive types are
refused; use `addLedgerEntries` for modern structured directives.

Optional `ledgerId` preserves the legacy order: explicit target, credential pin,
then the caller's first accessible ledger. This compatibility operation retains
that fallback rather than the modern tools' explicit-selection requirement.
Current target write authorization and normal web quotas still apply. The result
is `{data:"",success:true}` inside the MCP result envelope. No preview is offered.
