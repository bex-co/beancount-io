import { formatEntryRowAmount } from "../format-entry-row-amount";
import { selectTransactionAmount } from "../../utils/transaction-display-utils";
import { DirectiveType, JournalTransaction } from "../../types";

type Leg = [account: string, number: string, currency?: string];

const transaction = (legs: Leg[]): JournalTransaction => ({
  entry_hash: "row",
  date: "2026-03-31",
  directive_type: DirectiveType.TRANSACTION,
  flag: "*",
  payee: "Q1 2026 Revenue",
  narration: "",
  postings: legs.map(([account, number, currency = "USD"]) => ({
    account,
    units: { number, currency },
  })),
  tags: [],
  links: [],
});

/** The string a row renders for these postings, through the real selector. */
const rowAmount = (legs: Leg[]): string => {
  const amount = selectTransactionAmount(transaction(legs));
  if (!amount) throw new Error("no amount");
  return formatEntryRowAmount(amount.text, amount.value);
};

describe("formatEntryRowAmount", () => {
  it("signs a negative entry", () => {
    expect(
      rowAmount([
        ["Assets:US:Cash-Equivalents", "-180000000.00"],
        ["Income:US:Hedging-Losses", "180000000.00"],
      ]),
    ).toBe("-$180,000,000.00");
  });

  it("keeps the plus sign on money in", () => {
    expect(
      rowAmount([
        ["Assets:US:Checking", "2550.60"],
        ["Income:US:Hoogle:Salary", "-2550.60"],
      ]),
    ).toBe("+$2,550.60");
  });

  it("signs an expense the way its transaction detail does", () => {
    expect(
      rowAmount([
        ["Expenses:Software", "102.00"],
        ["Liabilities:US:Amex", "-102.00"],
      ]),
    ).toBe("-$102.00");
  });

  it("leaves a transfer between cash accounts unsigned", () => {
    expect(
      rowAmount([
        ["Assets:US:Checking", "6931.48"],
        ["Liabilities:US:Chase:Slate", "-6931.48"],
      ]),
    ).toBe("$6,931.48");
  });

  it("leaves a zero unsigned and signs a commodity amount", () => {
    expect(formatEntryRowAmount("$0.00", 0)).toBe("$0.00");
    expect(formatEntryRowAmount("360.00 VACHR", -360)).toBe("-360.00 VACHR");
  });

  it("lets the rows under a merchant add up to its total", () => {
    // The seven Q1 2026 Revenue entries on the public example ledger; the
    // merchant header shows 109,896,000,000.00 for them.
    const cashLegs = [
      "-180000000.00",
      "411000000.00",
      "20028000000.00",
      "12384000000.00",
      "6971000000.00",
      "9883000000.00",
      "60399000000.00",
    ];
    const total = cashLegs
      .map((number) =>
        rowAmount([
          ["Assets:US:Cash-Equivalents", number],
          [
            "Income:US:Revenue",
            number.startsWith("-") ? number.slice(1) : `-${number}`,
          ],
        ]),
      )
      .map((text) => Number(text.replace(/[$,+]/g, "")))
      .reduce((sum, value) => sum + value, 0);

    expect(total).toBe(109896000000);
  });
});
