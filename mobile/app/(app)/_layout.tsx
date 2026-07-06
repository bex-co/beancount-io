import { Redirect, Stack, router } from "expo-router";
import { useReactiveVar } from "@apollo/client";
import { sessionVar } from "@/common/vars";
import { useCallback } from "react";

import { HeaderBackButton } from "expo-router/react-navigation";
import { useTheme } from "@/common/theme";

export const DefaultHeaderLeftBack = () => {
  const theme = useTheme().colorTheme;
  const handlePress = useCallback(() => {
    router.back();
  }, []);
  return <HeaderBackButton onPress={handlePress} tintColor={theme.black} />;
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
    </Stack>
  );
}
