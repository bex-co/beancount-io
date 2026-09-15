import fs from "fs";
import path from "path";
import { merchantsSortButtonLabelKey } from "../sort-button-label";

describe("merchantsSortButtonLabelKey", () => {
  it("names the alphabetical order while the list is sorted by count", () => {
    expect(merchantsSortButtonLabelKey("count")).toBe(
      "merchantsSortAlphabetical",
    );
  });

  it("names the count order while the list is sorted alphabetically", () => {
    expect(merchantsSortButtonLabelKey("alphabetical")).toBe(
      "merchantsSortByCount",
    );
  });
});

/**
 * Static guardrail over the screen, which the unit runner cannot render: the
 * sort button's name must come from the action helper, while the icon keeps
 * showing the order already applied.
 */
describe("Merchants sort button", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "merchants-screen.tsx"),
    "utf8",
  );

  it("labels the button with the order a tap switches to", () => {
    expect(source.includes("t(merchantsSortButtonLabelKey(sort))")).toBe(true);
    expect(source.includes("accessibilityLabel={sortLabel}")).toBe(true);
  });

  it("keeps the icon showing the order already applied", () => {
    expect(
      source.includes(
        'sort === "count" ? "swap-vertical-outline" : "text-outline"',
      ),
    ).toBe(true);
  });
});
