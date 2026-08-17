import { useEffect, useState } from "react";
import { Appearance } from "react-native";
import {
  themes,
  ThemeProvider as CallStackThemeProvider,
  getSystemColorScheme,
  effectiveThemeName,
} from "@/common/theme";
import { themeVar } from "@/common/vars";
import { useReactiveVar } from "@apollo/client";

export const ThemeProvider = ({
  children,
}: {
  children: JSX.Element | JSX.Element[];
}) => {
  const currentThemeSetting = useReactiveVar(themeVar);
  const [systemColorScheme, setSystemColorScheme] = useState(
    getSystemColorScheme(),
  );

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme === "dark" ? "dark" : "light");
    });

    return () => subscription?.remove();
  }, []);

  const effectiveTheme = effectiveThemeName(
    currentThemeSetting,
    systemColorScheme,
  );

  return (
    <CallStackThemeProvider theme={themes[effectiveTheme]}>
      {children}
    </CallStackThemeProvider>
  );
};
