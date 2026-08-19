# w1 · m20 — Charts that animate: motion tokens, draw-in, and range morphs

**Worker:** worker1 **Goal:** A shared motion vocabulary, then the four live charts draw themselves in, grow from their baseline, and morph between time ranges instead of snapping — with the app's first reduce-motion handling. **Status:** **done** 2026-08-18 — charts animate on a shared motion token layer; the deferred simplify pass landed a shared chart-chrome module and unified the resting-bar geometry

## Tasks (in order)

| id   | title                                                              | est | depends_on                   |                                            |
| ---- | ------------------------------------------------------------------ | --- | ---------------------------- | ------------------------------------------ |
| t001 | `theme/motion.ts` tokens + `useReduceMotion()` hook                | 35m | —                            | — **DONE**                                 |
| t002 | Net-worth line + area draw in on first paint                       | 50m | t001                         | — **DONE**                                 |
| t003 | Headline figure counts up alongside the draw-in                    | 35m | t002                         | — **DONE**                                 |
| t004 | Bars grow from the zero baseline, staggered                        | 50m | t001                         | — **DONE**                                 |
| t005 | Range switch morphs the series instead of replacing it             | 50m | t002, t004                   | — **DONE**                                 |
| t006 | Animated selection indicator on `TimeRangePills`                   | 30m | t001                         | — **DONE**                                 |
| t007 | Refresh keeps the chart; skeleton crossfades into the loaded chart | 35m | t002, t004                   | — **DONE**                                 |
| t011 | Fix the TimeRangePills indicator origin — lands beside the pills   | 25m | t006                         | — **DONE**                                 |
| t008 | UX pass — light/dark, reduce-motion on device, i18n, safe area     | 40m | t003, t005, t006, t007, t011 | — **DONE** (accepted, not device-verified) |
| t009 | Simplify pass over the motion + chart code                         | 30m | t008                         | — **DONE**                                 |
| t010 | Unit tests for motion tokens, reduce-motion, and path/series math  | 40m | t008                         | — **DONE**                                 |

## Definition of done

On a cold start the net-worth chart's line and area draw in and the headline figure counts to its final value, both completing under 500ms. The three bar charts grow from the zero baseline with a per-bar stagger. Switching 1M→1Y morphs the existing series rather than swapping the path in one frame. The time-range pill indicator slides between pills instead of hard-restyling.

Pull-to-refresh on Home and account detail leaves the chart on screen under the `RefreshControl` spinner — `refreshing` no longer feeds any `loading` prop — and first-load skeletons crossfade into content instead of hard-cutting mid-pulse.

With the OS reduce-motion setting enabled, every one of these lands at its final state with no intermediate motion, verified on device. Durations and easings live in one module: no `withTiming`/`withSpring` in the code this milestone touches carries a literal duration.

Correct in light **and** dark, any new strings via `useTranslations()` from the English base. `yarn lint` / `yarn typecheck` / `yarn test:unit` pass.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-08-14 ("learn from monarch app's animation, e.g. chart rendering animation, and see how we can increase customer delight for our mobile app"). Reference behavior: Monarch's net-worth hero chart — full-bleed line with a vertical gradient-to-transparent area fill, headline value above, `1M 3M 6M YTD 1Y ALL` pills directly under the plot. Web parity inside this monorepo: `dashboard/src/features/reports/balance-sheet/line-chart.tsx:162-164` sets `animation: true`, `animationDuration: 1000`, `animationEasing: "cubicOut"` — the web net-worth line animates and the mobile one does not.
- **Goal linkage:** Pillar 3 **Analytics & insights**. Motion here is not decoration — a draw-in walks the eye along the time axis in reading order, and morphing between ranges preserves object constancy so the user tracks _what changed_ instead of re-reading a chart that teleported. Also the cross-cutting quality bar, which names delight in light and dark explicitly, and adds the app's first reduce-motion handling.
- **Expected outcome:** the number screens stop feeling like a static report. Three concretely testable changes: charts survive a pull-to-refresh (today they blank to a skeleton), ranges transition (today they snap in one frame), and the app respects the OS reduce-motion setting for the first time (`AccessibilityInfo` is referenced nowhere today).
- **Why now:** `w1/m3` (Reports tab) is mid-flight with more charts to build. Landing the primitives first means those charts are _born_ animated instead of retrofitted. The motion tokens also arrive before the next screen invents its twelfth magic duration — there are already eleven scattered literals (`300`, `200`/`150`, `500`, `2000`, …), and `src/common/theme/spacing.ts:1-15` documents this exact drift as the reason a shared scale exists. No new dependencies: `react-native-reanimated@4.5.1`, `react-native-worklets@0.10.1`, `react-native-svg@15.15.4` and `d3@7.9.0` are all installed.

## Design decisions (settled during brainstorm research)

- **d3 cannot cross to the UI thread.** `d3.line()` returns a closure and builds a `d3-path` class instance; the worklets serializer requires a plain-object prototype and rejects both. Keep all d3 work on the JS thread inside the existing `useMemo`, and interpolate plain `number[]` inside worklets. Reanimated's own `interpolate(v, inputRange, outputRange, Extrapolation.CLAMP)` is a worklet and replaces `scaleLinear` exactly.
- **`withTiming` cannot tween a path string** — its string support is a single `prefix + number + suffix` regex (fine for `"50%"`, useless for `"M0,0 C…"`). Build `d` yourself inside `useAnimatedProps`.
- **Budget one animated node per series.** Any prop change on any node repaints the whole `<Svg>`, so one animated `Path` costs the same as two hundred. Keep the scrub cursor as the only other animated SVG node; move any tooltip as a plain `View` with `useAnimatedStyle`.
- **Reanimated already defaults to `ReduceMotion.System`**, so `withTiming`/`withSpring` jump to their end state when the OS setting is on with no extra code. The hook in t001 exists for the things Reanimated does not own (looping shimmer, staggered reveal scheduling).
- **No Skia migration.** It would solve whole-tree repaint, but costs ~+6MB iOS / ~+4MB Android and — decisively — canvas content is invisible to VoiceOver/TalkBack.
- **The range morph uses precomputed keyframes, not the native `d` transition.** _Settled during t005._ Reanimated 4.5.1 does ship native C++ path morphing (`EXPERIMENTAL_CSS_ANIMATIONS_FOR_SVG_COMPONENTS` is on, and `processSVGPath` is in the installed build), and it was the first option considered. It was not taken, for two reasons: the task's own acceptance bar for it is a device judgement ("smooth for a 1M ↔ ALL switch in both directions") that could not be made in the implementing session, and it would have to share a `Path` with the entrance's `animatedProps`, which is untested territory. Instead, a range change precomputes 24 intermediate paths on the JS thread — blending the two series in **both** value and domain space, so the curve and its axis rescale together — and the UI thread only indexes into that array. The first and last frames are overwritten with the real resting paths, because a monotone cubic through a resampled grid is not quite the curve through the original points, and that difference would pop on the handoff back to the static render. When no morph is in flight the render path is byte-identical to what it was before the feature existed, so the blast radius is the transition itself. **The native route stays open** and is worth A/B-ing on a device during t008; if it wins, `buildMorphFrames` and `series-morph.ts` delete cleanly.
- **Scrubbing is out of scope.** `src/common/d3/interactive-line-chart.tsx` already ships scrub-with-haptics; the gap is that it runs on the JS thread via `PanResponder` + `useState`. That migration needs its own sizing pass — tracked as inbox note `w1/019`.
