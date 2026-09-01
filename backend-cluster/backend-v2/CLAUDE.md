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
yarn lint:deadcode
yarn lint:deadcode:fix
yarn typecheck
yarn build
yarn codegen
yarn mcp:conformance <base-url>
```

`yarn lint` fixes eligible ESLint findings and then runs Knip dead-code detection. Review its diff. `yarn lint:deadcode:fix` also removes unused files, exports, and exported types; review those removals before keeping them. Unit tests live beside features in `__tests__/` — and beside the scripts in `scripts/__tests__/`, which is why Jest's `roots` covers both; integration tests use `*.integration.test.ts`.

`yarn mcp:conformance <base-url> [--token …] [--read-only-token …]` runs ADR 0007's checklist against a deployment and names the check that failed. It only observes, so it is safe to point at production; checks needing a credential skip rather than fail without one.

Code generation:

- `yarn generate-backend-v2-openapi` updates the backend REST spec.
- `yarn generate-fava-client` reads `../idl/beancount-ledger.openapi.json`.
- `yarn generate-gitea-client` reads `../idl/gitea.swagger.v1.json`; never hand-edit `src/features/gitea/client/gitea-api.ts`.
- `yarn generate-agent-tool-types` updates generated agent tool types.

Prompt and agent-routing evals live entirely under `evals/`. Use the focused `yarn eval:*` scripts while iterating and `yarn eval` for all modules. These suites make real, billed model calls unless their provider explicitly stubs the tool context, so they are manual and not part of CI.

## API surfaces

- GraphQL: `src/server/graphql/`; resolver list and DI are in `resolver-registry.ts`.
- REST: feature handlers register fragments consumed by `src/server/api/composition-root.ts`.
- MCP: tools in `src/features/ai-agent/api/mcp-tools.ts`, resources in `mcp-resources.ts`, both registered through the same composition root and both gated per call. Reads belong in resources and actions in tools — a tool competes for the model's selection attention and a resource does not, which is what lets the read surface grow (ADR 0008 D2). Which verbs belong on which surface — and what an absence has to say for itself — is **ADR 0008** (`../../docs/adrs/ADR008-backend-v2-surface-parity.md`). The endpoint's own contract — its address, why it serves `POST` only, why a `401` is worthless unless the discovery document it names resolves, and why a tool result reading `ok: false` must carry `isError` — is **ADR 0007** (`../../docs/adrs/ADR007-backend-v2-mcp-surface.md`). Read it before changing `mcp-route.ts`; every rule in it exists because production broke without it.
- OpenAPI: `GET /api-gateway/v1/openapi.json` is the published v1 contract and is served in every environment. The internal `/api-docs` and `/api-admin-docs` Swagger UI pages stay development-only.
- New documented REST endpoints use Zod schemas, `zodValidator()`, and central route registration. Import the shared `@/shared/zod-openapi-setup`; never call `extendZodWithOpenApi()` in individual schema files.

### The v1 REST surface

`src/features/ledger/api/rest/v1/` is the public API (ADR 0006 D7). It is deliberately small: the bar for an endpoint is that a caller who has never read the GraphQL schema can do the thing with curl in ten minutes. Everything else stays GraphQL-only with a written `restExempt` reason in the op-class table.

- **Add an endpoint** by declaring a `v1Route({...})` in the relevant `*-handler.ts` and listing it in `v1/index.ts`. `registerV1Route` mounts it, validates it, requires the shared request identity, and registers it with the spec from that one declaration, so the mounted path, enforced schema/authentication, and documented contract cannot disagree.
- **Paths address a ledger as `{owner}/{name}`,** two segments, never one `{ledgerId}`. A single segment needs `%2F` to survive Cloudflare and Caddy unchanged.
- **Classify the new op** in `op-class.ts` — the coverage test fails otherwise — and remember the class comes from the table, not the HTTP method: `POST .../query` is `read`.
- **Regenerate the snapshot** with `yarn generate-v1-openapi`; `openapi-completeness.test.ts` fails when `docs/openapi/v1.json` and the live document disagree, so a contract change shows up as a reviewable diff.
- The v1 fragment is gated `enforced`, so scopes are denied on this surface regardless of `config.api.scopeEnforcement`. Every v1 resource route, including archive downloads, uses the shared identity gate; browsers present their session cookie and non-browser clients use OAuth bearer tokens or personal API keys.

### Identity and op classes

Every surface authenticates through one gate and classifies every operation:

- `src/server/api/identity.ts` (`resolveIdentity`) is the single authentication seam; the REST side publishes it via `rest/identity-middleware.ts`. Request credentials normalize to a user principal with computed effective capabilities and explicit assurance. Internal work uses a distinct `system` method and service principal with an explicit on-behalf-of user; it must never masquerade as a session.
- `src/server/api/op-class.ts` holds the scope vocabulary and the op-class matrix: a stable op id per operation, classified `read` / `write` / `admin` / `session-only` / `public`. The class is the operation's rate-limit risk and legacy audit default. A separate optional `authorizationAction` routes migrated operations to the centralized PDP, where credential reachability and grant authority are decided without treating a ledger scope as authority. PDP-routed rows use an operational `read` / `write` / `admin` class, never `session-only` or `public`. `graphql/scope-middleware.ts`, `rest/scope-middleware.ts`, and the MCP registry all gate on it. `config.api.scopeEnforcement` is `"shadow"` while coverage is confirmed against live traffic — it logs what it _would_ refuse; flipping it to `"enforce"` is a reviewed code edit here, never an environment switch.
- Every GraphQL root query and mutation declares exactly one access mode from `src/server/graphql/authenticated.ts`: `@Authenticated()` when an identity is required or `@AllowAnonymous()` when the resolver intentionally accepts no identity. Never use TypeGraphQL `@Authorized()`. `@Authenticated()` checks only that the shared identity resolver produced an `Identity`; credential methods, scopes, relationships, denials, and authorization audit remain the global operation gate and application service's decisions. Mark nullable identity probes and anonymous authentication ceremonies with `@AllowAnonymous()` rather than leaving them undecorated.
- `src/server/api/always-public.ts` is the census of mounts that sit outside the scope gate. Each entry carries a written reason.
- `src/server/api/rate-limit.ts` is the one rate limiter, shared by all three surfaces. Budgets are keyed on the credential (`tokenId`, else `userId`, else IP), so a client cannot get three budgets by spreading load across GraphQL, REST, and MCP. Writes get a much smaller budget than reads; per-op exceptions live in `OP_BUDGETS`. It fails open when Redis is unreachable — a limiter that refuses everything when its store is down is a worse outage than briefly unmetered traffic.
- `src/server/api/audit.ts` records write/admin ops and every denial or authorization-source error. Legacy operations hook at `requireScopeClass` and `authorizeLedger`; PDP-routed operations emit their final result from `AuthorizationService`. Request-bound calls preserve the exact transport op ID through an isolated AsyncLocalStorage child context; direct service calls fall back to the canonical action. Both preserve the credential ledger pin. The event type deliberately has **no field an argument value could occupy**; if you need to record more, widen the interface in a diff a reviewer will see. Retention is 90 days, swept by `audit-retention-job`.
- Three drift guards in `src/server/api/__tests__/` fail CI on divergence: `surface-parity` (a verb appears on every surface or carries an excuse), `op-class-coverage` (runtime ops ↔ matrix, both directions), and `always-public` (no unexplained outside-gate mount). Adding an operation means classifying it — the coverage test will not let you skip.
- `authz/model.fga` models the **durable relationship ceiling** (exact-self users plus ledger owner/collaborator/public relationships) in the OpenFGA language, with behavioral assertions in `authz/model.test.fga.yaml`. Credentials, scopes, Stripe identifiers, and request context stay outside FGA and never become contextual tuples. No OpenFGA runtime is deployed. Protected user profile/lifecycle/API-key-management/billing/social/ledger-control-plane actions and authenticated single-ledger `read`/`write`/`admin` decisions execute through the small TypeScript PDP in `src/server/api/authorization/`; their application-service boundaries call it before domain work, with no raw user-ID bypass. Public profile/follower/following/starred-list discovery and the static tier-quota catalog are explicit public exceptions. Exact-self comes from the resolved stable user ID, API-key ownership is read from the current row, Stripe customer/subscription ownership remains a payment-domain invariant, and ledger relationships are rechecked from current Gitea/Fava facts without a tuple copy or cross-request cache. `authorizeLedger` remains the compatibility seam and metadata-returning adapter: authenticated calls use the same `principal + action + resource + context` contract, while anonymous public reads retain their existing branch. A semantic relationship change must update the model in the same PR. See `authz/README.md` and **ADR 0010** (`../../docs/adrs/ADR010-backend-v2-authz-model.md`).

### API keys

`src/features/apikeys/` issues durable `bcio_` credentials for CI, cron, CLI, and agents (ADR 0006 D6). GraphQL, REST, and MCP all call `ApiKeyService`, the application-service boundary whose protected methods make one centralized authorization decision before domain work. The PDP owns the existing admin credential ceiling, exact-self/key-owner relationship, and no-self-replication rule. The service then enforces the remaining domain constraints identically on all three surfaces:

- **Minting requires a paid plan.** A pricing decision confirmed in w1/m22; existing keys keep working if a subscription lapses, because breaking a running integration is a support incident rather than a nudge.
- **A key can only narrow what its minter held,** never widen it.
- **A ledger pin is a ceiling too.** A credential confined to one ledger mints keys confined to that ledger — it may restate or inherit the pin, never name a different ledger or drop it. A blank `ledgerScope` means "inherit" and is never stored as `""`; a stored pin that is not `owner/name` makes the key not live.

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
