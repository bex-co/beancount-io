import fs from "fs";
import path from "path";
import { stacksBalanceRow } from "../format-entry-balances";

/**
 * Static guardrail: an account name in Entry Context's balance rows stays on
 * one line. Account names have no spaces, so a wrapping Text broke mid-word
 * ("Checkin" / "g"); a middle ellipsis keeps both the root and the leaf.
 */
describe("Entry Context balance rows", () => {
  it("truncates the account name in the middle instead of wrapping it", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "balance-section.tsx"),
      "utf8",
    );
    const start = source.indexOf("style={styles.balanceAccount}");
    const tag = source.slice(start, source.indexOf(">", start));
    expect(start === -1).toBe(false);
    expect(tag.includes("numberOfLines={1}")).toBe(true);
    expect(tag.includes('ellipsizeMode="middle"')).toBe(true);
  });

  // w21/684: beside the amounts, the account read "Asset…king" at AX2.
  it("stacks the amounts under the account at large text sizes", () => {
    const source = fs
      .readFileSync(path.join(__dirname, "..", "balance-section.tsx"), "utf8")
      .replace(/\s+/g, "");
    expect(
      source.includes("conststacked=prefersStackedLayout(fontScale);"),
    ).toBe(true);
    expect(source.includes("rowStacked&&styles.balanceRowStacked")).toBe(true);
    expect(source.includes("rowStacked&&styles.balanceAmountsStacked")).toBe(
      true,
    );
    expect(source.includes('balanceRowStacked:{flexDirection:"column"')).toBe(
      true,
    );
  });
});

// w21/863: a lot string took the whole row and the account name was dropped.
describe("a balance row holding a lot", () => {
  it("stacks, at the default text size too", () => {
    expect(
      stacksBalanceRow(["4.0000 QAETF {101.2500 USD, 2026-10-21}"], false),
    ).toBe(true);
    expect(stacksBalanceRow(["4910.00 USD", "3 HOOL {10 USD}"], false)).toBe(
      true,
    );
  });

  it("stays beside the account for plain amounts, and stacks at large text", () => {
    expect(stacksBalanceRow(["4910.00 USD"], false)).toBe(false);
    expect(stacksBalanceRow(["4910.00 USD"], true)).toBe(true);
  });

  it("is what the row's layout reads", () => {
    const source = fs
      .readFileSync(path.join(__dirname, "..", "balance-section.tsx"), "utf8")
      .replace(/\s+/g, "");
    expect(
      source.includes(
        "constrowStacked=stacksBalanceRow(balance.amounts,stacked);",
      ),
    ).toBe(true);
    expect(source.includes("rowStacked&&styles.balanceRowStacked")).toBe(true);
  });
});
