import { describe, expect, it } from "vitest";
import * as locales from "../locales";
import {
  findFlatPluralIssues,
  pluralCategories,
  pluralFamily,
} from "../plural";
import { PLURAL_BASE_KEYS } from "../plural-keys";

const NON_PLURAL_COUNTS = new Set([
  // Overflow label with no counted noun.
  "common.moreCount",
  // Subscription quota labels.
  "aiAgent.tokensPerMonth",
  "userSettings.aiTokensPerMonth",
  "userSettings.includedDirectives",
  // These only render at or above the 50-ledger preview cap.
  "userProfile.noMatchesInPreview",
  "userProfile.previewNotice",
]);

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

  it("are exactly the keys PLURAL_BASE_KEYS types as requiring count", () => {
    // Keeps the compile-time list in `plural-keys.ts` in step with the
    // catalogs: a new plural message must be listed to get its `count` check.
    const bases = Object.keys(locales.en)
      .filter((key) => key.endsWith("_other"))
      .map((key) => key.slice(0, -"_other".length))
      .sort();
    expect(bases).toEqual([...PLURAL_BASE_KEYS].sort());
  });

  it("use plural families for English word phrases that follow a count", () => {
    const offenders = Object.entries(locales.en)
      .filter(
        ([key, message]) =>
          /\{count\}\s+[a-z]/i.test(message) &&
          !NON_PLURAL_COUNTS.has(key) &&
          !Object.hasOwn(locales.en, `${key}_other`) &&
          !pluralFamily(key, (variant) => Object.hasOwn(locales.en, variant)),
      )
      .map(([key]) => key);
    expect(offenders).toEqual([]);
  });
});
