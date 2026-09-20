import { describe, expect, it } from "vitest";
import bg from "@/i18n/locales/bg";
import ca from "@/i18n/locales/ca";
import de from "@/i18n/locales/de";
import en from "@/i18n/locales/en";
import es from "@/i18n/locales/es";
import fa from "@/i18n/locales/fa";
import fr from "@/i18n/locales/fr";
import ja from "@/i18n/locales/ja";
import ko from "@/i18n/locales/ko";
import nl from "@/i18n/locales/nl";
import pt from "@/i18n/locales/pt";
import ru from "@/i18n/locales/ru";
import sk from "@/i18n/locales/sk";
import uk from "@/i18n/locales/uk";
import zh from "@/i18n/locales/zh";

/**
 * The Errors table's own column headings and its "Line 35" prefix are authored
 * labels, unlike the raw ledger diagnostics beside them. Several catalogs
 * still shipped the English source, some of them mixed into a translated
 * phrase ("错误 Message"). These assert the shipped values, and would fail
 * again if a catalog fell back to English.
 */

const CATALOGS = { bg, ca, de, es, fa, fr, ja, ko, nl, pt, ru, sk, uk, zh };

/** The exact values reproduced as wrong, so a regression is caught by name. */
const REPAIRED = [
  ["zh", "page.errors.errorMessage", "错误信息", "错误 Message"],
  ["ru", "page.errors.errorMessage", "Сообщение об ошибке", "Ошибка Message"],
  [
    "uk",
    "page.errors.errorMessage",
    "Повідомлення про помилку",
    "Помилка Message",
  ],
  ["ca", "page.errors.errorMessage", "Missatge d'error", "Error Message"],
  ["fr", "page.errors.errorMessage", "Message d'erreur", "Error Message"],
  ["zh", "page.errors.line", "行", "Line"],
  ["es", "page.errors.line", "Línea", "Line"],
  ["de", "page.errors.line", "Zeile", "Line"],
  ["fr", "page.errors.line", "Ligne", "Line"],
  ["ru", "page.errors.line", "Строка", "Line"],
] as const;

describe("Errors table labels", () => {
  it.each(REPAIRED)(
    "%s translates %s instead of shipping %j",
    (code, key, expected, wrong) => {
      const catalog = CATALOGS[code as keyof typeof CATALOGS];
      expect(catalog[key]).toBe(expected);
      expect(catalog[key]).not.toBe(wrong);
    },
  );

  it.each(Object.keys(CATALOGS))(
    "%s translates both labels away from the English source",
    (code) => {
      const catalog = CATALOGS[code as keyof typeof CATALOGS];
      for (const key of ["page.errors.errorMessage", "page.errors.line"]) {
        expect(catalog[key]).toBeTruthy();
        // Not the English source. A shared word is fine — French's
        // "Message d'erreur" is correct — so the half-translated values are
        // named individually above rather than banned by pattern.
        expect(catalog[key]).not.toBe(en[key]);
      }
    },
  );

  it("leaves English and the Japanese control as they were", () => {
    expect(en["page.errors.errorMessage"]).toBe("Error Message");
    expect(en["page.errors.line"]).toBe("Line");
    expect(ja["page.errors.errorMessage"]).toBe("エラーメッセージ");
    expect(ja["page.errors.line"]).toBe("行");
    expect(ko["page.errors.line"]).toBe("줄");
  });

  it("reads as a line prefix in front of a number", () => {
    // The cell is composed as `${t("page.errors.line")} ${lineno}`.
    expect(`${zh["page.errors.line"]} 35`).toBe("行 35");
    expect(`${es["page.errors.line"]} 35`).toBe("Línea 35");
  });
});
