import { Text, View, StyleSheet } from "react-native";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    text: {
      fontSize: 28,
      color: theme.text01,
      fontWeight: "bold",
    },
    container: {
      height: 40,
      justifyContent: "center",
    },
  });

export function NetAssetsStyled({
  netAssets,
}: {
  netAssets: string;
}): JSX.Element {
  const styles = useThemeStyle(getStyles);
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{netAssets}</Text>
    </View>
  );
}
