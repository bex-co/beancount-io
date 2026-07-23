export interface ThemeProps {
  name: string;
  colorTheme: ColorTheme;
}

export interface ColorTheme {
  overlay: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  white: string;
  black: string;
  black90: string;
  black80: string;
  black60: string;
  black40: string;
  black20: string;
  black10: string;
  text01: string;
  error: string;
  success: string;
  warning: string;
  information: string;
  nav01: string;
  nav02: string;
  tabIconDefault: string;
  tabIconSelected: string;
  activeTintColor: string;
  inactiveTintColor: string;
  activeBackgroundColor: string;
  inactiveBackgroundColor: string;
  navBg: string;
  navText: string;
}
