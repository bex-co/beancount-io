import fs from "fs";
import path from "path";
import { contrastRatio } from "../../../common/theme/color-utils";
import { themes, type ThemeName } from "../../../common/theme/palette";
import { readOnlyNoticeColors } from "../utils";

/**
 * The read-only notice is an explanatory sentence at 13pt. It once used the
 * placeholder/disabled ramp (`black60`), which in light mode measured 1.62:1
 * against its inset band — present, but unreadable.
 */
const TEXT_BAR = 4.5; // WCAG 1.4.3, text below 18pt

describe("file editor read-only notice contrast", () => {
  for (const name of ["light", "dark"] as ThemeName[]) {
    it(`keeps the notice text readable on its band in ${name}`, () => {
      const { foreground, background } = readOnlyNoticeColors(
        themes[name].colorTheme,
      );
      expect(contrastRatio(foreground, background) >= TEXT_BAR).toBe(true);
    });
  }

  // The measurement above only guards the screen if the screen actually
  // paints the notice with these colors.
  it("paints the notice band, text and lock icon from readOnlyNoticeColors", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "index.tsx"),
      "utf8",
    );
    const style = (key: string) => {
      const start = source.indexOf(`    ${key}: {`);
      expect(start === -1).toBe(false);
      return source.slice(start, source.indexOf("},", start));
    };
    expect(
      style("readOnlyBanner").includes(
        "backgroundColor: readOnlyNoticeColors(theme).background",
      ),
    ).toBe(true);
    expect(
      style("readOnlyText").includes(
        "color: readOnlyNoticeColors(theme).foreground",
      ),
    ).toBe(true);

    const bannerStart = source.indexOf('testID="ledger-editor-read-only"');
    expect(bannerStart === -1).toBe(false);
    const banner = source.slice(
      bannerStart,
      source.indexOf("</View>", bannerStart),
    );
    expect(
      banner.includes("color={readOnlyNoticeColors(theme).foreground}"),
    ).toBe(true);
  });
});
