import { EMAIL_STYLES, EMAIL_THEME, EMAIL_THEME_CSS } from "../email-theme";

function relativeLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [
    relativeLuminance(first),
    relativeLuminance(second),
  ].sort((a, b) => b - a);

  return (lighter + 0.05) / (darker + 0.05);
}

describe("Email theme", () => {
  it.each(["light", "dark"] as const)(
    "defines every shared visual role for %s mode",
    (mode) => {
      expect(Object.keys(EMAIL_THEME[mode])).toEqual([
        "canvas",
        "card",
        "foreground",
        "muted",
        "mutedForeground",
        "border",
        "primary",
        "primaryForeground",
        "accent",
        "accentForeground",
        "focus",
      ]);
      Object.values(EMAIL_THEME[mode]).forEach((color) => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/);
      });
    },
  );

  it.each([
    [EMAIL_THEME.light.foreground, EMAIL_THEME.light.card],
    [EMAIL_THEME.light.mutedForeground, EMAIL_THEME.light.card],
    [EMAIL_THEME.light.mutedForeground, EMAIL_THEME.light.muted],
    [EMAIL_THEME.light.primaryForeground, EMAIL_THEME.light.primary],
    [EMAIL_THEME.light.primary, EMAIL_THEME.light.card],
    [EMAIL_THEME.light.accentForeground, EMAIL_THEME.light.accent],
    [EMAIL_THEME.dark.foreground, EMAIL_THEME.dark.card],
    [EMAIL_THEME.dark.mutedForeground, EMAIL_THEME.dark.card],
    [EMAIL_THEME.dark.mutedForeground, EMAIL_THEME.dark.muted],
    [EMAIL_THEME.dark.primaryForeground, EMAIL_THEME.dark.primary],
    [EMAIL_THEME.dark.primary, EMAIL_THEME.dark.card],
    [EMAIL_THEME.dark.accentForeground, EMAIL_THEME.dark.accent],
  ])(
    "keeps intended foreground/background pairs at WCAG AA",
    (text, surface) => {
      expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("uses the accessible light and literal dark dashboard brand greens", () => {
    expect(EMAIL_THEME.light.primary).toBe("#2b7e00");
    expect(EMAIL_THEME.dark.primary).toBe("#5fc535");
    expect(EMAIL_STYLES.primaryAction).toContain(EMAIL_THEME.light.primary);
    expect(EMAIL_STYLES.link).toContain(EMAIL_THEME.light.primary);
  });

  it("renders responsive, dark-mode, Outlook, and focus enhancements", () => {
    const css = EMAIL_THEME_CSS;
    expect(css).toContain("@media only screen and (max-width: 600px)");
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain("[data-ogsc]");
    expect(css).toContain(".email-action:focus");
    expect(css).toContain(EMAIL_THEME.dark.primary);
  });
});
