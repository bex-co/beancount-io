import { getRootIcon, FALLBACK_ICON, TINT_ALPHA } from "../root-icon";
import type { ColorTheme } from "@/types/theme-props";

/** Only the tokens the icon tones read. */
const theme = {
  secondary: "#b8894b",
  success: "#0a8748",
  information: "#4c8dd6",
  warning: "#e08a1e",
  black80: "#727668",
} as ColorTheme;

describe("root-icon", () => {
  describe("getRootIcon", () => {
    it("should map each root to its own glyph", () => {
      expect(getRootIcon("expenses").glyph).toBe("receipt");
      expect(getRootIcon("income").glyph).toBe("cash");
      expect(getRootIcon("assets").glyph).toBe("wallet");
      expect(getRootIcon("liabilities").glyph).toBe("card");
      expect(getRootIcon("equity").glyph).toBe("business");
    });

    it("should resolve each tone from a theme token", () => {
      expect(getRootIcon("expenses").tone(theme)).toBe(theme.secondary);
      expect(getRootIcon("income").tone(theme)).toBe(theme.success);
      expect(getRootIcon("assets").tone(theme)).toBe(theme.information);
      expect(getRootIcon("liabilities").tone(theme)).toBe(theme.warning);
      expect(getRootIcon("equity").tone(theme)).toBe(theme.black80);
    });

    it("should fall back to a neutral icon when there is no root", () => {
      expect(getRootIcon(null)).toBe(FALLBACK_ICON);
      expect(getRootIcon(null).glyph).toBe("document-text");
      expect(getRootIcon(null).tone(theme)).toBe(theme.black80);
    });
  });

  describe("TINT_ALPHA", () => {
    it("should tint more strongly in dark than in light", () => {
      expect(TINT_ALPHA.dark > TINT_ALPHA.light).toBe(true);
    });
  });
});
