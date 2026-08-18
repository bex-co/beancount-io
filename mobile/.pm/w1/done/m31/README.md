# w1 · m31 — Right-to-left layout for Persian

**Worker:** worker1 **Goal:** `fa` stops being Persian text poured into a left-to-right shell. The app flips to RTL when the active locale is Persian — leading-edge drawer, mirrored disclosure chevrons, direction-aware spacing and alignment — so the thirteenth locale is delivered as a laid-out app rather than translated strings. **Status:** **done** 2026-08-17 — Persian ships laid out right-to-left, English unchanged, 1322 unit tests green

## Tasks (in order)

| id   | title                                                          | est | depends_on                              |
| ---- | -------------------------------------------------------------- | --- | --------------------------------------- |
| t001 | Flip the layout at boot from the resolved locale               | 40m | — — **DONE**                            |
| t002 | Switching to or from `fa` in Settings offers the reload        | 35m | t001 — **DONE**                         |
| t003 | Logical margins and padding across the 32 physical-prop files  | 60m | t001 — **DONE**                         |
| t004 | Absolute edges and text alignment follow the writing direction | 45m | t003 — **DONE**                         |
| t005 | One mirrored-icon helper for the 21 directional glyphs         | 30m | t001 — **DONE**                         |
| t006 | The ledger drawer opens from the leading edge                  | 35m | t001 — **DONE**                         |
| t007 | Pin the three d3 charts and their axes left-to-right           | 30m | t003 — **DONE**                         |
| t008 | UX pass — `fa` walked in RTL, light and dark                   | 40m | t002, t004, t005, t006, t007 — **DONE** |
| t009 | Simplify pass over the RTL diff                                | 20m | t008 — **DONE**                         |
| t010 | Test coverage — the boot flip, the switch, and the icon helper | 35m | t009 — **DONE**                         |

## Definition of done

Launching the app with Persian selected renders the whole app right-to-left: the tab bar, list rows, disclosure chevrons, back affordances, and the ledger drawer all read from the right edge inward. Switching language to `fa` (or away from it) from Settings tells the user a restart is needed and performs it on confirm, rather than leaving the app in a half-flipped state until the next cold start. No screen in `src/screens/` still positions content with a physical `marginLeft` / `marginRight` / `paddingLeft` / `paddingRight` where a logical `marginStart` / `marginEnd` / `paddingStart` / `paddingEnd` expresses the same intent; the exceptions that remain are the ones that are genuinely physical, each carrying a comment saying why. The three `src/common/d3/` charts keep their left-to-right axis order under RTL. Selecting any of the other twelve locales leaves layout exactly as it is today. `yarn lint` / `yarn typecheck` / `yarn test:unit` pass.

## Source + Goal linkage

- **Source:** the `w1/m30` outcome note, which names this gap and rules it out of scope in the same sentence — _"The app is **not** in RTL layout mode: `I18nManager.forceRTL` is never called, so Persian renders as Persian text inside a left-to-right layout. That is pre-existing and out of scope here; flipping it is a native, app-wide change affecting every screen."_ Re-verified in the working tree before writing this milestone: **zero** `I18nManager` / `forceRTL` / `allowRTL` / `isRTL` references in `src/` or `app/`.
- **Goal linkage:** the `.pm/GOAL.md` cross-cutting quality bar — "Delightful in light **and** dark themes; localized (13 locales, English as base)". m29 and m30 made the string half of that claim true; this is the layout half. It also serves **Pillar 1 — effortless capture**: a Persian speaker adding a transaction currently reads right-to-left text whose labels, chevrons, and drawer all point the wrong way, which costs taps and confidence in exactly the on-the-go moment the pillar is about.
- **Expected outcome:** a Persian-speaking user gets an app that is laid out in their reading direction, not just spelled in their language — and the count of locales the app honestly delivers goes from twelve to thirteen.
- **Why now:** m30 shipped the last of `fa`'s 175 missing keys today, so Persian is fully translated for the first time — which is precisely what makes the layout the only remaining defect and makes it visible on every screen at once. Doing it now also keeps the cost bounded: 63 physical margin/padding occurrences across 32 files is a mechanical sweep today, and every feature that lands before it adds more.
- **Adoption surface task omitted:** this milestone ships no user- or agent-facing documentation surface — no package `README` step, no skill, no `CLAUDE.md` table row changes. It is in-app layout behavior, verified by the UX pass in `t008`. This matches the shape of every milestone on this board (m29, m30, m28).

## Notes

