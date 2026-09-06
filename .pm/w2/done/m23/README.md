# w2 · m23 — Show primary ledger content before optional panels finish

**Worker:** worker2 **Goal:** Newcomers can use primary ledger content while optional sidebar and overview panels finish loading. **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Trace requests that gate primary content — **DONE** | 45m | w2/m21/t008 |
| t002 | Resolve sidebar counts independently — **DONE** | 45m | w2/m23/t001 |
| t003 | Defer optional overview panels — **DONE** | 60m | w2/m23/t002 |
| t004 | Verify hydration deduplication and freshness — **DONE** | 45m | w2/m23/t003 |
| t005 | Adoption surface — **DONE** | 20m | w2/m23/t004 |
| t006 | Simplify — **DONE** | 20m | w2/m23/t005 |
| t007 | Test coverage — **DONE** | 40m | w2/m23/t005, w2/m23/t006 |
| t008 | Closeout — **DONE** | 15m | w2/m23/t007 |

## Definition of done

- Injecting a two-second delay into optional sidebar-count, README, or account-metadata requests does not add that delay to primary content readiness.
- Ledger authorization and not-found behavior remain correct; sidebar counts never flash a false zero.
- Metadata-dependent charts retain declared cash-flow roles as authoritative and do not present provisional heuristic output as final while metadata is pending.
- SSR hydration introduces no duplicate equivalent requests; navigation and writes retain correct freshness and ledger isolation.
- Publish repeatable before/after navigation traces using public/synthetic data and run the dashboard checks.

## Source + Goal linkage

- **Source:** /pm-brainstorm dashboard performance, 2026-09-05; user requested materialization in w2. The ledger route awaits ledger metadata and sidebar counts together; the overview loader awaits overview data, README, and account metadata together. Requests already run concurrently, but optional requests still gate completion.
- **Goal linkage:** A2 — Frictionless onboarding. Newcomers can use primary ledger content while optional sidebar and overview panels finish loading.
- **Expected outcome:** Lower time to the first usable ledger screen under repeatable conditions. First-ledger/onboarding completion is a downstream adoption signal, not a promised conversion gain; no new analytics service is required.
- **Why now:** Use m21's baseline to address request waiting that bundle reduction cannot fix; preserve accounting and authorization behavior. w2 is the user-selected general-purpose queue, assigned to worker2.
- **Adoption surface:** Included because dashboard users directly experience this change; keep quickstart and measurement instructions accurate.

## Scope and measurement

Implementation stays within dashboard. Use public or synthetic ledgers, never user data or credentials in reports. Capture production-build baselines before changes; static imports identify candidates, not measured timing gains. Ask before adding dependencies; never hand-edit lockfiles. Preserve current access controls, accounting semantics, and supported exports. Journal virtualization and blanket memoization are out of scope; backend cold-start/retry safety is already tracked separately in w3/003.

## Validation and outcome

Completed 2026-09-06. Ledger routes now await only `GetLedger` and the page's primary report; the sidebar directive count, README card, and account metadata own their queries with honest pending states, and the overview loader starts README and metadata in the browser without waiting (never during SSR). Measured on the public `open_ledger/example` ledger with a record/replay fixture (400 ms simulated backend latency), Chrome 152, fresh contexts, 4× CPU and the m21 network profile, medians of three runs: with a 2,000 ms delay injected into the three optional operations, primary content improved from 3,308 ms to 1,330 ms on cold SSR loads and from 3,370 ms to 1,315 ms on client navigation (synthetic owner: 3,372 → 1,214 ms and 3,192 → 1,130 ms). Without injected delay, client navigation is unchanged (1,225 vs 1,262 ms) and cold primary content stays in the same band (1,273 vs 1,376 ms, overlapping ranges); README and Sankey now render after hydration on cold loads, about three seconds later than when they were server-rendered. The usage gauge's first text was the real count in every run, never a false zero. Fixture logs show no duplicate equivalent requests in any scenario; access errors still surface through the route error, declared cash-flow roles stay authoritative behind an explicit pending state, and writes/ledger switches keep their freshness and isolation (pinned by tests). Full tables, request accounting, limitations (HTTP/1.1 fixture connection limit) and reproduction steps: `dashboard/docs/performance-route-loading.md`.

Package checks passed: format, lint (TypeScript, ESLint, Knip), 278 Vitest files, production build; agent-guidance validation passed for all 16 scopes. Validated locally against recorded public data; no production deployment or backend change was required.
