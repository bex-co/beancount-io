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
`io.beancount.android:/oauth/callback`.

OAuth capabilities use one closed operation matrix on GraphQL, REST, and MCP:
reads require `ledger.read`, ordinary mutations require
`ledger.write`, and destructive account/ledger operations plus collaborator or
public-key management require `ledger.admin`. These scopes are independent; an
admin credential does not implicitly gain read or write access. Legacy browser
and installed-mobile session JWTs remain capability-exempt only for the stated
migration window.

Signing-key rotation is a two-step deployment: replace the secret-backed JWKS,
deploy, then verify `/api-gateway/oauth/jwks` exposes the new public `kid` only.
Tokens signed by a removed key stop authenticating immediately. Never place the
private JWK or a token in logs, commands captured by CI, or committed files.

Refresh-token revocation prevents another refresh but does not maintain a
per-request denylist for already-issued self-contained access tokens. Their
maximum lifetime is one hour (`ttl.AccessToken`); clients must clear their local
copy immediately on logout and operators should use signing-key rotation only
for incident response where immediate global invalidation is required.

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
[ADR 0007](./docs/ADR0007-mcp-surface.md).

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
([ADR 0008](./docs/ADR0008-surface-parity.md)):

```
beancount://{owner}/{name}/files/{path}
```

The scheme is deliberately not `https://` — reaching one needs your credential
and this server in the path, so a client must not try to fetch it from the web
itself. Resources authorize per read, exactly like tools: access revoked between
two fetches is refused on the second.

Twenty-one templates today — the ledger's vocabulary, its analysis reads, and
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
