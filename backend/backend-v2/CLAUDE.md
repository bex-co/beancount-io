# Backend - Web Beancount

Node.js backend providing GraphQL and REST APIs for Beancount accounting with feature-based architecture.

## Architecture

Feature-based organization: domain features in `src/features/`, infrastructure at `src/` root.

```
src/
├── config/             # Configuration (infrastructure)
├── drizzle/            # Database migrations (infrastructure)
├── features/           # Domain features
│   ├── admin/          # Admin API
│   ├── ai-agent/       # AI assistant
│   ├── auth/           # Authentication & authorization
│   ├── gitea/          # Git server integration (with sub-features)
│   ├── growth/         # Growth features (sitemap, etc.)
│   ├── healthz/        # Health check endpoints
│   ├── importer/       # Import/parsing
│   ├── is-paid/        # User classification and payment status logic
│   ├── ledger/         # Ledger data models
│   ├── stripe/         # Stripe payment processing
│   └── v1-compat/      # V1 API compatibility (URL redirects)
├── metrics/            # Observability (infrastructure)
├── scheduler/          # Job scheduling with node-cron (infrastructure)
├── server/             # HTTP server core (infrastructure)
│   ├── graphql/        # GraphQL API organization
│   │   ├── api-gateway.ts            # Apollo Server setup with all resolvers
│   │   ├── context.ts                # Request context creation
│   │   ├── auth-checker.ts           # Authorization logic
│   │   ├── paid-access-checker.ts    # Paid access authorization
│   │   ├── validation-error-plugin.ts # GraphQL validation errors
│   │   └── index.ts                  # GraphQL exports
│   ├── rest/           # RESTful API organization
│   │   ├── rest-routes.ts       # Centralized REST route setup
│   │   ├── openapi-routes.ts    # Swagger UI routes
│   │   ├── openapi-registry.ts  # OpenAPI spec registry
│   │   └── index.tsx            # REST exports
│   ├── service/        # Server services (config, models, etc.)
│   ├── start-server.ts # Server configuration and startup
│   └── server-routes.ts # Main orchestrator (REST + GraphQL)
├── service/            # Service container / DI root (infrastructure)
│   ├── factory.ts      # ServerContainer — composition root implementing IService
│   ├── types.ts        # IService interface
│   ├── fava/           # Fava API client
│   ├── models/         # Data model registry (PostgresRedisImpl)
│   ├── redis/          # Redis cache connection (createRedisCache)
│   └── sendgrid.ts     # Email service
└── shared/             # Common utilities (infrastructure)
    ├── email-templates/ # Email rendering templates
    ├── errors/         # Error classes (GraphQL & REST)
    └── [utilities]     # Various shared utilities
```

**Feature Pattern**: `./data/` (models), `./api/` (resolvers/endpoints), `./service/` (business logic)

**Domain Features** (`src/features/`): admin, ai-agent, auth, gitea, growth, healthz, importer, is-paid, ledger, stripe, v1-compat

**Infrastructure** (`src/`): server (GraphQL/REST), scheduler, metrics, shared, service, config, drizzle

## Architecture Conventions

These rules define what belongs in each layer. They exist to keep resolvers thin,
business logic in one place, and persistence dumb. Follow them for all new code
and when touching existing code.

### Target architecture: Workflow classes + constructor injection (migration in progress)

The layering is moving to **Resolver → Workflow → Service → Database**, with
**constructor injection** of workflows/services into resolvers wired in a
**Composition root**, replacing the `ctx.service` service-locator and the
`operations/` free-function style.

```
Resolver (transport)        ← constructor-injected workflow/service
   ↓
Workflow (orchestration)    ← injected service/client factories + Pick<IModels> + db
   ↓
Service / ClientFactory     ← injected Pick<IModels> + db + config
   ↓
Database (models + db)
```

- A **Workflow class** (`features/<feature>/workflow/<feature>-workflow.ts`,
  `interface I<Feature>Workflow` + class) owns cross-service orchestration:
  locking, transaction boundaries, multi-service/Fava/Gitea coordination, and DTO
  mapping. It is the new home for what used to live in `operations/` functions and
  in fat resolvers. Request data (`userId`) is passed **per method**, never
  injected.
- **Resolvers are constructor-injected** with their workflow and become thin
  adapters (resolve `userId` from `@Ctx`, delegate, return). They keep `@Ctx`
  only to read request data — **no `ctx.service.*`**.
- **Workflow method params/returns are transport-agnostic domain types**, NOT the
  resolver's GraphQL `@ArgsType`/`@ObjectType` classes (those carry TypeGraphQL +
  class-validator decorators). Define plain command/result types the workflow owns
  (e.g. `features/ledger/workflow/ledger-workflow.types.ts`); resolvers map their
  GraphQL args/DTOs to/from them — structural compatibility usually makes the
  mapping implicit (the resolver passes its args and returns the domain result
  as-is). A workflow must not import from `api/`.
- **No new code may type a parameter as `IService`.** Depend on narrow dedicated
  interfaces (`IFavaClientFactory`, `IGiteaClientFactory`, `IStripeService`,
  `Pick<IModels, …>`, `Pick<AppConfig, …>`). External-API client provisioning
  lives in `src/service/clients/*-client-factory.ts`, not on the container.
