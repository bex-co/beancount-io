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
the available endpoints, request schemas, and required permissions.

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
dashboard respectively. On the dashboard host (`APP_DOMAIN`), `/.well-known/*`
must reach this backend so Apple and Google can fetch the native app-link
vouchers from the same origin as `/ledger/...` links.

### Native app links

Optional. When set, this server answers:

- `GET /.well-known/apple-app-site-association` — Apple Universal Links for
  `io.beancount.ios` on `/ledger/*` (`APP_LINKS_APPLE_TEAM_ID`)
- `GET /.well-known/assetlinks.json` — Android App Links for
  `io.beancount.android` (`APP_LINKS_ANDROID_SHA256`, comma-separated SHA-256
  fingerprints of the Play App Signing certificate)

Unset either variable and its route returns 404, so a self-host without a
store build does not advertise Beancount.io's apps. Beancount.io production
uses `APP_LINKS_APPLE_TEAM_ID=PTLM7BZQMM`.

The static `beancount-mobile` client is public (no
secret), accepts only authorization code plus refresh grants, requires S256
PKCE, and registers only `io.beancount.ios:/oauth/callback` and
`io.beancount.android:/oauth/callback`. The authorization endpoint also accepts
`screen_hint=signup` and forwards it to the dashboard's `/oauth/mobile-consent`
page so a Sign Up tap in the app opens on registration instead of the login
form. It is a display hint, not a policy: a value this server does not
recognise is dropped rather than rejected, so an app newer than a self-hosted
server still gets a login form. The hint is never forwarded to MCP or
identity-client interaction pages.

OAuth capabilities use one closed operation matrix on GraphQL, REST, and MCP:
reads require `ledger.read`, ordinary mutations require
`ledger.write`, and ledger control-plane operations such as deleting a ledger,
managing collaborators, or managing public keys require `ledger.admin`. The
scopes are cumulative: `ledger.write` includes read capability, and
`ledger.admin` includes write and read capability. User-account lifecycle is
outside it: no ledger scope, OAuth client id, or ledger relationship authorizes
`user.delete`.

For ledger lifecycle, collaborator, leave, and SSH public-key operations,
`ledger.admin` is only the delegated credential ceiling. The centralized PDP
also requires the current exact-self User or Gitea-backed ledger relationship
at the application-service/workflow boundary. The operation's `admin` class is
rate-limit and audit metadata, not another grant. Relationship denials conceal
ledger existence; relationship-source outages return service unavailable and
run no Fava/Gitea mutation, Plaid cleanup, or database side effect. Existing
dashboard and mobile GraphQL contracts are unchanged.

### Ledger data-plane authorization

Ledger metadata, reports, journals, accounts, files, repository history, BQL,
archives, entries, receipts, and pull requests use transport-neutral
`ledger.*` actions in the same PDP. GraphQL, REST, MCP tools, and MCP resources
remain aliases: operational classes keep their existing rate budgets, while
the protected service/workflow selects the canonical action and evaluates the
credential scope, ledger pin, and current Gitea owner/collaborator/public fact
before data access or mutation.

Anonymous reads continue to work for currently public ledgers. Private
anonymous reads return authentication-required; signed relationship denials
remain actionable forbidden errors. Relationship-source failures return
service unavailable and are audited as errors. File path validation, archive
name validation, commit construction, receipt ownership/cleanup, and atomic
entry behavior remain domain invariants after authorization. No authorization
decision is cached, so revocation or visibility changes affect the next call.

A logged-in reader can ask questions about a public or shared ledger, including
when the UI requests agent mode. The agent first authorizes the read-only
`ai.ledger.ask` action, then attempts a separate `ai.ledger.agent` write upgrade.
If that upgrade is denied, the answer still runs in read-only mode without edit
tools or a writable Git remote; an authorization-source outage still fails
closed.

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
argument-free and accepts browser sessions and OAuth user credentials, so the
mobile deletion fix needs no client change or step-up flow. API keys cannot
delete the user or mint successor keys. User profile search/update remain
session-only; profile reads and API-key management keep their prior scope
ceilings. Paid-plan, scope/pin narrowing, expiry, and one-time-secret handling
remain enforced after authorization.

The static tier-quota catalog is deliberately public and does not enter the
PDP. Subscription status, checkout and portal sessions, cancel, resume, and
upgrade remain browser-session-only; the PDP catalog owns that credential
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

The backend serves a stateless Streamable HTTP endpoint at
`/api-gateway/mcp`. Connect with an OAuth grant for that resource or a `bcio_`
API key. Ledger tools accept `ledger: "owner/name"`; a ledger-pinned credential
defaults to its pin and cannot select a different ledger. Unpinned credentials
must select a ledger per call; account tools need no ledger.

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

Every result carries a readable text block and a typed `structuredContent`;
every failure carries `{code, message, hint}` with `isError` set, so an agent
branches on a code rather than on prose.

The [Beancount.io MCP guide](./docs/mcp.md) explains setup, OAuth and API-key
permissions, how requests reach the ledger, all 26 tools and 64 resource
templates, the result envelope and its failure codes, writing directives as
Beancount text, file-edit previews, bank imports, protocol examples, and
deployment diagnostics. It also documents the limits of the conformance check
and current client-facing differences from REST.

For the design decisions, see
[ADR 0007](../../docs/adrs/ADR007-backend-v2-mcp-surface.md) (transport contract)
and [ADR 0008](../../docs/adrs/ADR008-backend-v2-surface-parity.md) (tools,
resources, and surface parity).
