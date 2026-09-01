# Beancount.io Backend

## Overview

The backend is built with Node.js and TypeScript using Koa and GraphQL. It powers the API and background jobs for Beancount.io. Key features include:

- GraphQL APIs served via Apollo Server and Koa
- TypeScript for a type-safe codebase
- PostgreSQL with Drizzle ORM for database operations
- Redis for caching
- Background jobs for data processing

## Project Structure

```
/backend
├── config/         # Configuration files
├── migrations/     # Database migration scripts
├── src/
│   ├── api-gateway/  # API gateway implementation
│   ├── model/        # Data models and database schemas
│   ├── scripts/      # Utility scripts
│   ├── server/       # Server implementation
│   └── shared/       # Shared utilities and components
├── server.ts       # Main entry point
└── package.json    # Project dependencies and scripts
```

## Getting Started

This guide assumes a Unix-like environment. If you are on Windows, see [Run on Windows](#run-on-windows).

### Prerequisites

- Node.js 20+
- PostgreSQL
- Redis
- Git

### Setup

1. Clone the repository:

```bash
git clone git@github.com:bex-co/beancount-io.git
cd beancount-io/backend-cluster/backend-v2
```

2. Install dependencies:

```bash
yarn install
```

3. Set up environment variables:

Create a `.env` file in the backend directory with the necessary environment variables. Required variables include:

```dotenv
POSTGRES_BACKEND_URI=postgresql://user:password@localhost:5432/beancount
REDIS_URI=redis://localhost:6379
FAVA_API_URL=http://localhost:8000
FAVA_API_ADMIN_USER=admin
FAVA_API_ADMIN_PASSWORD=your_password
AUTH_SECRET=your_jwt_secret
SERVER_URL=http://localhost:4104
DASHBOARD_URL=http://localhost:5173
# Optional: login/register JWT lifetime in minutes (default 525600 = 365 days)
# AUTH_JWT_EXP_MINUTES=5
```

Production OAuth requires `OAUTH_JWKS`, a complete private P-256/ES256 signing
JWKS provided by the deployment secret manager. It must never be committed or
copied into `.env.example`. When it is absent or malformed, OAuth endpoints
return `503 oauth_not_configured`; the existing API and legacy JWT login remain
available. Development and tests generate an ephemeral process-local key.

Rotate an OAuth signing key by installing the replacement secret, deploying it,
and removing the replaced public key from the served JWKS. Deleting a historical
private key from Git without replacing the accepted live key does not invalidate
tokens signed with it.

### REST API quickstart

Personal access tokens are available to paid plans. Sign in, open
[Personal access tokens](https://beancount.io/settings/api-keys), create a token
with the least privilege your integration needs, and copy it when it is shown.
The plaintext cannot be recovered later; keep it in a secret manager and never
commit it.

Start with the safe ledger-listing endpoint:

```bash
export BEANCOUNT_API_KEY="bcio_your_token_here"

curl --fail-with-body \
  --header "x-api-key: $BEANCOUNT_API_KEY" \
  https://api.v3.beancount.io/api-gateway/v1/ledgers
```

The interactive [API reference](https://beancount.io/docs/api-reference) shows
the available endpoints, request schemas, and required scope classes.

### OAuth deployment contract

`DASHBOARD_URL` is the public authorization-server and consent front door in
production. `SERVER_URL` is the direct backend URL used by the local development
stack. They are normal public deployment configuration, not OAuth secrets. Both
default to the official service in production; development defaults to the
local backend and dashboard. HTTPS is mandatory except for `localhost`,
`127.0.0.1`, or `::1` outside production. If a production reverse proxy
publishes Beancount under a path prefix, include that prefix in `DASHBOARD_URL`
without a trailing slash.

The localhost stack uses different ports but the same hostname. Production
deployments should normally expose both through one HTTPS front door.

Discovery starts at the RFC 9728 URL derived from the API resource. For an
issuer `https://books.example.test/beancount`, the API resource and discovery
chain are:

```text
resource: https://books.example.test/beancount/v1
protected resource metadata:
  https://books.example.test/.well-known/oauth-protected-resource/beancount/v1
authorization server metadata:
  https://books.example.test/.well-known/oauth-authorization-server/beancount
```

The proxy must route those well-known paths, the issuer-prefixed
`/api-gateway/oauth/*` endpoints, and the interaction pages to this backend and
dashboard respectively. The static `beancount-mobile` client is public (no
secret), accepts only authorization code plus refresh grants, requires S256
PKCE, and registers only `io.beancount.ios:/oauth/callback` and
`io.beancount.android:/oauth/callback`. The authorization endpoint also accepts
`screen_hint=signup` and forwards it to the dashboard's `/oauth/mobile-consent`
page so a Sign Up tap in the app opens on registration instead of the login
form. It is a display hint, not a policy: a value this server does not
recognise is dropped rather than rejected, so an app newer than a self-hosted
server still gets a login form. The hint is never forwarded to MCP or
identity-client interaction pages.

The static `beancount-dashboard` client is also public and uses authorization
code with S256 PKCE only. Its callback is derived as
`<DASHBOARD_URL>/oauth/dashboard/callback`, including any issuer path prefix;
its resource is `<DASHBOARD_URL>/v1`, it receives no refresh token, and only its
access token receives the exact 365-day lifetime. Mobile, MCP/DCR, and Discourse
access tokens remain one hour. The Dashboard server performs the code exchange
and stores the bearer only in its secure HttpOnly cookie.

Clearing that cookie logs out that browser but cannot revoke a copied
self-contained Dashboard token. The compromise response is OAuth signing-key
rotation: install a replacement, remove the affected public key from the
accepted JWKS, redeploy, review audit events, and require sign-in again. This is
issuer-wide invalidation, not per-token revocation. New Dashboard password,
OTP, and magic-link authentication completes the exact OAuth interaction
directly and never creates an intermediate legacy session. Already-issued valid
legacy Dashboard tokens remain accepted read-only until their own expiry (no
later than 2027-08-30 for pre-cutover tokens), are never renewed, and may be
silently upgraded without being destroyed on upgrade failure. See
`../../docs/adrs/ADR011-dashboard-oauth.md`.

OAuth capabilities use one closed operation matrix on GraphQL, REST, and MCP:
reads require `ledger.read`, ordinary mutations require
`ledger.write`, and ledger control-plane operations such as deleting a ledger,
managing collaborators, or managing public keys require `ledger.admin`. The
scopes are independent within that ledger vocabulary. User-account lifecycle is
outside it: only a legacy browser session or the verified
`beancount-dashboard` OAuth client may reach the exact-self lifecycle decision;
no ledger scope or relationship alone authorizes `user.delete`.

### User-domain authorization

Protected user profile, lifecycle, API-key-management, and billing operations map to
transport-neutral `user.*` actions in the centralized TypeScript PDP under
`src/server/api/authorization/`. GraphQL, REST, and MCP adapters delegate to
Account/API-key/subscription application services, whose protected public
methods make one final decision before domain reads or side effects. Exact-self
relationships come from the resolved stable user ID;
API-key revoke resolves ownership from the current database row without copying
it into a tuple store.

Existing credential contracts are preserved. `Mutation.deleteAccount` remains
argument-free and accepts legacy browser sessions plus the exact Dashboard
OAuth client; Mobile, MCP/DCR, Discourse, arbitrary OAuth clients, and API keys
cannot inherit lifecycle authority. Profile search/update, billing, and API-key
creation use the same first-party predicate, while profile reads and delegated
API-key listing/revocation keep their prior scope ceilings. Paid-plan,
scope/pin narrowing, expiry, and one-time-secret handling remain enforced after
authorization.

The static tier-quota catalog is deliberately public and does not enter the
PDP. Subscription status, checkout and portal sessions, cancel, resume, and
upgrade remain first-party-Dashboard-only; the PDP catalog owns that credential
rule. `op-class.ts` separately preserves every billing alias's pre-cutover
300-per-minute budget, including the public catalog. Stripe customer binding,
configured products/prices, and subscription ownership remain payment-domain
checks. A relationship-source outage surfaces as service unavailable rather
than a policy denial, before Stripe or local billing work begins. Existing
dashboard and mobile flows require no new client step.

There is no OpenFGA runtime, SDK, service, new database, contextual tuple, or
cross-request authorization cache. `authz/model.fga` and its FGA CLI tests are
the declarative relationship boundary; current data is evaluated locally and
fails closed when unavailable. See `authz/README.md` and ADR 0010.

Signing-key rotation is a two-step deployment: replace the secret-backed JWKS,
deploy, then verify `/api-gateway/oauth/jwks` exposes the new public `kid` only.
Tokens signed by a removed key stop authenticating immediately. Never place the
private JWK or a token in logs, commands captured by CI, or committed files.

Refresh-token revocation prevents another refresh but does not maintain a
per-request denylist for already-issued self-contained access tokens. Their
maximum lifetime is one hour (`ttl.AccessToken`); clients must clear their local
copy immediately on logout and operators should use signing-key rotation only
for incident response where immediate global invalidation is required.

#### Session lifetimes

`src/features/oauth/data/config.ts` is the single source for OAuth client,
audience, and lifetime policy: the static Mobile and Discourse clients, the
dynamic-registration profile used by MCP clients, issuer-relative audiences,
token/grant lifetimes, and refresh rotation. `AppConfig.oauth` contains only
deployment inputs — the issuer, interaction origin, signing keys, and optional
Discourse secret — so a test or deployment cannot silently change a client ID,
redirect URI, audience, or TTL. Dashboard browser sessions are not OAuth
clients and therefore do not appear in this catalog.

These resource values are OAuth identifiers, not HTTP mounts. GraphQL and REST
keep their existing transport URLs; the historical `<issuer>/v1` identifier
names their shared authorization boundary even though no endpoint is mounted
at that URL. It remains stable because released native clients and persisted
refresh grants are bound to that exact audience.

| Client/profile         | Registration | Credential at token endpoint | Resource audience                |
| ---------------------- | ------------ | ---------------------------- | -------------------------------- |
| Beancount Mobile       | Static       | Public client + PKCE         | Application API (`<issuer>/v1`)  |
| Discourse forum        | Static       | `client_secret_basic` + PKCE | UserInfo only (no API resource)  |
| MCP/agent integrations | Dynamic      | Registered client metadata   | MCP (`<issuer>/api-gateway/mcp`) |

| Credential                    | Lifetime               | Notes                                               |
| ----------------------------- | ---------------------- | --------------------------------------------------- |
| Access token (all clients)    | 1 hour                 | Self-contained; revocation cannot cut it short.     |
| Refresh token (native app)    | 365 days               | Re-issued in full on every refresh.                 |
| Refresh token (other clients) | 30 days                | Unchanged; oidc-provider's default rotation policy. |
| Grant (native app)            | session window + 1 day | Slid forward on every refresh.                      |
| Grant (other clients)         | 14 days                | Unchanged.                                          |
| Authorization-server session  | 14 days                | The browser SSO cookie, not an app session.         |

A native-app session is an **idle window, not a fixed term**. Its refresh token
rotates on every refresh and the grant behind it is re-saved with a full fresh
lifetime, so a device used at least once inside the window stays signed in
indefinitely, while one that goes quiet for the whole window must re-authorize in
the system browser. This is deliberate: oidc-provider writes a Grant only at
authorization time and rejects any refresh whose grant has expired, so a fixed
grant lifetime — not the refresh token's — is what would otherwise cap the
session, and its own rotation default stops rotating a chain older than 365.25
days. Both are overridden for this one client by the policy functions in
`features/oauth/data/config.ts`; every other client keeps oidc-provider's
defaults. The window is a reviewed code value in that catalog, not an
environment variable, because deployments should not silently disagree about
credential lifetime.

Revocation is what ends a long session early: logout revokes the refresh
credential, which revokes the grant with it.

Credentials issued before these lifetimes shipped keep working on their own
terms: an existing refresh token is honored until its original expiry and the
replacement it rotates into carries the new window, so an installed app migrates
itself the first time it refreshes — no re-authorization, no forced logout. A
grant that had already lapsed is still refused; a longer window never resurrects
an authorization that has run out.

#### Git over SSH proxy (optional, ADR 0004)

Backend-v2 can serve git over SSH itself instead of Gitea, so that the
main-only rule and every application-layer check apply to SSH as well as HTTP.
It authenticates the client against the keys Gitea holds, then speaks
git-over-HTTP to Gitea with that user's own credentials — no key of ours is
stored or registered anywhere. It stays off unless **both** `SSH_PROXY_ENABLED`
and `SSH_PROXY_HOST_KEY` are set:

```dotenv
SSH_PROXY_ENABLED=false
SSH_PROXY_PORT=2222
SSH_PROXY_HOST_KEY=
```

#### Free-tier directive limit (ADR 0005)

The proxy also enforces the free-tier directive cap, replacing the last Gitea
pre-receive hook. It asks ledger-v2 what the ledger currently counts and refuses
a push whose ledger is already over — the question it _cannot_ answer is whether
a push would take it over, because a thin pack carries no object store.

There is no switch. It fails **open** on any error instead: once the hook is
gone, deleting entries through the app is an over-limit user's only way back
under, so a check that failed closed would lock both doors at once.

`SSH_PROXY_HOST_KEY` should hold **Gitea's existing** host private key.
Presenting a new one on a port clients have used before produces
`REMOTE HOST IDENTIFICATION HAS CHANGED` — indistinguishable from an attack —
and git refuses to continue. Retrieve the key with
`_infra/print-ssh-host-key.sh`; it is a private key, so it belongs only in an
uncommitted `.env`.

### Run on Windows

We recommend using the Windows Subsystem for Linux (WSL). After installing WSL,
open a terminal and follow the same installation steps. If you prefer
PowerShell, make sure `nvm` and Git Bash are available before running the
commands.

## Development

### Start the Server

To run the server in development mode:

```bash
yarn start
```

The server will be available at the port specified in your configuration (default: 4104).

### Available Scripts

- `yarn start`: Start the server using ts-node
- `yarn server`: Start the server using Node.js (requires build first)
- `yarn lint`: Run ESLint to check and fix code style issues
- `yarn kill`: Kill the node server occupying port 4104
- `yarn mcp:conformance <base-url>`: Check whether a deployment's MCP endpoint is connectable (see [Connecting an MCP client](#connecting-an-mcp-client))
- `yarn backfill-empty-locale`: Run script to backfill empty locale data
- `yarn backfill-user-activated`: Run script to backfill user activation status

### Job Scheduler

Background jobs are scheduled using node-cron and run automatically when the server starts:

- **JWT Cleanup**: Runs daily at midnight (00:00) to delete expired tokens from PostgreSQL
- **Dev Test Job**: Runs every 5 minutes in development mode (console.log test)

See `src/scheduler/` for implementation details and `src/scheduler/README.md` for information on adding new jobs.

## API Documentation

The backend exposes GraphQL APIs through Apollo Server. You can explore the API schema by running the server and visiting the GraphQL playground.

## Connecting an MCP client

The backend serves a Model Context Protocol endpoint, so a coding agent can
query and edit a ledger directly. Its contract — address, method set, refusal
dialect, deployment preconditions — is
[ADR 0007](../../docs/adrs/ADR007-backend-v2-mcp-surface.md).

### The endpoint

```
POST {your-deployment}/api-gateway/mcp
```

Two things about the address are worth stating plainly, because getting either
wrong produces an unhelpful error:

- **The full path is `/api-gateway/mcp`.** A shorter `/mcp` is not an alias
  unless your edge routes it; without that it reaches whatever serves your web
  front end, which typically answers a JSON-RPC POST with an HTML-shaped error
  that mentions nothing about MCP.
- **`POST` only.** `GET` and `DELETE` return `405` with `Allow: POST`. The
  transport is stateless — one server per request — so there is no session for a
  server-initiated stream to belong to.

### The credential must be pinned to one ledger

This is the requirement most first-time integrations miss. Both an OAuth grant
and a durable `bcio_` API key reach the endpoint, but **either must be scoped to
a single ledger**. MCP has no per-call ledger argument, so an unpinned
credential — perfectly usable on GraphQL and `/api-gateway/v1` — is refused here
rather than guessed at:

```
403 {"ok":false,"error":{"code":"FORBIDDEN","message":
  "This credential is not bound to a ledger; MCP requires a ledger-scoped grant"}}
```

Mint an API key with `ledgerScope: "owner/name"` for an agent client.

An anonymous request gets a `401` carrying an RFC 9728 pointer:

```
WWW-Authenticate: Bearer resource_metadata="{issuer}/.well-known/oauth-protected-resource"
```

That URL is how a client discovers the authorization server, so a deployment
whose OAuth signing key is unconfigured cannot be connected to at all — the
`401` is correct but points at a `503`. See the OAuth deployment contract above
for `OAUTH_JWKS`.

### Client configuration

```json
{
  "mcpServers": {
    "beancount": {
      "type": "http",
      "url": "https://your-deployment/api-gateway/mcp",
      "headers": { "Authorization": "Bearer bcio_your_ledger_scoped_key" }
    }
  }
}
```

### The tools

Seven, all scoped to the credential's ledger and re-authorized on every call, so
revoking access takes effect on the next tool call rather than the next session:

| Tool              | What it does                                              |
| ----------------- | --------------------------------------------------------- |
| `runBqlQuery`     | Run a BQL query against the ledger                        |
| `listLedgerFiles` | List files and directories                                |
| `readLedgerFiles` | Read file contents, optionally by line range              |
| `editLedgerFiles` | Create / update / replace / delete, with a `dry_run` mode |
| `listApiKeys`     | List the caller's API keys                                |
| `createApiKey`    | Mint a key (an API key may not mint another)              |
| `revokeApiKey`    | Revoke a key                                              |

Each returns `{ ok: true, result }` or `{ ok: false, error }` and publishes that
shape as its `outputSchema`, so a client can validate what it receives. A
failure — invalid query, missing file, revoked access, insufficient scope — also
carries `isError: true`, which is the flag an agent should branch on.

### Resources

Beyond tools, the server publishes **resources**: ledger data addressed by URI
that a client fetches directly, without spending a tool call. Today that is one
template, with the read surface porting onto it
([ADR 0008](../../docs/adrs/ADR008-backend-v2-surface-parity.md)):

```
beancount://{owner}/{name}/files/{path}
```

The scheme is deliberately not `https://` — reaching one needs your credential
and this server in the path, so a client must not try to fetch it from the web
itself. Resources authorize per read, exactly like tools: access revoked between
two fetches is refused on the second.

Twenty-eight templates today — the ledger's vocabulary, its analysis reads, and
file contents:

```
beancount://{owner}/{name}/payees        …/narrations   …/currencies
beancount://{owner}/{name}/tags          …/links        …/years
beancount://{owner}/{name}/commodities   …/events       …/errors
beancount://{owner}/{name}/attributes
beancount://{owner}/{name}/files/{path}

beancount://{owner}/{name}/trial-balance        …/interval-totals
beancount://{owner}/{name}/account-last-entries …/entries-count
beancount://{owner}/{name}/account-directives
beancount://{owner}/{name}/account-report/{accountName}
beancount://{owner}/{name}/payee-transactions/{payee}
beancount://{owner}/{name}/narration-transactions/{narration}
beancount://{owner}/{name}/payee-accounts/{payee}
beancount://{owner}/{name}/entry-context/{entryHash}
```

### Bank import

Everything a customer does with a bank that is **already linked** is on both
surfaces — list connections and accounts, pull transactions, write them into the
ledger, discard them, reconcile, map an account, unlink:

```
beancount://{owner}/{name}/banks                    …/banks/{itemId}
beancount://{owner}/{name}/banks/{itemId}/accounts  …/bank-accounts
beancount://{owner}/{name}/bank-transactions/unsynced
```

with `manageBankImport` (sync / submit / discard) and `manageBankConnection`
(reconcile / map / currency / refresh / unlink) as the two write tools. They are
two rather than one deliberately: a credential that may import transactions must
not thereby be able to sever the bank connection.

**Linking a new bank is not here.** That happens in a browser through the bank's
own widget — there is no API to expose for it. Link once, then everything after
is scriptable.

**`dry_run=true`** on sync, submit, discard, reconcile and unlink runs every
check and reports exactly what would change, writing nothing. It is deliberately
absent from the account-config updates and the status refresh: a preview that
only echoed your input back would teach you to trust a check that never ran.

**One asymmetry to know about.** The REST twins take optional narrowing —
`?account=…&filter=…&time=…&interval=…` — and the MCP resources do not. The MCP
SDK's URI-template matcher has no form-style query expansion, so an optional
parameter cannot be expressed in a template it will match. Required parameters
ride the path, as above; for a filtered read, use the REST route.

The vocabulary reads are what a client needs _before_ writing a correct entry:
which payees already exist, which currencies the book uses, which tags are in
play. Each has a REST twin under the same name — `GET
/api-gateway/v1/ledgers/{owner}/{name}/payees` — resolving through the same
service call, so the two surfaces cannot disagree.

Discover them with `resources/templates/list`; read one with `resources/read`.
Hosts differ in whether they surface resources to the model automatically, so a
client that shows you none is a host limitation rather than a server one.

### Diagnosing a deployment that will not connect

```zsh
yarn mcp:conformance https://your-deployment
yarn mcp:conformance https://your-deployment --token bcio_… --read-only-token bcio_…
```

This runs ADR 0007's seven-point checklist and names the check that failed
rather than leaving you to infer it from a curl transcript. Checks needing a
credential are skipped, not failed, when none is supplied. It exits non-zero if
any check fails, and only observes — it changes nothing.
