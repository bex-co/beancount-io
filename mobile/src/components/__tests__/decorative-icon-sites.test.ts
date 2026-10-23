import fs from "fs";
import path from "path";

// w21/848: each vector icon is a Text holding a private-use character, so
// VoiceOver stopped on it. These sites had no hiding wrapper, and two labels
// were never read because their View was not `accessible`.
const SRC = path.join(__dirname, "..", "..");
const read = (file: string) => fs.readFileSync(path.join(SRC, file), "utf8");
const compact = (file: string) => read(file).replace(/\s+/g, "");

const SITES = [
  "components/search-bar/index.tsx",
  "screens/ledger-selection/index.tsx",
  "screens/notifications-screen/notifications-screen.tsx",
  "screens/budget-screen/budget-screen.tsx",
  "screens/merchants-screen/merchants-screen.tsx",
  "screens/transactions-screen/no-results-state.tsx",
  "screens/transactions-screen/transactions-empty-state.tsx",
  "components/ledger-guard/ledger-guard.tsx",
  "screens/ledger-file-browser-screen/index.tsx",
];

describe("decorative icon glyphs", () => {
  it("hide every Ionicons on the screens that left them reachable", () => {
    for (const file of SITES) {
      const tags = read(file).match(/<Ionicons\b[^>]*?\/>/gs) ?? [];
      expect(tags.length > 0).toBe(true);
      for (const tag of tags) {
        expect(
          tag.includes("accessibilityElementsHidden") &&
            tag.includes('importantForAccessibility="no"'),
        ).toBe(true);
      }
    }
  });

  it("hides the merchant header icon's subtree", () => {
    expect(
      compact(
        "screens/merchant-detail-screen/merchant-detail-screen.tsx",
      ).includes(
        '<Viewaccessible={false}importantForAccessibility="no-hide-descendants"><AccountTypeIconpostings={[]}payee={payee}/>',
      ),
    ).toBe(true);
  });
});

describe("labels that were never read", () => {
  it("makes the stale-data banner an accessible element", () => {
    const banner = read("components/stale-data-banner/index.tsx");
    const start = banner.indexOf("style={styles.banner}");
    const tag = banner.slice(start, banner.indexOf("</View>", start));
    expect(/^\s*accessible\s*$/m.test(tag)).toBe(true);
  });

  it("makes Browse ledgers' loading skeleton an accessible element", () => {
    expect(
      compact("screens/ledger-selection/index.tsx").includes(
        "<Viewaccessibleaccessibility" + 'Label={t("discoveryLoading")}>',
      ),
    ).toBe(true);
  });
});
