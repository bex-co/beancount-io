import { formatHex, formatRgb, parse } from "culori";

// convert oklch(0.52 0.17 138) string to hex string hex #2b7e00
const convertOklchToHex = (oklch: string): string => {
  // Parse OKLCH string using culori
  const color = parse(oklch);

  // If parsing fails, return default black color
  if (!color) return "#000000";

  // Convert to hex using culori's formatHex
  const hex = formatHex(color);

  return hex || "#000000";
};

/**
 * Apply opacity to a color
 * @param color - Color string in any format (hex, rgb, hsl, oklch, etc.)
 * @param opacity - Opacity value between 0 and 1
 * @returns RGBA color string with the specified opacity
 */
export const opacity = (color: string, opacity: number): string => {
  // Validate opacity is between 0 and 1
  const validOpacity = Math.max(0, Math.min(1, opacity));

  // Parse the color string
  const parsed = parse(color);

  // If parsing fails, return original color
  if (!parsed) return color;

  // Create new color object with alpha channel
  const colorWithAlpha = { ...parsed, alpha: validOpacity };

  // Format as rgba string
  return formatRgb(colorWithAlpha) || color;
};

/**
 * Theme tokens interface
 */
interface ShadcnThemeTokens {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  border: string;
  input: string;
  ring: string;
  radius: string;
}

// Get all theme tokens
function getShadcnTokens(): ShadcnThemeTokens {
  // Check if we're in a browser environment
  if (typeof document === "undefined" || typeof window === "undefined") {
    // Return default tokens for SSR/test environments
    return {
      primary: "#000000",
      primaryForeground: "",
      secondary: "",
      secondaryForeground: "",
      muted: "",
      mutedForeground: "",
      accent: "",
      accentForeground: "",
      destructive: "",
      destructiveForeground: "",
      background: "",
      foreground: "",
      card: "",
      cardForeground: "",
      popover: "",
      popoverForeground: "",
      border: "",
      input: "",
      ring: "",
      radius: "",
    };
  }

  const root = document.documentElement;
  const styles = getComputedStyle(root);

  const tokens: ShadcnThemeTokens = {
    primary: convertOklchToHex(styles.getPropertyValue("--primary").trim()),
    primaryForeground: convertOklchToHex(
      styles.getPropertyValue("--primary-foreground").trim(),
    ),
    secondary: convertOklchToHex(styles.getPropertyValue("--secondary").trim()),
    secondaryForeground: convertOklchToHex(
      styles.getPropertyValue("--secondary-foreground").trim(),
    ),
    muted: convertOklchToHex(styles.getPropertyValue("--muted").trim()),
    mutedForeground: convertOklchToHex(
      styles.getPropertyValue("--muted-foreground").trim(),
    ),
    accent: convertOklchToHex(styles.getPropertyValue("--accent").trim()),
    accentForeground: convertOklchToHex(
      styles.getPropertyValue("--accent-foreground").trim(),
    ),
    destructive: convertOklchToHex(
      styles.getPropertyValue("--destructive").trim(),
    ),
    destructiveForeground: convertOklchToHex(
      styles.getPropertyValue("--destructive-foreground").trim(),
    ),
    background: convertOklchToHex(
      styles.getPropertyValue("--background").trim(),
    ),
    foreground: convertOklchToHex(
      styles.getPropertyValue("--foreground").trim(),
    ),
    card: convertOklchToHex(styles.getPropertyValue("--card").trim()),
    cardForeground: convertOklchToHex(
      styles.getPropertyValue("--card-foreground").trim(),
    ),
    popover: convertOklchToHex(styles.getPropertyValue("--popover").trim()),
    popoverForeground: convertOklchToHex(
      styles.getPropertyValue("--popover-foreground").trim(),
    ),
    border: convertOklchToHex(styles.getPropertyValue("--border").trim()),
    input: convertOklchToHex(styles.getPropertyValue("--input").trim()),
    ring: convertOklchToHex(styles.getPropertyValue("--ring").trim()),
    radius: styles.getPropertyValue("--radius").trim(),
  };

  return tokens;
}

let cachedTokens: ShadcnThemeTokens | null = null;

/**
 * Reset cached tokens (for testing purposes)
 * @internal
 */
export const resetTokenCache = (): void => {
  cachedTokens = null;
};

/**
 * Get Shadcn theme tokens with lazy initialization
 * @returns Theme tokens object
 */
export const getShadcnThemeTokens = (): ShadcnThemeTokens => {
  if (!cachedTokens) {
    cachedTokens = getShadcnTokens();
  }
  return cachedTokens;
};

/**
 * Get primary color from theme tokens
 * @returns Primary color as hex string
 */
export const getPrimaryColor = (): string => {
  return getShadcnThemeTokens().primary;
};

