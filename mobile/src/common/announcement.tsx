import * as React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ColorTheme } from "@/types/theme-props";
import { contentPadding, ScreenWidth } from "@/common/screen-util";
import { useRouter } from "expo-router";
import { useThemeStyle } from "./hooks/use-theme-style";

type Props = {
  title: string;
  subtitle: string;
  icon: JSX.Element;
};

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      height: 120,
      backgroundColor: theme.white,
      paddingHorizontal: contentPadding,
      flexDirection: "row",
      borderRadius: 5,
      borderWidth: 1,
      borderColor: theme.black40,
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: contentPadding,
    },
    titleContainer: {
      width: (ScreenWidth - 2 * contentPadding) * 0.6,
    },
    iconContainer: {
      width: (ScreenWidth - 2 * contentPadding) * 0.3,
    },
    subtitle: {
      color: theme.black,
      fontSize: 14,
      marginBottom: 10,
    },
    title: {
      color: theme.black,
      fontSize: 20,
      fontWeight: "bold",
      lineHeight: 26,
    },
    closeButton: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.black60,
      position: "absolute",
      top: 10,
      alignItems: "center",
      justifyContent: "center",
      right: 10,
    },
    closeText: {
      color: theme.white,
      fontSize: 16,
      fontWeight: "bold",
    },
  });

export function Announcement(props: Props): JSX.Element {
  const [hide, setHide] = React.useState(true);

  React.useEffect(() => {
    async function init() {
      try {
        const value = await AsyncStorage.getItem("@HideAnnouncement:key");
        if (value !== null) {
          setHide(value === "true");
        } else {
          setHide(false);
        }
      } catch (error) {
        console.error(`failed to get hide announcement value: ${error}`);
      }
    }
    init();
  }, []);

  const router = useRouter();

  const { title, subtitle, icon } = props;

  const styles = useThemeStyle(getStyles);

  if (hide) {
    return <View />;
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => {
        router.push("/(app)/settings");
      }}
    >
      <View style={styles.titleContainer}>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text numberOfLines={3} style={styles.title}>
          {title}
        </Text>
      </View>

      <View>{icon}</View>
      <TouchableOpacity
        style={styles.closeButton}
        activeOpacity={0.9}
        onPress={async () => {
          setHide(true);
          try {
            await AsyncStorage.setItem("@HideAnnouncement:key", "true");
          } catch (error) {
            console.error(`failed to set hide announcement value: ${error}`);
          }
        }}
      >
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
