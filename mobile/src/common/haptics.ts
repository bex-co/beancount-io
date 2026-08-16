/**
 * The app's haptic vocabulary — one wrapper over `expo-haptics` so a caller
 * says *what happened* rather than which taptic curve to run.
 *
 * Before this, five call sites imported `expo-haptics` directly and disagreed
 * on both of the things a haptic call has to get right: only the tab bar gated
 * on platform, and only the tab bar left its promise unguarded. The vocabulary
 * below is the fix — five intents, one policy each.
 *
 * ## Platform policy
 *
 * Fire on **both iOS and Android**. `app.json` ships those two platforms only,
 * `expo-haptics` implements both, and four of the five original call sites were
 * already firing on Android — gating everything to iOS would have silently
 * taken feedback away from Android users to make a tab press consistent. Any
 * other platform (a web build, a test runner) is skipped rather than trusted to
 * no-op, which is also what keeps this module loadable outside a device.
 *
 * ## Guarding
 *
 * Every call is fire-and-forget and swallows failure. A haptic is decoration:
 * an unsupported device, a silenced Taptic Engine or a missing Android
 * `VIBRATE` permission must never surface as a rejected promise in a save path.
 * Callers therefore need no `.catch()` of their own.
 *
 * ## Calling from a worklet
 *
 * These are **not** worklet-safe. `expo-haptics` is an async native module with
 * no worklet support, so a haptic driven by a gesture or an animation callback
 * has to hop to the JS thread first — `scheduleOnRN` from `react-native-worklets`
 * (`runOnJS` is deprecated as of worklets 0.10).
 *
 * Deliberately free of `@/` and `react-native` imports so the unit-test runner
 * can require it; platform comes from `process.env.EXPO_OS`, which Expo inlines
 * at build time.
 */
import * as Haptics from "expo-haptics";

/** Platforms whose native haptics implementation we actually ship on. */
const HAPTIC_PLATFORMS = ["ios", "android"];

function isSupported(): boolean {
  return HAPTIC_PLATFORMS.includes(process.env.EXPO_OS ?? "");
}

/**
 * Run a haptic without ever letting it fail upward — neither as a rejection nor
 * as a synchronous throw from an unavailable native module.
 */
function fire(trigger: () => Promise<void>): void {
  if (!isSupported()) {
    return;
  }
  try {
    void trigger().catch(() => undefined);
  } catch {
    // Native module missing entirely (Expo Go on an unsupported device).
  }
}

/**
 * Intent-named haptics. Import the object, not the individual functions, so
 * `haptics.error()` never has to fight a local `error` binding at a call site.
 */
export const haptics = {
  /** Moving between options in a set: a range pill, a scrub crossing a point. */
  selection(): void {
    fire(() => Haptics.selectionAsync());
  },

  /** A press landing on a control — the lightest tap in the vocabulary. */
  press(): void {
    fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },

  /** A write to the ledger committed. */
  success(): void {
    fire(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    );
  },

  /** Something landed, but not the way the user asked for. */
  warning(): void {
    fire(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    );
  },

  /** A write was rejected — distinguishable from `success` without reading. */
  error(): void {
    fire(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    );
  },
};
