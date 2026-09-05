# w2 · m21 — Load only the active language

**Worker:** worker2 **Goal:** Newcomers reach a usable dashboard with only their selected language and the English fallback downloaded. **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Capture production bundle and cold-load baselines — **DONE** | 45m | — |
| t002 | Split locale imports and load selected resources — **DONE** | 60m | w2/m21/t001 |
| t003 | Isolate SSR language state and hydrate matching resources — **DONE** | 60m | w2/m21/t002 |
| t004 | Handle language transitions and add a bundle budget command — **DONE** | 45m | w2/m21/t003 |
| t005 | Adoption surface — **DONE** | 20m | w2/m21/t004 |
| t006 | Simplify — **DONE** | 20m | w2/m21/t005 |
| t007 | Test coverage — **DONE** | 40m | w2/m21/t005, w2/m21/t006 |
| t008 | Closeout — **DONE** | 15m | w2/m21/t007 |

## Definition of done

- Initial browser requests exclude unused languages; all 15 supported languages remain usable.
- Concurrent SSR requests for different languages do not mix resources or translations; hydration shows neither raw translation keys nor a wrong-language flash.
- Language switching and failed chunk loads have usable recovery behavior.
- Record before/after compressed bytes and cold-load timings with identical production-build scenarios; document a repeatable bundle budget command.

## Source + Goal linkage

- **Source:** /pm-brainstorm dashboard performance, 2026-09-05; user requested materialization in w2. dashboard/src/i18n/init.ts eagerly imports all 15 languages and dashboard/src/routes/__root.tsx imports that initialization.
- **Goal linkage:** A2 — Frictionless onboarding. Newcomers reach a usable dashboard with only their selected language and the English fallback downloaded.
- **Expected outcome:** Lower time to the first usable ledger screen under repeatable conditions. First-ledger/onboarding completion is a downstream adoption signal, not a promised conversion gain; no new analytics service is required.
- **Why now:** Eager locale imports affect every entry route; establish the production baseline before chart and loader work. w2 is the user-selected general-purpose queue, assigned to worker2.
- **Adoption surface:** Included because dashboard users directly experience this change; keep quickstart and measurement instructions accurate.

## Scope and measurement

Implementation stays within dashboard. Use public or synthetic ledgers, never user data or credentials in reports. Capture production-build baselines before changes; static imports identify candidates, not measured timing gains. Ask before adding dependencies; never hand-edit lockfiles. Preserve current access controls, accounting semantics, and supported exports. Journal virtualization and blanket memoization are out of scope; backend cold-start/retry safety is already tracked separately in w3/003.


## Validation and outcome

Completed 2026-09-05. Initial JavaScript: 951,559 → 333,903 gzip bytes (64.9% smaller), with 14 non-English dynamic chunks. All 15 languages passed concurrent SSR and production-browser hydration; a blocked French chunk recovered through the explicit retry reload. See `dashboard/docs/performance-locales.md` for conditions, timing samples, limitations, and reproduction steps.

Package checks passed: format, lint (including types and dead code), 268 Vitest files / 3,438 passing tests / 1 skipped, production build, and locale budget. Agent-guidance validation passed for all 16 scopes. Implementation was validated locally; no production deployment was required.
