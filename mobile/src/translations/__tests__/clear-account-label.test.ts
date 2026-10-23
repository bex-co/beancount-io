import { translationLocales } from "./locale-parity";

// w21/831: Slovak labelled the filter's clear-account button "Vymazať účet",
// the words of Settings' Delete account, so VoiceOver announced a destructive
// action.
describe("the filter's clear-account label", () => {
  it("never reads as Delete account", () => {
    for (const locale of translationLocales()) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const catalog = require(`../${locale}`)[locale];
      expect([
        locale,
        String(catalog.clearAccount).toLowerCase() ===
          String(catalog.deleteAccount).toLowerCase(),
      ]).toEqual([locale, false]);
    }
  });
});
