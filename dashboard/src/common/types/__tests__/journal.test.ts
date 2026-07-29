import { describe, it, expect } from "vitest";
import {
  DirectiveType,
  isJournalTransaction,
  isJournalBalance,
  isJournalCommodity,
  isJournalClose,
  isJournalCustom,
  isJournalDocument,
  isJournalEvent,
  isJournalNote,
  isJournalOpen,
  isJournalPad,
  isJournalPrice,
} from "../journal";
import type {
  JournalTransaction,
  JournalBalance,
  JournalCommodity,
  JournalClose,
  JournalCustom,
  JournalDocument,
  JournalEvent,
  JournalNote,
  JournalOpen,
  JournalPad,
  JournalPrice,
  JournalDirectiveType,
} from "../journal";

describe("Journal Type Guards", () => {
  // Mock data for each directive type
  const mockTransaction: JournalTransaction = {
    entry_hash: "txn-hash-1",
    date: "2024-01-15",
    directive_type: DirectiveType.TRANSACTION,
    flag: "*",
    payee: "Test Payee",
    narration: "Test transaction",
    postings: [
      {
        account: "Assets:Bank",
        units: { number: "100.00", currency: "USD" },
      },
      {
        account: "Expenses:Food",
        units: { number: "-100.00", currency: "USD" },
      },
    ],
    tags: ["test"],
    links: [],
  };

  const mockBalance: JournalBalance = {
    entry_hash: "bal-hash-1",
    date: "2024-01-15",
    directive_type: DirectiveType.BALANCE,
    account: "Assets:Bank",
    diff_amount: { number: "1000.00", currency: "USD" },
  };

  const mockCommodity: JournalCommodity = {
    entry_hash: "com-hash-1",
    date: "2024-01-15",
    directive_type: DirectiveType.COMMODITY,
    currency: "USD",
  };

  const mockClose: JournalClose = {
    entry_hash: "close-hash-1",
    date: "2024-01-15",
    directive_type: DirectiveType.CLOSE,
    account: "Assets:OldAccount",
  };

  const mockCustom: JournalCustom = {
    entry_hash: "custom-hash-1",
    date: "2024-01-15",
    directive_type: DirectiveType.CUSTOM,
    type: "budget",
    values: ["budget-data"],
  };

  const mockDocument: JournalDocument = {
    entry_hash: "doc-hash-1",
    date: "2024-01-15",
    directive_type: DirectiveType.DOCUMENT,
    filename: "/path/to/document.pdf",
    account: "Assets:Bank",
    tags: [],
    links: [],
  };

  const mockEvent: JournalEvent = {
    entry_hash: "event-hash-1",
    date: "2024-01-15",
    directive_type: DirectiveType.EVENT,
    type: "location",
    description: "New York",
  };

  const mockNote: JournalNote = {
    entry_hash: "note-hash-1",
    date: "2024-01-15",
    directive_type: DirectiveType.NOTE,
    account: "Assets:Bank",
    comment: "This is a note",
  };

  const mockOpen: JournalOpen = {
    entry_hash: "open-hash-1",
    date: "2024-01-15",
    directive_type: DirectiveType.OPEN,
    account: "Assets:NewAccount",
    currencies: ["USD", "EUR"],
    booking: "FIFO",
  };

  const mockPad: JournalPad = {
    entry_hash: "pad-hash-1",
    date: "2024-01-15",
    directive_type: DirectiveType.PAD,
    account: "Assets:Bank",
    source_account: "Equity:Opening-Balances",
  };

  const mockPrice: JournalPrice = {
    entry_hash: "price-hash-1",
    date: "2024-01-15",
    directive_type: DirectiveType.PRICE,
    currency: "EUR",
    amount: { number: "1.10", currency: "USD" },
  };

  const allDirectives: JournalDirectiveType[] = [
    mockTransaction,
    mockBalance,
    mockCommodity,
    mockClose,
    mockCustom,
    mockDocument,
    mockEvent,
    mockNote,
    mockOpen,
    mockPad,
    mockPrice,
  ];

  describe("isJournalTransaction", () => {
    it("should return true for Transaction directive", () => {
      expect(isJournalTransaction(mockTransaction)).toBe(true);
    });

    it("should return false for all other directive types", () => {
      allDirectives
        .filter((d) => d.directive_type !== DirectiveType.TRANSACTION)
        .forEach((directive) => {
          expect(isJournalTransaction(directive)).toBe(false);
        });
    });
  });

  describe("isJournalBalance", () => {
    it("should return true for Balance directive", () => {
      expect(isJournalBalance(mockBalance)).toBe(true);
    });

    it("should return false for all other directive types", () => {
      allDirectives
        .filter((d) => d.directive_type !== DirectiveType.BALANCE)
        .forEach((directive) => {
          expect(isJournalBalance(directive)).toBe(false);
        });
    });
  });

  describe("isJournalCommodity", () => {
    it("should return true for Commodity directive", () => {
      expect(isJournalCommodity(mockCommodity)).toBe(true);
    });

    it("should return false for all other directive types", () => {
      allDirectives
        .filter((d) => d.directive_type !== DirectiveType.COMMODITY)
        .forEach((directive) => {
          expect(isJournalCommodity(directive)).toBe(false);
        });
    });
  });

  describe("isJournalClose", () => {
    it("should return true for Close directive", () => {
      expect(isJournalClose(mockClose)).toBe(true);
    });

    it("should return false for all other directive types", () => {
      allDirectives
        .filter((d) => d.directive_type !== DirectiveType.CLOSE)
        .forEach((directive) => {
          expect(isJournalClose(directive)).toBe(false);
        });
    });
  });

  describe("isJournalCustom", () => {
    it("should return true for Custom directive", () => {
      expect(isJournalCustom(mockCustom)).toBe(true);
    });

    it("should return false for all other directive types", () => {
      allDirectives
        .filter((d) => d.directive_type !== DirectiveType.CUSTOM)
        .forEach((directive) => {
          expect(isJournalCustom(directive)).toBe(false);
        });
    });
  });

  describe("isJournalDocument", () => {
    it("should return true for Document directive", () => {
      expect(isJournalDocument(mockDocument)).toBe(true);
    });

    it("should return false for all other directive types", () => {
      allDirectives
        .filter((d) => d.directive_type !== DirectiveType.DOCUMENT)
        .forEach((directive) => {
          expect(isJournalDocument(directive)).toBe(false);
        });
    });
  });

  describe("isJournalEvent", () => {
    it("should return true for Event directive", () => {
      expect(isJournalEvent(mockEvent)).toBe(true);
    });

    it("should return false for all other directive types", () => {
      allDirectives
        .filter((d) => d.directive_type !== DirectiveType.EVENT)
        .forEach((directive) => {
          expect(isJournalEvent(directive)).toBe(false);
        });
    });
  });

  describe("isJournalNote", () => {
    it("should return true for Note directive", () => {
      expect(isJournalNote(mockNote)).toBe(true);
    });

    it("should return false for all other directive types", () => {
      allDirectives
        .filter((d) => d.directive_type !== DirectiveType.NOTE)
        .forEach((directive) => {
          expect(isJournalNote(directive)).toBe(false);
        });
    });
  });

  describe("isJournalOpen", () => {
    it("should return true for Open directive", () => {
      expect(isJournalOpen(mockOpen)).toBe(true);
    });

    it("should return false for all other directive types", () => {
      allDirectives
        .filter((d) => d.directive_type !== DirectiveType.OPEN)
        .forEach((directive) => {
          expect(isJournalOpen(directive)).toBe(false);
        });
    });
  });

  describe("isJournalPad", () => {
    it("should return true for Pad directive", () => {
      expect(isJournalPad(mockPad)).toBe(true);
    });

    it("should return false for all other directive types", () => {
      allDirectives
        .filter((d) => d.directive_type !== DirectiveType.PAD)
        .forEach((directive) => {
          expect(isJournalPad(directive)).toBe(false);
        });
    });
  });

  describe("isJournalPrice", () => {
    it("should return true for Price directive", () => {
      expect(isJournalPrice(mockPrice)).toBe(true);
    });

    it("should return false for all other directive types", () => {
      allDirectives
        .filter((d) => d.directive_type !== DirectiveType.PRICE)
        .forEach((directive) => {
          expect(isJournalPrice(directive)).toBe(false);
        });
    });
  });

  describe("DirectiveType enum", () => {
    it("should have all expected directive types", () => {
      expect(DirectiveType.TRANSACTION).toBe("Transaction");
      expect(DirectiveType.BALANCE).toBe("Balance");
      expect(DirectiveType.COMMODITY).toBe("Commodity");
      expect(DirectiveType.CLOSE).toBe("Close");
      expect(DirectiveType.CUSTOM).toBe("Custom");
      expect(DirectiveType.DOCUMENT).toBe("Document");
      expect(DirectiveType.EVENT).toBe("Event");
      expect(DirectiveType.NOTE).toBe("Note");
      expect(DirectiveType.OPEN).toBe("Open");
      expect(DirectiveType.PAD).toBe("Pad");
      expect(DirectiveType.PRICE).toBe("Price");
    });
  });

  describe("Type guard type narrowing", () => {
    it("should narrow Transaction type correctly", () => {
      const directive: JournalDirectiveType = mockTransaction;

      if (isJournalTransaction(directive)) {
        // TypeScript should allow access to Transaction-specific properties
        expect(directive.flag).toBe("*");
        expect(directive.postings).toHaveLength(2);
        expect(directive.tags).toContain("test");
      }
    });

    it("should narrow Balance type correctly", () => {
      const directive: JournalDirectiveType = mockBalance;

      if (isJournalBalance(directive)) {
        expect(directive.account).toBe("Assets:Bank");
        expect(directive.diff_amount?.number).toBe("1000.00");
      }
    });

    it("should narrow Open type correctly", () => {
      const directive: JournalDirectiveType = mockOpen;

      if (isJournalOpen(directive)) {
        expect(directive.account).toBe("Assets:NewAccount");
        expect(directive.currencies).toContain("USD");
        expect(directive.booking).toBe("FIFO");
      }
    });

    it("should narrow Price type correctly", () => {
      const directive: JournalDirectiveType = mockPrice;

      if (isJournalPrice(directive)) {
        expect(directive.currency).toBe("EUR");
        expect(directive.amount.number).toBe("1.10");
        expect(directive.amount.currency).toBe("USD");
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle Transaction without optional fields", () => {
      const minimalTransaction: JournalTransaction = {
        entry_hash: "minimal-hash",
        date: "2024-01-15",
        directive_type: DirectiveType.TRANSACTION,
        flag: "!",
        postings: [],
        tags: [],
        links: [],
      };

      expect(isJournalTransaction(minimalTransaction)).toBe(true);
      expect(minimalTransaction.payee).toBeUndefined();
      expect(minimalTransaction.narration).toBeUndefined();
    });

    it("should handle Balance without diff_amount", () => {
      const balanceWithoutDiff: JournalBalance = {
        entry_hash: "bal-no-diff",
        date: "2024-01-15",
        directive_type: DirectiveType.BALANCE,
        account: "Assets:Bank",
      };

      expect(isJournalBalance(balanceWithoutDiff)).toBe(true);
      expect(balanceWithoutDiff.diff_amount).toBeUndefined();
    });

    it("should handle Open without optional fields", () => {
      const minimalOpen: JournalOpen = {
        entry_hash: "open-minimal",
        date: "2024-01-15",
        directive_type: DirectiveType.OPEN,
        account: "Assets:Simple",
      };

      expect(isJournalOpen(minimalOpen)).toBe(true);
      expect(minimalOpen.currencies).toBeUndefined();
      expect(minimalOpen.booking).toBeUndefined();
    });
  });
});
