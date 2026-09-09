import type { Locale } from "react-day-picker";
import { enUS } from "react-day-picker/locale/en-US";
import type { SupportedLanguage } from "@/i18n/config";

/**
 * DayPicker locale modules extend date-fns locales with accessibility labels.
 * English is sync (always available); other languages stay dynamic imports.
 */
const dateLocaleLoaders = {
  en: async () => enUS,
  bg: () => import("react-day-picker/locale/bg").then((m) => m.bg),
  ca: () => import("react-day-picker/locale/ca").then((m) => m.ca),
  de: () => import("react-day-picker/locale/de").then((m) => m.de),
  es: () => import("react-day-picker/locale/es").then((m) => m.es),
  fa: () => import("react-day-picker/locale/fa-IR").then((m) => m.faIR),
  fr: () => import("react-day-picker/locale/fr").then((m) => m.fr),
  ja: () => import("react-day-picker/locale/ja").then((m) => m.ja),
  ko: () => import("react-day-picker/locale/ko").then((m) => m.ko),
  nl: () => import("react-day-picker/locale/nl").then((m) => m.nl),
  pt: () => import("react-day-picker/locale/pt").then((m) => m.pt),
  ru: () => import("react-day-picker/locale/ru").then((m) => m.ru),
  sk: () => import("react-day-picker/locale/sk").then((m) => m.sk),
  uk: () => import("react-day-picker/locale/uk").then((m) => m.uk),
  zh: () => import("react-day-picker/locale/zh-CN").then((m) => m.zhCN),
} satisfies Record<SupportedLanguage, () => Promise<Locale>>;

export { enUS as defaultDateLocale };

export function loadDateLocale(language: SupportedLanguage): Promise<Locale> {
  return dateLocaleLoaders[language]();
}
