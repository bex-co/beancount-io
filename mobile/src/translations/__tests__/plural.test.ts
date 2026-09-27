/**
 * Plural forms follow each language's CLDR rules, and every catalog provides
 * exactly the categories its language distinguishes — no Russian key without
 * `few`, no Chinese key with a `one` nobody renders.
 */
import { I18n } from "i18n-js";
import {
  pluralCategory,
  pluralCategoryMismatches,
  pluralKeys,
} from "../../common/plural";
import {
  declaredKeys,
  localeModules,
  localeSource,
  translationLocales,
} from "./locale-parity";
import { en } from "../en";
import { ru } from "../ru";
import { zh } from "../zh";

describe("pluralCategory", () => {
  it("picks the CLDR category for the count", () => {
    expect(pluralCategory("en", 1)).toBe("one");
    expect(pluralCategory("en", 2)).toBe("other");
    expect(pluralCategory("ru", 1)).toBe("one");
    expect(pluralCategory("ru", 2)).toBe("few");
    expect(pluralCategory("ru", 5)).toBe("many");
    expect(pluralCategory("ru", 21)).toBe("one");
    expect(pluralCategory("zh", 1)).toBe("other");
  });

  it("falls back to other after the locale's category", () => {
    expect(pluralKeys("ru", 2)).toEqual(["few", "other"]);
    expect(pluralKeys("zh", 1)).toEqual(["other"]);
  });
});

describe("pluralCategoryMismatches", () => {
  it("flags a Russian plural without few and many", () => {
    expect(
      pluralCategoryMismatches("ru", {
        count: { one: "{{count}} a", other: "{{count}} b" },
        plain: "text",
      }),
    ).toEqual([{ key: "count", missing: ["few", "many"], extra: [] }]);
  });

  it("flags a Chinese plural carrying one", () => {
    expect(
      pluralCategoryMismatches("zh", {
        count: { one: "{{count}} 个", other: "{{count}} 个" },
      }),
    ).toEqual([{ key: "count", missing: [], extra: ["one"] }]);
  });

  it("accepts a catalog with exactly the locale's categories", () => {
    expect(
      pluralCategoryMismatches("es", {
        count: { one: "a", many: "b", other: "c" },
      }),
    ).toEqual([]);
  });
});

describe("shipped catalogs", () => {
  it("give every plural key exactly its language's categories", () => {
    const report: Record<string, unknown> = {};
    for (const locale of ["en", ...translationLocales()]) {
      const keys =
        locale === "en" ? Object.keys(en) : declaredKeys(localeSource(locale));
      const catalog =
        locale === "en"
          ? (en as Record<string, unknown>)
          : localeModules[locale];
      const mismatches = pluralCategoryMismatches(locale, catalog, keys);
      if (mismatches.length > 0) report[locale] = mismatches;
    }
    expect(report).toEqual({});
  });
});

describe("rendering counts", () => {
  const i18n = new I18n({ en, ru, zh });
  for (const locale of ["en", "ru", "zh"]) {
    i18n.pluralization.register(locale, (_i18n, count) =>
      pluralKeys(locale, count),
    );
  }
  const render = (locale: string, count: number) =>
    i18n.t("pricesNotUpdatedSince", { locale, count, date: "Sep 8, 2017" });

  it("reads naturally in English", () => {
    expect(render("en", 1)).toBe("1 price not updated since Sep 8, 2017");
    expect(render("en", 2)).toBe("2 prices not updated since Sep 8, 2017");
    expect(render("en", 5)).toBe("5 prices not updated since Sep 8, 2017");
  });

  it("uses Russian's few and many forms", () => {
    expect(render("ru", 1)).toBe("1 цена не обновлялась с Sep 8, 2017");
    expect(render("ru", 2)).toBe("2 цены не обновлялись с Sep 8, 2017");
    expect(render("ru", 5)).toBe("5 цен не обновлялись с Sep 8, 2017");
  });

  it("uses Chinese's single form", () => {
    expect(render("zh", 1)).toBe("1 个价格自 Sep 8, 2017 起未更新");
    expect(render("zh", 2)).toBe("2 个价格自 Sep 8, 2017 起未更新");
    expect(render("zh", 5)).toBe("5 个价格自 Sep 8, 2017 起未更新");
  });
});
