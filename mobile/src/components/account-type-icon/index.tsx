import React, { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, withAlpha } from "@/common/theme";
import { getAccountRoot } from "@/common/account-root";
import { resolveBrandDomain, buildLogoUrl } from "@/common/brand-matcher";
import {
  PostingLite,
  TRANSFER,
  TRANSFER_GLYPH,
  matchCategory,
  pickPrimaryAccount,
} from "@/common/tx-category";
import { config } from "@/config";
import { getRootIcon, TINT_ALPHA, type RootIcon } from "./root-icon";

const SIZE = 40;
const RADIUS = 12;
const GLYPH_SIZE = 20;
// Brand logos are inset on a neutral chip and given their own rounded corners so
// every tile reads as the same rounded square — full-bleed app-icons (Amazon),
// circular marks (Starbucks) and the glyph fallback alike. The chip must be
// non-white: it frames logos whose own background is white/transparent so they
// never read as a floating circle (white-on-white would hide the frame).
const LOGO_SIZE = 30;
const LOGO_RADIUS = 8;

type GlyphName = keyof typeof Ionicons.glyphMap;

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    borderRadius: RADIUS,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
    flexShrink: 0,
  },
  // The chip's background + hairline border are set inline from the theme so
  // they adapt to light/dark; the inset logo sits centered on top.
  logoChip: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_RADIUS,
  },
});

/**
 * Resolve the glyph + tone for a row from its primary account. Colour always
 * follows the primary account's root (so a paycheck reads Income-green even with
 * a tax leg), while the glyph refines to a spending category when recognised;
 * pure account-to-account moves get a neutral transfer glyph.
 */
function resolveGlyph(postings: PostingLite[]): {
  glyph: GlyphName;
  tone: RootIcon["tone"];
} {
  const primary = pickPrimaryAccount(postings);
  const base = getRootIcon(
    primary && primary !== TRANSFER ? getAccountRoot(primary) : null,
  );
  if (primary === TRANSFER) {
    return { glyph: TRANSFER_GLYPH as GlyphName, tone: base.tone };
  }
  const category = primary ? matchCategory(primary) : null;
  return { glyph: (category as GlyphName) ?? base.glyph, tone: base.tone };
}

interface AccountTypeIconProps {
  /** The entry's postings (account + amount). Drives which account's icon shows
   * and the transfer/category resolution; amounts may be omitted. */
  postings: PostingLite[];
  /** Payee/narration text; when it (or the target account) names a known brand,
   * the row shows that brand's logo instead of the category glyph. */
  payee?: string;
}

/**
 * Leading 40×40 icon for a journal row.
 *
 * Shows, in order: a brand logo (via logo.dev) when the payee or target account
 * names a known brand; a spending-category glyph (Food, Transport, …) inferred
 * from the primary account; a neutral transfer glyph for account-to-account
 * moves; else the entry's root-account glyph. All variants share the same
 * rounded-square geometry and fixed size, so rows never shift.
 */
export const AccountTypeIcon: React.FC<AccountTypeIconProps> = ({
  postings,
  payee,
}) => {
  const { colorTheme, name } = useTheme();
  // Keyed on the domain so a recycled FlatList row that lands on a different
  // brand re-attempts its logo instead of staying on the previous failure.
  const [failedDomain, setFailedDomain] = useState<string | null>(null);

  const accounts = postings.map((p) => p.account);
  const domain = resolveBrandDomain(payee, accounts);
  const logoUrl = domain ? buildLogoUrl(domain, config.logoDevToken) : null;

  if (logoUrl && failedDomain !== domain) {
    return (
      <View
        style={[
          styles.container,
          styles.logoChip,
          {
            backgroundColor: colorTheme.black10,
            borderColor: colorTheme.black20,
          },
        ]}
      >
        <Image
          source={{ uri: logoUrl }}
          style={styles.logo}
          resizeMode="cover"
          onError={() => setFailedDomain(domain)}
        />
      </View>
    );
  }

  const { glyph, tone } = resolveGlyph(postings);
  const color = tone(colorTheme);
  const alpha = name === "dark" ? TINT_ALPHA.dark : TINT_ALPHA.light;

  return (
    <View
      style={[styles.container, { backgroundColor: withAlpha(color, alpha) }]}
    >
      <Ionicons name={glyph} size={GLYPH_SIZE} color={color} />
    </View>
  );
};
