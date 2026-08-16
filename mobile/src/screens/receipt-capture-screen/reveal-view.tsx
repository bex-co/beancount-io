import { StyleSheet, Text } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { durations, fontSizes, fontWeights } from "@/common/theme";
import { useTranslations } from "@/common/hooks/use-translations";
import { CHROME } from "./chrome";

const styles = StyleSheet.create({
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: CHROME.scrim,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  title: {
    color: CHROME.icon,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
    marginTop: 6,
  },
  payee: {
    color: CHROME.icon,
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.medium,
    textAlign: "center",
  },
  amount: {
    color: CHROME.icon,
    fontSize: fontSizes.hero,
    fontWeight: fontWeights.medium,
    letterSpacing: -1,
  },
  date: {
    color: CHROME.icon,
    fontSize: fontSizes.md,
    opacity: 0.75,
  },
  hint: {
    color: CHROME.icon,
    fontSize: fontSizes.sm,
    opacity: 0.75,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 18,
  },
});

/**
 * What the model read off the receipt, held on screen for a beat before the
 * transaction form takes over.
 *
 * Without this the highest-magic action in the app — point a camera at a
 * receipt, get the fields back — ended in a silent `router.replace`, so nothing
 * ever told the user their receipt had been understood.
 *
 * The copy is deliberately a *proposal*: nothing has been written to the ledger
 * at this point, and the next screen is where the user confirms it. Colors come
 * from `CHROME` rather than the theme for the same reason the rest of this
 * screen does — a viewfinder has no light mode.
 */
export type ReceiptReveal = {
  payee: string;
  /** Already normalized to a positive, two-decimal string by the caller. */
  amount: string;
  date: string;
};

export const RevealView = ({
  payee,
  amount,
  date,
}: ReceiptReveal): JSX.Element => {
  const { t } = useTranslations();

  return (
    <Animated.View
      style={styles.scrim}
      entering={FadeIn.duration(durations.fast)}
    >
      <Animated.View entering={FadeIn.duration(durations.base)}>
        <Ionicons name="sparkles" size={28} color={CHROME.icon} />
      </Animated.View>
      <Text style={styles.title}>{t("receiptRevealTitle")}</Text>
      {/* Staggered so the eye lands on the payee, then the amount, in the
          order the fields are read back. */}
      <Animated.View entering={FadeInDown.duration(durations.base)}>
        {payee ? <Text style={styles.payee}>{payee}</Text> : null}
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(durations.slow)}>
        <Text style={styles.amount}>{amount}</Text>
      </Animated.View>
      <Text style={styles.date}>{date}</Text>
      <Text style={styles.hint}>{t("receiptRevealHint")}</Text>
    </Animated.View>
  );
};
