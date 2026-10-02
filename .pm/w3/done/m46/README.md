# w3 · m46 — Harden REST v1 ledger path params (validate + encode + fail-closed)

**Worker:** worker3 **Goal:** REST v1 `{owner}/{name}` path parameters are
slug-validated at the boundary and safely encoded before every upstream call,
so no encoded input can reshape the upstream Gitea/Fava URL or coax an
anonymous-access probe into failing open. **Status:** done

## Tasks (in order)

| id   | title                                                              | est | depends_on |
| ---- | ------------------------------------------------------------------ | --- | ---------- |
| t001 | Slug-validate `{owner}`/`{name}` at the REST v1 boundary — **DONE** | 40m | —          |
| t002 | Encode path params before upstream Fava/Gitea calls — **DONE** | 40m | t001       |
| t003 | Make the anonymous-access privacy probe fail closed — **DONE** | 30m | —          |
| t004 | CLI: turn a malformed 200 into a clear error, not `KeyError: 'id'` — **DONE** | 25m | —          |
| t008 | Encode ledger-service coordinates on the second Gitea hop — **DONE** | 30m | t002       |
| t005 | Simplify — **DONE** | 20m | t002, t003, t004, t008 |
| t006 | Test coverage — **DONE** | 40m | t005       |
| t007 | Closeout — **DONE** | 10m | t006       |

## Definition of done

- A GET/PUT/DELETE against `/api-gateway/v1/ledgers/{owner}/{name}` with a name
  containing `/` (`%2f`, `%252f`), `?`, `#`, `..`, uppercase, or spaces is
  rejected at the boundary with a 4xx that names the slug rule — it never
  reaches an upstream client and never resolves to a *different* repository.
- Upstream Fava/Gitea request paths are built with `encodeURIComponent` per
  segment, verified by a test that a param containing `/` or `?` cannot alter
  the request path.
- The anonymous-access probe treats a missing/unexpected `private` field as
  private (fail closed), verified by a test feeding a body without `private`.
- `bea cloud ledger show <malformed>` surfaces a clear "unexpected server
  response" error instead of the raw `KeyError: 'id'` (category `validation`,
  message `'id'`).
- GraphQL and MCP ledger lookups share the same slug rule (parity), verified.

## Evidence (reproduced 2026-09-26, `bea` 0.3.0, prod REST, authorized owner)

```sh
# CLI double-encodes once (quote(safe="")), so these hit the server double-decoded:
bea --json cloud ledger show 'puncsky/nonexist%2f..%2fMYLEDGER'   # -> 200, returns MYLEDGER
bea --json cloud ledger show 'puncsky/MYLEDGER%2fbranches'        # -> exit 1, "validation: 'id'"

# Raw REST (authorized bearer), owner-owned ledger `example`:
GET /api-gateway/v1/ledgers/OWNER/example%3Fx%3D1  -> 200 returns .../example  (encoded ? truncates)
GET /api-gateway/v1/ledgers/OWNER/example%23x       -> 200 returns .../example  (encoded # truncates)
GET /api-gateway/v1/ledgers/OWNER/example%252fbranches -> 200 {"sshUrl":".../undefined.git", ...}
GET /api-gateway/v1/ledgers/OWNER/%252e%252e        -> 200 {"sshUrl":".../undefined.git", ...}
```

The reproduced fact is: unvalidated, un-re-encoded path params let encoded
characters reshape the upstream URL, yielding wrong-repo or malformed 200
bodies. The privacy fail-open and DELETE-misrouting below are source-traced
(file:line) and were **not** demonstrated destructively against live data —
mark them cause-verified-by-source, live-unverified.

## Root cause (source-traced by QA, backend-cluster/backend-v2)

- `@koa/router` decodes each param once (`node_modules/@koa/router/lib/layer.js`,
  `safeDecodeURIComponent`). `src/server/rest/validation-middleware.ts:74`
  validates `ctx.params` with `ledgerPathSchema` = `z.string().min(1)` only —
  no slug rule (`src/features/ledger/api/rest/v1/schemas.ts:14-27`). So `%252f`
  → `%2f` survives, and a second decode happens on the upstream HTTP hop.
- Upstream paths are built by raw interpolation with no `encodeURIComponent`:
  `src/foundation/fava/Api.ts:4170,4193,4211`; Gitea client
  `src/features/gitea/client/gitea-api.ts:5668-5690`; passthrough
  `src/foundation/fava/api-client.ts`.
- Anonymous-access probe fails **open**: `src/foundation/clients/fava-client-factory.ts:81-96`
  and `src/foundation/clients/gitea-client-factory.ts:49-64` read
  `response.data.data.private`, and `undefined` on an odd 200 body is treated as
  "not private" (`ledger-access-check.ts:91-127`). `assertLedgerAccess` also
  resolves the same unencoded `owner/name` as the action, so authz and action
  traverse identically.
- DELETE authorizes `ledger:owner/name` then calls
  `favaApiClient.ledgers.deleteLedger(owner, name)`
  (`src/features/ledger/workflow/ledger-workflow.ts:467-509`); a `name` with `?`
  or `%2f` can route the upstream DELETE to a different repo/endpoint than the
  authorized string, and audit (`src/server/api/audit.ts`) logs the
  pre-truncation string.
- Parity: every v1 ledger route shares `ledgerPathSchema`/`ledgerIdOf`; MCP
  shares the shape (`src/features/ai-agent/api/mcp-resources.ts:133-141`,
  `mcp-resource-template.ts:41-48`); GraphQL applies `/^[a-z0-9_-]+$/` only on
  create/update **body** inputs (`ledger-resolver.types.ts:103,128`), never on
  path/lookup params.
- CLI side: `cli/src/cli/api/rest_client/api/ledger_v_1/get_ledger.py`
  `GetLedgerResponse200.from_dict` does `d.pop("id")` on any 200 body; a
  malformed 200 raises `KeyError('id')` that `unwrap` does not guard
  (`cli/src/cli/api/client.py:96-116`), surfacing as `validation: 'id'`.

## Source + Goal linkage

- **Source:** continuous CLI QA 2026-09-26 (cloud journeys, run4); backend trace
  by QA sub-investigation.
- **Goal linkage:** A1 — agent-native accounting depends on a hosted API that
  routes a ledger reference to exactly the ledger named and denies malformed or
  cross-resource references, so agents can trust `cloud ledger`/REST/MCP results.
- **Expected outcome:** every hosted ledger surface (REST, MCP, GraphQL)
  rejects malformed `{owner}/{name}` uniformly at the boundary; no encoded input
  can reshape an upstream URL or flip a privacy decision; the CLI reports a
  clear error on an unexpected server body.
- **Why now:** reproduced on production; encoded path params already resolve to
  the wrong repo and produce malformed 200s, and the privacy probe fails open —
  a correctness and security-hardening gap on a core adoption surface.
- **Adoption surface task omitted:** this milestone is backend/CLI hardening
  with no new user- or agent-facing surface or quickstart step; it changes
  rejection behavior for malformed input, not any documented workflow.

## Shipped outcome

Completed 2026-10-02. Ledger references now pass one shared boundary rule on
REST, GraphQL, and MCP; each owning service encodes upstream owner/repository
segments; malformed privacy metadata denies access; and the CLI explains
unexpected successful response bodies with status and request ID.
Implementation commits: `50c759fb`, `42f631c2`, `e8c39ebe`, `aadc7eb9`,
`deb649ff`. See `done/t006.md` for the requirement-by-requirement verification.
