import {
  buildMerchantSections,
  cadenceLabelKey,
} from "../screens/merchants-screen/selectors/merchant-sections";
import type { MerchantAggregate } from "../screens/merchants-screen/selectors/aggregate-payees";
import type { RecurrenceVerdict } from "../screens/merchants-screen/selectors/detect-recurrence";

const NETFLIX: MerchantAggregate = {
  payee: "Netflix",
  transactionCount: 12,
  firstDate: "2024-01-01",
  lastDate: "2025-06-01",
};
const UBER: MerchantAggregate = {
  payee: "Uber",
  transactionCount: 40,
  firstDate: "2024-01-01",
  lastDate: "2025-07-01",
};
const RENT: MerchantAggregate = {
  payee: "Landlord",
  transactionCount: 6,
  firstDate: "2024-01-01",
  lastDate: "2025-06-01",
};

const MONTHLY: RecurrenceVerdict = {
  cadence: "monthly",
  typicalAmountByCurrency: { USD: -15.99 },
  isApproximate: false,
  nextExpected: "2025-07-01",
  isOverdue: false,
};

const OVERDUE: RecurrenceVerdict = {
  ...MONTHLY,
  nextExpected: "2025-05-01",
  isOverdue: true,
};

describe("buildMerchantSections", () => {
  it("pins detected recurring merchants above the general list", () => {
    const detections = new Map<string, RecurrenceVerdict | null>([
      ["Netflix", MONTHLY],
      ["Uber", null],
      ["Landlord", OVERDUE],
    ]);
    const sections = buildMerchantSections(
      [UBER, NETFLIX, RENT],
      detections,
      () => null,
      "",
      "count",
    );
    expect(sections.map((s) => s.key)).toEqual(["recurring", "all"]);
    expect(sections[0]!.data.map((row) => row.merchant.payee)).toEqual([
      "Landlord",
      "Netflix",
    ]);
    expect(sections[0]!.titleKey).toBe("merchantsRecurringSection");
    expect(sections[1]!.titleKey).toBe(null);
    expect(sections[1]!.data.map((row) => row.merchant.payee)).toEqual([
      "Uber",
      "Netflix",
      "Landlord",
    ]);
    expect(sections[1]!.data[1]!.resolved.isRecurring).toBe(true);
    expect(sections[1]!.data[1]!.inRecurringSection).toBe(false);
  });

  it("lets a notRecurring override hide a detection from the pin", () => {
    const detections = new Map([["Netflix", MONTHLY]]);
    const sections = buildMerchantSections(
      [NETFLIX, UBER],
      detections,
      (payee) => (payee === "Netflix" ? "notRecurring" : null),
      "",
      "alphabetical",
    );
    expect(sections.map((s) => s.key)).toEqual(["all"]);
    expect(sections[0]!.data[0]!.resolved.isRecurring).toBe(false);
  });

  it("lets a recurring override pin an undetected payee", () => {
    const sections = buildMerchantSections(
      [UBER],
      new Map([["Uber", null]]),
      (payee) => (payee === "Uber" ? "recurring" : null),
      "",
      "count",
    );
    expect(sections[0]!.key).toBe("recurring");
    expect(sections[0]!.data[0]!.resolved.cadence).toBe("irregular");
  });

  it("filters both sections by search", () => {
    const detections = new Map([["Netflix", MONTHLY]]);
    const sections = buildMerchantSections(
      [NETFLIX, UBER],
      detections,
      () => null,
      "net",
      "count",
    );
    expect(sections[0]!.data.map((r) => r.merchant.payee)).toEqual(["Netflix"]);
    expect(sections[1]!.data.map((r) => r.merchant.payee)).toEqual(["Netflix"]);
  });
});

describe("cadenceLabelKey", () => {
  it("maps each cadence to a translation key", () => {
    expect(cadenceLabelKey("monthly")).toBe("merchantsCadenceMonthly");
    expect(cadenceLabelKey("irregular")).toBe("merchantsCadenceIrregular");
    expect(cadenceLabelKey(null)).toBe(null);
  });
});
