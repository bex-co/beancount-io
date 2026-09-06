import { describe, expect, it } from "vitest";
import * as resources from "@/i18n/locales";
import { SUPPORTED_LANGUAGES } from "@/i18n/config";
import enUserProfile from "../en";

// Checking locale files alone misses translations omitted by the runtime aggregator.
describe("user profile runtime translations", () => {
  it.each(SUPPORTED_LANGUAGES)(
    "registers every profile translation in %s",
    (language) => {
      const registered = resources[language];
      for (const key of Object.keys(enUserProfile)) {
        expect(registered[key], `${language}: ${key}`).toBeTruthy();
      }
    },
  );

  it("serves the localized search label instead of the English fallback", () => {
    expect(resources.zh["userProfile.searchLedgers"]).toBe("搜索账簿…");
    expect(resources.ja["userProfile.searchLedgers"]).toBe("帳簿を検索…");
  });
});