- **Status:** the **ledger** feature is the pilot (`LedgerWorkflow` +
  `LedgerMutationResolver`/`LedgerQueryResolver`). The other resolvers still use
  `ctx.service` — a **deprecated migration bridge** (`ServerContainer` delegates
  its `getFavaApiContext`/`getGiteaClient`/… to the new client factories). When a
  feature is migrated, move its orchestration into a workflow, register the
  resolver in `api-gateway.ts`'s manual DI map, and drop its `ctx.service` use.
  `ctx.service` is removed once the sweep completes. See "Composition root" below.

The per-unit rules in "Service shape" and "Constructor & function dependency
injection" below still hold for Services and any remaining `operations/` functions
(legacy), and for how Workflows take their narrow deps.

### Layer responsibilities

- **Resolver / REST handler (`api/`)** — transport adapter only. Parse/validate
  args (TypeGraphQL decorators / Zod), resolve `userId` from context, map domain
  results to GraphQL/REST DTOs, set cookies/headers, field-level authorization,
  and recovery `try/catch` (see Error Handling). **MUST NOT** contain business
  logic, multi-step orchestration, caching, or `ctx.service.models.*` access.
- **Service (`service/`)** — owns business logic + orchestration: validation
  rules, tier checks, multi-model/multi-API coordination, transactions, and
  **all caching** (via the cache helper). The only layer that calls models for
  business reads/writes and the only layer that drives external clients (Fava,
  Gitea, Plaid, LLM) for non-trivial flows.
- **Data model (`data/*-model/`)** — pure persistence: CRUD/queries over one
  aggregate. No business rules, no caching. **Exception:** ephemeral token /
  session stores whose persistence _is_ Redis (`emailToken`, `magicLinkToken`,
  `signupOtpSession`, `cliAuthSession`, `jwt`) live here and own their key
  namespace — these are "Redis-backed models," not caches.

**Strict boundary:** resolvers never touch `ctx.service.models` directly — always
go through a service. A lone external-API read that touches no model (e.g. a
single Fava call mapped straight to a DTO) may stay in a resolver.

### Service shape: simple classes + cross-service functions

Keep service classes **simple and single-concern**; express cross-service logic
as **functions**, not orchestrator classes.

- A **simple `*Service` class** owns one concern/aggregate. Its dependencies are
  limited to `models`, infra clients (Fava/Gitea/Plaid/Stripe SDK), and `config`.
  It MUST NOT depend on (import/inject) another service class.
- **Cross-service orchestration is a standalone function** that takes the
  **specific** service instances + narrow data deps it needs — **never `IService`**
  (the whole container). **Prefer a single destructured object param (named args)
  over positional params** — both deps and domain args go in one object, e.g.
  `createLedger({ favaApiClient, models, postgresDb, stripe, config, ledgerCreate, userId })`.
  Operations MUST NOT instantiate shared collaborators (`new StripeService(...)`):
  callers forward the singleton from the container (`ctx.service.stripe`).
  Resolvers/services assemble the params and call these functions. (The
  `features/llm/utils/*` functions are the precedent.)
- **Classification rule (mechanical):** _would the unit import/inject another
  service class?_ If yes, it's orchestration → make it a function. If it only
  touches `models`/clients/`config`, it's a simple service class.
- **Exception:** a cohesive capability with many methods over a shared resource
  stays a class (e.g. `StripeService`, which wraps the Stripe SDK with
  `getStripeInstance`/`listSubscriptions`/`upgradeSubscription`/…). Functionize
  the _glue that uses such units_, not the units. (Counter-example: the former
  `TierService` was just a pure limit-lookup stapled to one cross-service read,
  so it decomposed into `getTierLimits` (pure) + a `getUserTier` operation.)
- **Home for cross-service functions:** a per-feature `operations/` directory —
  `features/<feature>/operations/<operation>.ts`, one exported function per file.

### Interfaces for services & models

Every service class and data model declares an interface, and **type references
use the interface; construction uses the class** (the `ISendGrid` precedent).

- A service declares `export interface I<Name>` in its own file, directly above
  the class, listing its public methods; the class declares `implements I<Name>`
  (`implements` keeps the two in sync at compile time). Example: `StripeService
implements IStripeService`.
- A data model declares `IXxxModel` in its `types.ts`; the impl `implements` it.
- **Reference the interface** in container fields (`IService.stripe: IStripeService`),
  operation/constructor params (`stripe: IStripeService`), and the `IModels`
  registry — never the concrete class. **Construct** with the concrete class
  (`new StripeService(...)` in `factory.ts`); a concrete instance satisfies its
  interface. The composition root (`ServerContainer` in `factory.ts`) is the one
  place that legitimately names concrete classes (it builds them).
- Payoff: tests build type-checked mocks via `jest.Mocked<IStripeService>` /
  partial stubs without importing or `jest.mock`-ing the concrete class.

### Constructor & function dependency injection

Inject the **narrowest** dependency the unit actually uses; never inject the full
`IContext` for convenience (it bloats test mocks with
`userId`/`token`/`koaCtx`/`loaders`/`getCurrentUser`).

- **Infra-only / cross-transport services** → `(service: IService, config: AppConfig)`
  (or just `(service)`); pass request data (`userId`, `token`) as **method
  parameters**. `UserService` and `LedgerService`-style units are the exemplars.
