import { translationLocales } from "./locale-parity";

// w21/830: the English helper became "Whether this merchant is treated as
// recurring…" (w3/188), and every other language still said "Pin this
// merchant in Recurring", though turning the switch off unpins it.
describe("the Recurring switch's helper", () => {
  const pin =
    /Закачи|\bFixa\b|anheften|\bFija\b|ثابت کنید|Épingler|vast onder|\bFixe\b|Закрепить|Pripnite|Закріпити|固定/u;

  it("says whether, not pin, in every language", () => {
    for (const locale of translationLocales()) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const catalog = require(`../${locale}`)[locale];
      const helper = String(catalog.merchantsRecurringToggleHelper);
      expect([locale, pin.test(helper)]).toEqual([locale, false]);
    }
  });
});