- **No new dependencies.** `I18nManager` and the logical style props (`marginStart` / `marginEnd` / `paddingStart` / `paddingEnd` / `start` / `end`) are core React Native. `expo-updates` (`~57.0.6`) is already a dependency, so `Updates.reloadAsync()` covers the restart in `t002` without adding anything.
- **The reload is not optional and not cosmetic.** `I18nManager.forceRTL` only takes effect on the next launch — the native side reads the flag at startup. Any design that flips the flag and keeps rendering leaves the app in a state where half the layout believes one direction and half believes the other. `t001` handles the cold-start case, `t002` the in-app switch; they are separate tasks because they fail differently.
- **`flexDirection: "row"` already flips.** Yoga mirrors row layouts under RTL automatically, and the tree contains **zero** `row-reverse` uses — so the row-level work is genuinely just the spacing props, not a layout rewrite.
- **Charts must not mirror.** Time on an axis reads left-to-right in Persian financial UIs as it does elsewhere, and `t007` pins that explicitly rather than letting it depend on whichever container the chart lands in.
- **`textAlign` has no logical value in React Native.** The `TextStyle` union is `auto | left | right | center | justify` — there is no `start` / `end`. `t004` has to choose between `"auto"` (resolves from the text's own direction) and an explicit `I18nManager.isRTL` branch per site; the 7 `textAlign: "right"` occurrences are amount columns, where the two choices differ.
- **Carry-over from `m30/t008`:** the Persian range chips use Latin digits on purpose — `۱` is a bare vertical stroke visually identical to the letter `ا` at chip size. Do not "fix" them back to Persian digits during this milestone.
- **Not in scope:** making the other twelve locales' layouts configurable, `writingDirection` on user-entered ledger content, or RTL for the WebView-hosted dashboard (`src/components/dashboard-webview/`), which is a separate document with its own direction handling.

## Outcome — shipped 2026-08-17

Persian is laid out right-to-left. The flip is decided once at launch from the same locale the rest of the app already trusts, and every screen walked in the UX pass mirrors: tab bar, list rows, disclosure chevrons, back affordances, form rows, and the ledger drawer, which now opens from the right edge. English and the other eleven left-to-right locales are unchanged — verified screen by screen against captures taken before the first line was written.

`yarn lint` / `yarn typecheck` / `yarn test:unit` pass; the suite went from 1306 to 1322 tests.

### The two things that were actually hard

Neither was in the plan, and both were found by looking at the running app rather than by reading the diff.

**1. React Native's `doLeftAndRightSwapInRTL` defaults to _on_.** Under RTL it silently rewrites every `left` / `right` style prop to `end` / `start`. That is helpful for layout and wrong for anything deliberately physical — because the geometry React Native does _not_ mirror (`transform: translateX`, an `onLayout` `x`, a `shadowOffset`) then disagrees with it. The time-range pills place their sliding fill at `left: 0` and drive it with a measured `translateX`; the swap moved the origin to the right edge while the measurement stayed on the left, and **the selected pill's fill left the screen entirely**. The fix is to turn the swap off (`swapLeftAndRightInRTL(false)`) and let the sites that mean leading and trailing say `start` / `end` outright — which, after `t003` and `t004`, they all do. Like `forceRTL`, it only takes effect after a restart, so `applyLayoutDirection` now treats a stale swap flag as a reason to relaunch — but **only when the app is going right-to-left**, so the twelve other locales never pay for a flag that cannot affect them.

**2. `textAlign` is already direction-aware; `natural` is not.** `RCTTextAttributes.mm` swaps left and right whenever the layout is right-to-left, unconditionally — so `textAlign: "right"` already means _trailing_ in both directions, and the first attempt here, a `trailingTextAlign()` helper branching on `isRTL`, double-flipped it. It was written, shipped into seven amount columns, and reverted.

The real defect was React Native's default, `natural`, which resolves alignment from the **string's** own first strong character rather than from the layout. UI copy is fine — it is in the app's language. Ledger data is not: account names, payees, amounts and commit messages are Latin, so they pinned themselves to the left of a Persian row while the row around them mirrored right. Symptoms ranged from cosmetic (a card's heading and its change figure at opposite edges) to a real loss of meaning: **the account tree's indentation stopped reading as indentation**, because every depth started at the same edge.

That is now one documented constant, `LEADING_TEXT_ALIGN`, applied to the two shapes at risk — a `Text` styled `flex: 1`, and a `Text` inside a `flex: 1` wrapper `View` — found by scanning for both shapes rather than by fixing the screens that happened to be walked. It is spelled `"left"` on purpose, and `rtl.test.ts` asserts it reads the same in both directions, because branching it on `isRTL` is exactly the mistake that was already made once.

