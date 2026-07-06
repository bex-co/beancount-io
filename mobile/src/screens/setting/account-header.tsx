import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/common/theme";
import { ScreenWidth } from "@/common/screen-util";
import { useUserProfile } from "./hooks/use-user-profile";
import { LoadingTile } from "@/components/loading-tile";
import { ColorTheme } from "@/types/theme-props";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "@/common/hooks/use-session";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useToast } from "@/common/hooks";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    titleContainer: {
      paddingHorizontal: 14,
      paddingTop: 28,
      paddingBottom: 28,
      flexDirection: "row",
      backgroundColor: theme.primary,
    },
    nameText: {
      color: theme.white,
      fontWeight: "600",
      fontSize: 24,
    },
    loginSignUpText: {
      fontSize: 24,
      color: theme.white,
      fontWeight: "600",
    },
    closeButton: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.primary,
      position: "absolute",
      bottom: 10,
      right: 10,
    },
    closeText: {
      color: theme.white,
      fontSize: 24,
    },
  });

export const EmailHeader = ({ userId }: { userId: string }) => {
  const { email, loading, error } = useUserProfile(userId);
  const styles = useThemeStyle(getStyles);
  const toast = useToast();
  if (loading || error || !email) {
    if (error) {
      toast.showToast({
        message: `failed to fetch user: ${error}`,
        type: "error",
      });
    }
    return <LoadingTile style={{ height: 24, width: ScreenWidth - 14 * 2 }} />;
  }
  return (
    <View>
      <Text style={styles.nameText} numberOfLines={1}>
        {email}
      </Text>
    </View>
  );
};

export const AccountHeader = () => {
  const session = useSession();
  const theme = useTheme().colorTheme;
  const styles = getStyles(theme);
  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.titleContainer, { backgroundColor: theme.primary }]}
    >
      {session ? <EmailHeader userId={session.userId} /> : null}
    </SafeAreaView>
  );
};