- **`operations/` functions never take `IService`** — they take the specific
  service instances (`stripe: IStripeService`) + narrow data deps (`models`,
  `postgresDb`, `config`). This keeps test mocks tiny (pass a stub, no container).
  A long-lived service class (e.g. `UserService`) may still hold `IService` and
  pass `this.service.stripe` etc. into the operations it calls.
- **Shared leaf services live on the container** (`IService`) so callers forward
  a single instance instead of `new`-ing. `StripeService` is exposed as
  `service.stripe`; add others the same way rather than scattering `new`.
- Only take `(ctx: IContext)` when the unit genuinely needs request-user context;
  prefer narrowing to `(service[, config])` + method `userId`/`token`.
- Long-lived services constructed in `ServerContainer` (e.g. `FeatureUsageService`)
  take `(models, db)` since no request context exists at startup. When such a
  service needs a shared collaborator, the container injects it (e.g.
  `AiCfoUsageService` receives `stripe`), since the `IService` instance doesn't
  exist yet at construction time.
- **Slice `IModels` / `AppConfig` with `Pick<>`** — never inject the full registry
  or config when a unit reads one or two members. Declare the param/field as the
  narrowest slice (`models: Pick<IModels, "paidCustomer">`, `config:
Pick<AppConfig, "gitea">`); when a unit forwards them to a callee, its slice is
  the union of what it reads directly plus what the callee needs. Callers keep
  passing the full `service.models` / `config` (structurally assignable), so
  `factory.ts` is unchanged — the slice is just an honest contract that lets tests
  build `{ paidCustomer: ... }` mocks with no `as unknown as IModels` cast.
  `FeatureUsageService` (`Pick<IModels, "featureUsage">`) is the exemplar. The
  composition root (`IService`/`factory.ts`) keeps the full `IModels`/`AppConfig`.

### Composition root

The dependency graph is assembled explicitly, bottom-up, as **per-layer
interfaces** — not via a DI container. Two pieces:

- `src/service/factory.ts` (`ServerContainer`) — infra composition root: builds
  db/redis/models/stripe and the client factories (`favaClientFactory`,
  `giteaClientFactory`). Still implements `IService` during migration so the
  unmigrated resolvers keep working through `ctx.service`.
- `src/server/graphql/composition/layers.ts` + `resolver-container.ts` —
  transport/workflow composition root. Defines `DatabaseLayer` →
  `ClientFactoryLayer` → `ServiceLayer` → `WorkflowLayer` interfaces and
  `buildClientFactoryLayer`/`buildWorkflowLayer` builders (each takes the layer(s)
  below, never `IService`). `ClientFactoryLayer` is its own layer so services
  depend downward on it instead of on each other.
