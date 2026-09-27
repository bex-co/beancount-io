import { createInstance } from "i18next";
import { describe, expect, it } from "vitest";
import { findPluralIssues } from "@/i18n/plural";
import { extractMessages } from "@/i18n/utils";
import {
  dashboardOverviewMessages,
  dashboardOverviewTranslations,
} from "../dashboard-translations";

async function translatorFor(language: "en" | "ru" | "zh") {
  const i18n = createInstance();
  await i18n.init({
    lng: language,
    resources: {
      [language]: {
        translation: extractMessages(dashboardOverviewTranslations[language]),
      },
    },
    interpolation: { escapeValue: false, prefix: "{", suffix: "}" },
  });
  return (count: number) =>
    [
      i18n.t("page.overview.pricesNotUpdated", { count, date: "D" }),
      i18n.t("page.overview.notInTotalCount", { count }),
    ].join(" | ");
}

describe("overview count messages", () => {
  it("carry exactly the plural categories each language uses", () => {
    expect(findPluralIssues(dashboardOverviewMessages)).toEqual([]);
  });

  it("read as natural sentences for 1, 2 and 5", async () => {
    const en = await translatorFor("en");
    expect([1, 2, 5].map(en)).toEqual([
      "1 price not updated since D | 1 not in total",
      "2 prices not updated since D | 2 not in total",
      "5 prices not updated since D | 5 not in total",
    ]);
    const ru = await translatorFor("ru");
    expect([1, 2, 5].map(ru)).toEqual([
      "1 цена не обновлялась с D | 1 вне итога",
      "2 цены не обновлялись с D | 2 вне итога",
      "5 цен не обновлялись с D | 5 вне итога",
    ]);
    const zh = await translatorFor("zh");
    expect([1, 2, 5].map(zh)).toEqual([
      "1 个价格自 D 起未更新 | 1 项未计入合计",
      "2 个价格自 D 起未更新 | 2 项未计入合计",
      "5 个价格自 D 起未更新 | 5 项未计入合计",
    ]);
  });
});
