import { describe, expect, it } from "vitest";
import * as locales from "../locales";
import { findFlatPluralIssues, pluralCategories } from "../plural";

describe("pluralCategories", () => {
  it("follows Intl.PluralRules per language", () => {
    expect(pluralCategories("en")).toEqual(["one", "other"]);
    expect(pluralCategories("ru")).toEqual(["one", "few", "many", "other"]);
    expect(pluralCategories("zh")).toEqual(["other"]);
  });
});

describe("findFlatPluralIssues", () => {
  it("accepts families matching each language's categories", () => {
    expect(
      findFlatPluralIssues("en", { k_one: "a", k_other: "b", plain: "text" }),
    ).toEqual([]);
    expect(findFlatPluralIssues("zh", { k_other: "c", plain: "文本" })).toEqual(
      [],
    );
  });

  it("reports a Russian message missing `few` and a Chinese one with `one`", () => {
    expect(
      findFlatPluralIssues("ru", { k_one: "a", k_many: "b", k_other: "c" }),
    ).toEqual([{ language: "ru", key: "k", missing: ["few"], extra: [] }]);
    expect(findFlatPluralIssues("zh", { k_one: "a", k_other: "b" })).toEqual([
      { language: "zh", key: "k", missing: [], extra: ["one"] },
    ]);
  });

  it("ignores keys that only look like a plural suffix", () => {
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
