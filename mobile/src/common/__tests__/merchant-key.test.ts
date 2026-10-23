import { detectRecurrence } from "../../screens/merchants-screen/selectors/detect-recurrence";
import { merchantKey, seriesByMerchant } from "../merchant-key";

/**
 * w21/169: a merchant spelled two ways got recurrence from one spelling's
 * series only — a false Overdue, or no detection at all.
 */
const streaming = (date: string) => ({ date, currency: "USD", amount: 15.49 });

// w21/569: "İ".toLowerCase() is "i" + U+0307, so a typed "iş" was never a
// substring of "İşBank ATM".
describe("merchantKey with a Turkish dotted capital", () => {
  it("reads İ as i", () => {
    expect(merchantKey("İşBank ATM")).toBe("işbank atm");
    expect(merchantKey("İZMİR Kahve")).toBe("izmir kahve");
  });

  it("lets a plain search find it", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {
      filterMerchants,
    } = require("../../screens/merchants-screen/selectors/aggregate-payees");
    const merchants = [
      { payee: "İşBank ATM" },
      { payee: "İZMİR Kahve" },
      { payee: "Cafe" },
    ];
    const names = (query: string) =>
      filterMerchants(merchants, query).map((m: { payee: string }) => m.payee);
    expect(names("iş")).toEqual(["İşBank ATM"]);
    expect(names("izmir")).toEqual(["İZMİR Kahve"]);
    expect(names("İş")).toEqual(["İşBank ATM"]);
  });
});

describe("merchantKey with curly quotes", () => {
  it("reads Smart Punctuation's ’ as the apostrophe typed (w21/519)", () => {
    expect(merchantKey("Trader Joe\u2019s")).toBe(merchantKey("Trader Joe's"));
    expect(merchantKey("The \u201cBig\u201d Cafe")).toBe(
      merchantKey('The "Big" Cafe'),
    );
  });
});

describe("seriesByMerchant", () => {
  it("reads drifted spellings as one merchant's history", () => {
    const merged = seriesByMerchant(
      new Map([
        [
          "QaFlix",
          ["01", "02", "03", "04", "05", "06"].map((m) =>
            streaming(`2026-${m}-15`),
          ),
        ],
        [
          "QAFLIX",
          ["07", "08", "09", "10"].map((m) => streaming(`2026-${m}-15`)),
        ],
      ]),
    );
    expect([...merged.keys()]).toEqual(["qaflix"]);
    const verdict = detectRecurrence(merged.get("qaflix")!, "2026-10-21");
    expect(verdict?.cadence).toBe("monthly");
    expect(verdict?.isOverdue).toBe(false);
    expect(verdict?.nextExpected).toBe("2026-11-15");
  });

  it("detects alternating spellings", () => {
    const months = ["03", "04", "05", "06", "07", "08"];
    const merged = seriesByMerchant(
      new Map([
        [
          "QaFlix",
          months
            .filter((_, i) => i % 2 === 0)
            .map((m) => streaming(`2026-${m}-15`)),
        ],
        [
          "QAFLIX",
          months
            .filter((_, i) => i % 2 === 1)
            .map((m) => streaming(`2026-${m}-15`)),
        ],
      ]),
    );
    expect(detectRecurrence(merged.get("qaflix")!, "2026-08-20")?.cadence).toBe(
      "monthly",
    );
  });

  it("keys by the trimmed, case-folded payee", () => {
    expect(merchantKey(" QaFlix ")).toBe("qaflix");
  });
});

// w21/835: the history of one merchant written two ways merges.
describe("merchantKey across Arabic-script spellings", () => {
  it("reads Arabic yeh and kaf as the Persian letters", () => {
    expect(merchantKey("Qa كافي شاپ")).toBe(merchantKey("Qa کافی شاپ"));
  });

  it("reads a zero-width non-joiner as a space, and drops harakat", () => {
    expect(merchantKey("می\u200cخرم")).toBe(merchantKey("می خرم"));
    expect(merchantKey("كَافِي")).toBe(merchantKey("کافی"));
  });

  it("leaves other text as before", () => {
    expect(merchantKey("  Whole  Foods ")).toBe("whole foods");
  });
});
