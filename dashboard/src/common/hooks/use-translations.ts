import { useTranslation } from "react-i18next";
import type en from "@/i18n/locales/en";
import type { PluralBaseKey } from "@/i18n/plural-keys";

type TranslationParams = Record<string, string | number>;

/**
 * A plural key (`PLURAL_BASE_KEYS`) must be given `{ count }`, from which
 * i18next picks the language's form; every other key takes optional params.
 * A key typed as plain `string` (built at runtime) keeps optional params.
 */
type TranslateArgs<K extends string> = K extends PluralBaseKey
  ? [params: TranslationParams & { count: number }]
  : [params?: TranslationParams];

/**
 * Custom hook for type-safe translations
 *
 * Automatically extracts the message from the structured translation format.
 * All translations are now stored as objects with message and description.
 *
 * Usage:
 * ```tsx
 * const { t, i18n } = useTranslations();
 *
 * return <div>{t("common.home")}</div>;
 *
 * // Load resources before changing language; preserve the current UI on failure.
 * const { changeLanguage } = useChangeLanguage();
 * void changeLanguage("zh");
 * ```
 */
export function useTranslations() {
  const { t: i18nT, i18n } = useTranslation();

  const t = <K extends keyof typeof en>(
    key: K,
    ...[params]: TranslateArgs<K>
  ): string => {
    // Development-only validation
    if (import.meta.env.DEV) {
      // Validate namespace prefix
      if (!key.includes(".")) {
        console.error(
          `❌ TRANSLATION ERROR: Unprefixed key "${key}"\n\n` +
            `Translation keys MUST use namespace prefixes.\n` +
            `Format: t("namespace.keyName")\n\n` +
            `Examples:\n` +
            `  ✅ t("auth.login")\n` +
            `  ✅ t("common.save")\n` +
            `  ✅ t("journal.export")\n` +
            `  ❌ t("${key}")\n\n` +
            `See AGENTS.md for more information.`,
        );
      }

      // Warn if key doesn't exist (TypeScript should catch this, but just in case)
      // A count key exists only as its plural variants (`key_one`,
      // `key_other`, …), which i18next resolves from `count`.
      const count = params?.count;
      if (i18n.exists(`${key}_other`, { lng: "en" }) && count === undefined) {
        console.error(
          `❌ TRANSLATION ERROR: "${key}" is a plural message; pass { count }.`,
        );
      } else if (
        !i18n.exists(key, {
          lng: "en",
          ...(typeof count === "number" ? { count } : {}),
        })
      ) {
        console.warn(
          `⚠️  Translation key not found: "${key}"\n` +
            `Add this key to the appropriate locale file.`,
        );
      }
    }

    // i18next returns the plain string with interpolation already applied
    // Our locale files are structured as { key: string } where the string value
    // is already extracted from the { message, description } format by the extractMessages function
    return i18nT(key, params);
  };

  return {
    t,
    i18n,
  };
}
