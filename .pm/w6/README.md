# w6 — Worker queue (worker1)

**Worker:** worker1 — general-purpose adoption worker; accepts the next highest-impact milestone across packages, topics, and A1/A2/A3 rather than owning a permanent specialty.

## Blocker triage — 2026-10-18

Reviewed all 21 items originally under `blocked/`: 19 engine-adoption inbox notes, m2, and m6. m6 preparation is complete in PR #181 and its remaining publication work is parked again; the other 20 items need upstream engine work or publication. No engine dependency, deployed service, or external issue was changed.

| Items | Verified state | Action that clears the blocker |
| --- | --- | --- |
| [m6](blocked/m6/README.md) | t005/t006 done in PR #181: hosted validation passes for all ten current bundles; publication remains blocked. | Publication needs the owner's license/handle and naming decisions, then operator environment setup. |
| [016](./blocked/016.md), [017](./blocked/017.md), [018](./blocked/018.md), [022](./blocked/022.md), [023](./blocked/023.md), [024](./blocked/024.md), [025](./blocked/025.md) | All seven recorded fix commits are ancestors of upstream main `13ddd438`. No newer supported npm artifact is published. | Rustledger maintainer publishes WASM containing the seven fixes; repository worker adopts one release and runs each note's native and REST/GraphQL/MCP acceptance cases. |
| [029](./blocked/029.md), [034](./blocked/034.md), [037](./blocked/037.md) | [Rustledger PR #2682](https://github.com/rustledger/rustledger/pull/2682) merged 2026-10-19 at 11:03 UTC, covering SUBST, FINDFIRST, and short-circuit guards. | Maintainer publishes a compatible WASM artifact; repository worker adopts it and verifies the exact native/API controls. Merge alone does not clear the release condition. |
| [m2](./blocked/m2/README.md), [026](./blocked/026.md), [027](./blocked/027.md), [028](./blocked/028.md), [031](./blocked/031.md), [032](./blocked/032.md), [033](./blocked/033.md), [035](./blocked/035.md), [036](./blocked/036.md), [038](./blocked/038.md) | Upstream main retains the missing contracts or affected implementations; no matching correction was identified. Waiting for a release alone is insufficient. | User files or explicitly authorizes the upstream requests below; maintainer implements and publishes; repository worker adopts and verifies. |

Release evidence: [npm registry metadata](https://registry.npmjs.org/@rustledger%2fwasm) still has only `latest: 0.24.0` (published 2026-09-06), matching [GitHub latest release v0.24.0](https://github.com/rustledger/rustledger/releases/tag/v0.24.0) and `backend-cluster/ledger/package.json`. Inspected upstream main is [`13ddd438fcc4d185aef72951fa3a97b5e4ccf28a`](https://github.com/rustledger/rustledger/commit/13ddd438fcc4d185aef72951fa3a97b5e4ccf28a). This is source/release triage, not a fresh production retest. Original notes retain their synthetic reproductions and acceptance criteria.

**Rechecked 2026-10-19:** npm WASM latest remains 0.24.0. Rustledger PR #2682 has now merged; the publication prerequisite remains unmet for all twenty engine items. The workflow branch is refreshed on current main and its ten-skill layout; no hosted engine retest or dependency upgrade was performed.

### Upstream requests to get work moving

These are existing blocked findings prepared for an upstream hand-off; no issue, PR, or message was sent. The linked notes contain public synthetic fixtures and contrasting expected/actual results. Deduplicate again before filing.

| Item | Concrete upstream request |
| --- | --- |
| m2 | Expose per-column expression types through WASM `QueryResult`, independent of aliases and available for zero-row/null-first results; preserve String/Decimal/Date distinctions and precision. |
| 026 | Retain authored source maps through WASM `Ledger.fromFiles(...).query(...)` and use the source-aware executor, including included-file posting lines. |
| 027 | Normalize GETPRICE's base/quote arguments as Beanquery does, preserving source commodity data and historical lookup semantics. |
| 028 | Preserve signed SPLITCOMP indices instead of clamping negatives to zero; specify invalid-index behavior explicitly. |
| 031 | Use floor-based fixed-stride DATE_BIN arithmetic before the origin. |
| 032 | Preserve calendar DATE_BIN origin days and month/year boundaries, including short months and leap years; the fixed-day correction alone is insufficient. |
| 033 | Return an Amount in the requested currency for ONLY's zero inventory total; preserve true-null propagation. |
| 035 | Add FILTER_CURRENCY's Position overload and preserve the position's complete cost data. |
| 036 | Match Beanquery BOOL truthiness for strings and tag sets while retaining null propagation. |
| 038 | Preserve integer-only add/subtract/multiply types before type-sensitive operations, with explicit overflow behavior. |

Prioritize the major correctness findings (PRINT/FROM/JOURNAL, authored locations, and quoted-column values), then type provenance and guard/regex compatibility. Coordinate one dependency upgrade for whichever fixes the published artifact actually contains, regenerate the ledger lockfile with Yarn, and verify each finding separately. Source-only fixes, unrelated releases, and adapter query rewrites do not meet the written unblock conditions. Hosted verification follows the normal deployment separately.

## Milestones

- [x] **m7** — [Connect OpenClaw and Hermes Agent to the hosted MCP endpoint](./done/m7/README.md) (9 tasks; A1; backend-v2 fixtures and docs) ← user request 2026-10-16 to list Beancount.io on OpenClaw and Hermes Agent; ADR 019 D8

- [ ] **m6** — [Publish the ledger skills to ClawHub for OpenClaw and Hermes Agent](blocked/m6/README.md) (13 tasks; A3; skills and CI) ← user request 2026-10-16 to list Beancount.io on OpenClaw and Hermes Agent — **blocked:** t002–t006 complete in PR #181; publication waits on owner decisions, main merge, and operator setup

- [x] **m5** — [Include current earnings in balance-sheet equity](./done/m5/README.md) (6 tasks; major; ledger with backend-v2 validation).

- [x] **m4** — [Complete empty-narration transaction lookups across APIs](./done/m4/README.md) (6 tasks; minor; ledger and backend-v2).

- [x] **m3** — [Expose core ledger options consistently across API surfaces](./done/m3/README.md) (7 tasks; minor; backend-v2).

- [ ] **m2** — [Preserve BQL expression types across projection aliases](./blocked/m2/README.md) (7 tasks; minor; ledger with backend-v2 validation) — **blocked:** the engine query result has no column types; needs a published `@rustledger/wasm` release that exposes them

- [x] **m1** — Count canonical BQL rows in MCP text summaries (7 tasks) ← from [003](./done/003.md).

## Inbox



- [016](./blocked/016.md) — Adopt corrected PRINT filtering and cost-preserving rendering (major; ledger; 45–60m after release) — **blocked:** awaiting a published WASM artifact containing upstream 3ad34e07.

- [017](./blocked/017.md) — Adopt upstream BQL date subtraction support (minor; ledger; 35–50m after release) — **blocked:** awaiting a published WASM artifact containing upstream 6972f5ed.

- [018](./blocked/018.md) — Adopt upstream MIN/MAX support for posting amounts (minor; ledger; 35–50m after release) — **blocked:** awaiting a published WASM artifact containing upstream 25fc6be5.



- [022](./blocked/022.md) — Adopt BQL JOURNAL date windows and opening summaries (major; ledger; 45–60m after release) — **blocked:** awaiting a published WASM artifact containing upstream 1324bc25.

- [023](./blocked/023.md) — Adopt correct FROM predicate evaluation in BQL (major; ledger; 45–60m after release) — **blocked:** awaiting a published WASM artifact containing upstream a2d984d6.

- [024](./blocked/024.md) — Adopt hidden ORDER BY keys in subqueries and table groups (minor; ledger; 45–60m after release) — **blocked:** awaiting a published WASM artifact containing upstream 05b8588b.

- [025](./blocked/025.md) — Adopt quoted BQL column resolution (major; ledger; 45–60m after release) — **blocked:** awaiting a published WASM artifact containing upstream 9d3bde86.

- [026](./blocked/026.md) — Restore authored BQL source locations (minor; ledger; 45–60m after upstream support) — **blocked:** needs a published source-aware WASM query binding, not a known local patch.

- [027](./blocked/027.md) — Preserve GETPRICE currency argument normalization (minor; ledger; 35–50m after upstream support) — **blocked:** needs a published Beanquery-compatible WASM lookup.

- [028](./blocked/028.md) — Preserve negative SPLITCOMP component indices (minor; ledger; 35–50m after upstream support) — **blocked:** needs a published signed-index WASM implementation.

- [029](./blocked/029.md) — Preserve Beanquery SUBST replacement and null semantics (minor; ledger; 35–50m after upstream support) — **blocked:** needs a compatible published WASM replacement/null implementation.


- [031](./blocked/031.md) — Adopt floor-based DATE_BIN arithmetic before the origin (minor; ledger; 35–50m after upstream support) — **blocked:** needs a published native fixed-stride correction.

- [032](./blocked/032.md) — Preserve calendar DATE_BIN origins and boundaries (minor; ledger; 45–60m after upstream support) — **blocked:** needs a published native month/year boundary correction.

- [033](./blocked/033.md) — Preserve typed zero amounts from ONLY inventory extraction (minor; ledger; 35–50m after upstream support) — **blocked:** needs a published native zero-preserving extraction.

- [034](./blocked/034.md) — Preserve FINDFIRST prefix and case matching (minor; ledger; 35–50m after upstream support) — **blocked:** needs a published native regex-policy correction.

- [035](./blocked/035.md) — Adopt FILTER_CURRENCY Position overload (minor; ledger; 35–50m after upstream support) — **blocked:** needs a compatible published native overload.

- [036](./blocked/036.md) — Preserve BOOL string and tag-set truthiness in BQL (minor; ledger; 35–50m after upstream support) — **blocked:** needs a published native string/set truthiness correction.

- [037](./blocked/037.md) — Adopt short-circuit BQL logical guards (minor; ledger; 45–60m after upstream support) — **blocked:** needs a published native lazy logical evaluator.

- [038](./blocked/038.md) — Preserve integer arithmetic before type-sensitive BQL operations (minor; ledger; 45–60m after upstream support) — **blocked:** needs a published native integer-preserving arithmetic path.
