# w3 · m3 — Budget localization & analytics-driven iteration

**Worker:** worker3 **Goal:** Budget speaks all 13 app locales, and the first round of analytics-informed refinements ships (or is explicitly declined with data). **Status:** in progress (t001 locales + t006 parity test done; t002 unblocked 2026-08-24 — budget shipped in `mobile-v1.20260814.42`, so the funnel has collected for a real window and the analytics review is now the next actionable task)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Translate budget strings into the 13 non-English locales | 45m | — | — **DONE**
| t002 | Analytics review: budget funnel + iteration decisions | 30m | — |
| t003 | Implement decided iterations (interval filter / panel tuning) | 45m | t002 |
| t004 | Adoption surface | 20m | t001, t003 |
| t005 | Simplify | 20m | t004 |
| t006 | Test coverage | 30m | t004 | — **DONE**
| t007 | Closeout | 20m | t006 |

## Definition of done

Every budget translation key exists in all 13 non-English locale files and the translation key-parity test passes; the analytics review's decisions (interval filter on /budget: yes/no; Home panel empty-state treatment: keep/tune/hide) are recorded in the task files with the numbers that drove them; whatever was decided "yes" is shipped and `yarn test` passes.

## Source + Goal linkage

- **Source:** budget-on-mobile PM spec, 2026-08-09 (`/pm` invocation) — M3 "polish & iterate" phase.
- **Goal linkage:** A3 — 13-locale coverage is table stakes for the international beancount community this app serves, and shipping data-justified refinements (not speculative UI) keeps the app credible as an open-source showcase.
- **Expected outcome:** Non-English users get budget in their language; the iteration decisions demonstrate an analytics-driven loop the community can see on this board.
- **Why now:** Deliberately sequenced after M1+M2 so the funnel has real data before any speculative UI (interval filter) is built — the spec cut it from v1 pending evidence. Adoption surface task included: locale files are user-facing.
