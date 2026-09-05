# w2 · m21 — Load only the active language

**Worker:** worker2 **Goal:** Newcomers reach a usable dashboard with only their selected language and the English fallback downloaded. **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Capture production bundle and cold-load baselines | 45m | — |
| t002 | Split locale imports and load selected resources | 60m | w2/m21/t001 |
| t003 | Isolate SSR language state and hydrate matching resources | 60m | w2/m21/t002 |
| t004 | Handle language transitions and add a bundle budget command | 45m | w2/m21/t003 |
| t005 | Adoption surface | 20m | w2/m21/t004 |
| t006 | Simplify | 20m | w2/m21/t005 |
| t007 | Test coverage | 40m | w2/m21/t005, w2/m21/t006 |
| t008 | Closeout | 15m | w2/m21/t007 |

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

