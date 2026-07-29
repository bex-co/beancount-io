import { useTranslation } from "react-i18next";
import { en } from "@/i18n/locales";

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
 * // Change language
 * i18n.changeLanguage("zh");
 * ```
 */
export function useTranslations() {
  const { t: i18nT, i18n } = useTranslation();

  const t = (
    key: keyof typeof en,
    params?: Record<string, string | number>,
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
            `See CLAUDE.md for more information.`,
        );
      }

      // Warn if key doesn't exist (TypeScript should catch this, but just in case)
      // Check if en is available (might not be in test environment)
      if (typeof en !== "undefined" && !(key in en)) {
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
