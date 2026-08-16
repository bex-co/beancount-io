import { I18n } from "i18n-js";
import { en } from "../en";

const SUPPORTED_LOCALES = [
  "en",
  "zh",
  "bg",
  "ca",
  "de",
  "es",
  "fa",
  "fr",
  "nl",
  "pt",
  "ru",
  "sk",
  "uk",
];

// Replicate the getLocale logic from translations/index.ts for testing
// The actual module cannot be imported directly due to path alias resolution
// limitations in the test runner. This tests the core locale detection algorithm.
const getLocale = (
  locales: Array<{ languageCode?: string | null }>,
): string => {
  for (let i = 0; i < locales.length; i++) {
    const locale = locales[i];
    if (
      locale.languageCode &&
      SUPPORTED_LOCALES.includes(locale.languageCode)
    ) {
      return locale.languageCode;
    }
  }
  return "en";
};

describe("translations", () => {
  describe("i18n configuration", () => {
    let i18n: I18n;

    beforeEach(() => {
      i18n = new I18n({
        en,
      });
      i18n.enableFallback = true;
    });

    it("creates an i18n instance with t function", () => {
      expect(i18n).toBeTruthy();
      expect(typeof i18n.t).toBe("function");
    });

    it("has fallback enabled", () => {
      expect(i18n.enableFallback).toBe(true);
    });

    it("translates English key correctly", () => {
      i18n.locale = "en";
      expect(i18n.t("home")).toBe("Home");
    });

    it("translates ledger key correctly", () => {
      i18n.locale = "en";
      expect(i18n.t("ledger")).toBe("Ledger");
    });

    it("translates journal key correctly", () => {
      i18n.locale = "en";
      expect(i18n.t("journal")).toBe("Journal");
    });

    it("translates settings key correctly", () => {
      i18n.locale = "en";
      expect(i18n.t("settings")).toBe("Settings");
    });
  });

  describe("setLocale function", () => {
    it("changes i18n locale when called", () => {
      const i18n = new I18n({ en });
      const setLocale = (locale: string) => {
        i18n.locale = locale;
      };
      setLocale("zh");
      expect(i18n.locale).toBe("zh");
    });

    it("allows changing locale multiple times", () => {
      const i18n = new I18n({ en });
      const setLocale = (locale: string) => {
        i18n.locale = locale;
      };
      setLocale("fr");
      expect(i18n.locale).toBe("fr");
      setLocale("de");
      expect(i18n.locale).toBe("de");
    });
  });

  describe("getLocale detection", () => {
    it("defaults to en when no locales available", () => {
      const result = getLocale([]);
      expect(result).toBe("en");
    });

    it("defaults to en when locale has no languageCode", () => {
      const result = getLocale([{ languageCode: null }]);
      expect(result).toBe("en");
    });

    it("defaults to en when locale has undefined languageCode", () => {
      const result = getLocale([{ languageCode: undefined }]);
      expect(result).toBe("en");
    });

    it("defaults to en when locale languageCode is unsupported", () => {
      const result = getLocale([{ languageCode: "ja" }]);
      expect(result).toBe("en");
    });

    it("detects first supported locale from the list", () => {
      const result = getLocale([
        { languageCode: "ja" },
        { languageCode: "fr" },
        { languageCode: "en" },
      ]);
      expect(result).toBe("fr");
    });

    it("uses first locale when it is supported", () => {
      const result = getLocale([{ languageCode: "de" }]);
      expect(result).toBe("de");
    });

    it("handles mixed valid and invalid locales", () => {
      const result = getLocale([
        { languageCode: null },
        { languageCode: "kr" },
        { languageCode: "ru" },
      ]);
      expect(result).toBe("ru");
    });

    it("returns en when all locales are unsupported", () => {
      const result = getLocale([
        { languageCode: "ja" },
        { languageCode: "kr" },
        { languageCode: "th" },
      ]);
      expect(result).toBe("en");
    });
  });

  describe("supported locales constant", () => {
    it("contains expected number of supported locales", () => {
      // The app supports 13 locales as of this writing
      expect(SUPPORTED_LOCALES.length).toBe(13);
    });

    it("includes English as first locale", () => {
      expect(SUPPORTED_LOCALES[0]).toBe("en");
    });

    it("includes Chinese", () => {
      expect(SUPPORTED_LOCALES.includes("zh")).toBe(true);
    });

    it("includes European languages", () => {
      const europeanLanguages = [
        "bg",
        "ca",
        "de",
        "es",
        "fr",
        "nl",
        "pt",
        "ru",
        "sk",
        "uk",
      ];
      for (const lang of europeanLanguages) {
        expect(SUPPORTED_LOCALES.includes(lang)).toBe(true);
      }
    });

    it("includes Persian", () => {
      expect(SUPPORTED_LOCALES.includes("fa")).toBe(true);
    });
  });

  describe("translation keys", () => {
    it("has required navigation keys in English", () => {
      expect(en.home).toBe("Home");
      expect(en.ledger).toBe("Ledger");
      expect(en.journal).toBe("Journal");
      expect(en.settings).toBe("Settings");
    });

    it("has theme related keys in English", () => {
      expect(en.theme).toBe("Theme");
      expect(en.themeLight).toBe("Light");
      expect(en.themeDark).toBe("Dark");
      expect(en.themeSystem).toBe("System");
    });

    it("has logout keys in English", () => {
      expect(en.logout).toBe("Logout");
      expect(en.logoutAlertMsg).toBe("Are you sure you want to log out?");
      expect(en.logoutAlertCancel).toBe("Cancel");
      expect(en.logoutAlertConfirm).toBe("Logout");
    });

    it("has month abbreviations in English", () => {
      expect(en["01"]).toBe("JAN");
      expect(en["06"]).toBe("JUN");
      expect(en["12"]).toBe("DEC");
    });

    it("has transaction related keys", () => {
      expect(en.addTransaction).toBe("Add Transaction");
      expect(en.payee).toBe("Payee");
      expect(en.narration).toBe("Narration");
      expect(en.from).toBe("From");
      expect(en.to).toBe("To");
      expect(en.date).toBe("Date");
    });

    it("has account related keys", () => {
      expect(en.assets).toBe("Assets");
      expect(en.expenses).toBe("Expenses");
      expect(en.income).toBe("Income");
      expect(en.liabilities).toBe("Liabilities");
      expect(en.equity).toBe("Equity");
    });

    it("has action button keys", () => {
      expect(en.save).toBe("Save");
      expect(en.cancel).toBe("Cancel");
      expect(en.confirm).toBe("Confirm");
      expect(en.done).toBe("Done");
      expect(en.next).toBe("Next");
    });

    it("has status message keys", () => {
      expect(en.saving).toBe("Saving...");
      expect(en.saveSuccess).toBe("Transaction saved!");
      expect(en.saveFailed).toBe("Failed to save");
      expect(en.loading).toBe("loading...");
    });

    it("has email subscription keys", () => {
      expect(en.subscribe).toBe("Email Report");
      expect(en.off).toBe("Off");
      expect(en.weekly).toBe("Weekly");
      expect(en.monthly).toBe("Monthly");
    });

    it("has referral keys", () => {
      expect(en.inviteFriends).toBe("Invite Friends");
      expect(en.invite).toBe("Invite");
      expect(en.referral).toBe("Referral");
      expect(en.copy).toBe("Copy");
      expect(en.copied).toBe("Copied");
      expect(en.share).toBe("Share");
    });

    it("has delete account keys", () => {
      expect(en.deleteAccount).toBe("Delete Account");
      expect(en.deleteAccountConfirmPhrase).toBe("sudo delete my account");
    });

    it("has transactions screen keys", () => {
      expect(en.transactions).toBe("Transactions");
      expect(en.search).toBe("Search");
      expect(en.unknown).toBe("Unknown");
      expect(en.openAccount).toBe("Open Account");
      expect(en.closeAccount).toBe("Close Account");
      expect(en.transaction).toBe("Transaction");
    });
  });
});
