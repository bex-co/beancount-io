import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { fontSizes, fontWeights } from "@/common/theme";
import {
  getAvatarColor,
  getAvatarInitials,
} from "@/screens/journal-screen/utils/journal-utils";
import { matchBrand } from "@/common/brand-matcher";

const SIZE = 40;

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
    flexShrink: 0,
  },
  initialsText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
    color: "#fff",
  },
  logo: {
    width: SIZE,
    height: SIZE,
  },
});

interface TransactionAvatarProps {
  payee: string;
}

/**
 * 40×40 avatar for transaction rows.
 *
 * Shows a brand logo (via Google S2 favicon) when the payee is recognised,
 * otherwise falls back to coloured initials. The container is always 40×40 so
 * there is no layout shift between the two states.
 */
export const TransactionAvatar: React.FC<TransactionAvatarProps> = ({
  payee,
}) => {
  const [logoFailed, setLogoFailed] = useState(false);

  const domain = matchBrand(payee);
  const showLogo = domain !== null && !logoFailed;

  if (showLogo) {
    return (
      <View style={[styles.container, { backgroundColor: "#fff" }]}>
        <Image
          source={{
            uri: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
          }}
          style={styles.logo}
          onError={() => setLogoFailed(true)}
        />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: getAvatarColor(payee) }]}
    >
      <Text style={styles.initialsText}>{getAvatarInitials(payee)}</Text>
    </View>
  );
};
