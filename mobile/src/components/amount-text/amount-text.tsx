import { StyleSheet, Text, TextProps, useWindowDimensions } from "react-native";
import {
  amountMaxFontSizeMultiplier,
  amountStyle,
  fonts,
} from "@/common/theme";
import { LEADING_TEXT_ALIGN } from "@/common/rtl";

type AmountTextProps = TextProps & {
  /**
   * Render in the ledger mono face; "medium" is the emphasized weight for
   * row-level amounts. Omit for standalone amounts (headlines, hero entry),
   * which stay in the system font.
   */
  mono?: "regular" | "medium";
};

const styles = StyleSheet.create({
  amount: {
    ...amountStyle,
    /**
     * Every amount, aligned to the layout's leading edge rather than to its own
     * digits. `0.00 MUSD` is strongly left-to-right, so React Native's default
     * resolves the alignment from the string and pins the amount to the left of
     * a right-to-left screen while the row around it mirrors. Layered before
     * the caller's style, so a value column that wants its amounts at the
     * trailing edge still says `textAlign: "right"` and still wins.
     */
    textAlign: LEADING_TEXT_ALIGN,
  },
  monoRegular: { fontFamily: fonts.mono },
  monoMedium: { fontFamily: fonts.monoMedium },
});

/**
 * Text for money amounts: tabular figures so stacked amounts align on the
 * decimal point, and a Dynamic Type cap so amounts — which can't ellipsize
 * without lying — never scale out of their row. Size, weight, and color come
 * from the caller's style.
 *
 * Remounts on a live text-size change: iOS keeps a Text's native measurement
 * while its props are unchanged, so an amount first measured at a smaller size
 * would clip its lower edge after the change (mobile/AGENTS.md, w22/018). Keyed
 * here once so no caller has to.
 */
export function AmountText({ mono, style, ...rest }: AmountTextProps) {
  const { fontScale } = useWindowDimensions();
  return (
    <Text
      key={fontScale}
      maxFontSizeMultiplier={amountMaxFontSizeMultiplier}
      {...rest}
      style={[
        styles.amount,
        mono && (mono === "medium" ? styles.monoMedium : styles.monoRegular),
        style,
      ]}
    />
  );
}
