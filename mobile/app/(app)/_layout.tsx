import { Redirect, Stack, router } from "expo-router";
import { useReactiveVar } from "@apollo/client";
import { sessionVar } from "@/common/vars";
import { ColorValue } from "react-native";
import { useTheme } from "@/common/theme";
import { useTranslations } from "@/common/hooks/use-translations";
import { LedgerDirectoryProvider } from "@/common/ledger-directory/ledger-directory-provider";
import { StackBackButton } from "@/components/stack-back-button";

/** Cold deep links need a tabs anchor so Back has somewhere to land. */
export const unstable_settings = {
  anchor: "(tabs)",
};

export default function AppLayout() {
  const session = useReactiveVar(sessionVar);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  if (!session) {
    return <Redirect href="/auth/welcome" />;
  }

  // Closure-bound so the renderer itself stays hook-free.
  const backLabel = t("back");
  const onBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/(tabs)");
    }
  };
  const headerLeft = (props: { tintColor?: ColorValue }) => (
    <StackBackButton {...props} label={backLabel} onPress={onBack} />
  );

  return (
    <LedgerDirectoryProvider
      key={JSON.stringify([session.serverUrl, session.userId])}
    >
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
    </LedgerDirectoryProvider>
  );
}
