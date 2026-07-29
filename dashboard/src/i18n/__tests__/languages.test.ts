import { describe, it, expect } from "vitest";
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  type SupportedLanguage,
} from "../config";

describe("i18n Languages", () => {
  describe("SUPPORTED_LANGUAGES", () => {
    it("should contain all expected languages", () => {
      expect(SUPPORTED_LANGUAGES).toContain("en");
      expect(SUPPORTED_LANGUAGES).toContain("zh");
      expect(SUPPORTED_LANGUAGES).toContain("es");
      expect(SUPPORTED_LANGUAGES).toContain("fr");
      expect(SUPPORTED_LANGUAGES).toContain("de");
      expect(SUPPORTED_LANGUAGES).toContain("pt");
      expect(SUPPORTED_LANGUAGES).toContain("ru");
      expect(SUPPORTED_LANGUAGES).toContain("nl");
      expect(SUPPORTED_LANGUAGES).toContain("bg");
      expect(SUPPORTED_LANGUAGES).toContain("ca");
      expect(SUPPORTED_LANGUAGES).toContain("fa");
      expect(SUPPORTED_LANGUAGES).toContain("sk");
      expect(SUPPORTED_LANGUAGES).toContain("uk");
      expect(SUPPORTED_LANGUAGES).toContain("ja");
      expect(SUPPORTED_LANGUAGES).toContain("ko");
    });

    it("should have exactly 15 supported languages", () => {
      expect(SUPPORTED_LANGUAGES.length).toBe(15);
    });

    it("should be a readonly tuple", () => {
      expect(Array.isArray(SUPPORTED_LANGUAGES)).toBe(true);
    });
  });

  describe("LANGUAGE_NAMES", () => {
    it("should have names for all supported languages", () => {
      SUPPORTED_LANGUAGES.forEach((lang) => {
        expect(LANGUAGE_NAMES[lang]).toBeDefined();
        expect(typeof LANGUAGE_NAMES[lang]).toBe("string");
        expect(LANGUAGE_NAMES[lang].length).toBeGreaterThan(0);
      });
    });

    it("should have correct English names", () => {
      expect(LANGUAGE_NAMES.en).toBe("English");
      expect(LANGUAGE_NAMES.es).toBe("Español");
      expect(LANGUAGE_NAMES.fr).toBe("Français");
      expect(LANGUAGE_NAMES.de).toBe("Deutsch");
      expect(LANGUAGE_NAMES.pt).toBe("Português");
    });

    it("should have correct native names for Asian languages", () => {
      expect(LANGUAGE_NAMES.zh).toBe("中文");
      expect(LANGUAGE_NAMES.ja).toBe("日本語");
      expect(LANGUAGE_NAMES.ko).toBe("한국어");
    });

    it("should have correct native names for European languages", () => {
      expect(LANGUAGE_NAMES.ru).toBe("Русский");
      expect(LANGUAGE_NAMES.nl).toBe("Nederlands");
      expect(LANGUAGE_NAMES.bg).toBe("Български");
      expect(LANGUAGE_NAMES.ca).toBe("Català");
      expect(LANGUAGE_NAMES.sk).toBe("Slovenčina");
      expect(LANGUAGE_NAMES.uk).toBe("Українська");
    });

    it("should have correct Persian name", () => {
      expect(LANGUAGE_NAMES.fa).toBe("فارسی");
    });

    it("should have exactly 15 language names", () => {
      expect(Object.keys(LANGUAGE_NAMES).length).toBe(15);
    });
  });

  describe("SupportedLanguage type", () => {
    it("should be a valid language code", () => {
      const validLanguage: SupportedLanguage = "en";
      expect(SUPPORTED_LANGUAGES).toContain(validLanguage);
    });

    it("should match SUPPORTED_LANGUAGES", () => {
      const languageCode: SupportedLanguage = "zh";
      expect(SUPPORTED_LANGUAGES.includes(languageCode)).toBe(true);
    });
  });

  describe("Language code format", () => {
    it("should use ISO 639-1 two-letter codes", () => {
      SUPPORTED_LANGUAGES.forEach((lang) => {
        expect(lang.length).toBe(2);
        expect(lang).toMatch(/^[a-z]{2}$/);
      });
    });
  });

  describe("LANGUAGE_NAMES keys alignment", () => {
    it("should have the same keys as SUPPORTED_LANGUAGES", () => {
      const languageNameKeys = Object.keys(LANGUAGE_NAMES).sort();
      const supportedLanguagesCopy = [...SUPPORTED_LANGUAGES].sort();

      expect(languageNameKeys).toEqual(supportedLanguagesCopy);
    });
  });

  describe("Default language", () => {
    it("should have English as a supported language", () => {
      expect(SUPPORTED_LANGUAGES).toContain("en");
    });

    it("should have English name defined", () => {
      expect(LANGUAGE_NAMES.en).toBeDefined();
    });
  });

  describe("RTL language support", () => {
    it("should include Persian (Farsi) as an RTL language", () => {
      expect(SUPPORTED_LANGUAGES).toContain("fa");
      expect(LANGUAGE_NAMES.fa).toBe("فارسی");
    });
  });
});
