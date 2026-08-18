/**
 * Stand-in for the `react-native` module, which cannot load in the test runner.
 *
 * Only `I18nManager` is modelled, because that is all `../../rtl` imports. The
 * model is deliberately faithful on the one point that matters: `forceRTL`
 * records the call but does **not** move `isRTL`. The real one behaves the same
 * way — the native side reads the flag at startup and not again — and that gap
 * is the whole reason `applyLayoutDirection` reports whether it changed
 * anything so the caller can restart. A mock that flipped `isRTL` eagerly would
 * make a broken implementation pass.
 */

export type I18nCall = { method: string; value: boolean };

export const calls: I18nCall[] = [];

export const I18nManager = {
  /** As read at launch. Tests set it directly to stage a launch. */
  isRTL: false,
  /** React Native's own default. */
  doLeftAndRightSwapInRTL: true,

  allowRTL(value: boolean): void {
    calls.push({ method: "allowRTL", value });
  },
  forceRTL(value: boolean): void {
    calls.push({ method: "forceRTL", value });
  },
  swapLeftAndRightInRTL(value: boolean): void {
    calls.push({ method: "swapLeftAndRightInRTL", value });
  },
};

/** Stage a launch: the flags as the native side reports them at startup. */
export function reset(isRTL: boolean, doLeftAndRightSwapInRTL = true): void {
  calls.length = 0;
  I18nManager.isRTL = isRTL;
  I18nManager.doLeftAndRightSwapInRTL = doLeftAndRightSwapInRTL;
}
