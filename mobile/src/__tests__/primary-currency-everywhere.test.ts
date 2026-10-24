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

// w21/896: a CAD merchant in a EUR ledger read "$150.00" over rows of "-150.00 CAD".
describe("another dollar currency in a ledger that is not in dollars", () => {
  it("reads the merchant header by code, as its rows read", () => {
    expect(labelRowAmount("150.00", "CAD", "EUR")).toBe("150.00 CAD");
    expect(formatMerchantAmount({ total: -150, currency: "CAD" }, "EUR")).toBe(
      "-150.00 CAD",
    );
    expect(formatMerchantAmount({ total: 80, currency: "AUD" }, "GBP")).toBe(
      "80.00 AUD",
    );
  });

  it("keeps the dollar sign for USD and for the primary currency", () => {
    expect(formatMerchantAmount({ total: 150, currency: "USD" }, "EUR")).toBe(
      "$150.00",
    );
    expect(formatMerchantAmount({ total: 150, currency: "CAD" }, "CAD")).toBe(
      "$150.00",
    );
  });
});
