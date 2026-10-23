import fs from "fs";
import path from "path";

// w21/537: the pending badge was a Latin "P" in all 13 languages. It is the
// Beancount flag itself now, "!", which reads in any script; the rows' own
// accessibility labels already say the translated "pending".
const read = (...parts: string[]) =>
  fs.readFileSync(path.join(__dirname, "..", "..", "..", ...parts), "utf8");

describe("the pending badge", () => {
  it("is the entry's flag, not a Latin letter, on every row that shows it", () => {
    for (const file of [
      read("transactions-screen", "entry-row", "index.tsx"),
      read("account-detail-screen", "components", "account-entry-row.tsx"),
      read("transaction-detail-screen", "components", "posting-row.tsx"),
    ]) {
      expect(file.includes("<Text style={styles.badgeText}>!</Text>")).toBe(
        true,
      );
      expect(file.includes("<Text style={styles.badgeText}>P</Text>")).toBe(
        false,
      );
    }
  });

  it("is still read as the translated word", () => {
    expect(
      read(
        "transaction-detail-screen",
        "components",
        "posting-row.tsx",
      ).includes('t("pending")'),
    ).toBe(true);
    expect(
      read(
        "account-detail-screen",
        "components",
        "account-entry-row.tsx",
      ).includes('t("pending")'),
    ).toBe(true);
    expect(
      read("transactions-screen", "entry-row", "index.tsx").includes(
        't("pending")',
      ),
    ).toBe(true);
  });
});
