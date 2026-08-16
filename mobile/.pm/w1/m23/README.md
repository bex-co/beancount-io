# w1 · m23 — One loading and feedback vocabulary across the app

**Worker:** worker1 **Goal:** Every skeleton fades into its content, every pull-to-refresh spinner looks the same, no screen still animates on the JS thread, and the tab bar answers a tap with more than a color change. **Status:** todo

## Tasks (in order)

| id   | title                                                             | est | depends_on             |
| ---- | ----------------------------------------------------------------- | --- | ---------------------- |
| t001 | One `RefreshControl` convention, owned by `dashboard-scroll-view` | 45m | —                      |
| t002 | Crossfade every skeleton into its content (~18 sites)             | 60m | —                      |
| t003 | Retire the two legacy RN `Animated` files onto the motion tokens  | 45m | —                      |
| t004 | Tab icons: outline when inactive, filled + spring on focus        | 40m | —                      |
| t005 | UX pass — light/dark, reduce-motion, i18n, safe area              | 30m | t001, t002, t003, t004 |
| t006 | Simplify pass over the loading/motion diff                        | 25m | t005                   |
| t007 | Unit tests for the shared refresh config and icon state           | 30m | t005                   |

## Definition of done

Pull-to-refresh looks identical on all twelve lists — one tint convention, resolved from the theme in one place instead of three conventions across the app. Every skeleton hands off to real content with a crossfade rather than a hard cut at whatever opacity the pulse reached. No file in the app calls React Native's core `Animated` with `useNativeDriver: false`. The tab bar shows an outline icon when inactive and a filled one on focus, with a spring, so the active tab reads without depending on hue.

With the OS reduce-motion setting on, the crossfades and the icon spring land at their end state with no travel. Correct in light **and** dark; any new strings via `useTranslations()` from the English base. `yarn lint` / `yarn typecheck` / `yarn test:unit` pass.

## Source + Goal linkage

- **Source:** inbox notes `015` (three `RefreshControl` conventions across 12 sites), `016` (two legacy RN `Animated` files), `017` (crossfade sweep over ~18 skeleton sites) and `018` (tab icons never animate and always use the filled variant) — all from the `/pm-brainstorm` 2026-08-14 motion pass, re-verified during the 2026-08-16 triage.
- **Goal linkage:** the cross-cutting quality bar — _"Delightful in light **and** dark themes"_ — and Pillar 3 **Analytics & insights**, since the surfaces carrying most of these skeletons are the number screens (Home, Reports, Budget, account detail) where a hard cut mid-pulse is the first thing the user sees.
- **Expected outcome:** the app stops looking like four people built four loading states. Concretely: no more brightness pop when data lands, one refresh spinner, and an active tab that is legible without comparing colors.
- **Why now:** `w1/m20` established the pattern and the duration tokens on the chart surfaces (`t007`) and the `useReduceMotion()` hook (`t001`); this milestone is the sweep over everything else, and doing it while that vocabulary is fresh avoids a second motion dialect. Note `017` says so explicitly: _"Do this after `w1/m20/t007`, which establishes the pattern and the duration token."_

## Sequencing note

Sequence after `w1/m20` closes (`t011`, `t009`). If `w1/m22/t005` (lazy tab mounting) lands first, `t004`'s cost argument changes — it assumes all five tabs are already mounted, which stops being true.
