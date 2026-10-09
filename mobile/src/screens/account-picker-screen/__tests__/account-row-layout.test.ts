import fs from "fs";
import path from "path";

/**
 * Static guardrail: path-like names give way from the front or the middle, not
 * the end. A single tail-truncating Text cut the account leaf, the part that
 * identifies the account, while keeping a shared parent path in full.
 */
const SCREENS = path.join(__dirname, "..", "..");
const read = (file: string) =>
  fs.readFileSync(path.join(SCREENS, file), "utf8");

describe("account and file name truncation", () => {
  it("lays the picker row out as a shrinking parent path beside a whole leaf", () => {
    const source = read("account-picker-screen/account-picker-screen.tsx");
    const row = source.slice(
      source.indexOf("const AccountRow = memo("),
      source.indexOf("function AccountPickerScreenComponent("),
    );
    expect(
      row.includes(
        '<Text style={styles.parentPath} numberOfLines={1} ellipsizeMode="head">',
      ),
    ).toBe(true);
    expect(row.includes("<Text style={styles.leaf} numberOfLines={1}>")).toBe(
      true,
    );
    expect(/parentPath: \{\s*flexShrink: 1,/u.test(source)).toBe(true);
    expect(/leaf: \{\s*flexShrink: 0,/u.test(source)).toBe(true);
  });

  it("keeps both ends of a commit's file path", () => {
    const source = read("commit-detail-screen/commit-detail-screen.tsx");
    const start = source.indexOf("style={styles.fileName}");
    expect(
      source
        .slice(start, source.indexOf(">", start))
        .includes('ellipsizeMode="middle"'),
    ).toBe(true);
  });
});
