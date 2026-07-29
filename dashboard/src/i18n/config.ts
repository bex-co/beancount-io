export const SUPPORTED_LANGUAGES = [
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
  "ja",
  "ko",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  zh: "中文",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  ru: "Русский",
  nl: "Nederlands",
  bg: "Български",
  ca: "Català",
  fa: "فارسی",
  sk: "Slovenčina",
  uk: "Українська",
  ja: "日本語",
  ko: "한국어",
};
