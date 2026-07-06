import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { contentPadding } from "@/common/screen-util";
import { useTheme } from "@/common/theme";
import { CommonMargin } from "@/common/common-margin";
import { ColorTheme } from "@/types/theme-props";

type ContactRowProps = {
  name: string;
  emailOrNumber: string;
  onPress: () => void;
  selected: boolean;
};

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    rowContainer: {
      paddingHorizontal: contentPadding,
      paddingVertical: contentPadding * 0.5,
      flexDirection: "row",
      alignItems: "center",
    },
    name: { color: theme.text01, fontSize: 16, fontWeight: "500" },
    emailOrNum: { marginTop: 4, color: theme.black80, fontSize: 14 },
  });

export function ContactRow({
  onPress,
  name,
  emailOrNumber,
  selected,
}: ContactRowProps): JSX.Element {
  const theme = useTheme().colorTheme;
  const styles = getStyles(theme);
  const iconName = selected
    ? ("radio-button-checked" as const)
    : ("radio-button-unchecked" as const);
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
      <View style={styles.rowContainer}>
        <MaterialIcons name={iconName} size={24} color={theme.primary} />
        <CommonMargin />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{name || emailOrNumber}</Text>
          {name.length > 0 && (
            <Text style={styles.emailOrNum}> {emailOrNumber} </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
