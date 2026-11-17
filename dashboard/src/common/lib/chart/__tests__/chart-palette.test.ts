import { readFileSync } from "fs";
import { resolve } from "path";
import { differenceCiede2000, parse } from "culori";
import { describe, expect, it } from "vitest";
import {
  CHART_PALETTE,
  getCategoricalChartColors,
  getMoneyFlowColors,
  toCategoricalOrder,
} from "../color";

const css = readFileSync(resolve(__dirname, "../../../../style.css"), "utf-8");
const deltaE = differenceCiede2000();

/** The --chart-1..9 declarations of one rule block (`:root` or `.dark`). */
function chartTokens(selector: string): string[] {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf("}", start));
  return Array.from({ length: 9 }, (_, index) => {
    const match = block.match(
      new RegExp(`--chart-${index + 1}:\\s*(oklch\\([^)]+\\))`),
    );
    if (!match) throw new Error(`--chart-${index + 1} missing in ${selector}`);
    return match[1];
  });
}

describe("CHART_PALETTE", () => {
  // The ECharts themes are registered before any CSS can be read, so they
  // carry these literals. A retuned token must move the literal with it.
  it.each([
    ["light", ":root"],
    ["dark", ".dark"],
  ] as const)(
    "matches the %s --chart tokens in style.css",
    (theme, selector) => {
      chartTokens(selector).forEach((token, index) => {
        const literal = CHART_PALETTE[theme][index];
        expect(
          deltaE(parse(token), parse(literal)),
          `--chart-${index + 1} (${theme}) ${token} vs ${literal}`,
        ).toBeLessThan(3.5);
      });
    },
  );
});

describe("categorical order", () => {
  it("leads with the brand and keeps the loss red for the last category", () => {
    const order = toCategoricalOrder(CHART_PALETTE.light);
    expect(order).toHaveLength(9);
    expect(new Set(order).size).toBe(9);
    expect(order[0]).toBe(CHART_PALETTE.light[0]);
    // --chart-8 is the same red as --loss.
    expect(order.at(-1)).toBe(CHART_PALETTE.light[7]);
  });

  it("keeps each category's position across themes", () => {
    const light = getCategoricalChartColors(false);
    const dark = getCategoricalChartColors(true);
    expect(light.at(-1)).toBe("#d40924");
    expect(dark.at(-1)).toBe("#f94144");
    // Position n is the same --chart token in both themes.
    expect(light.map((c) => CHART_PALETTE.light.indexOf(c as never))).toEqual(
      dark.map((c) => CHART_PALETTE.dark.indexOf(c as never)),
    );
  });

  it("gives money in and money out the Sankey's income and spending hues", () => {
    expect(getMoneyFlowColors(false)).toEqual({
      income: "#008455",
      expenses: "#c25500",
    });
    expect(getMoneyFlowColors(true)).toEqual({
      income: "#00bb85",
      expenses: "#f3813f",
    });
  });
});
