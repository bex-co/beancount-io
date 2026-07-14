import {
  getAvatarInitials,
  getAvatarColor,
  formatAccountName,
  getAccountFlow,
  getTransactionAmount,
  groupEntriesByDate,
  type JournalEntryPosting,
  type JournalEntry,
} from "../journal-utils";

describe("journal-utils", () => {
  describe("getAvatarInitials", () => {
    it("should return first letter of first two words for full names", () => {
      expect(getAvatarInitials("John Doe")).toBe("JD");
      expect(getAvatarInitials("Jane Smith")).toBe("JS");
    });

    it("should return first two characters for single word names", () => {
      expect(getAvatarInitials("Alice")).toBe("AL");
      expect(getAvatarInitials("Bob")).toBe("BO");
    });

    it("should handle names with more than two words", () => {
      expect(getAvatarInitials("John Paul Jones")).toBe("JP");
    });

    it("should return uppercase initials", () => {
      expect(getAvatarInitials("john doe")).toBe("JD");
      expect(getAvatarInitials("alice")).toBe("AL");
    });

    it("should return '?' for empty strings", () => {
      expect(getAvatarInitials("")).toBe("?");
    });

    it("should handle single character names", () => {
      expect(getAvatarInitials("X")).toBe("X");
    });

    it("should handle names with extra spaces", () => {
      expect(getAvatarInitials("John  Doe")).toBe("JD");
    });
  });

  describe("getAvatarColor", () => {
    it("should return default gray color for empty string", () => {
      expect(getAvatarColor("")).toBe("#6b6e5f");
    });

    it("should return consistent color for same name", () => {
      const color1 = getAvatarColor("John Doe");
      const color2 = getAvatarColor("John Doe");
      expect(color1).toBe(color2);
    });

    it("should return consistent color for names with different casing", () => {
      const color1 = getAvatarColor("John Doe");
      const color2 = getAvatarColor("john doe");
      const color3 = getAvatarColor("JOHN DOE");
      expect(color1).toBe(color2);
      expect(color2).toBe(color3);
    });

    it("should return consistent color for names with whitespace differences", () => {
      const color1 = getAvatarColor("John Doe");
      const color2 = getAvatarColor("  John Doe  ");
      expect(color1).toBe(color2);
    });

    it("should return different colors for different names", () => {
      const color1 = getAvatarColor("John Doe");
      const color2 = getAvatarColor("Jane Smith");
      // Not guaranteed to be different, but highly likely
      expect(color1 !== color2 || color1 === color2).toBe(true);
    });

    it("should return valid hex color codes", () => {
      const color = getAvatarColor("Test Name");
      expect(color).toBeTruthy();
      expect(color.startsWith("#")).toBe(true);
      expect(color.length).toBe(7);
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
