# beancount-ledger-v2

Standalone TypeScript service that parses, validates, and queries Beancount
ledgers, built on the [`@rustledger/wasm`](https://www.npmjs.com/package/@rustledger/wasm)
engine (a Rust reimplementation of Beancount, 10-30x faster than the Python
parser).

## Why a separate service

`@rustledger/wasm` is GPL-3.0-only. Running it in-process inside another
service would make that service's Docker image a conveyance of GPL-licensed
code. Instead, the engine is contained in this standalone sidecar, which
other services talk to over plain HTTP/JSON. See `NOTICE` and
`src/foundation/rustledger/README.md` for the containment rationale and
`AGENTS.md` for the hard rules.

## Architecture

- `src/foundation/rustledger/` - the Beancount engine (WASM loader, parsers,
  report builders, plugins)
- `src/foundation/clients/` - Gitea file-map loading + caching
- `src/features/gitea/` - generated Gitea API client + auth
- `src/features/ledger/` - request-to-engine orchestration (reports, journal,
  entries, shell/BQL queries)
- `src/api/` - Koa route handlers, one file per endpoint family
- `src/server/` - auth, error handling, server bootstrap
- `src/shared/` - errors, logging, caching, locking, path-safety helpers

There is no database and no user table: auth is Basic/token credentials
forwarded verbatim to Gitea, which is the sole source of truth for identity
and repository access.

Internal JSON requests have a bounded body allowance of about **7.4 MiB**
(`JSON_BODY_LIMIT_BYTES` in `src/server/start-server.ts`). It covers the
largest body backend-v2 sends: a projected check of at most 5,000,000 decoded
bytes (`MAX_PROJECTED_BYTES`), as base64 inside JSON, with 1 MiB for the
envelope. The old 2 MiB allowance refused batches the gateway's own 2 MiB
request cap admits once their files were re-encoded (w23/074). It is a
transport limit, separate from the gateway's decoded-file policy. It does not
impose a decoded upload cap on generated or merged ledger contents. A body past
it, JSON or form, is refused with **413**, which backend-v2 reports as
`BAD_USER_INPUT` "split it into smaller batches", not as an outage.
URL-encoded forms retain the parser's default **56 KiB** limit, and multipart
routes keep their existing route-specific handling.

## Report coverage

Income-statement and overview flow series, account-report interval totals,
and `/interval-totals` cover the full selected period. They no longer keep only
the latest 100 intervals: a full non-leap year with `interval=daily` returns
365 rows. Consumers should aggregate or window charts explicitly if needed;
the report service does not apply a chart display limit to financial data.

## BQL column types

BQL query tables include column names and `dtype` labels. The pinned
`@rustledger/wasm` 0.24.0 result does not expose an expression schema, so the
ledger service infers these labels from non-null returned cells and canonical
column names. Numeric-looking or date-looking string literals can be labelled
`Decimal` or `date`, and a projection alias can change a label. Empty or
entirely null columns fall back to their output names.

For example, `'00123' AS reference` can be labelled `Decimal` while
`'00123' AS account` is labelled `str`; both preserve the string `"00123"`.
Numeric `1.25 AS account` can conversely be labelled `str`. Consumers should
not coerce an identifier to a number solely from this inferred label. Scalar
text and decimal strings retain their values and precision.

NULL cells are returned as an empty string, as the backend-v2 adapter returned
Fava's before the migration (`toShellCell` in
`src/features/ledger/service/ledger-shell-mappers.ts`). So a missing payee or
price, `SELECT NULL` or `1/0` reads `""`, the same as an empty value. Use
`IS NULL` in the query to tell them apart (`WHERE payee IS NULL`). Emitting
`null` instead is a contract change on all three surfaces, still undecided
(w23/075).

REST, GraphQL and MCP share this query producer and its limitations. Reliable
expression types independent of aliases, including empty or entirely null
columns, require a supported engine schema. The service does not reconstruct
that schema by parsing user queries or coercing values.

## Getting started

Requires Node.js 20.19+, 22.13+, or 24+ and a running Gitea instance. See
`.env.example` for the expected environment variables.

TypeScript stays on 6.0.x: TypeScript 7 is outside the current ts-jest and
typescript-eslint supported ranges and fails Yarn 4.17's TypeScript patch.
The `ignoreDeprecations: "6.0"` setting preserves the CommonJS loader and
`baseUrl` aliases used by ts-node until that toolchain can migrate together.

```bash
yarn install
cp .env.example .env   # fill in GITEA_* / BACKEND_V2_* as needed
yarn dev                # runs on :8000
```

### Scripts

- `yarn dev` / `yarn start` - run with ts-node
- `yarn build` / `yarn dist:start` - compile then run the compiled output
- `yarn test` - unit tests (WASM-free)
- `yarn verify:rustledger` - live engine checks against the real WASM module
- `yarn lint` / `yarn typecheck`
- `yarn generate-gitea-client` - regenerate the client from
  `../idl/gitea.swagger.v1.json` using pinned generator tooling. The local config
  encodes owner/repository path segments; the thin HTTP template preserves
  `format: "raw"` streaming and rejects unexpected upstream template changes.

### Environment variables

See `.env.example`. All are optional with sensible defaults for the Docker
Compose network; the only ones typically set explicitly are `WEBHOOK_TOKEN`
and `BACKEND_V2_ADMIN_TOKEN`.

### Managed price includes

A ledger file may include a managed price feed:

```beancount
include "https://beancount.io/prices/BTC-USD"
```

The service fetches the feed, accepts only `price` directives with the
allowlisted metadata, overlays them as a read-only virtual file after the
committed files are loaded, and refreshes them on a five-minute schedule
without creating a Git commit. A failed refresh keeps the last validated
revision serving. Ledger-authored prices for the same date and pair win.
`MANAGED_PRICE_ORIGINS` lists the origins the service may fetch from and
allows only `https://beancount.io` unless set; set it to an empty string to
disable the feature. The design is recorded in
[ADR 015](../../docs/adrs/ADR015-ledger-managed-price-includes.md).

## Testing

`yarn test` runs the unit suite. A separate parity harness under `parity/`
proved endpoint-by-endpoint equivalence with the Python service during
migration; it's retired now that the Python service is gone, but
`parity/COVERAGE.md` is kept as the historical record.
