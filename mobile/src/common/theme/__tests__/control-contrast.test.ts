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
import fs from "fs";
import path from "path";
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

// w21/329: amber `warning` is a fill colour; used as text it was 2.36:1 on the
// Pending chip's tint and 2.68:1 on white in light mode.
describe("warning as text", () => {
  for (const name of THEME_NAMES) {
    const theme = themes[name].colorTheme;

    it(`reads at 4.5:1 on the surface and the warning tint in ${name}`, () => {
      expect(contrastRatio(theme.warningText, theme.white) >= TEXT_BAR).toBe(
        true,
      );
      expect(contrastRatio(theme.warningText, theme.black10) >= TEXT_BAR).toBe(
        true,
      );
      // The chip's own background: the warning at 14% over the surface.
      const tint = overlay(theme.warning, theme.white, 0.14);
      expect(contrastRatio(theme.warningText, tint) >= TEXT_BAR).toBe(true);
    });
  }

  it("is what the Pending chip and the stale-price text use", () => {
    const read = (relative: string) =>
      fs.readFileSync(path.join(__dirname, "..", "..", "..", relative), "utf8");
    const chip = read(
      "screens/transaction-detail-screen/transaction-detail-screen.tsx",
    );
    expect(/statusText:\s*\{[^}]*color: theme\.warningText/u.test(chip)).toBe(
      true,
    );
    const sheet = read("components/valuation-sheet/index.tsx");
    expect(/staleText:\s*\{[^}]*color: theme\.warningText/u.test(sheet)).toBe(
      true,
    );
  });
});

/** `foreground` at `alpha` over `background`, as a `#rrggbb`. */
function overlay(
  foreground: string,
  background: string,
  alpha: number,
): string {
  const channel = (hex: string, at: number) =>
    parseInt(hex.slice(1 + at * 2, 3 + at * 2), 16);
  const mixed = [0, 1, 2].map((at) =>
    Math.round(
      channel(foreground, at) * alpha + channel(background, at) * (1 - alpha),
    )
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${mixed.join("")}`;
}

// w21/926: success and error are line and bar colours; as text on the card they
// measured 4.17:1 and 4.27:1 in light mode.
describe("success and error as text", () => {
  for (const name of THEME_NAMES) {
    const theme = themes[name].colorTheme;

    it(`read at 4.5:1 on the surface and the card in ${name}`, () => {
      for (const text of [theme.successText, theme.errorText]) {
        expect(contrastRatio(text, theme.white) >= TEXT_BAR).toBe(true);
        expect(contrastRatio(text, theme.controlFill) >= TEXT_BAR).toBe(true);
      }
    });
  }

  it("are what the income amount, the change row and the budget figures use", () => {
    const read = (relative: string) =>
      fs.readFileSync(path.join(__dirname, "..", "..", "..", relative), "utf8");
    expect(
      /amountPositive:\s*\{[^}]*color: theme\.successText/u.test(
        read("screens/transactions-screen/entry-row/index.tsx"),
      ),
    ).toBe(true);
    expect(
      read("common/d3/interactive-line-chart.tsx").includes(
        "color={lineTextColor}",
      ),
    ).toBe(true);
    const budget = read(
      "screens/budget-screen/components/budget-group-card.tsx",
    );
    expect(/errorText:\s*\{[^}]*color: theme\.errorText/u.test(budget)).toBe(
      true,
    );
    expect(
      budget
        .replace(/\s+/g, "")
        .includes("?theme.successText:theme.errorText;"),
    ).toBe(true);
  });
});
