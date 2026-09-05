# w2 · m23 — Show primary ledger content before optional panels finish

**Worker:** worker2 **Goal:** Newcomers can use primary ledger content while optional sidebar and overview panels finish loading. **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Trace requests that gate primary content | 45m | w2/m21/t008 |
| t002 | Resolve sidebar counts independently | 45m | w2/m23/t001 |
| t003 | Defer optional overview panels | 60m | w2/m23/t002 |
| t004 | Verify hydration deduplication and freshness | 45m | w2/m23/t003 |
| t005 | Adoption surface | 20m | w2/m23/t004 |
| t006 | Simplify | 20m | w2/m23/t005 |
| t007 | Test coverage | 40m | w2/m23/t005, w2/m23/t006 |
| t008 | Closeout | 15m | w2/m23/t007 |

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

