import { Redirect, Stack, router } from "expo-router";
import { useReactiveVar } from "@apollo/client";
import { sessionVar } from "@/common/vars";
import { ColorValue, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/common/theme";

// Hook-free so it can be used as a headerLeft render function without causing
// hook-count mismatches when screens override headerLeft with their own function.
// The tintColor comes from the Stack's headerTintColor screenOption.
export const DefaultHeaderLeftBack = ({ tintColor }: { tintColor?: ColorValue }) => (
  <Pressable
    onPress={router.back}
    style={{ paddingHorizontal: 8, paddingVertical: 4 }}
    hitSlop={8}
  >
    <Ionicons name="chevron-back" size={28} color={tintColor} />
  </Pressable>
);

export default function AppLayout() {
  const session = useReactiveVar(sessionVar);
  const theme = useTheme().colorTheme;
  if (!session) {
    return <Redirect href="/auth/welcome" />;
  }

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
        headerLeft: DefaultHeaderLeftBack,
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
      <Stack.Screen name="commit-detail" />
      <Stack.Screen name="ledger-file-editor" />
    </Stack>
  );
}
