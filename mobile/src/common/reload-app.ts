/**
 * Restart the app so a native-side flag takes effect.
 *
 * Only one thing needs this today — `I18nManager.forceRTL`, which the native
 * layout engine reads at startup and never again — but the restart has three
 * different mechanisms depending on how the app is running, and getting that
 * wrong at boot is how you ship a launch loop. Hence one place.
 *
 * Kept out of `rtl.ts` so that module imports `react-native` alone and stays
 * cheap to unit-test.
 */
import { DevSettings } from "react-native";
import * as Updates from "expo-updates";

/**
 * Reload, by whichever mechanism this build actually has.
 *
 * `Updates.reloadAsync` is the real one, but it rejects in development and
 * does nothing useful when updates are disabled, so a dev build falls through
 * to `DevSettings.reload`. Both are guarded: a failed restart must leave the
 * caller able to carry on, because the alternative — a rejected promise inside
 * the splash screen's `prepare()` — is an app that never renders at all.
 */
export async function reloadApp(): Promise<void> {
  try {
    if (!__DEV__ && Updates.isEnabled) {
      await Updates.reloadAsync();
      return;
    }
  } catch (error) {
    console.warn(
      "Updates.reloadAsync failed; falling back to DevSettings",
      error,
    );
  }

  DevSettings.reload();
}
