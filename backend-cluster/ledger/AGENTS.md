# AGENTS.md — beancount-ledger-v2

Standalone TypeScript ledger service on the `@rustledger/wasm` engine, serving the
same HTTP contract as the Python `beancount-ledger` service it replaced and
decommissioned. The OpenAPI contract is `../idl/beancount-ledger.openapi.json`.

## Hard rules

- **GPL containment:** `@rustledger/wasm` is GPL-3.0-only. This service's Docker
  image links GPL code — see `NOTICE` and `src/foundation/rustledger/README.md`.
  Never add the `@rustledger/wasm` dependency to a package whose image is
  published or that ships to the browser, and never vendor rustledger's bytes
  (source, `.wasm`, `node_modules`) into a public repo. Publishing THIS service's
  own source is permitted — it contains none of rustledger's bytes.
- **Contract compatibility:** responses use the Python envelope
  `{"success": true, "data": ...}`; error responses match the Python
  `ErrorResponse` shape and codes (e.g. `directive_limit_exceeded`), NOT
  backend-v2's `{ok:false}` shape. Both path styles are preserved exactly
  (`/income-statement` vs `/account_last_entries`).
- **CommonJS is load-bearing:** the engine's ESM/WASM loader
  (`new Function("s","return import(s)")` + `initSync`) requires
  `module: commonjs` + ts-node. Do not convert to ESM.
- **No database, no Stripe:** tier limits come from an admin service's
  `GET /api/admin/ledger-limits/{ledgerUsername}` (fail-open, see `src/config.ts`
  `BACKEND_V2_*` env vars). Auth is credential-forwarding to Gitea — no sessions,
  no JWT, no user table.
- **The forwarded context is untrusted; authority is not in it.** Exactly two
  request headers carry authority — `Authorization` and
  `x-directive-limit-exempt` (`server/auth.ts`), the second trusted with no
  authentication because this service has no public port. Everything in the
  `x-bcio-context` envelope is caller-influenced (ADR 016): never read it for
  authentication, authorization, or a limit decision, and never move an
  authority header into it. Keeping them apart is what lets this service tell
  what backend-v2 decided from what a caller claimed. Its `session-token` is
  the caller's own credential, relayed unverified to beancount.io's price
  routes and never trusted here (ADR 016 §7) — it must not reach a log line,
  which is why the logger copies an allowlist (`LOGGABLE_CONTEXT_KEYS`) rather
  than spreading the context.

## Dev commands

- `yarn dev` — run on :8000 (ts-node)
- `yarn test` — unit tests (WASM-free; live engine path via `yarn verify:rustledger`)
- `yarn verify:rustledger` — live `@rustledger/wasm` checks through the real
  runtime loader. Includes the poisoned-worker regression: an engine
  instance that traps is retired, not reused for every later request.
- `yarn lint && yarn typecheck && yarn build` — ESLint, Knip dead-code detection, types, and compile check
- `yarn lint:deadcode:fix` — remove unused files, exports, and exported types; review the resulting diff
- Parity harness: retired (the Python oracle it compared against is gone —
  see `parity/README.md`); `parity/COVERAGE.md` is kept as the historical
  record that all 75 contract rows were green at cutover.

`.github/workflows/ci-ledger.yml` (`CI (ledger)`) runs `yarn typecheck`,
`yarn lint:deadcode`, `yarn test` and `yarn verify:rustledger` on every push
and PR touching this package. It does NOT run `yarn lint`, because that script
passes `eslint --fix` and would rewrite files in CI instead of reporting — run
the lint gate locally before handing off.

## Layout

Directory paths deliberately mirror the donor branch's aliases so transplanted
files need no import rewrites (decision: keep `foundation/rustledger`, not
`src/engine/`):

- `src/foundation/rustledger/` — the engine adapter, report builders, and
  `plugins/`
- `src/foundation/ledger-api-types/` — wire DTOs + `ledger-entry-input.ts`
- `src/foundation/clients/` — `load-cached-ledger-file-map.ts` (HEAD-SHA-keyed
  FileMap cache, then the managed price overlay) + client factories
- `src/foundation/managed-prices/` — managed price includes (ADR 015): URL
  policy, bounded fetch + price-only validation, revision/head feed cache,
  and the read-only virtual-file overlay with ledger-price precedence. Never
  bake feed text into the SHA-keyed cache; virtual keys are never written.
- `src/features/gitea/client/gitea-api.ts` — generated Gitea client (never
  hand-edit; factories must default `format: "json"`)
- `src/features/ledger/service/` — request→engine orchestration (adapted donor
  service classes; `ledger-shell-types.ts` / `ledger-entry-input.ts` hold the
  types the engine layer needs without service deps)
- `src/api/` — route handlers by endpoint family
- `src/server/` — Koa app, auth, error middleware, and the forwarded request
  context (ADR 016): `request-context-middleware.ts` populates
  `shared/async-context` so every log line carries backend-v2's `requestId`
- `src/shared/` — errors (no postgres-error: this service has no DB), logger,
  cache, lock, safe-repo-path, async-context
- `parity/` — retired dual-target parity harness + `COVERAGE.md` historical record
- `scripts/` — `verify-rustledger.ts` (live WASM checks, `yarn verify:rustledger`),
  `rustledger-shadow/` fixtures + Python oracle, `bql-oracle/` (stock beanquery
  0.2.0 answers replayed by `verify:rustledger`; a BQL change that the engine now
  refuses or rewords fails it unless `allowlist.json` documents it — see its
  README; the same corpus also checks the trial balance, balance sheet and
  income statement against stock beancount, `report-allowlist.json`), `served-bql/` (the columns, statement forms and expressions the
  hosted MCP surface tells agents to use, replayed by `verify:rustledger`;
  backend-v2's `served-bql-claims.test.ts` keeps `served-bql-claims.json` equal
  to what it serves, so a claim the engine refuses, like the `change` column of
  w1/226, fails here — regenerate it from backend-v2 with
  `UPDATE_SERVED_BQL=1 yarn jest served-bql-claims`)
