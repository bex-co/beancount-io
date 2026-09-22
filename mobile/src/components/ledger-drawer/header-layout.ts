/** Shared tab chrome geometry, independent of actions, permissions and title. */
import { space } from "../../common/theme/spacing";
export const headerTitleLineHeight = 24;

export function headerHeight(fontScale: number): number {
  const scale = Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1;
  // Preserve the existing tabs' 26pt glyph + 12pt top/bottom spacing.
  // The 44pt touch targets fit INSIDE this bar; they must not add to its height.
  return Math.max(26, Math.ceil(headerTitleLineHeight * scale)) + space.md * 2;
}
