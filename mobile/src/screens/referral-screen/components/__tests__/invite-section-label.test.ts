import fs from "fs";
import path from "path";

// w21/488: the Invite Friends row was read as "Invite Friends" twice (its title
// and the button's label), and the summary the label replaced was never spoken.
// The component needs the native runtime, so the wiring is checked on its source.
const source = fs
  .readFileSync(path.join(__dirname, "..", "invite-section.tsx"), "utf8")
  .replace(/\s+/g, "");

describe("the Invite Friends row", () => {
  it("is one focus stop named by its title and its summary", () => {
    expect(
      source.includes(
        'accessibilityLabel={`${t("inviteFriends")},${t("inviteSummary")}`}',
      ),
    ).toBe(true);
  });

  it("does not make its title a stop of its own", () => {
    expect(
      source.includes(
        '<Textkey={`title-${fontScale}`}style={styles.title}accessible={false}importantForAccessibility="no">{t("inviteFriends")}</Text>',
      ),
    ).toBe(true);
  });
});
