import { translationLocales } from "./locale-parity";

// w21/829: Catalan and Portuguese named Equity and Net Worth alike ("Patrimoni
// net", "Patrimônio líquido"), so two different figures shared one label.
describe("Equity and Net Worth", () => {
  it("read differently in every language", () => {
    for (const locale of translationLocales()) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const catalog = require(`../${locale}`)[locale];
      expect([locale, catalog.equity === catalog.netWorth]).toEqual([
        locale,
        false,
      ]);
    }
  });
});
