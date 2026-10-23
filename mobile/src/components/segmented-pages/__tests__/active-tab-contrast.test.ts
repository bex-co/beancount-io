import fs from "fs";
import path from "path";
import { contrastRatio } from "../../../common/theme/color-utils";
import { themes, type ThemeName } from "../../../common/theme/palette";

/**
 * w21/701: Home's selected chart tab was a `black20` fill on the card's
 * `controlFill`, 1.08:1 in light and 2.07:1 in dark, so which of Net Worth,
 * Assets and Liabilities was showing could barely be seen. WCAG 1.4.11 asks
 * 3:1 for the state indicator. The tokens are read from the two sources, so a
 * restyle of either is measured as it ships.
 */
const NON_TEXT_BAR = 3;
const TEXT_BAR = 4.5;

const read = (...parts: string[]) =>
  fs.readFileSync(path.join(__dirname, "..", "..", ...parts), "utf8");

/** The `theme.<token>` a style block sets for `property`, if it sets one. */
function tokenIn(
  source: string,
  block: string,
  property: string,
): string | undefined {
  const style = new RegExp(`\\b${block}: \\{([^}]*)\\}`).exec(source)?.[1];
  return style
    ? new RegExp(`${property}: theme\\.(\\w+)`).exec(style)?.[1]
    : undefined;
}

function tokenOf(source: string, block: string, property: string): string {
  const token = tokenIn(source, block, property);
  if (!token) throw new Error(`no theme ${property} in ${block}`);
  return token;
}

const tabs = read("segmented-pages", "index.tsx");
const card = read("dashboard-card", "index.tsx");
const fill = tokenOf(tabs, "tabActive", "backgroundColor");
// The edge marks the tab where it has one; otherwise the fill has to.
const edge = tokenIn(tabs, "tabActive", "borderColor") ?? fill;
const label = tokenOf(tabs, "labelActive", "color");
const cardFill = tokenOf(card, "card", "backgroundColor");

describe("the selected chart tab", () => {
  for (const name of ["light", "dark"] as ThemeName[]) {
    const theme = themes[name].colorTheme as unknown as Record<string, string>;

    it(`stands out 3:1 from its card in ${name}`, () => {
      expect(
        contrastRatio(theme[edge], theme[cardFill]) >= NON_TEXT_BAR,
      ).toBeTruthy();
    });

    it(`keeps its label readable on its fill in ${name}`, () => {
      expect(contrastRatio(theme[label], theme[fill]) >= TEXT_BAR).toBeTruthy();
    });
  }

  it("keeps every tab the same size, selected or not", () => {
    expect(/\btab: \{[^}]*borderWidth: TAB_BORDER/.test(tabs)).toBe(true);
    expect(/\btabActive: \{[^}]*borderWidth/.test(tabs)).toBe(false);
  });
});
