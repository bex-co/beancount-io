# foundation/rustledger

A WASM-backed beancount engine for this service, built on
[`@rustledger/wasm`](https://www.npmjs.com/package/@rustledger/wasm) (a Rust
reimplementation of beancount, 10–30× faster than the Python parser). This is
the foundation for **porting the Python `beancount-ledger` service's
`beancount`/`beanquery` dependency off Python** — parsing, validation, and BQL
now run in-process in Node instead of over HTTP to the FastAPI "fava_api".
The engine is hosted here, in a standalone sidecar service, rather than inside
the main backend service — see `NOTICE` for the licensing rationale.

## Why WASM (and not a Python binding or the CLI)

rustledger ships **no Python bindings / pip package** — only a Rust binary
(`rledger`), Rust crates, and this WASM/npm package. The `rledger` CLI can emit
JSON only for `query` and `check`; it cannot dump the full directive AST. The
**WASM package can** (`Ledger.getDirectives()` returns every directive type with
metadata), and it runs in-process — a first-class fit for backend-v2's
TypeScript/Node runtime. So the port hosts the engine here rather than swapping a
dependency inside the Python service.

## Loading model

`@rustledger/wasm` is an ESM (`"type": "module"`), `wasm-pack --target web`
build; this service is `module: "commonjs"` + ts-jest. `loader.ts` bridges that:

- a `new Function("s","return import(s)")` dynamic import (so TS doesn't
  down-compile the `import()` to `require()`, which can't load an ESM package);
- `initSync({ module: bytes })` with the `.wasm` read off disk via
  `dirname(require.resolve("@rustledger/wasm"))` — avoids the browser
  `import.meta.url` + `fetch` init path.

**Production (`yarn start` / compiled `node`) needs no flags.** Under **jest**,
the dynamic import requires `NODE_OPTIONS=--experimental-vm-modules`, so unit
tests here stay on the **pure mappers** (`mappers.test.ts`, no WASM) and the
live engine is verified by `scripts/verify-rustledger.ts` (run via ts-node).

```bash
# live end-to-end check (real runtime loader):
yarn ts-node -r tsconfig-paths/register --transpile-only scripts/verify-rustledger.ts
```

## ⚠️ License

`@rustledger/wasm` is **GPL-3.0-only**. Bundling it into the Node app is
_linking_ (unlike shelling out to the `rledger` binary, which would be mere
aggregation) — see `NOTICE` in the service root for the containment strategy.

## Public API

| Export                                     | Purpose                                                                                                                                                         |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loadRustledger()`                         | Memoized module load + `initSync` (rarely called directly)                                                                                                      |
| `withLedger(files, entryPoint, fn)`        | Scoped access to a live `Ledger`; frees native memory in `finally`                                                                                              |
| `parseLedgerFiles(files, entryPoint)`      | → `LedgerSnapshot` (valid, errors, options, directives, count) — the ONE validity source (sanitized: included option/plugin neutralization + fava-plugin strip) |
| `queryLedgerFiles(files, entryPoint, bql)` | → BQL result reshaped into column-keyed row records                                                                                                             |
| `countDirectives(content)`                 | Directive count for a single source (reporting/compatibility)                                                                                                   |
| `formatSource(source)`                     | Canonical alignment via rustledger's formatter                                                                                                                  |
| `queryResultToRecords` / `formatCellValue` | Pure mappers (unit-tested)                                                                                                                                      |

`files` is a `path -> contents` map; the caller fetches it from Gitea (the same
files the Python service loaded). `include` is resolved from `entryPoint`.

## Staged endpoint migration (Python fava_api → this engine)

The Python service's callers hit ~58 fava_api endpoints: ~22 are pure Gitea
passthrough (no beancount — unaffected), ~36 are accounting-compute. The compute
endpoints map to this engine in three tiers:

**Tier 1 — direct WASM calls (this module already covers the primitives):**
`getLedgerErrors` → `parseLedgerFiles` (`snapshot.errors`); `queryShell`/
`queryShellText` → `queryLedgerFiles`; `getLedgerEntriesCountPerType` →
`parseLedgerFiles`/`countDirectives`;
`getLedgerOptions` → `getOptions()`.

**Tier 2 — walk `getDirectives()` in TS (mechanical):** attributes
(`getLedgerPayees|Accounts|Tags|Links|Years|Currencies|Narrations`),
`getLedgerEvents`/`getLedgerDocuments`, `getLedgerCommodities`,
`getJournal`/`plaintextJournal`/`getAccountJournal` (running balances via BQL or
a directive walk), `addBulkEntries` (build + `format`).

**Tier 3 — reimplement Fava report algorithms in TS:** `getLedgerIncomeStatement`
/ `getLedgerBalanceSheet` / `getLedgerTrialBalance` / `getLedgerOverview`,
`getLedgerHierarchy` / `getLedgerIntervalTotals` / `getLedgerAccountReport` (the
account `Tree` + interval bucketing + currency conversion), and the
`source_slice` family (needs file+line spans and sha256 — verify these are in
directive `meta` before relying on them). These are the real reimplementation
cost; several can be expressed as BQL (`BALANCES … GROUP BY`, date-bucketed
sums) instead of hand-rolled tree walks.

The Gitea-passthrough endpoints (files, collaborators, keys, tokens, repo
history, users, webhooks) do not touch beancount and can stay as-is or move to a
Gitea client independently of this port.
