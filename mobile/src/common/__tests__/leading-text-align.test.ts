import fs from "fs";
import path from "path";

/**
 * In Persian, full-width UI text left at `natural` alignment sat on the
 * physical left beside correctly mirrored rows: Settings section titles, the
 * Spending subtitle, the Budget empty line, the drawer's row labels and Add
 * Budget's help and error lines, and the Invite Friends heading and summary
 * (w0/049, w21/019, w21/037). Each now takes
 * `LEADING_TEXT_ALIGN`; every style block of these names in these files must
 * keep it.
 */
const SURFACES: [string, string][] = [
  ["screens/setting/list-item.tsx", "title"],
  ["screens/home-screen/components/spending-card.tsx", "subtitle"],
  ["screens/home-screen/components/budget-card.tsx", "emptyText"],
  ["components/ledger-drawer/ledger-drawer.tsx", "menuItemText"],
  ["screens/add-budget-screen/add-budget-screen.tsx", "help"],
  ["screens/add-budget-screen/add-budget-screen.tsx", "error"],
  ["screens/referral-screen/components/invite-section.tsx", "title"],
  ["screens/referral-screen/components/invite-section.tsx", "summary"],
  // The Transactions filter sheet's section titles and its range error (w22/038).
  [
    "screens/transaction-filters-screen/transaction-filters-screen.tsx",
    "sectionTitle",
  ],
  [
    "screens/transaction-filters-screen/transaction-filters-screen.tsx",
    "rangeError",
  ],
];

function styleBlocks(source: string, name: string): string[] {
  const blocks: string[] = [];
  const opener = new RegExp(`\\n\\s+${name}: \\{`, "g");
  for (const match of source.matchAll(opener)) {
    const start = match.index! + match[0].length;
    blocks.push(source.slice(start, source.indexOf("}", start)));
  }
  return blocks;
}

describe("full-width UI text follows the layout's leading edge", () => {
  for (const [file, style] of SURFACES) {
    it(`${file} ${style}`, () => {
      const source = fs.readFileSync(
        path.join(__dirname, "..", "..", file),
        "utf8",
      );
      const blocks = styleBlocks(source, style);
      expect(blocks.length > 0).toBe(true);
      for (const block of blocks) {
        expect(block.includes("textAlign: LEADING_TEXT_ALIGN")).toBe(true);
      }
    });
  }
});
