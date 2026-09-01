# CLAUDE.md — beancount-ledger-v2

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

## Dev commands

- `yarn dev` — run on :8000 (ts-node)
- `yarn test` — unit tests (WASM-free; live engine path via `yarn verify:rustledger`)
- `yarn lint && yarn typecheck && yarn build` — ESLint, Knip dead-code detection, types, and compile check
- `yarn lint:deadcode:fix` — remove unused files, exports, and exported types; review the resulting diff
- Parity harness: retired (the Python oracle it compared against is gone —
  see `parity/README.md`); `parity/COVERAGE.md` is kept as the historical
  record that all 75 contract rows were green at cutover.

## Layout

Directory paths deliberately mirror the donor branch's aliases so transplanted
files need no import rewrites (decision: keep `foundation/rustledger`, not
`src/engine/`):

- `src/foundation/rustledger/` — the engine adapter, report builders, and
  `plugins/`
- `src/foundation/ledger-api-types/` — wire DTOs + `ledger-entry-input.ts`
- `src/foundation/clients/` — `load-cached-ledger-file-map.ts` (HEAD-SHA-keyed
  FileMap cache) + client factories
- `src/features/gitea/client/gitea-api.ts` — generated Gitea client (never
  hand-edit; factories must default `format: "json"`)
- `src/features/ledger/service/` — request→engine orchestration (adapted donor
  service classes; `ledger-shell-types.ts` / `ledger-entry-input.ts` hold the
  types the engine layer needs without service deps)
- `src/api/` — route handlers by endpoint family
- `src/shared/` — errors (no postgres-error: this service has no DB), logger,
  cache, lock, safe-repo-path, async-context
- `parity/` — retired dual-target parity harness + `COVERAGE.md` historical record
- `scripts/` — `verify-rustledger.ts` (live WASM checks, `yarn verify:rustledger`),
  `rustledger-shadow/` fixtures + Python oracle
