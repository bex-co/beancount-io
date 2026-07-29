import { describe, it, expect, vi, afterEach } from "vitest";
import {
  opacity,
  getShadcnThemeTokens,
  getPrimaryColor,
  getChartColors,
  getLossColor,
  resetTokenCache,
  hclColorRange,
  getTreeMapColors,
} from "../color";

describe("Color Utils", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    // Reset token cache after any tests that may have modified globals
    resetTokenCache();
  });

  describe("opacity", () => {
    it("should apply opacity to a hex color", () => {
      const result = opacity("#ff0000", 0.5);
      expect(result).toMatch(/^rgba?\(/);
      expect(result).toContain("255");
      expect(result).toContain("0");
      expect(result).toContain("0.5");
    });

    it("should apply opacity to an rgb color", () => {
      const result = opacity("rgb(255, 0, 0)", 0.5);
      expect(result).toMatch(/^rgba?\(/);
      expect(result).toContain("0.5");
    });

    it("should apply opacity to an hsl color", () => {
      const result = opacity("hsl(0, 100%, 50%)", 0.5);
      expect(result).toMatch(/^rgba?\(/);
      expect(result).toContain("0.5");
    });

    it("should apply opacity to an oklch color", () => {
      const result = opacity("oklch(0.541 0.281 293.009)", 0.5);
      expect(result).toMatch(/^rgba?\(/);
      expect(result).toContain("0.5");
    });

    it("should clamp opacity to 0 if less than 0", () => {
      const result = opacity("#ff0000", -0.5);
      expect(result).toMatch(/^rgba?\(/);
      expect(result).toContain("0)"); // alpha should be 0
    });

    it("should clamp opacity to 1 if greater than 1", () => {
      const result = opacity("#ff0000", 1.5);
      expect(result).toMatch(/^rgba?\(/);
      // When alpha is 1, culori may omit it and return rgb instead of rgba
      expect(result).toContain("255");
    });

    it("should handle opacity value of 0", () => {
      const result = opacity("#ff0000", 0);
      expect(result).toMatch(/^rgba?\(/);
      expect(result).toContain("0)");
    });

    it("should handle opacity value of 1", () => {
      const result = opacity("#ff0000", 1);
      expect(result).toMatch(/^rgba?\(/);
      expect(result).toContain("255");
    });

    it("should return original color for invalid color string", () => {
      const invalidColor = "not-a-color";
      const result = opacity(invalidColor, 0.5);
      expect(result).toBe(invalidColor);
    });

    it("should handle empty color string", () => {
      const result = opacity("", 0.5);
      expect(result).toBe("");
    });
  });

  describe("getShadcnThemeTokens", () => {
    it("should return default tokens in non-browser environment", () => {
      // Use vi.stubGlobal to simulate non-browser environment
      // This makes typeof document === "undefined" return true
      vi.stubGlobal("document", undefined);
      vi.stubGlobal("window", undefined);
      resetTokenCache();

      try {
        const tokens = getShadcnThemeTokens();

        expect(tokens).toHaveProperty("primary");
        expect(tokens.primary).toBe("#000000");
        expect(tokens).toHaveProperty("primaryForeground");
        expect(tokens).toHaveProperty("secondary");
      } finally {
        // Restore globals (afterEach will also call vi.unstubAllGlobals())
        vi.unstubAllGlobals();
        resetTokenCache();
      }
    });

    it("should cache tokens across multiple calls", () => {
      // Test caching behavior in default environment
      resetTokenCache();

      const tokens1 = getShadcnThemeTokens();
      const tokens2 = getShadcnThemeTokens();

      expect(tokens1).toBe(tokens2); // Should be the same object due to caching
    });

    it("should reset cache when resetTokenCache is called", () => {
      resetTokenCache();
      const tokens1 = getShadcnThemeTokens();

      resetTokenCache();
      const tokens2 = getShadcnThemeTokens();

      // After reset, we get a new object (though with same values)
      expect(tokens1).not.toBe(tokens2);
      expect(tokens1.primary).toBe(tokens2.primary); // But same values
    });
  });

  describe("getPrimaryColor", () => {
    it("should return primary color from tokens", () => {
      const color = getPrimaryColor();
      expect(color).toBeDefined();
      expect(typeof color).toBe("string");
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe("getChartColors", () => {
    it("should return an array of color strings", () => {
      const colors = getChartColors();
      expect(Array.isArray(colors)).toBe(true);
      expect(colors.length).toBeGreaterThan(0);
    });

    it("should include primary color as first element", () => {
      const colors = getChartColors();
      const primaryColor = getPrimaryColor();
      expect(colors[0]).toBe(primaryColor);
    });

    it("should fall back to the brand palette when the CSS tokens are unavailable", () => {
      // jsdom loads no stylesheet, so --chart-N resolve to "" and the
      // hardcoded light-theme brand values stand in.
      const colors = getChartColors();
      expect(colors).toContain("#008455"); // sea green
      expect(colors).toContain("#a46e00"); // gold
      expect(colors).toContain("#ad36a7"); // magenta
      expect(colors).toContain("#c25500"); // orange
      expect(colors).toContain("#007f7f"); // teal
      expect(colors).toContain("#426ec2"); // blue
      expect(colors).toContain("#d40924"); // red
      expect(colors).toContain("#b14f69"); // rose
    });

    it("should resolve colors from the --chart-N tokens when they are set", () => {
      const root = document.documentElement;
      root.style.setProperty("--chart-1", "oklch(0.52 0.17 138)");
      root.style.setProperty("--chart-2", "oklch(0.53 0.14 164)");

      try {
        const colors = getChartColors();
        expect(colors[0]).toBe("#2b7e00"); // brand green (light)
        expect(colors[1]).toBe("#008455"); // sea green
      } finally {
        root.style.removeProperty("--chart-1");
        root.style.removeProperty("--chart-2");
      }
    });

    it("should render the brand token as exactly #5FC535 in dark mode", () => {
      // The dark --primary/--chart-1 must round-trip to the literal brand hex.
      const root = document.documentElement;
      root.style.setProperty("--chart-1", "oklch(0.7344 0.2016 138.3122)");

      try {
        expect(getChartColors()[0]).toBe("#5fc535");
      } finally {
        root.style.removeProperty("--chart-1");
      }
    });

    it("should return exactly 9 colors", () => {
      const colors = getChartColors();
      expect(colors.length).toBe(9);
    });

    it("should return all hex color strings", () => {
      const colors = getChartColors();
      colors.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe("getLossColor", () => {
    it("should return a hex color", () => {
      expect(getLossColor()).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("should match the palette's red so callers can filter it out", () => {
      // DistributionBar reserves this color for negative bars and removes it
      // from the series palette; that only works if the two agree.
      expect(getChartColors()).toContain(getLossColor());
    });

    it("should resolve from the --loss token when it is set", () => {
      const root = document.documentElement;
      root.style.setProperty("--loss", "oklch(0.65 0.22 25)");

      try {
        expect(getLossColor()).toBe("#f94144"); // dark-theme loss red
      } finally {
        root.style.removeProperty("--loss");
      }
    });
  });

  describe("hclColorRange", () => {
    it("should generate correct number of colors", () => {
      const colors = hclColorRange(5);
      expect(colors).toHaveLength(5);
    });

    it("should generate single color", () => {
      const colors = hclColorRange(1);
      expect(colors).toHaveLength(1);
      expect(colors[0]).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("should generate many colors", () => {
      const colors = hclColorRange(20);
      expect(colors).toHaveLength(20);
    });

    it("should return all hex color strings", () => {
      const colors = hclColorRange(10);
      colors.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it("should use default chroma and luminance when not provided", () => {
      const colors = hclColorRange(3);
      expect(colors).toHaveLength(3);
      expect(colors[0]).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("should accept custom chroma value", () => {
      const colors = hclColorRange(3, 50);
      expect(colors).toHaveLength(3);
      expect(colors[0]).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("should accept custom luminance value", () => {
      const colors = hclColorRange(3, 30, 60);
      expect(colors).toHaveLength(3);
      expect(colors[0]).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it("should generate different colors with different chroma", () => {
      const colors1 = hclColorRange(3, 30, 80);
      const colors2 = hclColorRange(3, 50, 80);
      // At least some colors should be different
      const allSame = colors1.every((color, i) => color === colors2[i]);
      expect(allSame).toBe(false);
    });

    it("should generate evenly distributed hues", () => {
      const colors = hclColorRange(4, 30, 80);
      expect(colors).toHaveLength(4);
      // All colors should be different
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(4);
    });
  });

  describe("getTreeMapColors", () => {
    it("should return exactly 15 colors", () => {
      const colors = getTreeMapColors();
      expect(colors).toHaveLength(15);
    });

    it("should return all hex color strings", () => {
      const colors = getTreeMapColors();
      colors.forEach((color) => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it("should return all unique colors", () => {
      const colors = getTreeMapColors();
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(15);
    });

    it("should return consistent colors across calls", () => {
      const colors1 = getTreeMapColors();
      const colors2 = getTreeMapColors();
      expect(colors1).toEqual(colors2);
    });
  });
});
