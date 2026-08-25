# Beancount.io Backend

Node.js and TypeScript service providing GraphQL, REST, git-proxy, agent, and scheduled-job surfaces for Beancount.io.

## Architecture

Code is feature-oriented, with shared infrastructure under `src/foundation/`, transport setup under `src/server/`, and reusable utilities under `src/shared/`.

```
src/
├── config/                 # Environment-backed AppConfig
├── drizzle/                # PostgreSQL connection and migrations
├── features/               # Domain features
│   ├── admin/              # Admin REST API
│   ├── ai-agent/           # Agent routes, tools, and workflows
│   ├── auth/               # Authentication, users, and CLI auth
│   ├── feature-usage/      # Quotas and AI-CFO usage
│   ├── gitea/              # Git API, HTTP/SSH proxy, and push policy
│   ├── healthz/            # Health checks
│   ├── ledger/             # Ledger GraphQL/REST domain
│   ├── llm/                # Prompted extraction/categorization
│   ├── oauth/              # OIDC provider routes and models
│   ├── plaid/              # Bank linking and synchronization
│   ├── s3/                 # Temporary/permanent asset storage
│   ├── sitemap/            # Sitemap generation and cache
│   ├── stripe/             # Billing and tier operations
│   └── v1-compat/          # Legacy URL compatibility
├── foundation/             # Composition root, clients, models, Redis
├── metrics/                # Observability
├── scheduler/              # node-cron jobs
├── server/                 # Koa, GraphQL, REST, middleware
└── shared/                 # Cache, errors, logging, locks, helpers
```

Feature-specific guidance cascades from:

- `src/features/gitea/CLAUDE.md`
- `src/features/ledger/CLAUDE.md`
- `src/features/plaid/CLAUDE.md`

The usual feature shape is `api/` for transport adapters, `service/` for single-domain behavior, `workflow/` for orchestration, `data/` for persistence, and `utils/` for pure helpers. Use only the directories the feature needs.

## Dependency and layer rules

The current dependency direction is:

```
Resolver / REST handler
        ↓
Workflow (multi-service orchestration) or Service (single-domain operation)
        ↓
Service / Client factory
        ↓
Model + database / external API
```

- Resolvers and REST handlers are transport adapters. They authenticate, validate, map request/response types, set transport state, and delegate. They do not access models or orchestrate several services.
- Workflows own cross-service coordination, transaction boundaries, locking, and multi-step use cases. Their inputs and outputs are plain domain types; a workflow must not import GraphQL DTOs from `api/`.
- Services own one reusable domain capability. They may call models and external-client factories through narrow interfaces, but they stay transport-agnostic.
- Models perform persistence for one aggregate. They contain queries and CRUD, not tier rules, cross-model workflows, or cache policy. Redis-backed token/session models are persistence, not caches.
- Existing `operations/` functions are small, explicitly injected domain operations used by services/workflows. New multi-service orchestration belongs in a workflow rather than a resolver or service-locator function.

Use constructor injection and the narrowest dependency contract:

- Declare an `I<Name>` interface beside every service/workflow class and have the class implement it. Reference the interface in consumers and tests; name concrete classes only where constructing them.
- Slice broad contracts with `Pick<IModels, ...>` and `Pick<AppConfig, ...>` when a unit needs only a few members.
- Pass request identity (`userId`, token, ledger ID) as method input. Do not put application services into GraphQL context.
- A resolver may call one service directly for a simple operation. If it must coordinate multiple services, add or extend a workflow.

## Composition root

The application dependency graph is explicit:

- `src/foundation/factory.ts` connects PostgreSQL and Redis and returns `AppLayers`.
- `src/foundation/composition/layers.ts` defines Database → ClientFactory → Service → Workflow layer contracts.
- `src/foundation/composition/builder.ts` constructs services and workflows bottom-up.
- `src/server/graphql/resolver-registry.ts` constructs resolvers and is the only GraphQL resolver registration list.
- `src/server/graphql/api-gateway.ts` passes the resolver container to TypeGraphQL.
- `src/server/api/composition-root.ts` assembles the transport surfaces: one REST router, one GraphQL schema, and one MCP registry, built from per-feature registration fragments (ADR 0006). There is no `server-routes.ts`, `rest/rest-routes.ts`, or `graphql/index.ts`; a feature exposes itself by registering a fragment, not by being wired into a route list.

