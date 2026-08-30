/**
 * Email-safe sRGB equivalents of the visual roles in dashboard/src/style.css.
 * Inline light values are the compatibility baseline; embedded CSS progressively
 * applies the dark values in clients that support prefers-color-scheme.
 */
export const EMAIL_THEME = {
  light: {
    canvas: "#f8f8f6",
    card: "#ffffff",
    foreground: "#292d28",
    muted: "#f6f6f3",
    mutedForeground: "#60665d",
    border: "#e4e4e1",
    primary: "#2b7e00",
    primaryForeground: "#ffffff",
    accent: "#f1f3ed",
    accentForeground: "#333a32",
    focus: "#2b7e00",
  },
  dark: {
    canvas: "#171b17",
    card: "#202520",
    foreground: "#ecece8",
    muted: "#323732",
    mutedForeground: "#a9ada2",
    border: "#3b423b",
    primary: "#5fc535",
    primaryForeground: "#1b3017",
    accent: "#333b33",
    accentForeground: "#e3e5df",
    focus: "#5fc535",
  },
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  maxWidth: "600px",
  radius: "10px",
} as const;

const light = EMAIL_THEME.light;

/** Shared inline light-mode styles used by components and templates. */
export const EMAIL_STYLES = {
  heading: `margin: 0 0 16px; color: ${light.foreground}; font-size: 24px; line-height: 1.3; font-weight: 700; letter-spacing: -0.3px;`,
  paragraph: `margin: 0 0 16px; color: ${light.foreground}; font-size: 16px; line-height: 1.65;`,
  mutedText: `color: ${light.mutedForeground}; font-size: 14px; line-height: 1.6;`,
  link: `color: ${light.primary}; text-decoration: underline; font-weight: 600;`,
  actionRow: "width: 100%; border-collapse: collapse; margin: 28px 0;",
  primaryAction: `display: inline-block; box-sizing: border-box; background-color: ${light.primary}; color: ${light.primaryForeground}; text-decoration: none; font-weight: 700; font-size: 16px; line-height: 1.2; padding: 14px 28px; border: 1px solid ${light.primary}; border-radius: 8px;`,
  callout: `background-color: ${light.accent}; border: 1px solid ${light.border}; border-radius: 8px; padding: 18px; margin: 22px 0;`,
  calloutTitle: `margin: 0 0 8px; color: ${light.accentForeground}; font-size: 14px; line-height: 1.5; font-weight: 700;`,
  secondaryLinks: `width: 100%; border-collapse: collapse; background-color: ${light.muted}; border: 1px solid ${light.border}; border-radius: 8px;`,
  codeBox: `background-color: ${light.accent}; border: 2px solid ${light.primary}; border-radius: 8px; padding: 20px 16px;`,
  codeLabel: `margin: 0 0 8px; color: ${light.mutedForeground}; font-size: 13px; line-height: 1.4; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;`,
  codeValue: `margin: 0; color: ${light.foreground}; font-size: 32px; line-height: 1.2; font-weight: 700; letter-spacing: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; white-space: nowrap;`,
  breakableUrl: `margin: 0 0 16px; color: ${light.mutedForeground}; font-size: 13px; line-height: 1.5; word-break: break-all; overflow-wrap: anywhere;`,
} as const;

/** Embedded enhancements. Clients that strip this block retain all inline light styles. */
function buildEmailThemeCss(): string {
  const dark = EMAIL_THEME.dark;

  return `
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    .email-action:focus, .email-link:focus { outline: 2px solid ${light.focus}; outline-offset: 2px; }
    @media only screen and (max-width: 600px) {
      .email-canvas-cell { padding: 12px 8px !important; }
      .email-header { padding: 24px 20px !important; }
      .email-content { padding: 28px 20px !important; }
      .email-footer { padding: 20px !important; }
      .email-heading { font-size: 22px !important; }
      .email-action { display: block !important; width: 100% !important; }
      .email-code-value { font-size: 28px !important; letter-spacing: 4px !important; }
      .email-breakable { word-break: break-all !important; overflow-wrap: anywhere !important; }
    }
    @media (prefers-color-scheme: dark) {
      .email-body, .email-canvas { background-color: ${dark.canvas} !important; }
      .email-card, .email-header, .email-content { background-color: ${dark.card} !important; border-color: ${dark.border} !important; }
      .email-brand, .email-heading, .email-body-copy, .email-code-value { color: ${dark.foreground} !important; }
      .email-muted, .email-code-label, .email-breakable { color: ${dark.mutedForeground} !important; }
      .email-link { color: ${dark.primary} !important; }
      .email-brand-mark { background-color: ${dark.primary} !important; }
      .email-action:focus, .email-link:focus { outline-color: ${dark.focus} !important; }
      .email-action { background-color: ${dark.primary} !important; border-color: ${dark.primary} !important; color: ${dark.primaryForeground} !important; }
      .email-callout, .email-code-box { background-color: ${dark.accent} !important; border-color: ${dark.border} !important; }
      .email-code-box { border-color: ${dark.primary} !important; }
      .email-callout-title { color: ${dark.accentForeground} !important; }
      .email-secondary-links, .email-footer { background-color: ${dark.muted} !important; border-color: ${dark.border} !important; }
      .email-divider { border-color: ${dark.border} !important; }
    }
    [data-ogsc] .email-body, [data-ogsc] .email-canvas { background-color: ${dark.canvas} !important; }
    [data-ogsc] .email-card, [data-ogsc] .email-header, [data-ogsc] .email-content { background-color: ${dark.card} !important; border-color: ${dark.border} !important; }
    [data-ogsc] .email-brand, [data-ogsc] .email-heading, [data-ogsc] .email-body-copy, [data-ogsc] .email-code-value { color: ${dark.foreground} !important; }
    [data-ogsc] .email-muted, [data-ogsc] .email-code-label, [data-ogsc] .email-breakable { color: ${dark.mutedForeground} !important; }
    [data-ogsc] .email-link { color: ${dark.primary} !important; }
    [data-ogsc] .email-brand-mark { background-color: ${dark.primary} !important; }
    [data-ogsc] .email-action { background-color: ${dark.primary} !important; border-color: ${dark.primary} !important; color: ${dark.primaryForeground} !important; }
    [data-ogsc] .email-callout, [data-ogsc] .email-code-box { background-color: ${dark.accent} !important; border-color: ${dark.border} !important; }
    [data-ogsc] .email-code-box { border-color: ${dark.primary} !important; }
    [data-ogsc] .email-callout-title { color: ${dark.accentForeground} !important; }
    [data-ogsc] .email-secondary-links, [data-ogsc] .email-footer { background-color: ${dark.muted} !important; border-color: ${dark.border} !important; }
    [data-ogsc] .email-divider { border-color: ${dark.border} !important; }
  `.trim();
}

export const EMAIL_THEME_CSS = buildEmailThemeCss();
