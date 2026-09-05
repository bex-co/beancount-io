import { createInstance } from "i18next";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "./config";
import en from "./locales/en";

const localeLoaders = {
  en: async () => ({ default: en }),
  bg: () => import("./locales/bg"),
  ca: () => import("./locales/ca"),
  de: () => import("./locales/de"),
  es: () => import("./locales/es"),
  fa: () => import("./locales/fa"),
  fr: () => import("./locales/fr"),
  ja: () => import("./locales/ja"),
  ko: () => import("./locales/ko"),
  nl: () => import("./locales/nl"),
  pt: () => import("./locales/pt"),
  ru: () => import("./locales/ru"),
  sk: () => import("./locales/sk"),
  uk: () => import("./locales/uk"),
  zh: () => import("./locales/zh"),
} satisfies Record<
  SupportedLanguage,
  () => Promise<{ default: Record<string, string> }>
>;

function isSupportedLanguage(language: string): language is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(language);
}

/** One instance per router (and therefore per SSR request), never a singleton. */
export function createLocalization() {
  const i18n = createInstance();
  // English is synchronously available even for errors before beforeLoad runs.
  // I18nextProvider supplies the instance; initReactI18next's global fallback
  // would reintroduce shared mutable language state on the server.
  void i18n.init({
    initImmediate: false,
    resources: { en: { translation: { ...en } } },
    lng: "en",
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false, prefix: "{", suffix: "}" },
    react: { useSuspense: false },
  });
  let revision = 0;
  const pending = new Map<string, Promise<Record<string, string>>>();

  async function changeLanguage(language: string): Promise<boolean> {
    if (!isSupportedLanguage(language)) throw new Error("Unsupported language");
    const requested = ++revision;
    if (!i18n.hasResourceBundle(language, "translation")) {
      let load = pending.get(language);
      if (!load) {
        load = localeLoaders[language]().then((module) => module.default);
        pending.set(language, load);
      }
      try {
        const resources = await load;
        i18n.addResourceBundle(language, "translation", resources);
      } catch (error) {
        // Superseded requests must not surface errors over a newer selection.
        if (requested !== revision) return false;
        throw error;
      } finally {
        pending.delete(language);
      }
    }
    if (requested !== revision) return false;
    await i18n.changeLanguage(language);
    return true;
  }

  return { i18n, changeLanguage };
}

export type Localization = ReturnType<typeof createLocalization>;
