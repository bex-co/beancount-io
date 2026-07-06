import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "@/common/theme";
import { Ionicons } from "@expo/vector-icons";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";

type ListItemProps = {
  onPress?: () => void;
  title: string;
  content?: string;
};

export const ListItem = ({ onPress, title, content }: ListItemProps) => {
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle((theme: ColorTheme) =>
    StyleSheet.create({
      container: {
        backgroundColor: theme.white,
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      },
      title: {
        fontSize: 14,
        color: theme.black80,
      },
      content: {
        fontSize: 20,
        color: theme.black,
      },
    }),
  );
  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.content}>{content}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={theme.black20} />
    </TouchableOpacity>
  );
};
