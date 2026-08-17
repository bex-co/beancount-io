/**
 * The guard the light neutral ramp never had.
 *
 * The ramp drifted to 1.10–1.34 against the surface — every control boundary
 * below the WCAG 1.4.11 minimum — and nothing failed. These assertions are the
 * thing that makes that regression loud: they read the real palettes and
 * measure, so a token edit that dulls a control fails the suite rather than
 * shipping.
 *
 * Ratios are asserted as `>= bar`, not pinned to today's numbers, so the
 * palette can be re-tuned upward freely. The table in `palette.ts` records
 * where each pair actually lands.
 */
import { contrastRatio, relativeLuminance } from "../color-utils";
import { themes, type ThemeName } from "../palette";

/** WCAG 1.4.11 — boundary of an interactive component vs adjacent color. */
const NON_TEXT_BAR = 3;
/** WCAG 1.4.3 — text below 18pt. Placeholders are text. */
const TEXT_BAR = 4.5;

const THEME_NAMES: ThemeName[] = ["light", "dark"];

describe("control token contrast", () => {
  for (const name of THEME_NAMES) {
    const theme = themes[name].colorTheme;

    it(`gives the control boundary 3:1 against the base surface in ${name}`, () => {
      expect(
        contrastRatio(theme.controlBorder, theme.white) >= NON_TEXT_BAR,
      ).toBeTruthy();
    });

    it(`gives the control boundary 3:1 against its own fill in ${name}`, () => {
      expect(
        contrastRatio(theme.controlBorder, theme.controlFill) >= NON_TEXT_BAR,
      ).toBeTruthy();
    });

    // Section headers and inset bands fill with `black10`, and controls sit on
    // top of them in the picker and the filter sheet. Today that is the same
    // value as `controlFill`; this pins the pairing so the two can't drift
    // apart unnoticed.
    it(`gives the control boundary 3:1 against an inset band in ${name}`, () => {
      expect(
        contrastRatio(theme.controlBorder, theme.black10) >= NON_TEXT_BAR,
      ).toBeTruthy();
    });

    it(`keeps placeholder text readable on the control fill in ${name}`, () => {
      expect(
        contrastRatio(theme.controlPlaceholder, theme.controlFill) >= TEXT_BAR,
      ).toBeTruthy();
    });

    // The hierarchy that matters inside a field: what the user typed has to
    // outrank the hint, or a filled field reads as empty.
    it(`keeps entered text darker than the placeholder in ${name}`, () => {
      const entered = contrastRatio(theme.black90, theme.controlFill);
      const placeholder = contrastRatio(
        theme.controlPlaceholder,
        theme.controlFill,
      );
      expect(entered > placeholder).toBeTruthy();
    });

    // A fill that drifts away from the page would turn every control into a
    // slab; the boundary is what marks a control, not the fill.
    it(`keeps the control fill close to the base surface in ${name}`, () => {
      expect(
        contrastRatio(theme.controlFill, theme.white) < NON_TEXT_BAR,
      ).toBeTruthy();
    });
  }

  it("computes the WCAG reference ratio for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    // Order must not matter.
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(
      contrastRatio("#ffffff", "#000000"),
      5,
    );
  });

  it("computes the WCAG reference luminances", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
  });

  it("refuses a color it cannot measure", () => {
    expect(() => relativeLuminance("rgba(0, 0, 0, 0.5)")).toThrow();
    expect(() => relativeLuminance("#fff")).toThrow();
  });
});
