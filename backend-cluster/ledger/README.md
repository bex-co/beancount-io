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

Set-typed cells (tags, links, `other_accounts`, …) render identically in text
and structured results: members sorted and double-space-joined, the way stock
beanquery prints a set. An empty set reads `""`. The dtype still says `set`
while the value is a string; returning real JSON arrays is a three-surface
contract change, still undecided (w23/119).

REST, GraphQL and MCP share this query producer and its limitations. Reliable
expression types independent of aliases, including empty or entirely null
columns, require a supported engine schema. The service does not reconstruct
that schema by parsing user queries or coercing values.

## BQL string concatenation

Stock beanquery concatenates strings with `+` (`'a' + 'b'` → `ab`), but the
pinned engine only adds numbers and refuses str `+` str. There is no
`concat()` spelling on either side and no engine spelling to rewrite to
(`||` is a syntax error, `concat()` is unknown, `joinstr` joins with a
`", "` separator), so BQL here has no string-concat spelling at all:
concatenate outside the query. The refusal names the limitation
(`String concatenation with + is not supported …`, w23/154) instead of the
engine's generic numeric hint. Engine support is tracked upstream
(w23/blocked/022).

## BQL `str()` input domain

Stock beanquery stringifies every value, but the pinned engine's `str()`
accepts only strings, integers, numbers, booleans, dates, and amounts —
positions, inventories, and sets refuse with
`type error: STR expects a string, integer, number, boolean, date, or amount`.
Stock would render those as `3000.00 USD`, `(3000.00 USD)`, and set text;
here there is no spelling for those renderings (w23/155). The refusal
already names the whitelist, so no service rewrite applies. Engine
overloads are tracked upstream (w23/blocked/022).

## BQL date arithmetic

Stock beanquery shifts dates by day counts (`date + 7`, `7 + date`,
`date - 7`) and counts days (`date - date`), but the pinned engine adds
numbers only and refuses every date pair. There is no operator spelling
to rewrite to, so spell the shift with `date_add(date, days)` and the day
count with `date_diff(first, second)` — both answer on this engine. The
refusal names the limitation and the workaround
(`Date arithmetic with + and - is not supported …`, w23/165) instead of
the engine's generic numeric hint. Date comparisons are unaffected
(`WHERE date > 2026-06-01` works), and so are the pairs stock refuses
too (`7 - date`, `date + date`, `-date`). Engine overloads are tracked
upstream (w23/blocked/022).

## BQL `FROM OPEN ON` is suffix-only

Stock's `FROM OPEN ON <date>` returns the postings from `<date>` onward
plus a synthetic opening-balances entry dated `<date>−1` (opening legs
per balance account offset to `Equity:Opening-Balances`, plus an
`Equity:Earnings:Previous` leg), but the pinned engine evaluates the
scope as a plain date-suffix filter with no summary synthesis. Counts
over mid-period OPEN scopes miss the summary block, and per-account
`GROUP BY` sums miss its legs (summary-only groups are absent entirely);
the ungrouped `sum(position)` still nets to zero on both, since the
missing block balances. Combined `OPEN ON … CLOSE ON` ranges share the
gap; the `CLOSE ON` mirror agrees row-for-row (w23/166). There is no
query-side spelling for the summary entry — refusing the scope would
steal its correct suffix rows — so the scope stays suffix-only until the
engine synthesizes the entry (w23/blocked/022).

## BQL `meta` dialects

The `meta` column reports dtype `object` on both tables at every
endpoint — valued, blank, and empty — matching stock's dict (w23/170).
But the two tables serialize the same content differently: postings
serves pre-stringified `k: "v"` cells (comma-joined, engine-rendered)
while entries serves the dict, which the shell renders as `k=v`. The
split lives in the engine's cell shapes, so only the engine can unify
the serialization; parsing its undocumented string form back into
dicts would be guessing. Neither table carries filename/lineno (the
w23/016 upstream gap: no source-location surface is populated) — custom
keys flow on both. Engine unification is tracked upstream
(w23/blocked/022).

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