- `src/server/graphql/api-gateway.ts` is the one bootstrap edge where `IService`
  is still in scope: it assembles the layers from `service`, builds the workflows,
  and registers migrated resolver instances in a **manual DI map**
  (`resolverInstances`) passed to TypeGraphQL's `buildSchema({ container })`. This
  is **direct instantiation** (`new LedgerMutationResolver(workflow)`); the
  `container.get` hook is just the seam TypeGraphQL requires to return a pre-built
  instance (it throws if a resolver with ctor params isn't registered).

To migrate a feature: build its workflow in `buildWorkflowLayer`, add the
resolver(s) to `resolverInstances`, and remove the resolver's `ctx.service` use.

### Caching

Caching lives in the **service layer** via the cache helper, never in resolvers,
and in the data layer only for the ephemeral-token exception above.

Use `ctx.service.cacheHelper` (see `src/shared/cache/`) — not `ctx.service.cache`
directly. It provides:

- `getOrSet(key, ttlMs, loader)` — read-through, stampede-guarded, fails open
  (a Redis outage runs the loader instead of breaking the request).
- `get` / `set` / `del` — **fail-open** (log + swallow). For genuine caches:
  a Redis blip degrades gracefully instead of breaking the request.
- `getStrict` / `setStrict` / `delStrict` — **log + rethrow**. For ephemeral
  persistence stores (auth tokens) where a dropped write must surface to the
  caller rather than silently no-op.
- TTL constants in `TTL` (`cache-ttl.ts`) — no raw `5 * 60 * 1000` literals.
- Key builders in `CACHE_KEYS` (`cache-keys.ts`), convention
  `domain:resource:identifier[:sub]`.

**Serialization is type-preserving.** The Redis-backed Keyv store is configured with
a superjson codec (`service/redis/cache-codec.ts`), so cached values round-trip with
their types intact — `Date`, `Map`, `Set`, and `BigInt` survive a read/write. Cache
rich objects directly; do **not** rehydrate `Date` fields by hand on read (Keyv's
default `json-buffer` codec would have turned them into ISO strings — that gap is now
closed at the framework level).

The auth Redis-backed models (`features/auth/data/*-model/`) wrap their injected
`cache` with `createCacheHelper` and use the **strict** variants — they keep
`JSON.stringify` serialization (so no value-shape change), gaining centralized
error logging on the throw path.

The sitemap cache is an intentional exception: it stays **file-backed**
(Docker-volume persisted, large XML, stale-while-revalidate) but uses the shared
`TTL` / `CACHE_KEYS` naming.

## Key Technologies

Node.js + TypeScript, Koa.js, TypeGraphQL, Apollo Server, PostgreSQL + Drizzle ORM, Redis (cache + ephemeral token stores), JWT auth

## Development

**Scripts**: `yarn start` (dev), `yarn lint`, `yarn typecheck`, `yarn build`

**Codegen**: `yarn codegen` (all), `yarn generate-fava-client`, `yarn generate-gitea-client`

**Environment**: Port 4104, PostgreSQL + Redis required, `.env` for config

### Testing

**Structure**: `__tests__/` (unit, fast), `__integration__/` (integration, slower)

**Commands**: `yarn test` (unit only), `yarn test:integration`, `yarn test:watch`, `yarn test:coverage`

### Prompt Evals (promptfoo)

`src/features/llm` prompts have no compile-time way to catch a wording change
that breaks model behavior — Jest can check prompt _text_ but not what the
model actually does with it. `evals/` holds a [promptfoo](https://www.promptfoo.dev/)
harness — fully self-contained in this one directory (config, shared
providers, and per-module prompt adapters all live under `evals/`, not
scattered into `src/`) — that calls the real production functions
(`categorizeTransactions`, `suggestAccountMapping`, …) against fixtures and
asserts business-rule invariants (e.g. "never suggest an account outside the
existing list") plus qualitative `llm-rubric` grading — both against the real
BlockEden-proxied model, no extra credentials needed beyond the existing
`BLOCKEDEN_ACCESS_KEY`.

**Commands**: `yarn eval:categorize-transactions`, `yarn eval:suggest-account-mapping`
(fast single-module iteration), `yarn eval` (loops over every
`evals/*/promptfooconfig.yaml`, running each as its own isolated `promptfoo
eval` invocation — auto-discovers new modules, nothing to edit when one is
added), `yarn eval:view` (opens promptfoo's local web UI to inspect
prompts/outputs/pass-fail side by side).

`yarn eval` deliberately does **not** pass promptfoo's own glob support
(`-c "evals/*/promptfooconfig.yaml"`) as a single invocation — promptfoo
merges every matched config into one combined run and evaluates the full
cross product of all merged providers × all merged prompts × all merged
tests, so module A's fixtures would also run (nonsensically) against module
B's provider/prompt. Looping and invoking `promptfoo eval` once per file
keeps each module's run isolated, which is what we actually want.

**Node version**: the `promptfoo` CLI itself requires Node `^20.20.0` or
`>=22.22.0` (stricter than this project's own `engines.node: >=20.0.0`) — on
an older 22.x patch (e.g. 22.17.0, installed via `n`) it exits immediately
with "requires a supported Node.js runtime". Run the `eval*` scripts under a
qualifying version, e.g. `n exec 22.22.0 yarn eval` (after `n --download 22.22.0`
once), without changing your default `node`.

**Not wired into CI** (`make ci-backend-v2` / GitHub Actions) — like
`yarn test:integration`, it's a local/manual command since it makes real,
billed model calls with non-trivial latency.

**Currently covers 4 of 5** `features/llm` prompt modules
(`categorize-transactions`, `suggest-account-mapping`, `recommend-accounts`,
`extract-transactions-from-file` — both its text formats `csv`/`ofx`/`txt`/
`json`/`xml` and image formats like `webp`/`png`/`jpg`), each under its own
`evals/<module>/` folder (`adapter.ts` + `promptfooconfig.yaml`). To add a
module whose orchestration function is pure text/JSON in, `Output.object`-
schema JSON out (same shape as these — `recommend-accounts` needed a
destructuring lambda in `WORKFLOWS` since its function takes positional
args, not one params object): add a `workflow` entry to `WORKFLOWS` in
`evals/providers/llm-workflow-provider.ts`, then a new `evals/<module>/`
folder with a display-only prompt adapter (mirrors the existing ones) and a
`promptfooconfig.yaml` with fixtures covering the module's documented
constraints (the "CRITICAL" clauses in its `prompts.ts` are the regression
risks worth asserting on). `yarn eval` picks up the new folder automatically
— no script edit needed; adding a dedicated `eval:<module>` script is
optional, purely for convenience when iterating on just that one module.

**File-based (image/PDF) fixtures need a real sample asset, not new
architecture.** `extract-transactions-from-file` and
`extract-receipt-from-file` take a `fileUrl: string` that the AI SDK
resolves itself (`prepare-llm-message.ts`) — this is _not_ a testability
flaw, it mirrors production (a presigned S3 URL, `llm-service.ts:108-116`).
Verified empirically: for the **text** category, a `data:` URI works with
zero network dependency, since `prepare-llm-message.ts`'s own
`fetch(fileUrl)` call supports `data:` URLs natively. For **image/file**
categories, a full `data:...;base64,...` URI does **not** work — the AI
SDK's own `downloadAssets` step treats any `new URL()`-parseable string as a
remote asset and only allows `http`/`https`, throwing `AI_DownloadError`
otherwise; the fix is a **bare base64 payload with no `data:` prefix** (fails
`new URL()`, so the SDK treats it as inline data instead of something to
download). `evals/providers/llm-workflow-provider.ts`'s
`"extract-transactions-from-file"` entry implements exactly this: it reuses
`classifyFile()` (the same function production uses) to pick a `data:` URI
vs. reading a real fixture file from disk
(`evals/extract-transactions-from-file/receipt.webp`, referenced by a
relative `imagePath` var) and passing its bare base64. `extract-receipt-from-file`
(always image/PDF) isn't covered yet but can follow the identical pattern
once/if a receipt fixture is added there too.

**Two prompt-quality findings surfaced by building these fixtures** (not
fixed, since they weren't asked for — flagging for a future decision):

- `getFormatSpecificRules()` in `extract-transactions-from-file/prompts.ts`
  only matches the literal string `"image"` to trigger its detailed IMAGE
  RULES text — but production's own `getFormatFromContentType()`
  (`llm-service.ts:69-76`) never actually passes that literal value for a
  real image upload; it passes the specific subtype (`"webp"`, `"png"`,
  `"jpg"`, etc.). That IMAGE RULES branch is effectively dead code today.
- The receipt-image fixture's receipt has no visible date printed on it; the
  model filled in a plausible-looking date anyway (schema requires the
  field). Not asserted on exact value since there's no ground truth, but
  worth knowing the prompt doesn't say what to do when a required field
  isn't visible in the source document.

### Agent tool-routing evals (`evals/beancount-agent/`)

`BeancountAgent` (`AGENT_SYSTEM_PROMPT`,
`src/features/ai-agent/service/agent-handler/beancount-agent.ts`) is a
different shape of eval from the 4 one-shot JSON modules above — a
`ToolLoopAgent` making up to 10 autonomous tool-calling steps against 6
tools that hit real Fava/Gitea/S3. `evals/providers/beancount-agent-provider.ts`
constructs the **real** agent (real system prompt, real tool schemas) with a
**stubbed** `ToolContext` (`favaApi`/`llmService`/`ledgerReceiptWorkflow`
return canned data — see `unwrapFavaResponse`'s expected response shape in
`src/foundation/fava/unwrap-response.ts`), then asserts on which tools the
model chose and in what order — not on real side effects, since nothing
touches production infrastructure.

**Deliberately not using promptfoo's native `trajectory:*` assertions**
(the ones covered in promptfoo's "agent quality" docs) — those require
promptfoo's own OpenTelemetry OTLP receiver and the provider emitting real
OTel spans, which this repo has no infrastructure for, and pair naturally
with real sandboxed tool execution rather than stubs. Instead, the provider
flattens `GenerateTextResult.steps[].toolCalls` itself (**not**
`result.toolCalls` — that field only reflects the _last_ step; a case where
the final step just summarizes an earlier tool's result in text would see
it come back empty even though a tool clearly ran, confirmed by chasing
down a real false-negative this way) and returns that as plain JSON, so
assertions are ordinary `javascript` checks like every other suite here —
`evals/beancount-agent/promptfooconfig.yaml`'s 3 fixtures check: a balance
question never calls a mutating tool, a receipt upload calls `parseReceipt`
but not `insertReceiptTransaction` in the same turn (waits for user
confirmation, per the prompt), and an edit request calls
`listLedgerFiles`/`readLedgerFiles` before `editLedgerFiles` (never edits
blind, per the prompt's editing workflow). This required one small
production change: a `generate()` forwarder alongside `BeancountAgent`'s
existing `stream()`, since `ToolLoopAgent.generate()` returns tool-call data
directly without needing to consume a stream.

`BqlToolCallingHandler`'s `BQL_SYSTEM_PROMPT` is a smaller instance of the
same shape (one tool, real Fava-backed) and could follow this identical
stubbing pattern if useful later — not yet covered.

## API Documentation

**OpenAPI/Swagger**: `/api-docs` (Swagger UI, dev only), `/api-docs/swagger.json` (spec, dev only)

**Auth schemes**: bearerAuth (JWT), adminToken, apiKey

**Adding endpoints**: Create Zod schemas → `zodValidator()` → `registerRoute()` → `rest-routes.ts`

**Zod OpenAPI Setup**: All schema files import from `@/shared/zod-openapi-setup` which extends Zod once at application startup following `@asteasolutions/zod-to-openapi` best practices. Never call `extendZodWithOpenApi()` directly in schema files.

## Server Organization

**Entry**: `server.ts` → `start-server.ts` → `server-routes.ts` (orchestrator)

**GraphQL** (`src/server/graphql/`): `api-gateway.ts`, `context.ts`, `auth-checker.ts`, `paid-access-checker.ts`

**REST** (`src/server/rest/`): `rest-routes.ts`, `openapi-routes.ts`, `openapi-registry.ts`

**Services** (`src/server/service/`): `config.ts`, `service.ts`, `models/`, `fava/`

## Data Models

All data models in `src/features/*/data/*-model/` **MUST** use Stripe-style `shortprefix_base58` IDs for primary keys.

### ID Format Convention

**Format**: `{prefix}_{base58_id}`

**Requirements**:

- **Prefix**: Short abbreviation (2-5 chars) + underscore, describing the resource type
- **ID**: Base58-encoded random string (default 20 chars, configurable)
- **Base58 Alphabet**: `123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz` (excludes confusing characters: 0, O, I, l)

**Benefits**:

- ✅ URL-safe and copy-paste friendly (no confusing characters)
- ✅ Self-documenting (prefix identifies resource type)
- ✅ Globally unique across tables
- ✅ Compact and readable (shorter than UUIDs)
- ✅ Follows Stripe API design patterns

### Implementation

Use `prefixedNanoidBase58()` from `@/shared/nanoid-base58` to generate IDs:

```typescript
import { prefixedNanoidBase58 } from "@/shared/nanoid-base58";

// In your model's create method
const result = await db
  .insert(myTable)
  .values({
    id: prefixedNanoidBase58("myres_"), // Format: myres_{20-char-base58}
    // ... other fields
  })
  .returning();
```

**Function signature**:

```typescript
prefixedNanoidBase58(prefix: string, length: number = 20): string
```

### Prefix Naming Convention

Choose clear, abbreviated prefixes that identify the resource:

| Prefix   | Resource Type       | Model Location                                     |
| -------- | ------------------- | -------------------------------------------------- |
| `ftusg_` | Feature Usage       | `features/feature-usage/data/feature-usage-model/` |
| `pacc_`  | Plaid Account       | `features/plaid/data/plaid-account-model/`         |
| `pitm_`  | Plaid Item          | `features/plaid/data/plaid-item-model/`            |
| `pslg_`  | Plaid Sync Log      | `features/plaid/data/plaid-sync-log-model/`        |
| `ptxn_`  | Plaid Transaction   | `features/plaid/data/plaid-transaction-model/`     |
| `pwe_`   | Plaid Webhook Event | `features/plaid/data/plaid-webhook-event-model/`   |

**Prefix Guidelines**:

- Keep prefixes 3-6 characters total (including underscore)
- Use lowercase letters only
- Abbreviate resource names logically (e.g., `plaid_transaction` → `ptxn_`)
- For feature-specific resources, include feature abbreviation (e.g., `plaid` → `p`, `feature_usage` → `ftusg`)
- Always end with underscore (`_`)
- Document new prefixes in this table when adding models

### Example: Creating a New Model

```typescript
// src/features/myfeature/data/my-resource-model/postgres-impl.ts
import { prefixedNanoidBase58 } from "@/shared/nanoid-base58";
import { type DbExecutor } from "@/drizzle/drizzle";
import { myResources } from "./schema";
import { MyResource, CreateMyResourceInput } from "./types";

export class MyResourcePostgresModel {
  public async create(
    db: DbExecutor,
    input: CreateMyResourceInput,
  ): Promise<MyResource> {
    const now = new Date();

    const result = await db
      .insert(myResources)
      .values({
        id: prefixedNanoidBase58("myres_"), // Stripe-style ID with custom prefix
        userId: input.userId,
        name: input.name,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return result[0];
  }

  // ... other methods
}
```

### Schema Definition

In your Drizzle schema, define the ID column as `text` with primary key:

```typescript
// src/features/myfeature/data/my-resource-model/schema.ts
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const myResources = pgTable("my_resources", {
  id: text("id").primaryKey(), // Stores Stripe-style IDs like "myres_7wXzK9mNpQrSt2VxYaBcDeF3"
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

### Migration from Other ID Formats

**DO NOT**:

- ❌ Use `nanoid()` directly without prefix (not self-documenting)
- ❌ Use MongoDB ObjectIDs (not Postgres-friendly)
- ❌ Use auto-incrementing integers (exposes business metrics)
- ❌ Use UUIDs (too long, harder to read)

**Migration Strategy**:
If you have existing models with different ID formats, they should be migrated when next updated. Add new columns with Stripe-style IDs and maintain backward compatibility during transition.

## Code Standards

ESLint, no `++`, no shadowing, TypeScript strict, kebab-case files, feature-based organization

### Logging

**ALWAYS use the logger instance instead of console.log/error/warn/info:**

```typescript
import { logger } from "@/shared/logger";

// ✅ CORRECT - Use module-scoped child logger
const authLogger = logger.child({ module: "auth-routes" });

authLogger.info("User logged in", { userId: "123", email: "user@example.com" });
authLogger.error("Failed to fetch data", { endpoint: "/api/users", error });
authLogger.warn("Rate limit approaching", { current: 95, max: 100 });
authLogger.debug("Processing request", { requestId, data });

// ❌ WRONG - Do not use manual tags in log messages
logger.info("[auth-routes] User logged in", { userId: "123" });

// ❌ WRONG - Do not use console
console.log("User logged in", userId);
console.error("Failed to fetch data", error);
```

**Module-Scoped Logging (Preferred):**

Always create a child logger at the top of your file to automatically include module context:

```typescript
import { logger } from "@/shared/logger";

// Create child logger once per module
const moduleLogger = logger.child({ module: "feature-name" });

export function myFunction() {
  // Use child logger throughout the module
  moduleLogger.info("Operation started");
  moduleLogger.error("Operation failed", { error });
}
```

**Benefits of Child Loggers:**

- ✅ Automatic module context in all logs
- ✅ Cleaner log messages without manual tags
- ✅ Better structured logging for filtering and aggregation
- ✅ Consistent module naming across the codebase

**Log Levels:**

- `debug` - Verbose debugging information (hidden in production by default)
- `info` - General informational messages (user actions, business events)
- `warn` - Warning messages (recoverable errors, deprecated features)
- `error` - Error messages (failures, exceptions)

**Best Practices:**

- **Always use child loggers** - Create one per module with `logger.child({ module: "module-name" })`
- **Never use manual tags** - Don't put `[module-name]` in log messages
- Use structured logging with metadata objects (second parameter)
- Keep log messages concise and descriptive
- Include relevant context (userId, requestId, etc.) in metadata
- Avoid logging sensitive data (passwords, tokens, PII)
- Use appropriate log levels for filtering

**Test Environment:**
Logs are automatically silenced in test environment (NODE_ENV=test). No need to mock logger in tests.

**Test Files Exception:**
Test files (`__tests__/`, `*.test.ts`) and dev tools (`generate-preview.ts`) may use console.log for output.

## Error Handling

**One transport-agnostic error hierarchy** lives in `src/shared/errors/`. Throw a
`DomainError` subclass from **any** layer (services, operations, shared infra,
resolvers, REST handlers/middleware) — never a GraphQL- or HTTP-specific error, and
never a generic `Error`. Each error carries a semantic `category`
(`ErrorCategory`, e.g. `NOT_FOUND`) which is the **canonical, transport-agnostic
code**; the per-transport adapters translate it to the wire format.

- **Domain layer**: `error-category.ts` (`ErrorCategory` enum + `CATEGORY_HTTP_STATUS`)
  and `domain-errors.ts` (`DomainError` base + 12 concrete classes:
  `NotFoundError`, `ForbiddenError`, `UnauthenticatedError`, `BadUserInputError`,
  `ValidationError`, `ConflictError`, `RateLimitedError`, `InternalServerError`,
  `ServiceUnavailableError`, `ResourceLimitReachedError`,
  `OperationNotAllowedError`, `PremiumRequiredError`).
- **GraphQL adapter**: `src/server/graphql/format-error.ts` (Apollo `formatError`)
  maps `category` → `extensions.code`, merges metadata, and masks internal-error
  messages in production. `error-logging-plugin.ts` classifies by category.
- **REST adapter**: `src/server/rest/error-middleware.ts` (`restErrorMiddleware`),
  registered once as the outermost middleware in `rest-routes.ts`, maps `category`
  → HTTP status (via `CATEGORY_HTTP_STATUS`, or `httpStatusHint` for passthrough)
  and emits `{ ok: false, error: { code, message, metadata? } }`. It also logs
  centrally — REST handlers just throw, no per-handler try/catch-to-log.

**DO NOT use**: transport-specific error classes (the old `GraphQL*Error` /
`REST*Error` split was removed), `apollo-server-errors` (removed), legacy `AppError`
(removed).

### Business Logic: Throwing Errors

```typescript
import { NotFoundError, ServiceUnavailableError } from "@/shared/errors";

// Resource not found
if (!user) {
  throw new NotFoundError("User", userId);
}

// External service down
if (!response.data.success) {
  throw new ServiceUnavailableError("Ledger API");
}

// Tier limit (with metadata)
if (userLedgers.length >= tierLimits.maxLedgers) {
  throw new ResourceLimitReachedError(
    "Ledger",
    tierLimits.maxLedgers,
    userLedgers.length,
  );
}
```

### When to Use try...catch in Resolvers

**❌ DON'T use try...catch for logging only:**

```typescript
// BAD - Apollo Server already catches errors, centralized plugin logs them
async getUser(@Arg("id") id: string): Promise<User> {
  try {
    const user = await this.userService.findById(id);
    if (!user) throw new NotFoundError("User", id);
    return user;
  } catch (error) {
    logger.error("Failed to get user", { id, error });
    throw error; // Just re-throwing after logging
  }
}
```

**✅ DO use try...catch for actual recovery logic:**

```typescript
// GOOD - Returns fallback value on error
async isPaid(@Ctx() ctx: IContext): Promise<boolean> {
  try {
    const subscription = await this.stripeService.getSubscription(ctx.userId);
    return subscription.status === "active";
  } catch (error) {
    logger.error("Failed to check subscription", { error });
    return false; // Fallback value - user can still access basic features
  }
}

// GOOD - Returns structured error response
async createCheckout(): Promise<CheckoutResult> {
  try {
    const session = await this.stripe.checkout.sessions.create(...);
    return { success: true, sessionUrl: session.url };
  } catch (error) {
    return { success: false, message: "Checkout failed" };
  }
}
```

**Error logging is automatic:** The `error-logging-plugin` (GraphQL) and
`restErrorMiddleware` (REST) log all errors with proper classification and context.
Just throw errors directly from resolvers and REST handlers.

### Test Code: Asserting Errors

**✅ Recommended**: Assert error type, not message

```typescript
// Type-based assertion (robust, survives message changes)
await expect(fn()).rejects.toThrow(NotFoundError);

// Advanced: Check category + metadata (DomainErrors have no `.extensions`)
try {
  await fn();
  fail("Expected error");
} catch (error) {
  expect(error).toBeInstanceOf(ResourceLimitReachedError);
  expect(error.metadata).toEqual({ resource: "Ledger", limit: 1, current: 1 });
  expect(error.category).toBe("RESOURCE_LIMIT_REACHED");
}
```

**❌ Avoid**: Message-based assertions (fragile)

```typescript
// Don't do this
await expect(fn()).rejects.toThrow("User with ID 'user-123' not found");

// Do this instead
await expect(fn()).rejects.toThrow(NotFoundError);
```

### Best Practices

- **Business Logic**: Use specific `DomainError` classes from `@/shared/errors`, include resource IDs for debugging
- **Test Code**: Assert error type with `toThrow(ErrorClass)`, check `category`/`metadata` for structured data, avoid exact message matching

See `src/shared/errors/domain-errors.ts` for all available error classes.

## Environment Variables Best Practices

**CRITICAL: Avoid Adding Environment Variables Unless Absolutely Necessary**

When working on Backend-v2, **strongly prefer** using configuration files in `src/config/` over environment variables. Environment variables should be the last resort, not the first choice.

### When to Avoid Environment Variables

**DO NOT add environment variables for:**

- Feature flags (use config files instead)
- API endpoints with sensible defaults
- Settings that rarely change
- Developer convenience features

### When Environment Variables Are Acceptable

**ONLY add environment variables when:**

- Storing sensitive credentials (JWT secrets, API keys, passwords)
- Configuration that must differ between production/staging/development
- External service URLs that vary by environment (e.g. Fava API)
- Settings managed by deployment infrastructure

### Required Steps When Adding Environment Variables

If you determine an environment variable is truly necessary:

1. Document it in `backend-cluster/backend-v2/README.md`
2. Add it to `backend-cluster/backend-v2/.env.example` (if file exists, create if needed)
3. Add it to `backend-cluster/_infra/.env.example`
4. Update `backend-cluster/_infra/docker-compose.yml` to pass the variable
5. Update this CLAUDE.md file
6. Provide a sensible default value in `src/config/`
7. Justify why it cannot be handled through config files

## Recent Changes

- Git over SSH proxy (2026-08, ADR 0004): backend-v2 can terminate git over SSH
  itself (`src/features/gitea/ssh/`), so the main-only ref rule and every
  application-layer check apply to SSH as well as HTTP — previously SSH bypassed
  all of them by connecting to Gitea directly. The client authenticates with its
  own key — resolved by asking Gitea, which is the only place SSH keys live — and
  then speaks git-over-HTTP to Gitea with that user's own credentials, so a key
  deleted in Gitea stops working on the next connection.
  `advanceCommandListScan` from the HTTP proxy so the two transports cannot
  drift apart. **Off unless both `SSH_PROXY_ENABLED` and `SSH_PROXY_HOST_KEY`
  are set** — see README; `SSH_PROXY_HOST_KEY` must be Gitea's *existing* host
  key or every prior client sees a host-key-changed warning.

- Free-tier directive limit in the git proxy (2026-08, ADR 0005):
  `src/features/gitea/policy/directive-limit-gate.ts` is the one place either
  transport decides, so SSH and HTTPS cannot drift on the verdict, the fail-open
  rule, or the wording. It asks ledger-v2 for the ledger's current count and gets
  the allowance from `lookupDirectiveLimit` — the same function `AdminService`
  delegates to, so the mobile bypass ticket is seen identically. The question is
  "is this ledger currently over", not "will this push take it over": the latter
  needs the pushed objects, which a thin pack does not carry. **Fails open on
  every error**, deliberately — once the pre-receive hook is gone, deleting
  entries through the app is an over-limit user's only way back under, so failing
  closed would lock both doors at once. Deliberately **not** behind a config
  switch: a boolean that turns a paywall off is the failure shape this whole
  migration exists to fix.

- Transport-agnostic error consolidation (2026-06): Replaced the parallel
  `GraphQL*Error` / `REST*Error` hierarchies with a single `DomainError` hierarchy
  in `src/shared/errors/` keyed by a semantic `ErrorCategory`. Per-transport
  adapters translate it: a new Apollo `formatError` (`server/graphql/format-error.ts`)
  for GraphQL, and `restErrorMiddleware` (`server/rest/error-middleware.ts`, applied
  outermost in `rest-routes.ts`) for REST. Services/shared infra no longer throw
  transport errors. **Breaking change (REST only):** REST error bodies now emit the
  canonical category (e.g. `NOT_FOUND`) instead of path-style codes
  (`resource/not-found`); GraphQL `extensions.code` values are unchanged. Admin
  handlers and rate limiters now throw/emit the canonical scheme; the old
  `error-wrapper` and `ai-agent/utils/errors.ts` were removed.
- Centralized GraphQL error logging (2026-02): Removed verbose try...catch blocks from resolvers that just logged and re-threw errors. Apollo Server automatically catches errors, and centralized `error-logging-plugin` now logs all errors with proper classification (debug for auth, info for client errors, error for server errors). **Keep try...catch ONLY for actual recovery logic** (returning fallback values, structured error responses). Cleaned: Plaid resolvers (9 blocks removed), ledger-public-key-resolver. Kept: account-resolver, subscription-resolver, pull-request-resolver, is-paid-resolver (all have recovery logic).
- Logger improvements (2026-02): Refactored to use child loggers instead of manual tags (`logger.child({ module: "name" })`), added "test" environment support, automatic log silencing in tests
- Centralized Zod OpenAPI setup (2026-01): Refactored to call `extendZodWithOpenApi()` once in `src/shared/zod-openapi-setup.ts` following library best practices, eliminating duplicate extensions across 9 schema files
- Job scheduler with node-cron (2026-01): JWT cleanup (midnight daily), dev test jobs (every 5 min in dev)
- Custom error handling system (2026-01): 11 GraphQL + 12 REST error classes, removed `apollo-server-errors` and legacy `AppError`
- Moved Gitea to `src/features/gitea/` (2026-01)
- Consolidated server code under `src/server/` with REST/GraphQL separation (2026-01)
- Feature-based architecture: moved 10 features to `src/features/` (2026-01)
- OpenAPI/Swagger docs with Zod validation (2025-11)
- Stripe payment integration (2025-08)
