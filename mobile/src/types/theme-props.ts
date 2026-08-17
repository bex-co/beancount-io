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
  /**
   * The control triple. Every interactive surface — search fields, chips,
   * cards, drawers, menu buttons, pickers — fills with `controlFill` and draws
   * its boundary in `controlBorder`; hint text inside one uses
   * `controlPlaceholder`. See `palette.ts` for why these are separate tokens
   * rather than steps of the neutral ramp, and for the measured ratios.
   */
  controlFill: string;
  controlBorder: string;
  controlPlaceholder: string;
  /** Fill marking a selected or pressed row inside a control. */
  controlSelected: string;
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
