# w3 · m39 — Make the primary sidebar a navigation landmark and let keyboard users skip it

**Worker:** worker3 **Goal:** a screen-reader or keyboard user can jump straight to the ledger navigation, or straight past it to the content, on every dashboard route **Status:** todo

Severity: **minor** (breadth, every route). Package: dashboard. The app's main navigation — 11 to 15 links repeated on every page — is a bare `<ul>`. The two *secondary* navigations on the same page are proper landmarks, so this is an inconsistency inside the app, not a missing convention.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Wrap the ledger and dashboard sidebars in labelled navigation landmarks | 40m | — |
| t002 | Add a skip-to-content link to the dashboard shell | 35m | t001 |
| t003 | Verify the navigation adoption surface | 15m | t002 |
| t004 | Simplify the landmark and skip-link wiring | 10m | t003 |
| t005 | Test landmarks and skip-link behavior | 40m | t003 |
| t006 | Close and archive the navigation landmark milestone | 10m | t004, t005 |

Implementation totals 75 minutes; all six tasks total 150 minutes. Two shells, new localized labels in 15 files, and real keyboard behavior push this past a sub-hour edit.

## Reproduction and evidence

Production https://beancount.io, 2026-09-12, isolated headless Chrome (Playwright MCP `--headless --isolated`), English/light, 1440×1000. Authenticated QA account on its own synthetic `example` ledger and the public `open_ledger/example`. Local/fetched main `84231f9c`; deployed SHA unverified. Read-only.

Enumerate the landmarks and in-page anchors on each route:

| route | landmarks | skip links | sidebar links |
| --- | --- | --- | --- |
| `/ledger` | `main`, `header` | none | — |
| `/ledger/<owner>/example` | `main`, `header`, `nav[Related pages]` | none | 11 |
| `/ledger/<owner>/example/journal` | `main`, `header`, `navigation[pagination]`, `nav[Related pages]` | none | 11 |
| `/ledger/open_ledger/example/balance-sheet` | `main`, `header`, `nav[Related pages]`, `header`, `aside`, `footer` | none | 15 |

The accessibility tree agrees: on `/journal` the sidebar renders as `list` → `listitem` → `link "Overview"`, `link "Journal"`, … with **no** `navigation` node, while `navigation "Related pages"` and `navigation "pagination"` are both present on that same page. So a screen-reader user listing landmarks to reach the ledger's own menu finds "Related pages" and "pagination" but not the menu itself, and a keyboard user has no way past 11–15 repeated links to reach the content.

Control: the public marketing site at `https://beancount.io/` exposes `Skip to main content`, `banner`, `navigation[Main]`, `navigation[Utility]`, `main` and `contentinfo`. That site lives in a different repo and is **not** in scope — it is cited only to show the intended standard.

Also checked and **not** defective: the three ledger filter controls keep their accessible names once filled (`combobox "Time": "2017"`, `combobox "Account": "Assets:US:ETrade"`), every `img` has `alt`, and every `button` has an accessible name. Do not fold those into this milestone.

Verified evidence under `dashboard/tmp/qa-20260912/a11y-landmarks.json` (gitignored, local only).

## Root cause and repair boundary

- `dashboard/src/common/components/ui/sidebar.tsx:686-690` — `SidebarMenu` renders a plain `<ul>`; `SidebarContent` at `:603` renders a plain `<div>`. Nothing in the primitive emits `<nav>` or `role="navigation"`.
- `dashboard/src/common/components/ledger-layout/ledger-sidebar.tsx` composes those primitives for the ledger routes and sets only one `aria-label`, on the account search control (`:151`).
- `dashboard/src/features/ledger-list/pages/dashboard-page/components/dashboard-sidebar.tsx` is the second shell, used at `/ledger`.
- No dashboard route renders an in-page skip anchor; the app shell has no such element.

Put the landmark on the composing sidebars rather than inside the shared `sidebar.tsx` primitive unless every consumer of that primitive is genuinely a navigation region — a landmark on a primitive used for non-navigation content would be worse than none. `dashboard/CLAUDE.md` requires reusing common responsive and accessibility primitives before adding another abstraction, and every new string needs an English key plus matching keys in the other 14 locales (`src/test/translations.test.ts` checks shape).

Two `navigation` landmarks already exist per page, so each new one needs a distinct accessible name; a landmark without one makes the list worse, not better. Keep the sidebar's existing collapse/expand behavior, its narrow-viewport sheet, and the focus fallback documented at `sidebar.tsx:43` intact.

## Definition of done

- The ledger sidebar and the `/ledger` dashboard sidebar are each exposed as a `navigation` landmark with a distinct, localized accessible name, on every route that renders them.
- "Related pages" and "pagination" keep their existing names, and no page ends up with two identically named landmarks.
- A skip link is the first focusable element on a dashboard route: invisible until focused, visible and operable when focused, and activating it moves both focus and the viewport to the main content — not just the URL hash.
- The skip link and both landmark labels are localized in all 15 locale files, and `src/test/translations.test.ts` passes.
- Keyboard behavior is unchanged otherwise: sidebar collapse/expand, the narrow-viewport sheet, and the post-navigation focus fallback at `sidebar.tsx:43` still work at 1440 and 390.
- `yarn format:check && yarn lint && yarn test && yarn build` pass in `dashboard/`.

## Dedupe and limits

All open and `done/` queues searched for skip link, landmark, navigation, sidebar and accessibility terms — no existing item. Open [m32](../m32/README.md) is the *statement hierarchy tables*' missing table/row/columnheader semantics inside `.hierarchy-scroll`; it is a different element, a different role family and a different page region — coordinate only if both touch shared report layout. Completed `m23` restored focus return after Journal, Budget and Account **dialogs**; completed `m25` gave Accounts and Holdings **table** structure. Neither concerns page-level landmarks or a skip target. No `git log` evidence of a later fix on fetched main; not deployment lag.

Unverified: an actual screen reader (this was measured from the DOM and the accessibility tree, not VoiceOver or NVDA), other locales, the narrow-viewport sheet's landmark behavior, and the patched behavior.

## Source + Goal linkage

- **Source:** continuous dashboard QA, 2026-09-12 — the accessibility journey; evidence in `dashboard/tmp/qa-20260912/a11y-landmarks.json`.
- **Goal linkage:** **A2 — Frictionless onboarding**: a keyboard or screen-reader user evaluating Beancount.io currently tabs through 11–15 repeated navigation links on every page load before reaching any content, and cannot find the ledger's own menu in a landmark list.
- **Expected outcome:** landmark navigation reaches the ledger menu by name, and one keystroke skips it; the app matches the standard its own marketing site already meets.
- **Why now:** the app already has two correctly-labelled secondary navigation landmarks, so the pattern and the primitives exist; the gap is on the one region users hit most. Adoption surface is included because this is a user-facing behavior change on every route.
