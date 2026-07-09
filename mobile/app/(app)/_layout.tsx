import { Redirect, Stack, router } from "expo-router";
import { useReactiveVar } from "@apollo/client";
import { sessionVar } from "@/common/vars";
import { useCallback } from "react";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/common/theme";

export const DefaultHeaderLeftBack = () => {
  const theme = useTheme().colorTheme;
  const handlePress = useCallback(() => {
    router.back();
  }, []);
  return (
    <Pressable
      onPress={handlePress}
      style={{ paddingHorizontal: 8, paddingVertical: 4 }}
      hitSlop={8}
    >
      <Ionicons name="chevron-back" size={28} color={theme.black} />
    </Pressable>
  );
};

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
    </Stack>
  );
}
