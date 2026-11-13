import fs from "fs";
import path from "path";
import { historyCountLabel } from "../budget-labels";
import { de } from "../../../../translations/de";
import { en } from "../../../../translations/en";
import { fa } from "../../../../translations/fa";
import { ru } from "../../../../translations/ru";
import { zh } from "../../../../translations/zh";

// w22/043: the history toggle under each budget card read "2 مورد" in Persian,
// the only Latin digit on a card whose amounts, ticks and months are Persian.
// `t` prints a count in Latin digits; the label opts into the language's own.
const translator =
  (catalog: unknown) => (key: string, params?: Record<string, unknown>) => {
    const value = (catalog as Record<string, unknown>)[key];
    const text =
      typeof value === "object" && value !== null
        ? (value as Record<string, string>)[
            params?.count === 1 ? "one" : "other"
          ]
        : String(value);
    return text.replace(/{{(\w+)}}/g, (_match, name: string) =>
      String(params?.[name]),
    );
  };

describe("the budget history toggle's count", () => {
  it("is written in Persian digits in Persian", () => {
    const t = translator(fa);
    expect(historyCountLabel(2, t, "fa")).toBe("۲ مورد");
    expect(historyCountLabel(12, t, "fa")).toBe("۱۲ مورد");
    expect(/[0-9]/.test(historyCountLabel(30, t, "fa"))).toBe(false);
  });

  it("keeps the Latin digits of every other language", () => {
    expect(historyCountLabel(2, translator(en), "en")).toBe("2 entries");
    for (const [catalog, locale] of [
      [de, "de"],
      [ru, "ru"],
      [zh, "zh"],
    ] as const) {
      const t = translator(catalog);
      expect(historyCountLabel(12, t, locale)).toBe(
        t("budgetHistoryCount", { count: 12 }),
      );
    }
  });

  it("is what the card's toggle shows and speaks, not a bare t() call", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "..", "components", "budget-history-rows.tsx"),
      "utf8",
    );
    expect(source.includes("historyCountLabel(rows.length, t, locale)")).toBe(
      true,
    );
    expect(source.includes('t("budgetHistoryCount"')).toBe(false);
  });
});
