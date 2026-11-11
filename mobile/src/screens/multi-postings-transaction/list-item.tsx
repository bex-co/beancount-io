import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { fontSizes, fontWeights, useTheme } from "@/common/theme";
import { Ionicons } from "@expo/vector-icons";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import {
  directionalIcon,
  LEADING_TEXT_ALIGN,
  letterSpacing,
} from "@/common/rtl";

type ListItemProps = {
  onPress?: () => void;
  title?: string;
  content?: string;
  showDivider?: boolean;
};

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.white,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.black10,
    },
    textWrap: {
      flex: 1,
    },
    title: {
      fontSize: fontSizes.xs,
      lineHeight: 16,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacing(0.8),
      color: theme.black80,
      marginBottom: 2,
      textAlign: LEADING_TEXT_ALIGN,
    },
    content: {
      fontSize: fontSizes.lg,
      lineHeight: 20,
      fontWeight: fontWeights.medium,
      color: theme.text01,
      textAlign: LEADING_TEXT_ALIGN,
    },
    placeholder: {
      color: theme.black60,
      fontWeight: fontWeights.regular,
    },
    // Tile margins fill the same 16px/20px line boxes as title/content, so
    // skeleton and loaded rows are pixel-identical in height.
    titleTile: {
      height: 10,
      width: 48,
      borderRadius: 5,
      marginTop: 3,
      marginBottom: 3,
    },
    contentTile: {
      height: 14,
      width: 200,
      borderRadius: 7,
      marginTop: 5,
      marginBottom: 3,
    },
  });

export const ListItem = ({
  onPress,
  title,
  content,
  showDivider,
}: ListItemProps) => {
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  // Keys re-measure the Texts after a live text-size change (w22/024).
  const { fontScale } = useWindowDimensions();
  return (
    <TouchableOpacity
      style={[styles.container, showDivider && styles.divider]}
      activeOpacity={0.6}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        title ? `${title}${content ? `, ${content}` : ""}` : content
      }
    >
      <View style={styles.textWrap}>
        {title && (
          // A caption is a label: one line that shrinks to fit before it breaks.
          // German "ZAHLUNGSEMPFÄNGER" is one 17-letter word, and at AX2 iOS
          // broke it by character, leaving a lone "R" (w22/033).
          <Text
            key={`title-${fontScale}`}
            style={styles.title}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {title}
          </Text>
        )}
        <Text
          key={`content-${fontScale}`}
          style={[styles.content, !content && styles.placeholder]}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {content || "—"}
        </Text>
      </View>
      <Ionicons
        name={directionalIcon("chevron-forward")}
        size={18}
        color={theme.black60}
      />
    </TouchableOpacity>
  );
};
