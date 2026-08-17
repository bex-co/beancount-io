/**
 * Which Ionicon each tab renders, in both states.
 *
 * The tab bar used to render the filled glyph unconditionally and signal the
 * active tab with color alone, so the only way to tell where you were was to
 * compare two greens. Outline-when-inactive is what iOS tab bars do, and it
 * reads without depending on hue — an accessibility win before it is a polish
 * one.
 *
 * Import-free (the glyph-name type is erased) so the unit tests can read the
 * real map rather than a copy of it.
 */
import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

/** Route names, exactly as registered in `app/(app)/(tabs)/_layout.tsx`. */
export type TabRouteName =
  "index" | "accounts" | "transactions" | "reports" | "ledger";

export type TabIconPair = {
  /** Focused: the filled glyph. */
  active: IoniconName;
  /** Unfocused: the outline glyph — never the filled one. */
  inactive: IoniconName;
};

export const tabIcons: Record<TabRouteName, TabIconPair> = {
  index: { active: "home", inactive: "home-outline" },
  accounts: { active: "copy", inactive: "copy-outline" },
  transactions: {
    active: "document-text",
    inactive: "document-text-outline",
  },
  reports: { active: "stats-chart", inactive: "stats-chart-outline" },
  ledger: { active: "folder", inactive: "folder-outline" },
};

/** The glyph a tab shows in the given focus state. */
export function tabIconName(
  route: TabRouteName,
  focused: boolean,
): IoniconName {
  const pair = tabIcons[route];
  return focused ? pair.active : pair.inactive;
}
