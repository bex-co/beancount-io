# Dual-target parity harness (retired)

**The Python oracle is gone.** `backend-cluster/beancount-ledger` was deleted
as part of the ledger-v2 production cutover + bake-in
(`docs/ledger-v2-cutover-runbook.md`); `docker-compose.parity.yml` no longer
builds a `ledger-py` target, and `yarn test:parity` / `expect-parity.ts` (which
requires `PARITY_PYTHON_URL`) can no longer run. `COVERAGE.md` is kept as the
historical parity record. What follows describes the harness as it operated
before the oracle was retired.

Proved, endpoint by endpoint, that `beancount-ledger-v2` (this service) and the
Python `backend-cluster/beancount-ledger` service returned the same responses
to the same requests. The Python service was the oracle; an endpoint counted
as ported only when its parity suite was green against **both** live services.

## How comparison works

For each corpus request the runner (`expect-parity.ts`) issues the identical
HTTP request — same method, path, query params, and `Authorization` header —
to both base URLs, then asserts:

1. **Status parity** — identical HTTP status codes, success or error.
2. **Envelope parity** — the full JSON body (`{"success": ..., ...}`) is
   deep-equal **after normalization** (below). Error responses are compared the
   same way (`error`/`code`/`details` fields included) — a 404 with a different
   message is a parity failure, not a skip.
3. **Write parity (stronger rule)** — write endpoints run against per-target
   copies of the fixture repo (`<fixture>-py` / `<fixture>-v2`). After the
   response comparison, the resulting repo **file contents are byte-compared**
   via the Gitea API (never commit SHAs — committer/timestamps differ). The
   donor branch's parity checklist never signed off the write path; this rule
   exists to close exactly that gap.

Environment: `PARITY_PYTHON_URL` (default `http://localhost:18001`) and
`PARITY_V2_URL` (default `http://localhost:18002`), per the compose file here.

## Normalization allowlist

One source of truth: `normalize.ts`, which wraps the engine's
`shadow-normalization.ts` (golden-validated against the Python oracle on the
donor branch) and adds live-vs-live volatile-field masking. Every rule is a
difference parity deliberately does not compare:

| Rule                                                    | Applies to                                      | Rationale (source)                                                                                           |
| ------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Trailing decimal zeros trimmed (`"2950.00"` → `"2950"`) | numeric strings anywhere                        | BigNumber drops trailing zeros; documented cosmetic divergence (donor `docs/rustledger-parity-checklist.md`) |
| `cost` / `cost_children` dropped when `null`            | any object                                      | Python omits, wire type emits null (omitted-optional-null parity)                                            |
| `meta` dropped when `null`/`{}`                         | any object                                      | same omitted-null parity                                                                                     |
| `meta.filename` / `meta.lineno` dropped                 | journal ops (`getJournal`, `getAccountJournal`) | source coordinates unavailable on the Rustledger wire                                                        |
| `meta` dropped entirely                                 | `getLedgerAccounts`                             | donor shadow-corpus rule                                                                                     |
| `entry_hash` masked to a placeholder                    | journal ops + `getLedgerAccounts`               | location-dependent hashes the engine mints differently (one hashing regime chosen at cutover)                |
| `timestamp` masked                                      | `healthCheck`                                   | two live clocks; volatile per request                                                                        |

Documented **behavioral** divergences (donor checklist) are _not_ silently
normalized — where a fixture would hit one (document auto-discovery no-ops,
forecast month-end/REPEAT/UNTIL semantics, repo-root-relative document paths),
the suite must assert the v2 behavior explicitly and link the checklist entry,
so every accepted divergence stays visible in a test.

## Suite conventions

- One file per endpoint family: `parity/suites/<family>.integration.test.ts`
  (`healthz`, `ledgers`, `reports`, `journal`, `shell`, `entries`, `admin`,
  `tokens`, `keys`, `collaborators`, `repo`, `legacy`).
- Table-driven per endpoint: a corpus of `{name, request}` cases covering
  success, auth-failure (401), and not-found/error paths.
- Suites are `*.integration.test.ts` — excluded from unit `yarn test`, run by
  `yarn test:parity` against the live dual-target stack.
- `parity/__tests__/` holds the harness's own unit tests (normalizer rules,
  runner failure modes) — these DO run in unit CI.
- Coverage is tracked operation-by-operation in `COVERAGE.md`.

## Environment

`docker-compose.parity.yml` + `seed.ts` + `up.sh` bring up Gitea + the Python
ledger (`:8001`) + ledger-v2 (`:8002`) against one seeded Gitea, with the
shadow-fixture repo (`scripts/rustledger-shadow/fixtures`) and a `bean-example`
book, duplicated per target for write suites.
