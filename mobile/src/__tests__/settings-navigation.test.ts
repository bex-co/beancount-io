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
});
