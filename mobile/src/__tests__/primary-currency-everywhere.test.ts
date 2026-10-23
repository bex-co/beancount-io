import fs from "fs";
import path from "path";
import { labelRowAmount, ledgerPrimaryCurrency } from "../common/currency-util";
import { formatMerchantAmount } from "../screens/merchant-detail-screen/selectors/format-merchant-total";

/**
 * w21/732: in a ledger without `operating_currency` the merchant header read
 * its currencies against the ledger's own commodity (w21/415, w21/719), while
 * the rows read only the option: "−120.00 USD" over rows of "−$60.00".
 */
describe("the ledger's primary currency", () => {
  it("labels a USD row and its merchant header alike in a CAD ledger with no option", () => {
    const primary = ledgerPrimaryCurrency([], ["CAD", "USD"]);
    expect(primary).toBe("CAD");
    expect(labelRowAmount("60.00", "USD", primary)).toBe("60.00 USD");
    expect(
      formatMerchantAmount({ total: -120, currency: "USD" }, primary),
    ).toBe("-120.00 USD");
  });

  it("is what the rows' hook reads", () => {
    const hook = fs
      .readFileSync(
        path.join(__dirname, "../common/hooks/use-operating-currency.ts"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      hook.includes(
        "ledgerPrimaryCurrency(ledger.options.operatingCurrency,ledger.attributes.currencies??[],)",
      ),
    ).toBe(true);
  });
});
