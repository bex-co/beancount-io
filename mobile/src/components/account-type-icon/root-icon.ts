// Type-only so this module stays runtime-pure (no react-native import) and can
// be unit tested under Node, same as `@/common/theme/typography`.
import type { Ionicons } from "@expo/vector-icons";
import type { AccountRoot } from "@/common/account-root";
import type { ColorTheme } from "@/types/theme-props";

export type RootIcon = {
  glyph: keyof typeof Ionicons.glyphMap;
  /** Tone is resolved from the theme so the tile works in light and dark. */
  tone: (theme: ColorTheme) => string;
};

/**
 * One glyph + tone per Beancount root account type. Deliberately restrained:
 * the row's icon signals *what kind of account* the entry hits, and the text
 * carries the rest. No per-category guessing, so it is never wrong.
 */
export const ROOT_ICONS: Record<AccountRoot, RootIcon> = {
  expenses: { glyph: "receipt", tone: (theme) => theme.secondary },
  // `cash` rather than a "$" glyph: ledgers are not necessarily USD.
  income: { glyph: "cash", tone: (theme) => theme.success },
  assets: { glyph: "wallet", tone: (theme) => theme.information },
  liabilities: { glyph: "card", tone: (theme) => theme.warning },
  equity: { glyph: "business", tone: (theme) => theme.black80 },
};

/** Used for directives with no account at all (Price, Commodity, Event, …). */
export const FALLBACK_ICON: RootIcon = {
  glyph: "document-text",
  tone: (theme) => theme.black80,
};

/** Tint strength for the icon tile; dark needs more to read on charcoal. */
export const TINT_ALPHA = { light: 0.14, dark: 0.22 } as const;

export const getRootIcon = (root: AccountRoot | null): RootIcon =>
  root ? ROOT_ICONS[root] : FALLBACK_ICON;