/**
 * Number of chart series colors defined as --chart-N in style.css
 */
const CHART_SERIES_COUNT = 9;

/**
 * Light-theme values of --chart-1..9, used when the CSS variables cannot be
 * read (SSR and unit tests). --chart-1 is the brand primary, so it falls back
 * to getPrimaryColor() rather than a literal.
 */
const CHART_COLOR_FALLBACK: (string | null)[] = [
  null, // --chart-1: brand primary, resolved via getPrimaryColor()
  "#008455", // --chart-2: sea green
  "#a46e00", // --chart-3: gold
  "#ad36a7", // --chart-4: magenta
  "#c25500", // --chart-5: orange
  "#007f7f", // --chart-6: teal
  "#426ec2", // --chart-7: blue
  "#d40924", // --chart-8: red
  "#b14f69", // --chart-9: rose
];

/**
 * Read a CSS custom property off :root and convert it to hex
 * @param name - Custom property name, e.g. "--chart-2"
 * @returns Hex color string, or null when unavailable (SSR) or unparseable
 */
function readCssColor(name: string): string | null {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return null;
  }

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

  if (!value) return null;

  const parsed = parse(value);
  if (!parsed) return null;

  return formatHex(parsed) || null;
}

/**
 * Convert HCL color to hex string
 * HCL (Hue-Chroma-Luminance) color space provides perceptually uniform colors
 * @param hue - Hue value (0-360 degrees)
 * @param chroma - Chroma value (color intensity)
 * @param luminance - Luminance value (brightness)
 * @returns Hex color string
 */
function hclToHex(hue: number, chroma: number, luminance: number): string {
  // Convert HCL to RGB using D3-like algorithm
  const h = hue * (Math.PI / 180);
  const a = chroma * Math.cos(h);
  const b = chroma * Math.sin(h);

  // Convert Lab to XYZ
  const l = (luminance + 16) / 116;
  const y = l * l * l;
  const x = (a / 500 + l) * (a / 500 + l) * (a / 500 + l);
  const z = (l - b / 200) * (l - b / 200) * (l - b / 200);

  // Convert XYZ to RGB (D65 illuminant)
  let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
  let g = x * -0.969266 + y * 1.8760108 + z * 0.041556;
  let bVal = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

  // Apply gamma correction
  r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
  g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
  bVal =
    bVal > 0.0031308 ? 1.055 * Math.pow(bVal, 1 / 2.4) - 0.055 : 12.92 * bVal;

  // Clamp and convert to 0-255
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(1, n));
    const val = Math.round(clamped * 255);
    return val.toString(16).padStart(2, "0");
  };

  return `#${toHex(r)}${toHex(g)}${toHex(bVal)}`;
}

/**
 * Generate an array of HCL colors
 * Uses the HCL color space to generate colors that are perceived to be of equal brightness
 * Matches the color generation strategy used in Fava
 * @param count - Number of colors to generate
 * @param chroma - Chroma channel value (color intensity, default: 30)
 * @param luminance - Luminance channel value (brightness, default: 80)
 * @returns Array of hex color strings
 */
export function hclColorRange(
  count: number,
  chroma = 30,
  luminance = 80,
): string[] {
  const offset = 130; // Starting hue — the brand olive, so the ramp opens on-brand
  const delta = 360 / count; // Hue step

  return Array.from({ length: count }, (_, index) => {
    const hue = (index * delta + offset) % 360;
    return hclToHex(hue, chroma, luminance);
  });
}

/**
 * Get 15 HCL colors for treemap visualizations
 * Follows Fava's generation strategy, rotated to start at the brand hue
 * @returns Array of 15 hex color strings
 */
export const getTreeMapColors = (): string[] => {
  return hclColorRange(15, 30, 80);
};

/**
 * Get the color for negative amounts, resolved from the --loss design token.
 *
 * This is the same red as --chart-8, so callers that reserve it for negative
 * values can filter it out of getChartColors() to keep the two distinguishable.
 * @returns Hex color string
 */
export const getLossColor = (): string => {
  return readCssColor("--loss") ?? "#d40924";
};

/**
 * Get the chart series colors, resolved from the --chart-N design tokens so
 * charts track the brand palette and the active light/dark theme.
 *
 * Read fresh on every call (not cached like getShadcnThemeTokens) so a theme
 * switch is reflected the next time a chart builds its options.
 * @returns Array of hex color strings for charts, starting with the primary
 */
export const getChartColors = (): string[] => {
  return Array.from(
    { length: CHART_SERIES_COUNT },
    (_, index) =>
      readCssColor(`--chart-${index + 1}`) ??
      CHART_COLOR_FALLBACK[index] ??
      getPrimaryColor(),
  );
};
