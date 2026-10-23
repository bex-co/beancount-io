import fs from "fs";
import path from "path";

// w21/811: the Stats label sat on a view that was no accessibility element, so
// VoiceOver read "+12" and "−3" and never "12 additions, 3 deletions". The
// screen needs the native runtime, so the wiring is checked on source.
describe("commit detail's Stats row", () => {
  const screen = fs
    .readFileSync(
      path.join(__dirname, "..", "commit-detail-screen.tsx"),
      "utf8",
    )
    .replace(/\s+/g, "");

  it("is one element labelled with its additions and deletions", () => {
    const row = screen.slice(screen.indexOf("<Viewstyle={styles.statsRow}"));
    expect(
      row.startsWith(
        '<Viewstyle={styles.statsRow}accessibleaccessibilityLabel={`${t("commitDetailAdditions",{count:commit.stats.additions,})},${t("commitDetailDeletions",{count:commit.stats.deletions,})}`}',
      ),
    ).toBe(true);
  });

  it("keeps its heading an element of its own", () => {
    expect(
      screen.includes(
        '<Viewstyle={styles.section}><Textstyle={styles.sectionLabel}accessibilityRole="header">{t("commitDetailStats")}',
      ),
    ).toBe(true);
  });
});
