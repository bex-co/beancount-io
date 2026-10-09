import fs from "fs";
import path from "path";

/**
 * Static guardrail: merchant header totals keep every digit and their currency
 * at accessibility text sizes. A plain one-line Text scaled without limit and
 * ellipsized "51,230.00 MSEK" to "51,230.00…". The unit runner cannot lay text
 * out, so this checks that each total renders through AmountText (the amount
 * Dynamic Type cap) with the shared shrink-to-fit policy, never an ellipsis.
 */

const SCREEN = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "screens",
    "merchant-detail-screen",
    "merchant-detail-screen.tsx",
  ),
  "utf8",
);

/** The JSX element (opening tag through children) rendering each total. */
function totalElement(): { tag: string; openingTag: string } {
  const usage = SCREEN.indexOf("style={styles.totalLine}");
  if (usage === -1) {
    throw new Error("merchant total line not found");
  }
  const start = SCREEN.lastIndexOf("<", usage);
  const end = SCREEN.indexOf(">", usage);
  const openingTag = SCREEN.slice(start, end);
  const tag = openingTag.match(/^<([A-Za-z]+)/)?.[1] ?? "";
  return { tag, openingTag };
}

describe("merchant header totals at enlarged text sizes", () => {
  it("renders each total with the capped amount component", () => {
    expect(totalElement().tag).toBe("AmountText");
    expect(
      SCREEN.includes('import { AmountText } from "@/components/amount-text";'),
    ).toBe(true);
  });

  it("shrinks a too-wide total instead of truncating its currency", () => {
    const { openingTag } = totalElement();
    expect(openingTag.includes("{...HERO_AMOUNT_FIT}")).toBe(true);
    expect(openingTag.includes("numberOfLines=")).toBe(false);
    expect(openingTag.includes("ellipsizeMode")).toBe(false);
    expect(openingTag.includes("maxFontSizeMultiplier")).toBe(false);
  });
});
