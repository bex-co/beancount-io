import fs from "fs";
import path from "path";

const drawerSource = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "components",
    "ledger-drawer",
    "ledger-drawer.tsx",
  ),
  "utf8",
);

describe("settings navigation (m5)", () => {
  describe("translation keys required by the settings drawer menu and pushed screen", () => {
    it("has a 'settings' key", () => {
      const { en } = require("../translations/en");
      expect(en.settings).toBeTruthy();
    });

    it("has an 'accountSettings' key for the profile row", () => {
      const { en } = require("../translations/en");
      expect(en.accountSettings).toBeTruthy();
    });

    it("has a 'ledgers' key for the drawer section label", () => {
      const { en } = require("../translations/en");
      expect(en.ledgers).toBeTruthy();
    });

    it("has a 'visitWebsite' key for the external website row", () => {
      const { en } = require("../translations/en");
      expect(en.visitWebsite).toBe("Visit website");
    });
  });

  describe("en translation values", () => {
    it("settings is 'Settings'", () => {
      const { en } = require("../translations/en");
      expect(en.settings).toBe("Settings");
    });

    it("accountSettings is 'Account'", () => {
      const { en } = require("../translations/en");
      expect(en.accountSettings).toBe("Account");
    });
  });

  describe("website drawer row", () => {
    it("opens the web ledger at the requested external URL", () => {
      expect(
        drawerSource.includes(
          'const WEB_LEDGER_URL = "https://beancount.io/ledger";',
        ),
      ).toBe(true);
      expect(drawerSource.includes("Linking.openURL(WEB_LEDGER_URL)")).toBe(
        true,
      );
    });

    it("sits between Merchants and Settings with an external-link icon", () => {
      const merchants = drawerSource.indexOf('testID="drawer-merchants-row"');
      const website = drawerSource.indexOf('testID="drawer-website-row"');
      const settings = drawerSource.indexOf('testID="drawer-settings-row"');

      expect(merchants < website && website < settings).toBe(true);
      expect(
        drawerSource.slice(website, settings).includes('name="open-outline"'),
      ).toBe(true);
    });
  });
});
