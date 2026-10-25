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

describe("the screens and sheets use the shared columns", () => {
  it("the dashboard scaffold caps its content", () => {
    expect(
      readSource("components/dashboard-scroll-view/index.tsx").includes(
        "...contentColumn",
      ),
    ).toBe(true);
  });

  it("the Picker sheet caps itself", () => {
    expect(
      readSource("components/picker/index.tsx").includes("...sheetColumn"),
    ).toBe(true);
  });

  it("the valuation sheet caps itself", () => {
    expect(
      readSource("components/valuation-sheet/index.tsx").includes(
        "...sheetColumn",
      ),
    ).toBe(true);
  });

  it("Add Budget caps its form", () => {
    expect(
      readSource("screens/add-budget-screen/add-budget-screen.tsx").includes(
        "...contentColumn",
      ),
    ).toBe(true);
  });

  it("Open Account caps its form", () => {
    expect(
      readSource(
        "screens/open-account-screen/open-account-screen.tsx",
      ).includes("...contentColumn"),
    ).toBe(true);
  });

  it("the transaction form caps itself", () => {
    expect(
      readSource(
        "screens/multi-postings-transaction/multi-postings-transaction-screen.tsx",
      ).includes("...contentColumn"),
    ).toBe(true);
  });

  // w21/m2/t001: the bespoke list screens.
  for (const [name, file] of [
    ["Transactions", "screens/transactions-screen/transactions-screen.tsx"],
    ["Merchants", "screens/merchants-screen/merchants-screen.tsx"],
    [
      "merchant detail",
      "screens/merchant-detail-screen/merchant-detail-screen.tsx",
    ],
    ["Budget", "screens/budget-screen/budget-screen.tsx"],
    ["Notifications", "screens/notifications-screen/notifications-screen.tsx"],
    ["ledger selection", "screens/ledger-selection/index.tsx"],
    [
      "account detail",
      "screens/account-detail-screen/account-detail-screen.tsx",
    ],
    ["the file browser", "screens/ledger-file-browser-screen/index.tsx"],
  ]) {
    it(`${name} caps its list`, () => {
      expect(readSource(file).includes("contentColumn")).toBe(true);
    });
  }
});
