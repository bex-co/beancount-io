import { MerchantsScreen } from "@/screens/merchants-screen";
import { Stack } from "expo-router";
import { i18n } from "@/translations";
import { useTheme } from "@/common/theme";

export default function Merchants() {
  const theme = useTheme().colorTheme;

  return (
    <>
      <Stack.Screen
        options={{
          title: i18n.t("merchants"),
          contentStyle: {
            backgroundColor: theme.white,
          },
        }}
      />
      <MerchantsScreen />
    </>
  );
}
