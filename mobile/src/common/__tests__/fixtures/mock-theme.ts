/** Stand-in for `@/common/theme`: a settable current colour theme. */
let colorTheme: Record<string, string> = { white: "#ffffff" };

export function setColorTheme(next: Record<string, string>): void {
  colorTheme = next;
}

export function useTheme(): { colorTheme: Record<string, string> } {
  return { colorTheme };
}
