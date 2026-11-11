import fs from "fs";
import path from "path";

/**
 * w21/143: date sections, Merchants and account-picker sections and card
 * titles were not headings, so VoiceOver's Headings rotor could not step
 * through a long journal.
 */
const read = (relative: string) =>
  fs.readFileSync(path.join(__dirname, "..", relative), "utf8");

describe("section and card titles are headings", () => {
  for (const file of [
    "screens/transactions-screen/date-section-header.tsx",
    "screens/merchants-screen/merchants-screen.tsx",
    "screens/account-picker-screen/account-picker-screen.tsx",
    "components/dashboard-card/index.tsx",
  ]) {
    it(`marks the title in ${file}`, () => {
      expect(read(file).includes('accessibilityRole="header"')).toBe(true);
    });
  }

  // w21/320: w21/143 missed these section titles.
  it("marks the remaining section titles", () => {
    const compactRead = (relative: string) =>
      read(relative).replace(/\s+/gu, "");
    const titled = (relative: string, key: string) => {
      const source = compactRead(relative);
      const at = source.indexOf(`t("${key}")`);
      expect(at > -1).toBe(true);
      // The role sits on the Text that opens just before the title.
      const open = source.lastIndexOf("<Text", at);
      expect(
        source.slice(open, at).includes('accessibilityRole="header"'),
      ).toBe(true);
    };
    titled(
      "screens/account-detail-screen/account-detail-screen.tsx",
      "transactions",
    );
    titled(
      "screens/transaction-detail-screen/transaction-detail-screen.tsx",
      "moneyFlow",
    );
    titled(
      "screens/transaction-detail-screen/transaction-detail-screen.tsx",
      "details",
    );
    titled(
      "screens/transactions-screen/entry-context/index.tsx",
      "journalSource",
    );
    for (const key of ["filterStatus", "filterDateRange", "filterAccount"])
      titled(
        "screens/transaction-filters-screen/transaction-filters-screen.tsx",
        key,
      );
    // Settings' section headers (Support, About, …) share one component.
    expect(
      compactRead("screens/setting/list-item.tsx").includes(
        '<Textkey={fontScale}style={styles.title}accessibilityRole="header">{title}</Text>',
      ),
    ).toBe(true);
  });

  // w21/440: four more titles w21/320 missed.
  it("marks the titles of Entry Context's balances, Notifications and the text-input suggestions", () => {
    const compact = (relative: string) => read(relative).replace(/\s+/gu, "");
    expect(
      compact(
        "screens/transactions-screen/entry-context/balance-section.tsx",
      ).includes(
        '<Textkey={`title-${fontScale}`}style={styles.balanceSectionHeaderText}accessibilityRole="header">{title}</Text>',
      ),
    ).toBe(true);
    const notifications = compact(
      "screens/notifications-screen/notifications-screen.tsx",
    );
    for (const key of ["notificationsErrorsSection"]) {
      const at = notifications.indexOf(`t("${key}")`);
      expect(at > -1).toBe(true);
      expect(
        notifications
          .slice(notifications.lastIndexOf("<Text", at), at)
          .includes('accessibilityRole="header"'),
      ).toBe(true);
    }
    // The second title ("Recent changes") shares the style and the role. Each
    // carries its own font-scale key (w22/020), so the key is left out here.
    expect(
      notifications.split(
        'style={styles.sectionHeader}accessibilityRole="header">',
      ).length,
    ).toBe(3);
    expect(
      compact("components/text-input-screen/index.tsx").includes(
        '<Textstyle={styles.sectionTitle}accessibilityRole="header">{i18n.t("suggestions").toUpperCase()}',
      ),
    ).toBe(true);
  });

  it("reads a date header's day total as part of it", () => {
    expect(
      read("screens/transactions-screen/date-section-header.tsx").includes(
        't("dateSectionHeaderTotal", { date: displayDate, total })',
      ),
    ).toBe(true);
  });
});
