import fs from "fs";
import path from "path";
import { merchantRowText } from "../merchant-row-text";
import type { MerchantListItem } from "../selectors/merchant-sections";

/**
 * w21/139: VoiceOver read a Merchants row as the payee alone, dropping its
 * count, Recurring, cadence, typical amount and "Overdue".
 */
const t = ((key: string, options?: Record<string, unknown>) =>
  options ? `${key}(${JSON.stringify(options)})` : key) as never;

const netflix = (inRecurringSection: boolean, isOverdue: boolean) =>
  ({
    merchant: {
      payee: "Netflix",
      transactionCount: 12,
      lastDate: "2026-08-01",
    },
    resolved: {
      isRecurring: true,
      cadence: "monthly",
      detection: {
        cadence: "monthly",
        typicalAmountByCurrency: { USD: 15.99 },
        primaryCurrency: "USD",
        isApproximate: true,
        nextExpected: "2026-09-01",
        isOverdue,
        isLapsed: false,
        lastPaid: "2026-09-15",
      },
    },
    inRecurringSection,
  }) as unknown as MerchantListItem;

describe("merchantRowText", () => {
  it("reads a recurring overdue row in full", () => {
    const text = merchantRowText(netflix(true, true), t, "en", "2026-10-21");
    expect(text.accessibilityLabel).toBe(
      [
        "Netflix",
        'merchantsTransactionCount({"count":12})',
        "merchantsRecurringBadge",
        "merchantsCadenceMonthly",
        text.trailingAmount,
        "merchantsOverdue",
      ].join(", "),
    );
    expect(text.trailingAmount?.startsWith("~")).toBe(true);
    expect(text.trailingOverdue).toBe(true);
  });

  it("reads a general-list row as its count, badge and last date", () => {
    const text = merchantRowText(netflix(false, false), t, "en", "2026-10-21");
    expect(text.showBadge).toBe(true);
    expect(text.accessibilityLabel).toBe(
      [
        "Netflix",
        'merchantsTransactionCount({"count":12})',
        "merchantsRecurringBadge",
        text.lastDate,
      ].join(", "),
    );
  });
});

// w21/167: a pre-entered payment read as paid.
describe("a pre-entered payment on the Merchants row", () => {
  it("keeps Overdue and names the scheduled one", () => {
    const item = netflix(true, true);
    (item.resolved.detection as { scheduled?: string }).scheduled =
      "2026-11-01";
    expect(
      merchantRowText(item, t, "en", "2026-10-21").trailingMeta?.startsWith(
        "merchantsOverdue · merchantsScheduled(",
      ),
    ).toBe(true);
  });

  it("labels a last date after today as scheduled", () => {
    const item = netflix(false, false);
    item.merchant.lastDate = "2026-11-01";
    expect(
      merchantRowText(item, t, "en", "2026-10-21").lastDate.startsWith(
        "merchantsScheduled(",
      ),
    ).toBe(true);
  });
});

describe("the Merchants row", () => {
  it("is labelled by merchantRowText, with a testID per payee", () => {
    const row = fs.readFileSync(
      path.join(__dirname, "..", "merchant-row.tsx"),
      "utf8",
    );
    expect(
      row.includes("merchantRowText(item, t, locale, today, primaryCurrency)"),
    ).toBe(true);
    expect(row.includes("accessibilityLabel={accessibilityLabel}")).toBe(true);
    expect(row.includes("accessibilityLabel={merchant.payee}")).toBe(false);
    expect(row.includes("testID={`merchant-row-${merchant.payee}`}")).toBe(
      true,
    );
  });
});

// w21/461: a paycheck's typical amount read as an unsigned $5,000.00, like a bill,
// under a detail header that says -$15,000.00.
describe("the typical amount on a recurring row", () => {
  const typical = (amount: number, isApproximate = false) => {
    const item = netflix(true, false) as unknown as {
      resolved: { detection: Record<string, unknown> };
    };
    item.resolved.detection = {
      ...item.resolved.detection,
      typicalAmountByCurrency: { USD: amount },
      isApproximate,
    };
    return merchantRowText(
      item as unknown as MerchantListItem,
      t,
      "en",
      "2026-10-21",
    ).trailingAmount;
  };

  it("carries a paycheck's sign, as the detail header does", () => {
    expect(typical(-5000)).toBe("-$5,000.00");
    expect(typical(-5000, true)).toBe("~-$5,000.00");
  });

  it("leaves a bill unsigned", () => {
    expect(typical(15.99)).toBe("$15.99");
    expect(typical(15.99, true)).toBe("~$15.99");
  });
});

// w21/615: the row showed the currency with the largest number, so one ¥980
// charge abroad replaced a $10.99 bill's amount.
describe("merchantRowText amount currency", () => {
  it("shows the bill's usual currency, not the largest number", () => {
    const item = netflix(true, false) as unknown as {
      resolved: { detection: Record<string, unknown> };
    };
    item.resolved.detection.typicalAmountByCurrency = { USD: 10.99, JPY: 980 };
    item.resolved.detection.primaryCurrency = "USD";
    const text = merchantRowText(
      item as unknown as MerchantListItem,
      t,
      "en",
      "2026-10-21",
    );
    expect(text.trailingAmount?.includes("10.99")).toBe(true);
    expect(text.trailingAmount?.includes("980")).toBe(false);
  });
});

// w21/719: the recurring amount read "-$15.99" for USD in a CAD ledger.
describe("a recurring amount in a ledger whose own dollar is another", () => {
  it("reads by code, and keeps the symbol in a USD ledger", () => {
    const row = netflix(true, false);
    expect(
      merchantRowText(row, t, "en", "2026-10-21", "CAD").trailingAmount,
    ).toBe("~15.99 USD");
    expect(
      merchantRowText(row, t, "en", "2026-10-21", "USD").trailingAmount,
    ).toBe("~$15.99");
  });

  it("is given the ledger's own currency by the Merchants list", () => {
    const read = (file: string) =>
      fs
        .readFileSync(path.join(__dirname, "..", file), "utf8")
        .replace(/\s+/g, "");
    expect(
      read("merchants-screen.tsx").includes(
        "primaryCurrency={primaryCurrency}",
      ),
    ).toBe(true);
    expect(
      read("merchant-row.tsx").includes(
        "merchantRowText(item,t,locale,today,primaryCurrency)",
      ),
    ).toBe(true);
  });
});
