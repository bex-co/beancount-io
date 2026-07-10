// Value imports must be relative: the jest-lite runner resolves "@/" only for
// type imports. typography.ts is deliberately react-native-free so it loads
// under plain Node.
import {
  JETBRAINS_MONO_MEDIUM,
  JETBRAINS_MONO_REGULAR,
  amountStyle,
  fontSizes,
  fontWeights,
  monoMinFontSize,
  resolveMonoFontFamily,
} from "../common/theme/typography";

describe("typography tokens", () => {
  describe("amountStyle", () => {
    it("carries tabular figures so stacked amounts align", () => {
      expect(amountStyle.fontVariant).toEqual(["tabular-nums"]);
    });

    it("stays a pure figure-spacing style (no size/weight/family baked in)", () => {
      expect(Object.keys(amountStyle)).toEqual(["fontVariant"]);
    });
  });

  describe("fontSizes scale", () => {
    it("exposes no step below the 11pt legibility floor", () => {
      for (const size of Object.values(fontSizes)) {
        expect(size >= 11).toBeTruthy();
      }
    });

    it("keeps the mono floor at 13 or above", () => {
      expect(monoMinFontSize >= 13).toBeTruthy();
      expect(fontSizes.sm >= monoMinFontSize).toBeTruthy();
    });

    it("is strictly ascending from xs to hero", () => {
      const steps = [
        fontSizes.xs,
        fontSizes.sm,
        fontSizes.md,
        fontSizes.lg,
        fontSizes.xl,
        fontSizes.xxl,
        fontSizes.display,
        fontSizes.heroSm,
        fontSizes.hero,
      ];
      for (let i = 1; i < steps.length; i += 1) {
        expect(steps[i] > steps[i - 1]).toBeTruthy();
      }
    });
  });

  describe("fontWeights", () => {
    it("exposes exactly regular and medium — no light or bold", () => {
      expect(Object.keys(fontWeights).sort()).toEqual(["medium", "regular"]);
    });

    it("maps regular/medium to their CSS numeric weights", () => {
      expect(fontWeights.regular).toBe("400");
      expect(fontWeights.medium).toBe("500");
    });
  });

  describe("resolveMonoFontFamily", () => {
    it("resolves the embedded JetBrains Mono family by default", () => {
      expect(resolveMonoFontFamily("ios")).toBe(JETBRAINS_MONO_REGULAR);
      expect(resolveMonoFontFamily("android")).toBe(JETBRAINS_MONO_REGULAR);
      expect(resolveMonoFontFamily("ios", { weight: "medium" })).toBe(
        JETBRAINS_MONO_MEDIUM,
      );
    });

    it("never falls back to 'monospace' on iOS — it is not a valid iOS font name", () => {
      const family = resolveMonoFontFamily("ios", { embedded: false });
      expect(family).toBe("Menlo");
      expect(family).not.toBe("monospace");
    });

    it("falls back to the Android generic mono when not embedded", () => {
      expect(resolveMonoFontFamily("android", { embedded: false })).toBe(
        "monospace",
      );
    });
  });
});
