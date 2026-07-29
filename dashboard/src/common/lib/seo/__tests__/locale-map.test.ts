import { describe, it, expect } from "vitest";
import { OG_LOCALE_MAP, getOgLocale } from "../locale-map";

describe("OG_LOCALE_MAP", () => {
  it("should have all 13 supported languages", () => {
    const expectedLanguages = [
      "en",
      "zh",
      "es",
      "fr",
      "de",
      "pt",
      "ru",
      "nl",
      "bg",
      "ca",
      "fa",
      "sk",
      "uk",
    ];

    expectedLanguages.forEach((lang) => {
      expect(OG_LOCALE_MAP).toHaveProperty(lang);
    });

    expect(Object.keys(OG_LOCALE_MAP)).toHaveLength(13);
  });

  it("should have valid OpenGraph locale format (language_REGION)", () => {
    Object.values(OG_LOCALE_MAP).forEach((locale) => {
      // OpenGraph locale format: 2 lowercase letters, underscore, 2 uppercase letters
      expect(locale).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
    });
  });

  it("should map common languages correctly", () => {
    expect(OG_LOCALE_MAP.en).toBe("en_US");
    expect(OG_LOCALE_MAP.zh).toBe("zh_CN");
    expect(OG_LOCALE_MAP.es).toBe("es_ES");
    expect(OG_LOCALE_MAP.fr).toBe("fr_FR");
    expect(OG_LOCALE_MAP.de).toBe("de_DE");
    expect(OG_LOCALE_MAP.pt).toBe("pt_BR");
    expect(OG_LOCALE_MAP.ru).toBe("ru_RU");
  });
});

describe("getOgLocale", () => {
  it("should return correct OpenGraph locale for known languages", () => {
    expect(getOgLocale("en")).toBe("en_US");
    expect(getOgLocale("zh")).toBe("zh_CN");
    expect(getOgLocale("es")).toBe("es_ES");
    expect(getOgLocale("fr")).toBe("fr_FR");
    expect(getOgLocale("de")).toBe("de_DE");
    expect(getOgLocale("pt")).toBe("pt_BR");
    expect(getOgLocale("ru")).toBe("ru_RU");
    expect(getOgLocale("nl")).toBe("nl_NL");
    expect(getOgLocale("bg")).toBe("bg_BG");
    expect(getOgLocale("ca")).toBe("ca_ES");
    expect(getOgLocale("fa")).toBe("fa_IR");
    expect(getOgLocale("sk")).toBe("sk_SK");
    expect(getOgLocale("uk")).toBe("uk_UA");
  });

  it("should return en_US as default for unknown languages", () => {
    expect(getOgLocale("unknown")).toBe("en_US");
    expect(getOgLocale("")).toBe("en_US");
    expect(getOgLocale("xyz")).toBe("en_US");
  });

  it("should handle language codes case-sensitively", () => {
    // The function expects lowercase language codes; uppercase "EN" is not in the map
    // and thus falls back to the default (en_US)
    expect(getOgLocale("EN")).toBe("en_US"); // Not mapped, falls back to default
    expect(getOgLocale("en")).toBe("en_US"); // Mapped correctly
  });

  it("should handle null-like values gracefully", () => {
    // @ts-expect-error - Testing runtime behavior with invalid input
    expect(getOgLocale(null)).toBe("en_US");
    // @ts-expect-error - Testing runtime behavior with invalid input
    expect(getOgLocale(undefined)).toBe("en_US");
  });

  it("should handle language codes with extra characters", () => {
    expect(getOgLocale("en-US")).toBe("en_US"); // Not in map, falls back
    expect(getOgLocale("zh-CN")).toBe("en_US"); // Not in map, falls back
    expect(getOgLocale("pt-BR")).toBe("en_US"); // Not in map, falls back
  });

  it("should handle whitespace in language codes", () => {
    expect(getOgLocale(" en")).toBe("en_US"); // Leading space, falls back
    expect(getOgLocale("en ")).toBe("en_US"); // Trailing space, falls back
    expect(getOgLocale(" ")).toBe("en_US"); // Just space, falls back
  });

  it("should consistently return en_US for all fallback cases", () => {
    const invalidInputs = ["invalid", "xx", "123", "en-gb", "français", "中文"];

    invalidInputs.forEach((input) => {
      expect(getOgLocale(input)).toBe("en_US");
    });
  });
});