When adding a constructor-injected resolver, register both its class and instance in `resolver-registry.ts`. The container intentionally throws if a resolver with constructor parameters was not wired.

## Caching

Application caches use `CacheHelper` from `src/shared/cache/`, not the raw cache-manager instance.

- Use `getOrSet` for read-through caches; it guards stampedes and fails open.
- Use `get` / `set` / `del` for non-critical caches and `getStrict` / `setStrict` / `delStrict` for Redis-backed persistence where a dropped write must fail.
- Use `TTL` and `CACHE_KEYS`; do not add raw duration literals or ad-hoc key strings.
- The Redis codec preserves `Date`, `Map`, `Set`, and `BigInt`; do not manually rehydrate cached values.
- The sitemap cache is intentionally file-backed because it stores large, persisted XML.

## Data models and IDs

New primary keys use `prefixedNanoidBase58()` from `@/shared/nanoid-base58` with a documented lowercase resource prefix ending in `_` (for example `ptxn_`). Define IDs as Drizzle `text(...).primaryKey()` columns. Do not introduce bare NanoIDs, integer IDs, ObjectIDs, or UUIDs for new models.

Every data model exposes an interface from its `types.ts`, and the implementation implements that interface. Add a new model to the registry under `src/foundation/models/` and include its schema in the Drizzle setup/migration flow.

## Errors and logging

- Throw transport-agnostic `DomainError` subclasses from `@/shared/errors`; do not throw GraphQL- or REST-specific errors from domain code.
- GraphQL translation lives in `src/server/graphql/format-error.ts`; REST translation and centralized logging live in `src/server/rest/error-middleware.ts`.
- Use `try...catch` only for recovery, fallback, cleanup, or translation that changes behavior. Do not catch only to log and rethrow.
- Tests should assert the error class and, when relevant, `category`/`metadata`, not exact prose.
- Use a module-scoped child logger from `@/shared/logger`; do not use manual `[module]` tags or `console.*` in production code. Tests and explicit developer-output scripts may use console output.
- Never log secrets, credentials, tokens, or user financial data.

## Development

Run from `backend-cluster/backend-v2/`:

```zsh
yarn dev
yarn test
yarn test:integration
yarn lint
yarn typecheck
yarn build
yarn codegen
```

`yarn lint` fixes eligible ESLint findings. Review its diff. Unit tests live beside features in `__tests__/`; integration tests use `*.integration.test.ts`.

Code generation:

- `yarn generate-backend-v2-openapi` updates the backend REST spec.
- `yarn generate-fava-client` reads `../idl/beancount-ledger.openapi.json`.
- `yarn generate-gitea-client` reads `../idl/gitea.swagger.v1.json`; never hand-edit `src/features/gitea/client/gitea-api.ts`.
- `yarn generate-agent-tool-types` updates generated agent tool types.

Prompt and agent-routing evals live entirely under `evals/`. Use the focused `yarn eval:*` scripts while iterating and `yarn eval` for all modules. These suites make real, billed model calls unless their provider explicitly stubs the tool context, so they are manual and not part of CI.

## API surfaces

- GraphQL: `src/server/graphql/`; resolver list and DI are in `resolver-registry.ts`.
- REST: feature handlers register fragments consumed by `src/server/api/composition-root.ts`.
- MCP: `src/features/ai-agent/api/mcp-tools.ts`, registered through the same composition root.
- OpenAPI: `GET /api-gateway/v1/openapi.json` is the published v1 contract and is served in every environment. The internal `/api-docs` and `/api-admin-docs` Swagger UI pages stay development-only.
- New documented REST endpoints use Zod schemas, `zodValidator()`, and central route registration. Import the shared `@/shared/zod-openapi-setup`; never call `extendZodWithOpenApi()` in individual schema files.

### The v1 REST surface

`src/features/ledger/api/rest/v1/` is the public API (ADR 0006 D7). It is deliberately small: the bar for an endpoint is that a caller who has never read the GraphQL schema can do the thing with curl in ten minutes. Everything else stays GraphQL-only with a written `restExempt` reason in the op-class table.

