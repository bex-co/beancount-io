import { getEntryAccounts } from "../entry-utils";
import { DirectiveType, type JournalDirectiveType } from "../../types";

describe("entry-utils", () => {
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
});
