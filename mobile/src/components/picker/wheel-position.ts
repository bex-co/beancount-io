export const ITEM_HEIGHT = 50;

/**
 * Share of `ITEM_HEIGHT` a wheel label's line box may occupy. The rest is the
 * row's visual breathing space inside the selection indicator.
 */
const WHEEL_TEXT_HEIGHT_BUDGET = 0.8;

/** React Native lays a text line out at roughly 1.2x its font size. */
const LINE_HEIGHT_RATIO = 1.2;

/**
 * `maxFontSizeMultiplier` for a wheel label of `fontSize`.
 *
 * The wheel's row height is the single constant `ITEM_HEIGHT` — it drives the
 * spacers, the selection indicator, `snapToInterval` and the wheel's own height,
 * so snapping only works while every row is exactly that tall. Enlarged labels
 * therefore have to be capped rather than allowed to grow the row: this returns
 * the largest multiplier whose line box still fits the row.
 */
export function wheelTextMaxFontSizeMultiplier(fontSize: number): number {
  const maxFontSize =
    (ITEM_HEIGHT * WHEEL_TEXT_HEIGHT_BUDGET) / LINE_HEIGHT_RATIO;
  // Never below 1: a cap under 1 would shrink text below the designed size.
  return Math.max(1, Math.floor((maxFontSize / fontSize) * 100) / 100);
}

type WheelItem = { value: string };

/**
 * The wheel offset that centers `selectedValue`.
 *
 * This is both the ScrollView's `contentOffset` and the seed for the picker's
 * `scrollY`. They must come from the same source: `contentOffset` positions the
 * wheel without reliably emitting a scroll event, so a `scrollY` seeded
 * independently (at 0) makes an untouched picker confirm the first item instead
 * of the one it is visibly showing.
 */
export function wheelOffsetForValue(
  items: readonly WheelItem[],
  selectedValue: string | undefined,
): number {
  return selectedIndexForValue(items, selectedValue) * ITEM_HEIGHT;
}

export function selectedIndexForValue(
  items: readonly WheelItem[],
  selectedValue: string | undefined,
): number {
  if (!selectedValue) return 0;
  const index = items.findIndex((item) => item.value === selectedValue);
  return index >= 0 ? index : 0;
}

/**
 * The item the wheel is centered on at `offset`, clamped to `items`.
 *
 * A worklet as well as a plain function: the scroll handler runs on the UI
 * thread and needs the *pending* index to drive which row is emphasized, and
 * that has to be the same rounding Confirm uses — a second copy of it is how
 * the highlighted row and the saved row came to disagree mid-scroll.
 */
export function wheelIndexAtOffset(offset: number, itemCount: number): number {
  "worklet";
  const index = Math.round(offset / ITEM_HEIGHT);
  return Math.max(0, Math.min(index, itemCount - 1));
}