- **Add an endpoint** by declaring a `v1Route({...})` in the relevant `*-handler.ts` and listing it in `v1/index.ts`. `registerV1Route` mounts it, validates it, and registers it with the spec from that one declaration, so the mounted path, the enforced schema, and the documented contract cannot disagree.
- **Paths address a ledger as `{owner}/{name}`,** two segments, never one `{ledgerId}`. A single segment needs `%2F` to survive Cloudflare and Caddy unchanged.
- **Classify the new op** in `op-class.ts` — the coverage test fails otherwise — and remember the class comes from the table, not the HTTP method: `POST .../query` is `read`.
- **Regenerate the snapshot** with `yarn generate-v1-openapi`; `openapi-completeness.test.ts` fails when `docs/openapi/v1.json` and the live document disagree, so a contract change shows up as a reviewable diff.
- The v1 fragments are gated `enforced`, so scopes are denied on this surface regardless of `config.api.scopeEnforcement`. The archive download is the one v1 route outside the identity gate: it carries a single-use HMAC ticket instead, because a browser following a download link cannot send a header.

### Identity and op classes

Every surface authenticates through one gate and classifies every operation:

- `src/server/api/identity.ts` (`resolveIdentity`) is the single authentication seam; the REST side publishes it via `rest/identity-middleware.ts`.
- `src/server/api/op-class.ts` holds the scope vocabulary and the op-class matrix: a stable op id per operation, classified `read` / `write` / `admin`. `graphql/scope-middleware.ts`, `rest/scope-middleware.ts`, and the MCP registry all gate on it. `config.api.scopeEnforcement` is `"shadow"` while coverage is confirmed against live traffic — it logs what it _would_ refuse; flipping it to `"enforce"` is a reviewed code edit here, never an environment switch.
- `src/server/api/always-public.ts` is the census of mounts that sit outside the scope gate. Each entry carries a written reason.
- `src/server/api/rate-limit.ts` is the one rate limiter, shared by all three surfaces. Budgets are keyed on the credential (`tokenId`, else `userId`, else IP), so a client cannot get three budgets by spreading load across GraphQL, REST, and MCP. Writes get a much smaller budget than reads; per-op exceptions live in `OP_BUDGETS`. It fails open when Redis is unreachable — a limiter that refuses everything when its store is down is a worse outage than briefly unmetered traffic.
- `src/server/api/audit.ts` records write-class ops and every denial, hooked at `requireScopeClass` and `authorizeLedger` so coverage does not depend on each verb remembering. The event type deliberately has **no field an argument value could occupy**; if you need to record more, widen the interface in a diff a reviewer will see. Retention is 90 days, swept by `audit-retention-job`.
- Three drift guards in `src/server/api/__tests__/` fail CI on divergence: `surface-parity` (a verb appears on every surface or carries an excuse), `op-class-coverage` (runtime ops ↔ matrix, both directions), and `always-public` (no unexplained outside-gate mount). Adding an operation means classifying it — the coverage test will not let you skip.

### API keys

`src/features/apikeys/` issues durable `bcio_` credentials for CI, cron, CLI, and agents (ADR 0006 D6). Three rules live in the service, not the adapters, so they hold identically on all three surfaces:

- **A key cannot mint a key.** Checked on `Identity.method`. A credential that can create its own successor cannot really be revoked.
- **Minting requires a paid plan.** A pricing decision confirmed in w1/m22; existing keys keep working if a subscription lapses, because breaking a running integration is a support incident rather than a nudge.
- **A key can only narrow what its minter held,** never widen it.

Only a sha256 digest is stored, plus a display prefix. The plaintext is returned by the mint response and is unrecoverable afterwards.

A key reaches GraphQL and `/api-gateway/v1` unconditionally. **MCP additionally requires the key to be ledger-scoped**, because `mcp-route.ts` refuses any credential not bound to one ledger — mint with `ledgerScope: "owner/name"` for an agent client.

## Environment and deployment

Prefer typed defaults in `src/config/config.ts`. Add an environment variable only for secrets or values that genuinely vary by deployment.

When adding one:

1. Add it to `AppConfig` and parse it once in `src/config/config.ts`.
2. Document it in `.env.tmpl` and `README.md`.
3. Add a placeholder/pass-through to `../../deploy/docker-mac/.env.example` and `../../deploy/docker-mac/docker-compose.yml` when the local stack needs it.
4. Update the root `bex.yaml` when the hosted deployment needs it.
5. Keep real values only in ignored local files or the deployment platform's secret store.

The service defaults to port 4104 and requires PostgreSQL and Redis. The ledger and Gitea endpoints are external-service dependencies provided by the local stack or deployment environment.
