import * as Localization from "expo-localization";
import { I18n } from "i18n-js";
import { en } from "@/translations/en";
import { zh } from "@/translations/zh";
import { bg } from "@/translations/bg";
import { ca } from "@/translations/ca";
import { de } from "@/translations/de";
import { es } from "@/translations/es";
import { fa } from "@/translations/fa";
import { fr } from "@/translations/fr";
import { nl } from "@/translations/nl";
import { pt } from "@/translations/pt";
import { ru } from "@/translations/ru";
import { sk } from "@/translations/sk";
import { uk } from "@/translations/uk";
import { pluralKeys } from "@/common/plural";

/**
 * The one place the locale set is written down at runtime. Bundled code can't
 * read the directory, so this object is it — and `SUPPORTED_LOCALES` is derived
 * from it rather than repeated, which is how a hand-kept list and a real
 * translation set drift apart. The test-side list is derived from the
 * directory; `__tests__/index.test.ts` asserts the two agree.
 */
const translations = {
  en,
  zh,
  bg,
  ca,
  de,
  es,
  fa,
  fr,
  nl,
  pt,
  ru,
  sk,
  uk,
};

const SUPPORTED_LOCALES = Object.keys(translations);

const getLocale = () => {
  const locales = Localization.getLocales();
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

export const i18n = new I18n(translations);
i18n.enableFallback = true;
// Each locale pluralises by its own CLDR rules (Russian 2 цены / 5 цен,
// Chinese without a `one` form), not by i18n-js's English-only default.
for (const locale of SUPPORTED_LOCALES) {
  i18n.pluralization.register(locale, (_i18n, count) =>
    pluralKeys(locale, count),
  );
}

export const setLocale = (locale: string) => {
  i18n.locale = locale;
};

i18n.locale = getLocale();
