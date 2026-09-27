import { describe, expect, it } from "vitest";
import * as locales from "../locales";
import {
  expandPlural,
  findFlatPluralIssues,
  findPluralIssues,
  pluralCategories,
} from "../plural";

describe("pluralCategories", () => {
  it("follows Intl.PluralRules per language", () => {
    expect(pluralCategories("en")).toEqual(["one", "other"]);
    expect(pluralCategories("ru")).toEqual(["one", "few", "many", "other"]);
    expect(pluralCategories("zh")).toEqual(["other"]);
  });
});

describe("expandPlural", () => {
  it("writes one suffixed key per form, in category order", () => {
    expect(
      expandPlural("page.x", { other: "{count} items", one: "{count} item" }),
    ).toEqual({
      "page.x_one": "{count} item",
      "page.x_other": "{count} items",
    });
  });
});

describe("findPluralIssues", () => {
  it("accepts forms matching each language's categories", () => {
    expect(
      findPluralIssues({
        en: { k: { one: "a", other: "b" }, plain: "text" },
        zh: { k: { other: "c" }, plain: "文本" },
      }),
    ).toEqual([]);
  });

  it("reports a Russian message missing `few` and a Chinese one with `one`", () => {
    expect(
      findPluralIssues({
        ru: { k: { one: "a", many: "b", other: "c" } },
        zh: { k: { one: "a", other: "b" } },
      }),
    ).toEqual([
      { language: "ru", key: "k", missing: ["few"], extra: [] },
      { language: "zh", key: "k", missing: [], extra: ["one"] },
    ]);
  });

  it("finds the same gaps in flattened resources", () => {
    expect(
      findFlatPluralIssues("ru", {
        k_one: "a",
        k_other: "c",
        plain_text: "not a plural family",
      }),
    ).toEqual([
      { language: "ru", key: "k", missing: ["few", "many"], extra: [] },
    ]);
  });
});

describe("shipped locales", () => {
  it("give every plural message exactly its language's categories", () => {
    const issues = Object.entries(locales).flatMap(([language, resources]) =>
      findFlatPluralIssues(language, resources),
    );
    expect(issues).toEqual([]);
  });
});
