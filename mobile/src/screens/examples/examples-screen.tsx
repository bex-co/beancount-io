import { Redirect, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/common/theme";
import { useTranslations } from "@/common/hooks/use-translations";
import { StackBackButton } from "@/components/stack-back-button";
import { ExampleSelector } from "./example-selector";
import { useExamples } from "./examples-layout";
import { exampleRoutes } from "./example-routes";

export function ExamplesScreen() {
  const { visit, availability, refresh, select, exit } = useExamples();
  const { t } = useTranslations();
  const theme = useTheme().colorTheme;
  if (visit.ledgerId) return <Redirect href={exampleRoutes[visit.view]} />;
  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: theme.white }}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: t("guestChooseExample"),
          headerStyle: { backgroundColor: theme.white },
          headerTintColor: theme.text01,
          headerLeft: (props) => (
            <StackBackButton {...props} label={t("guestExit")} onPress={exit} />
          ),
        }}
      />
      <ExampleSelector
        availability={availability}
        onRetry={refresh}
        onSelect={select}
        serverUrl={visit.serverUrl}
      />
    </SafeAreaView>
  );
}