### What shipped, by task

- **t001** — `src/common/rtl.ts` (the direction predicate, the flag reconciliation, the icon map) and `src/common/reload-app.ts`. The splash provider decides direction after `loadLocale()` and before anything draws, and restarts instead of rendering when the flag moved. A launch whose flag already agrees costs one comparison. `expo-updates` was already a dependency, so the restart added nothing.
- **t002** — the Settings language picker prompts for a restart, but only when the change crosses the direction boundary; `de` → `fr` stays instant. The persisted locale is flushed before the relaunch, or the app returns in the previous language.
- **t003 / t004** — 63 physical margin/padding occurrences across 32 files became logical. The app now has **zero** `marginLeft` / `marginRight` / `paddingLeft` / `paddingRight` anywhere in `src/` or `app/`. Of 30 absolute `left` / `right` uses, 24 were symmetric stretch pairs needing nothing, six became `end`, and one stayed physical with the reason written down.
- **t005** — 21 directional glyphs go through one helper; vertical chevrons pass through untouched, asserted by test.
- **t006** — the drawer's five would-be direction branches collapsed into one signed travel distance. `drawer-motion.ts` stays direction-free and its tests were not touched.
- **t007** — the three plots are pinned left-to-right through a shared `LTR_PLOT`. Time on a financial axis reads earliest-to-latest in Persian as everywhere else; mirroring it would have inverted every trend line. The chrome around the plots still mirrors.
- **t009** — four review passes. The one real regression they caught was mine: a fresh hit-slop object literal in the drawer's `useMemo` dependency array, which rebuilt the pan gesture and re-uploaded its three worklets to the UI runtime on every render, including the render that lands mid-drag. Both direction constants are now resolved once at module load, which is correct because direction cannot change without a restart. The passes also moved the amount alignment into `AmountText` — the funnel all 26 amount sites already went through — collapsed three copies of the chart-pin rationale into one constant, and removed two alignment properties that their centering parent made inert.
- **t010** — 14 tests over the direction predicate, the restart decision and the icon map, plus two over the persisted-write flush. Every unit was deliberately broken to confirm the tests bite: emptying `RTL_LOCALES` fails 6, dropping the swap check fails 1, removing the early return (the relaunch loop) fails 3, mirroring vertical chevrons fails 1, branching `LEADING_TEXT_ALIGN` fails 1, dropping the regional-tag normalisation fails 1, and untracking the pending write fails 1.

### Verified, and not

Walked in Persian in **light and dark**: home, accounts, reports, transactions, transaction detail, multi-posting entry, open-account, budget, notifications, settings, the account picker, and the ledger drawer. Each was then re-checked in English against a capture taken before the milestone started.

Three things are **not** verified, and none of them is claimed:

- **The restart prompt itself has never been seen.** The Settings language picker is a JS `ScrollView` wheel with no per-item tap target; the available automation exposes taps only, and synthetic mouse events no longer reach this machine's simulator. Its decision and its flush-before-restart ordering are covered by unit tests; its rendering is not.
- **Receipt capture** — same gap as m29 and m30. The simulator has no camera permission, so the flow stops at the permission screen. Its three views were converted but not walked.
- **Android.** Everything here was verified on iOS. The `textAlign` swap in finding 2 is iOS platform code (`RCTTextAttributes.mm`); Android's text alignment goes through a different path and may not agree.

### Noticed, not fixed

Dates render in English inside a Persian app — the transactions list shows `December 31, 2025`. That is a formatting gap, not a layout one: m29 and m30 closed the string half of localization and nothing has ever localized date formatting. Worth an inbox note; deliberately out of scope here.

## Notes

- **No new dependencies.** `I18nManager` and the logical style props are core React Native; `expo-updates` was already installed.
- **`flexDirection: "row"` mirrors for free** — the tree had zero `row-reverse` uses, so the row work really was only the spacing props.
- **Carried over from `m30/t008`:** the Persian range chips use Latin digits on purpose, because `۱` is visually identical to `ا` at chip size. Left alone.
- **Left as it was:** `createPersistentVar` now returns a third positional element, which the review flagged as the right depth but an awkward shape — a fourth would make hole-destructuring the norm. And `setLocale` centralizes the locale but not the obligation to reconcile direction, because the reconciliation's other half is a restart that only the caller can decide how to take. Both are recorded here rather than fixed.
