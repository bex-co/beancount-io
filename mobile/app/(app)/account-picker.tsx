import { AccountPickerScreen } from "@/screens/account-picker-screen/account-picker-screen";
import { Stack } from "expo-router";
import { i18n } from "@/translations";
import { useTheme } from "@/common/theme";

export default function AccountPicker() {
  const theme = useTheme().colorTheme;

  return (
    <>
      <Stack.Screen
        options={{
          title: i18n.t("accountPicker"),
          contentStyle: {
            backgroundColor: theme.white,
          },
        }}
      />
      <AccountPickerScreen />
    </>
  );
}
