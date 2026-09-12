import { Redirect, Stack, router } from "expo-router";
import { useReactiveVar } from "@apollo/client";
import { sessionVar } from "@/common/vars";
import { ColorValue, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/common/theme";
import { useTranslations } from "@/common/hooks/use-translations";
import { directionalIcon } from "@/common/rtl";

// Hook-free so it can be used as a headerLeft render function without causing
// hook-count mismatches when screens override headerLeft with their own function.
// The tintColor comes from the Stack's headerTintColor screenOption; `label` is
// the spoken name, resolved by the layout because this renderer cannot call
// useTranslations without breaking the hook-free contract above.
export const DefaultHeaderLeftBack = ({
  tintColor,
  label,
}: {
  tintColor?: ColorValue;
  label?: string;
}) => (
  <Pressable
    onPress={router.back}
    style={{ paddingHorizontal: 8, paddingVertical: 4 }}
    hitSlop={8}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <Ionicons
      name={directionalIcon("chevron-back")}
      size={28}
      color={tintColor}
      // The glyph has no text of its own, but leaving it visible to assistive
      // tech lets the icon font's name leak in beside the label.
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  </Pressable>
);

export default function AppLayout() {
  const session = useReactiveVar(sessionVar);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  if (!session) {
    return <Redirect href="/auth/welcome" />;
  }

  // Closure-bound so the renderer itself stays hook-free.
  const backLabel = t("back");
  const headerLeft = (props: { tintColor?: ColorValue }) => (
    <DefaultHeaderLeftBack {...props} label={backLabel} />
  );

  return (
    <Stack
      initialRouteName="(tabs)"
      screenOptions={{
        headerTitleStyle: {
          fontWeight: "bold",
          color: theme.black,
        },
        headerStyle: {
          backgroundColor: theme.white,
        },
        headerTintColor: theme.black,
        headerLeft,
      }}
    >
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen name="settings" />
      <Stack.Screen name="notifications" />
      {/* The screen supplies its own title and New-chat action. */}
      <Stack.Screen name="agent" />
      {/* The screen supplies its own header actions (Cancel / Reset). */}
      <Stack.Screen
        name="transaction-filters"
        options={{ presentation: "modal" }}
      />
      <Stack.Screen name="ledger-selection" />
      <Stack.Screen name="create-ledger" />
      <Stack.Screen name="commit-detail" />
      <Stack.Screen name="ledger-file-editor" />
      {/* Full-bleed camera: it draws its own dark chrome over the viewfinder. */}
      <Stack.Screen
        name="receipt-capture"
        options={{ headerShown: false, presentation: "fullScreenModal" }}
      />
    </Stack>
  );
}
