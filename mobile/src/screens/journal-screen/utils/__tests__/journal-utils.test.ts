import {
  getEntryAccounts,
  formatAccountName,
  getAccountFlow,
  getTransactionAmount,
  groupEntriesByDate,
  type JournalEntryPosting,
  type JournalEntry,
} from "../journal-utils";
import { DirectiveType, type JournalDirectiveType } from "../../types";

describe("journal-utils", () => {
  describe("getEntryAccounts", () => {
    it("should return every posting account for a transaction", () => {
      const entry = {
        entry_hash: "h1",
        date: "2025-06-09",
        directive_type: DirectiveType.TRANSACTION,
        flag: "*",
        payee: "Kin Soy",
        postings: [
          {
            account: "Expenses:Food:Restaurant",
            units: { number: "23.09", currency: "USD" },
          },
          {
            account: "Assets:Bank:Checking",
            units: { number: "-23.09", currency: "USD" },
          },
        ],
        tags: [],
        links: [],
      } as unknown as JournalDirectiveType;

      expect(getEntryAccounts(entry)).toEqual([
        "Expenses:Food:Restaurant",
        "Assets:Bank:Checking",
      ]);
    });

    it("should return an empty array for a transaction with no postings", () => {
      const entry = {
        entry_hash: "h2",
        date: "2025-06-09",
        directive_type: DirectiveType.TRANSACTION,
        flag: "*",
        postings: [],
        tags: [],
        links: [],
      } as unknown as JournalDirectiveType;

      expect(getEntryAccounts(entry)).toEqual([]);
    });

    it("should return the single account of an account-bearing directive", () => {
      const entry = {
        entry_hash: "h3",
        date: "2025-06-09",
        directive_type: DirectiveType.OPEN,
        account: "Assets:Bank:Checking",
      } as unknown as JournalDirectiveType;

      expect(getEntryAccounts(entry)).toEqual(["Assets:Bank:Checking"]);
    });

    it("should return an empty array for account-less directives", () => {
      const entry = {
        entry_hash: "h4",
        date: "2025-06-09",
        directive_type: DirectiveType.PRICE,
        currency: "RGAGX",
        amount: { number: "71.13", currency: "USD" },
      } as unknown as JournalDirectiveType;

      expect(getEntryAccounts(entry)).toEqual([]);
    });
  });

  describe("formatAccountName", () => {
    it("should return single-level account name as-is", () => {
      expect(formatAccountName("Assets")).toBe("Assets");
    });

    it("should join two-level accounts with slash", () => {
      expect(formatAccountName("Assets:Bank")).toBe("Assets/Bank");
    });

    it("should show first and last segments for multi-level accounts", () => {
      expect(formatAccountName("Assets:Bank:Checking")).toBe("Assets/Checking");
      expect(formatAccountName("Expenses:Food:Groceries:Organic")).toBe(
        "Expenses/Organic",
      );
    });

    it("should handle accounts with many levels", () => {
      expect(formatAccountName("A:B:C:D:E:F")).toBe("A/F");
    });

    it("should handle empty account name", () => {
      expect(formatAccountName("")).toBe("");
    });
  });

  describe("getAccountFlow", () => {
    const mockT = (key: string) => {
      if (key === "accountsPlural") return "accounts";
      return key;
    };

    it("should handle empty postings array", () => {
      expect(getAccountFlow([], mockT)).toBe("");
    });

    it("should format simple transfer (one debit, one credit)", () => {
      const postings: JournalEntryPosting[] = [
        { account: "Assets:Bank", units: { number: 100 } },
        { account: "Expenses:Food", units: { number: -100 } },
      ];
      const result = getAccountFlow(postings, mockT);
      expect(result).toBe("Assets/Bank ← Expenses/Food");
    });

    it("should format split transaction (multiple debits, one credit)", () => {
      const postings: JournalEntryPosting[] = [
        { account: "Expenses:Food", units: { number: 50 } },
        { account: "Expenses:Transport", units: { number: 30 } },
        { account: "Assets:Bank", units: { number: -80 } },
      ];
      const result = getAccountFlow(postings, mockT);
      expect(result).toBe("Expenses/Food, Expenses/Transport ← Assets/Bank");
    });

    it("should format split transaction with more than 2 debits", () => {
      const postings: JournalEntryPosting[] = [
        { account: "Expenses:Food", units: { number: 30 } },
        { account: "Expenses:Transport", units: { number: 20 } },
        { account: "Expenses:Entertainment", units: { number: 10 } },
        { account: "Assets:Bank", units: { number: -60 } },
      ];
      const result = getAccountFlow(postings, mockT);
      expect(result).toBe("3 accounts ← Assets/Bank");
    });

    it("should format multiple sources to one destination (one debit, multiple credits)", () => {
      const postings: JournalEntryPosting[] = [
        { account: "Assets:Bank", units: { number: 100 } },
        { account: "Income:Salary", units: { number: -60 } },
        { account: "Income:Bonus", units: { number: -40 } },
      ];
      const result = getAccountFlow(postings, mockT);
      expect(result).toBe("Assets/Bank ← Income/Salary, Income/Bonus");
    });

    it("should format multiple sources with more than 2 credits", () => {
      const postings: JournalEntryPosting[] = [
        { account: "Assets:Bank", units: { number: 100 } },
        { account: "Income:Salary", units: { number: -40 } },
        { account: "Income:Bonus", units: { number: -30 } },
        { account: "Income:Other", units: { number: -30 } },
      ];
      const result = getAccountFlow(postings, mockT);
      expect(result).toBe("Assets/Bank ← 3 accounts");
    });

    it("should format complex multi-leg transactions", () => {
      const postings: JournalEntryPosting[] = [
        { account: "Assets:Bank1", units: { number: 50 } },
        { account: "Assets:Bank2", units: { number: 50 } },
        { account: "Expenses:Food", units: { number: -30 } },
        { account: "Expenses:Transport", units: { number: -70 } },
      ];
      const result = getAccountFlow(postings, mockT);
      expect(result).toBe("2 → 2 accounts");
    });

    it("should handle postings with no units", () => {
      const postings: JournalEntryPosting[] = [
        { account: "Assets:Bank", units: null },
      ];
      const result = getAccountFlow(postings, mockT);
      expect(result).toBe("Assets/Bank");
    });

    it("should handle postings with zero amounts", () => {
      const postings: JournalEntryPosting[] = [
        { account: "Assets:Bank", units: { number: 0 } },
      ];
      const result = getAccountFlow(postings, mockT);
      expect(result).toBe("Assets/Bank");
    });
  });

  describe("getTransactionAmount", () => {
    it("should return 0 for empty postings array", () => {
      expect(getTransactionAmount([])).toBe(0);
    });

    it("should calculate amount from positive postings (debits)", () => {
      const postings: JournalEntryPosting[] = [
        { account: "Assets:Bank", units: { number: 100 } },
        { account: "Expenses:Food", units: { number: -100 } },
      ];
      expect(getTransactionAmount(postings)).toBe(100);
    });

    it("should calculate amount from negative postings (credits)", () => {
      const postings: JournalEntryPosting[] = [
        { account: "Income:Salary", units: { number: -500 } },
        { account: "Assets:Bank", units: { number: 500 } },
      ];
      expect(getTransactionAmount(postings)).toBe(500);
    });

    it("should sum multiple positive postings", () => {
      const postings: JournalEntryPosting[] = [
        { account: "Expenses:Food", units: { number: 50 } },
        { account: "Expenses:Transport", units: { number: 30 } },
        { account: "Assets:Bank", units: { number: -80 } },
      ];
      expect(getTransactionAmount(postings)).toBe(80);
    });

    it("should handle decimal amounts", () => {
      const postings: JournalEntryPosting[] = [
        { account: "Assets:Bank", units: { number: 12.5 } },
        { account: "Expenses:Food", units: { number: -12.5 } },
      ];
      expect(getTransactionAmount(postings)).toBe(12.5);
    });

    it("should handle postings with no units", () => {
      const postings: JournalEntryPosting[] = [
        { account: "Assets:Bank", units: null },
      ];
      expect(getTransactionAmount(postings)).toBe(0);
    });

    it("should handle postings with zero amounts", () => {
      const postings: JournalEntryPosting[] = [
        { account: "Assets:Bank", units: { number: 0 } },
      ];
      expect(getTransactionAmount(postings)).toBe(0);
    });

    it("should handle mixed postings and prefer positive sum", () => {
      const postings: JournalEntryPosting[] = [
        { account: "Assets:Bank", units: { number: 100 } },
        { account: "Expenses:Food", units: { number: 50 } },
        { account: "Income:Salary", units: { number: -150 } },
      ];
      expect(getTransactionAmount(postings)).toBe(150);
    });
  });

  describe("groupEntriesByDate", () => {
    it("should group entries by formatted date", () => {
      const entries: JournalEntry[] = [
        { date: "2025-01-15" },
        { date: "2025-01-15" },
        { date: "2025-01-14" },
      ];
      const grouped = groupEntriesByDate(entries);

      expect(grouped.length).toBe(2);
      expect(grouped[0][1].length).toBe(2); // Two entries for Jan 15
      expect(grouped[1][1].length).toBe(1); // One entry for Jan 14
    });

    it("should sort groups by date descending (most recent first)", () => {
      const entries: JournalEntry[] = [
        { date: "2025-01-10" },
        { date: "2025-01-15" },
        { date: "2025-01-12" },
      ];
      const grouped = groupEntriesByDate(entries);

      expect(grouped.length).toBe(3);
      // Most recent date should be first
      expect(
        new Date(grouped[0][1][0].date) > new Date(grouped[1][1][0].date),
      ).toBe(true);
      expect(
        new Date(grouped[1][1][0].date) > new Date(grouped[2][1][0].date),
      ).toBe(true);
    });

    it("should handle empty entries array", () => {
      const grouped = groupEntriesByDate([]);
      expect(grouped.length).toBe(0);
    });

    it("should handle entries from different months", () => {
      const entries: JournalEntry[] = [
        { date: "2025-01-15" },
        { date: "2025-02-15" },
      ];
      const grouped = groupEntriesByDate(entries);

      expect(grouped.length).toBe(2);
    });

    it("should handle entries from different years", () => {
      const entries: JournalEntry[] = [
        { date: "2024-12-31" },
        { date: "2025-01-01" },
      ];
      const grouped = groupEntriesByDate(entries);

      expect(grouped.length).toBe(2);
      // 2025 entry should be first (more recent)
      expect(grouped[0][1][0].date).toBe("2025-01-01");
    });

    it("should format dates consistently", () => {
      const entries: JournalEntry[] = [{ date: "2025-01-15" }];
      const grouped = groupEntriesByDate(entries);

      expect(grouped.length).toBe(1);
      // Check that date is formatted (e.g., "Jan 15, 2025")
      expect(grouped[0][0]).toBeTruthy();
      expect(typeof grouped[0][0]).toBe("string");
    });
  });
});
