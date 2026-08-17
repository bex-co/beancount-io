# w1 · m26 — UI-thread scrubbing for the interactive line chart

**Worker:** worker1 **Goal:** The chart scrub that already ships — guide line, cursor dot, per-point haptic tick, headline swap — stops re-rendering the card in React on every finger move and runs on the UI thread, Monarch/Robinhood-smooth. **Status:** todo

## Tasks (in order)

| id   | title                                                             | est | depends_on       |
| ---- | ----------------------------------------------------------------- | --- | ---------------- |
| t001 | Migrate `PanResponder` + state to `Gesture.Pan()` + shared values | 50m | w1/m20/t009      |
| t002 | Guide line and cursor dot via `useAnimatedProps`                  | 40m | t001             |
| t003 | Haptic ticks from `useAnimatedReaction` via `scheduleOnRN`        | 30m | t001             |
| t004 | Scrubbed headline value driven from the UI thread                 | 40m | t002             |
| t005 | UX pass — light/dark, reduce-motion, gesture arbitration          | 30m | t002, t003, t004 |
| t006 | Simplify pass over the scrub diff                                 | 25m | t005             |
| t007 | Unit tests for the scrub math                                     | 40m | t005             |

## Definition of done

Scrubbing `src/common/d3/interactive-line-chart.tsx` triggers **zero React re-renders per frame** while the finger moves: `scrubIndex` React state is gone, the guide line and cursor dot are `useAnimatedProps`-driven, and the headline tracks the finger exactly without a per-frame `setState`. Haptic selection ticks still fire once per data-point crossing (never at frame rate), touch-in still gives the impact haptic, and horizontal arbitration against the drawer via `useHorizontalSwipeOwnerGesture` still holds. No handler demotes the gesture to the JS thread (every worklet chain is verified; JS side effects go through `scheduleOnRN` from `react-native-worklets`). Behavior is otherwise pixel-identical in light and dark. `yarn lint` / `yarn typecheck` / `yarn test:unit` pass.

## Source + Goal linkage

- **Source:** inbox note `w1/019` (from `/pm-brainstorm` 2026-08-14, Monarch animation pass), promoted during the 2026-08-17 board triage. The note's hazard analysis is folded into the tasks.
- **Goal linkage:** Pillar 3 **Analytics & insights** plus the cross-cutting quality bar — scrubbing is how the user reads exact values off every line chart; today each haptic tick re-renders the whole card mid-gesture, the same defect class commit `d0c1f13` fixed for the ledger drawer.
- **Expected outcome:** the biggest felt-smoothness win per line changed in the motion area: scrubbing any line chart (Home net worth, account detail) stays at frame rate on a busy JS thread instead of stuttering when React is doing work.
- **Why now:** sequenced directly after `w1/m20` — t009 is m20's last task and this file is in its diff; m20 also landed the animated-props plumbing, motion tokens, and the design decisions (one animated node budget, d3-stays-on-JS-thread) this milestone rides on. No new dependencies.

## Hazards (from the sizing pass)

- **One non-worklet callback demotes the whole gesture** — a single `onEnd` calling `setState` costs the UI-thread `onUpdate` too. Every JS effect must route through `scheduleOnRN`.
- **Haptics cannot run in a worklet** — `expo-haptics` is an async native module; fire it via `scheduleOnRN`, gated strictly on index change.
- **The headline is React text** — driving it from the UI thread needs the `useAnimatedProps`-on-`TextInput` trick or a throttled `scheduleOnRN`, and it must still track the finger exactly (constraint recorded in `w1/m20/done/t003.md`).
- `runOnJS` is deprecated in worklets 0.10 and `react-native-reanimated` does **not** re-export `scheduleOnRN` — import it from `react-native-worklets`.
