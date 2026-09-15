import fs from "fs";
import path from "path";

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
});
