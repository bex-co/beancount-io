import fs from "fs";
import path from "path";
import { HERO_AMOUNT_FIT } from "../components/amount-text/hero-amount-fit";

/**
 * Static guardrail: every hero-sized amount stays on one line and shrinks to
 * fit instead of wrapping or truncating. The unit runner cannot lay text out,
 * so this checks the props each call site passes — without them, long amounts
 * wrapped mid-number on the transaction detail hero and the Home headline.
 */

const SRC_ROOT = path.join(__dirname, "..");

const HERO_SITES = [
  {
    file: "screens/transaction-detail-screen/transaction-detail-screen.tsx",
    tag: "<AmountText",
    usage: "styles.heroAmount,",
  },
  {
    file: "common/d3/interactive-line-chart.tsx",
    tag: "<AnimatedAmount",
    usage: "style={styles.headline}",
  },
];

const read = (file: string) =>
  fs.readFileSync(path.join(SRC_ROOT, file), "utf8");

/** The opening JSX tag of the element that renders the given style usage. */
function heroOpeningTag(source: string, tag: string, usage: string): string {
  const at = source.indexOf(usage);
  const start = at === -1 ? -1 : source.lastIndexOf(tag, at);
  const end = at === -1 ? -1 : source.indexOf(">", at);
  if (start === -1 || end === -1) {
    throw new Error(`hero element ${tag} using ${usage} not found`);
  }
  return source.slice(start, end);
}

describe("hero amount fit", () => {
  it("keeps a hero amount on one line and shrinks it instead of truncating", () => {
    expect(HERO_AMOUNT_FIT.numberOfLines).toBe(1);
    expect(HERO_AMOUNT_FIT.adjustsFontSizeToFit).toBe(true);
    const floor = HERO_AMOUNT_FIT.minimumFontScale;
    expect(floor > 0 && floor <= 0.4).toBe(true);
  });

  for (const site of HERO_SITES) {
    it(`${site.file} renders its hero amount with the fit props and no ellipsis`, () => {
      const tagSource = heroOpeningTag(read(site.file), site.tag, site.usage);
      expect(tagSource.includes("{...HERO_AMOUNT_FIT}")).toBe(true);
      expect(tagSource.includes("ellipsizeMode")).toBe(false);
    });
  }

  it("centres the transaction detail hero amount instead of inheriting leading alignment", () => {
    const source = read(HERO_SITES[0].file);
    const start = source.indexOf("heroAmount: {");
    const block = source.slice(start, source.indexOf("}", start));
    expect(start === -1).toBe(false);
    expect(block.includes('textAlign: "center"')).toBe(true);
  });
});
