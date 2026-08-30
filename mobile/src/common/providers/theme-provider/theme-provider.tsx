import { useEffect, useState } from "react";
import { Appearance } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "expo-router";
import {
  themes,
  ThemeProvider as CallStackThemeProvider,
  getSystemColorScheme,
  effectiveThemeName,
  nativeColorSchemeForTheme,
} from "@/common/theme";
import { themeVar } from "@/common/vars";
import { useReactiveVar } from "@apollo/client";

export const ThemeProvider = ({
  children,
}: {
  children: JSX.Element | JSX.Element[];
}) => {
  const currentThemeSetting = useReactiveVar(themeVar);
  const nativeColorScheme = nativeColorSchemeForTheme(currentThemeSetting);
  const [systemColorScheme, setSystemColorScheme] = useState(
    getSystemColorScheme(),
  );

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme === "dark" ? "dark" : "light");
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    // The custom palette alone cannot theme UIKit. In particular, native tabs
    // re-resolve their appearance during selection and otherwise fall back to
    // the device scheme (often light) after a tab press.
    Appearance.setColorScheme(nativeColorScheme);
  }, [nativeColorScheme]);

  const effectiveTheme = effectiveThemeName(
    currentThemeSetting,
    systemColorScheme,
  );

  return (
    <NavigationThemeProvider
      value={effectiveTheme === "dark" ? DarkTheme : DefaultTheme}
    >
      <CallStackThemeProvider theme={themes[effectiveTheme]}>
        {children}
      </CallStackThemeProvider>
    </NavigationThemeProvider>
  );
};
