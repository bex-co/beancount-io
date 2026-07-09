import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/common/theme";
import { Ionicons } from "@expo/vector-icons";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { LoadingTile } from "@/components/loading-tile";

type ListItemProps = {
  onPress?: () => void;
  title: string;
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
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "600",
      letterSpacing: 0.8,
      color: theme.black80,
      marginBottom: 2,
    },
    content: {
      fontSize: 16,
      lineHeight: 20,
      fontWeight: "500",
      color: theme.text01,
    },
    placeholder: {
      color: theme.black60,
      fontWeight: "400",
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
  return (
    <TouchableOpacity
      style={[styles.container, showDivider && styles.divider]}
      activeOpacity={0.6}
      onPress={onPress}
    >
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text
          style={[styles.content, !content && styles.placeholder]}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {content || "—"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.black60} />
    </TouchableOpacity>
  );
};

export const ListItemSkeleton = ({
  showDivider,
}: {
  showDivider?: boolean;
}) => {
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  return (
    <View style={[styles.container, showDivider && styles.divider]}>
      <View style={styles.textWrap}>
        <LoadingTile style={styles.titleTile} />
        <LoadingTile style={styles.contentTile} />
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.black40} />
    </View>
  );
};
