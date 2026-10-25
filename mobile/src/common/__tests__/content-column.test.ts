import fs from "fs";
import path from "path";
import {
  contentColumn,
  readableContentWidth,
  sheetColumn,
  sheetContentWidth,
} from "../content-column";

/**
 * w21/1005: no screen had a readable-width cap, so on iPad forms ran edge to
 * edge and the Picker and valuation sheets stretched full width. The lite
 * runner has no component-render harness, so these pin the shared column's
 * numbers directly and check each consumer spreads it (source checks in the
 * `bar-chart-d3.test.ts` style).
 */

const srcRoot = path.join(__dirname, "..", "..");

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(srcRoot, relativePath), "utf8");
}

describe("the shared content columns", () => {
  it("caps screen content at 640 pt, centered, full width below that", () => {
    expect(readableContentWidth).toBe(640);
    expect(contentColumn).toEqual({
      width: "100%",
      maxWidth: 640,
      alignSelf: "center",
    });
  });

  it("caps bottom sheets at 560 pt, centered, full width below that", () => {
    expect(sheetContentWidth).toBe(560);
    expect(sheetColumn).toEqual({
      width: "100%",
      maxWidth: 560,
      alignSelf: "center",
    });
  });
});

// One row per capped surface: the full test title, its file, and the needle
// that proves the wiring. A spread where the consumer spreads one; the bare
// name where it passes the column straight through (w21/m2/t005).
const consumers: [title: string, file: string, needle: string][] = [
  [
    "the dashboard scaffold caps its content",
    "components/dashboard-scroll-view/index.tsx",
    "...contentColumn",
  ],
  [
    "the Picker sheet caps itself",
    "components/picker/index.tsx",
    "...sheetColumn",
  ],
  [
    "the valuation sheet caps itself",
    "components/valuation-sheet/index.tsx",
    "...sheetColumn",
  ],
  [
    "Add Budget caps its form",
    "screens/add-budget-screen/add-budget-screen.tsx",
    "...contentColumn",
  ],
  [
    "Open Account caps its form",
    "screens/open-account-screen/open-account-screen.tsx",
    "...contentColumn",
  ],
  [
    "the transaction form caps itself",
    "screens/multi-postings-transaction/multi-postings-transaction-screen.tsx",
    "...contentColumn",
  ],
  [
    "Transactions caps its list",
    "screens/transactions-screen/transactions-screen.tsx",
    "contentColumn",
  ],
  [
    "Merchants caps its list",
    "screens/merchants-screen/merchants-screen.tsx",
    "contentColumn",
  ],
  [
    "merchant detail caps its list",
    "screens/merchant-detail-screen/merchant-detail-screen.tsx",
    "contentColumn",
  ],
  [
    "Budget caps its list",
    "screens/budget-screen/budget-screen.tsx",
    "contentColumn",
  ],
  [
    "Notifications caps its list",
    "screens/notifications-screen/notifications-screen.tsx",
    "contentColumn",
  ],
  [
    "ledger selection caps its list",
    "screens/ledger-selection/index.tsx",
    "contentColumn",
  ],
  [
    "account detail caps its list",
    "screens/account-detail-screen/account-detail-screen.tsx",
    "contentColumn",
  ],
  [
    "the file browser caps its list",
    "screens/ledger-file-browser-screen/index.tsx",
    "contentColumn",
  ],
  [
    "transaction detail caps its content",
    "screens/transaction-detail-screen/transaction-detail-screen.tsx",
    "contentColumn",
  ],
  [
    "commit detail caps its content",
    "screens/commit-detail-screen/commit-detail-screen.tsx",
    "contentColumn",
  ],
  [
    "account picker caps its content",
    "screens/account-picker-screen/account-picker-screen.tsx",
    "contentColumn",
  ],
  [
    "transaction filters caps its content",
    "screens/transaction-filters-screen/transaction-filters-screen.tsx",
    "contentColumn",
  ],
  [
    "create ledger caps its content",
    "screens/create-ledger-screen/create-ledger-screen.tsx",
    "contentColumn",
  ],
  [
    "profile caps its content",
    "screens/profile/profile-screen.tsx",
    "contentColumn",
  ],
  [
    "referral caps its content",
    "screens/referral-screen/referral-screen.tsx",
    "contentColumn",
  ],
  ["welcome caps its content", "screens/welcome/index.tsx", "contentColumn"],
  [
    "server settings caps its content",
    "screens/welcome/server-settings-screen.tsx",
    "contentColumn",
  ],
  [
    "the agent chat caps its content",
    "screens/agent-screen/agent-screen.tsx",
    "contentColumn",
  ],
  [
    "settings about caps its content",
    "screens/setting/about.tsx",
    "contentColumn",
  ],
  [
    "the accounts table caps its list",
    "components/account-table/account-table.tsx",
    "contentColumn",
  ],
];

describe("the screens and sheets use the shared columns", () => {
  // SettingScreen needs none — it only renders About, which is capped.
  for (const [title, file, needle] of consumers) {
    it(title, () => {
      expect(readSource(file).includes(needle)).toBe(true);
    });
  }
});
