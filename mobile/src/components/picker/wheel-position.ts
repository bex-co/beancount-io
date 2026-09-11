export const ITEM_HEIGHT = 50;

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

/** The item the wheel is centered on at `offset`, clamped to `items`. */
export function wheelIndexAtOffset(offset: number, itemCount: number): number {
  const index = Math.round(offset / ITEM_HEIGHT);
  return Math.max(0, Math.min(index, itemCount - 1));
}
