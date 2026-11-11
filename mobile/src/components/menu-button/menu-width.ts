import { prefersStackedLayout } from "../../common/theme/dynamic-type";

/** The side margin the popover keeps from the screen edge. */
export const MENU_SCREEN_MARGIN = 16;

/**
 * How wide the menu popover is.
 *
 * Ordinary sizes keep the fixed width (260 pt, 300 pt with a title). It was fixed
 * at every size, so at AX2 a row's label, about twice as large, was narrower than
 * one long word and iOS broke it by character: Russian "Сканировать чек" read
 * "Сканироват" / "ь чек" (w22/035). From the stacking threshold the menu takes the
 * whole width the screen allows instead, so the labels wrap at word boundaries.
 *
 * Pure (no react-native import) so the unit-test runner loads it under plain Node.
 */
export function menuWidth(input: {
  hasTitle: boolean;
  screenWidth: number;
  fontScale: number | undefined;
}): number {
  const available = input.screenWidth - 2 * MENU_SCREEN_MARGIN;
  if (prefersStackedLayout(input.fontScale)) return available;
  return Math.min(input.hasTitle ? 300 : 260, available);
}
