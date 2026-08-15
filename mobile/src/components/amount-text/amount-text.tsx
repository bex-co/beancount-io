import { StyleSheet, Text, TextProps } from "react-native";
import {
  amountMaxFontSizeMultiplier,
  amountStyle,
  fonts,
} from "@/common/theme";

type AmountTextProps = TextProps & {
  /**
   * Render in the ledger mono face; "medium" is the emphasized weight for
   * row-level amounts. Omit for standalone amounts (headlines, hero entry),
   * which stay in the system font.
   */
  mono?: "regular" | "medium";
};

const styles = StyleSheet.create({
  amount: amountStyle,
  monoRegular: { fontFamily: fonts.mono },
  monoMedium: { fontFamily: fonts.monoMedium },
});

/**
 * Text for money amounts: tabular figures so stacked amounts align on the
 * decimal point, and a Dynamic Type cap so amounts — which can't ellipsize
 * without lying — never scale out of their row. Size, weight, and color come
 * from the caller's style.
 */
export function AmountText({ mono, style, ...rest }: AmountTextProps) {
  return (
    <Text
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
