import {
  mapToCategorizationFormat,
  buildBeancountTransaction,
} from "../plaid-mapper";
import type { PlaidTransaction } from "../../data/plaid-transaction-model/types";

function makePlaidTransaction(
  overrides: Partial<PlaidTransaction> = {},
): PlaidTransaction {
  return {
    id: "ptxn_abc123",
    plaidAccountId: "pacc_xyz456",
    transactionId: "plaid-tx-001",
    date: new Date("2024-03-15"),
    amount: "42.50",
    name: "STARBUCKS",
    merchantName: "Starbucks",
    isPending: false,
    syncedToLedger: false,
    createdAt: new Date("2024-03-15"),
    updatedAt: new Date("2024-03-15"),
    ...overrides,
  };
}

describe("plaid-mapper", () => {
  describe("mapToCategorizationFormat", () => {
    it("should map transactions to categorization format", () => {
      const transactions = [
        makePlaidTransaction({
          amount: "42.50",
          name: "STARBUCKS",
          merchantName: "Starbucks",
        }),
        makePlaidTransaction({
          amount: "15.00",
          name: "UBER TRIP",
          merchantName: undefined,
        }),
      ];

      const result = mapToCategorizationFormat(transactions);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        rowIndex: 0,
        date: "2024-03-15",
        payee: "Starbucks",
        description: "STARBUCKS",
        amount: 42.5,
      });
      expect(result[1]).toEqual({
        rowIndex: 1,
        date: "2024-03-15",
        payee: "UBER TRIP",
        description: "UBER TRIP",
        amount: 15.0,
      });
    });

    it("should use merchantName as payee when present", () => {
      const transactions = [
        makePlaidTransaction({
          name: "WHOLE FOODS MARKET",
          merchantName: "Whole Foods",
        }),
      ];

      const result = mapToCategorizationFormat(transactions);

      expect(result[0].payee).toBe("Whole Foods");
      expect(result[0].description).toBe("WHOLE FOODS MARKET");
    });

    it("should fall back to name as payee when merchantName is absent", () => {
      const transactions = [
        makePlaidTransaction({ name: "TRANSFER", merchantName: undefined }),
      ];

      const result = mapToCategorizationFormat(transactions);

      expect(result[0].payee).toBe("TRANSFER");
    });

    it("should return correct rowIndex for each transaction", () => {
      const transactions = [
        makePlaidTransaction(),
        makePlaidTransaction(),
        makePlaidTransaction(),
      ];

      const result = mapToCategorizationFormat(transactions);

      expect(result[0].rowIndex).toBe(0);
      expect(result[1].rowIndex).toBe(1);
      expect(result[2].rowIndex).toBe(2);
    });

    it("should return empty array for empty input", () => {
      const result = mapToCategorizationFormat([]);

      expect(result).toEqual([]);
    });

    it("should format date as YYYY-MM-DD", () => {
      const transactions = [
        makePlaidTransaction({ date: new Date("2024-12-31") }),
      ];

      const result = mapToCategorizationFormat(transactions);

      expect(result[0].date).toBe("2024-12-31");
    });

    it("should parse amount string to number", () => {
      const transactions = [makePlaidTransaction({ amount: "123.45" })];

      const result = mapToCategorizationFormat(transactions);

      expect(result[0].amount).toBe(123.45);
      expect(typeof result[0].amount).toBe("number");
    });
  });

  describe("buildBeancountTransaction", () => {
    const sourceAccount = "Assets:Checking:BankOfAmerica";
    const targetAccount = "Expenses:Food:Coffee";

    it("should build a valid beancount transaction for an expense", () => {
      const plaidTx = makePlaidTransaction({
        amount: "42.50",
        name: "STARBUCKS",
        merchantName: "Starbucks",
        isPending: false,
        date: new Date("2024-03-15"),
      });

      const result = buildBeancountTransaction(
        plaidTx,
        sourceAccount,
        targetAccount,
      );

      expect(result.date).toBe("2024-03-15");
      expect(result.flag).toBe("*");
      expect(result.payee).toBe("Starbucks");
      expect(result.narration).toBe("STARBUCKS");
      expect(result.postings).toHaveLength(2);
    });

    it("should set source account posting as negative for an expense", () => {
      const plaidTx = makePlaidTransaction({ amount: "42.50" });

      const result = buildBeancountTransaction(
        plaidTx,
        sourceAccount,
        targetAccount,
      );

      // Source account (bank) loses money - negative
      expect(result.postings[0].account).toBe(sourceAccount);
      expect(result.postings[0].units.number).toBe("-42.50");
      // Target account (expense) gains - positive
      expect(result.postings[1].account).toBe(targetAccount);
      expect(result.postings[1].units.number).toBe("42.50");
    });

    it("should set source account posting as positive for income (negative amount)", () => {
      const plaidTx = makePlaidTransaction({ amount: "-100.00" });

      const result = buildBeancountTransaction(
        plaidTx,
        sourceAccount,
        "Income:Salary",
      );

      // Source account (bank) gains money - positive
      expect(result.postings[0].units.number).toBe("100.00");
      // Target account (income) loses - negative
      expect(result.postings[1].units.number).toBe("-100.00");
    });

    it("should use ! flag for pending transactions", () => {
      const plaidTx = makePlaidTransaction({ isPending: true });

      const result = buildBeancountTransaction(
        plaidTx,
        sourceAccount,
        targetAccount,
      );

      expect(result.flag).toBe("!");
    });

    it("should use * flag for cleared transactions", () => {
      const plaidTx = makePlaidTransaction({ isPending: false });

      const result = buildBeancountTransaction(
        plaidTx,
        sourceAccount,
        targetAccount,
      );

      expect(result.flag).toBe("*");
    });

    it("should use default USD currency when not specified", () => {
      const plaidTx = makePlaidTransaction();

      const result = buildBeancountTransaction(
        plaidTx,
        sourceAccount,
        targetAccount,
      );

      expect(result.postings[0].units.currency).toBe("USD");
      expect(result.postings[1].units.currency).toBe("USD");
    });

    it("should use custom currency when specified", () => {
      const plaidTx = makePlaidTransaction();

      const result = buildBeancountTransaction(
        plaidTx,
        sourceAccount,
        targetAccount,
        "CAD",
      );

      expect(result.postings[0].units.currency).toBe("CAD");
      expect(result.postings[1].units.currency).toBe("CAD");
    });

    it("should set payee to undefined when merchantName is absent", () => {
      const plaidTx = makePlaidTransaction({
        merchantName: undefined,
        name: "ATM WITHDRAWAL",
      });

      const result = buildBeancountTransaction(
        plaidTx,
        sourceAccount,
        targetAccount,
      );

      expect(result.payee).toBeUndefined();
      expect(result.narration).toBe("ATM WITHDRAWAL");
    });

    it("should format amount to 2 decimal places", () => {
      const plaidTx = makePlaidTransaction({ amount: "10.5" });

      const result = buildBeancountTransaction(
        plaidTx,
        sourceAccount,
        targetAccount,
      );

      expect(result.postings[0].units.number).toBe("-10.50");
      expect(result.postings[1].units.number).toBe("10.50");
    });
  });
});
