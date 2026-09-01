import "reflect-metadata";
import { LedgerDataQueryResolver } from "../ledger-data-resolver.query";
import { IContext } from "@/server/graphql/context";
import { InternalServerError } from "@/shared/errors";
import type { Identity } from "@/server/api/identity";

const IDENTITY: Identity = {
  userId: "user-123",
  method: "oauth",
  scopes: new Set(),
};

describe("LedgerDataQueryResolver", () => {
  let resolver: LedgerDataQueryResolver;
  let mockContext: IContext;
  let mockDataService: {
    getAttributes: jest.Mock;
    getCommodities: jest.Mock;
    getEvents: jest.Mock;
    getDocuments: jest.Mock;
    getPayeeTransactions: jest.Mock;
    getNarrationTransactions: jest.Mock;
    getPayeeAccounts: jest.Mock;
    getErrors: jest.Mock;
    getCurrencies: jest.Mock;
    getTags: jest.Mock;
    getYears: jest.Mock;
    getLinks: jest.Mock;
    getNarrations: jest.Mock;
    getPayees: jest.Mock;
    getAccountLastEntries: jest.Mock;
    getEntriesCountPerType: jest.Mock;
    getAccountReport: jest.Mock;
    getIntervalTotals: jest.Mock;
  };

  const ledgerId = "user/test-ledger";

  beforeEach(() => {
    jest.clearAllMocks();

    mockDataService = {
      getAttributes: jest.fn(),
      getCommodities: jest.fn(),
      getEvents: jest.fn(),
      getDocuments: jest.fn(),
      getPayeeTransactions: jest.fn(),
      getNarrationTransactions: jest.fn(),
      getPayeeAccounts: jest.fn(),
      getErrors: jest.fn(),
      getCurrencies: jest.fn(),
      getTags: jest.fn(),
      getYears: jest.fn(),
      getLinks: jest.fn(),
      getNarrations: jest.fn(),
      getPayees: jest.fn(),
      getAccountLastEntries: jest.fn(),
      getEntriesCountPerType: jest.fn(),
      getAccountReport: jest.fn(),
      getIntervalTotals: jest.fn(),
    };

    mockContext = {
      userId: "user-123",
      identity: IDENTITY,
      token: "mock-token",
      reqHeaders: {},
      service: {} as any,
      config: {},
      getCurrentUserId: jest.fn().mockReturnValue("user-123"),
    } as unknown as IContext;

    resolver = new LedgerDataQueryResolver(mockDataService as any);
  });

  describe("getLedgerAttributes", () => {
    it("should delegate to dataService and return result", async () => {
      mockDataService.getAttributes.mockResolvedValue({
        accounts: ["Assets:Bank"],
        tags: ["tag1"],
        years: ["2024"],
        links: [],
        payees: ["Payee1"],
        currencies: ["USD"],
      });

      const result = await resolver.getLedgerAttributes(ledgerId, mockContext);

      expect(mockDataService.getAttributes).toHaveBeenCalledWith({
        ledgerId,
        identity: IDENTITY,
      });
      expect(result.accounts).toEqual(["Assets:Bank"]);
      expect(result.currencies).toEqual(["USD"]);
    });

    it("should propagate errors", async () => {
      mockDataService.getAttributes.mockRejectedValue(
        new InternalServerError("get ledger filter options"),
      );

      await expect(
        resolver.getLedgerAttributes(ledgerId, mockContext),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("getLedgerCommodities", () => {
    it("should delegate to dataService and map prices", async () => {
      mockDataService.getCommodities.mockResolvedValue([
        {
          base: "BTC",
          quote: "USD",
          prices: [{ date: "2024-01-01", value: "40000" }],
        },
      ]);

      const result = await resolver.getLedgerCommodities(ledgerId, mockContext);

      expect(mockDataService.getCommodities).toHaveBeenCalledWith({
        ledgerId,
        identity: IDENTITY,
      });
      expect(result).toHaveLength(1);
      expect(result[0].base).toBe("BTC");
      expect(result[0].prices[0].value).toBe("40000");
    });
  });

  describe("getLedgerEvents", () => {
    it("should delegate to dataService and return mapped events", async () => {
      mockDataService.getEvents.mockResolvedValue([
        {
          date: "2024-01-01",
          type: "birthday",
          description: "Alice's birthday",
        },
      ]);

      const result = await resolver.getLedgerEvents(
        ledgerId,
        { filter: "2024" },
        mockContext,
      );

      expect(mockDataService.getEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          ledgerId,
          identity: IDENTITY,
          filter: "2024",
        }),
      );
      expect(result[0].type).toBe("birthday");
    });
  });

  describe("getLedgerDocuments", () => {
    it("should delegate to dataService and return mapped documents", async () => {
      mockDataService.getDocuments.mockResolvedValue([
        {
          date: "2024-01-01",
          account: "Assets:Bank",
          filename: "/receipts/jan.pdf",
          tags: ["receipt"],
          links: null,
          meta: null,
        },
      ]);

      const result = await resolver.getLedgerDocuments(
        ledgerId,
        {},
        mockContext,
      );

      expect(mockDataService.getDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ ledgerId, identity: IDENTITY }),
      );
      expect(result[0].filename).toBe("/receipts/jan.pdf");
      expect(result[0].links).toBeUndefined();
    });
  });

  describe("getLedgerPayeeTransactions", () => {
    it("should delegate to dataService and map postings", async () => {
      mockDataService.getPayeeTransactions.mockResolvedValue({
        date: "2024-01-01",
        payee: "Amazon",
        narration: "Books",
        postings: [
          {
            account: "Expenses:Books",
            amount: "50",
            commodity: "USD",
            price: null,
          },
        ],
      });

      const result = await resolver.getLedgerPayeeTransactions(
        ledgerId,
        { payee: "Amazon" },
        mockContext,
      );

      expect(mockDataService.getPayeeTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          ledgerId,
          identity: IDENTITY,
          payee: "Amazon",
        }),
      );
      expect(result.payee).toBe("Amazon");
      expect(result.postings[0].price).toBeUndefined();
    });

    it("should throw when service returns null", async () => {
      mockDataService.getPayeeTransactions.mockResolvedValue(null);

      await expect(
        resolver.getLedgerPayeeTransactions(
          ledgerId,
          { payee: "Unknown" },
          mockContext,
        ),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("getLedgerNarrationTransactions", () => {
    it("should delegate to dataService", async () => {
      mockDataService.getNarrationTransactions.mockResolvedValue({
        date: "2024-01-01",
        payee: null,
        narration: "Groceries",
        postings: [],
      });

      const result = await resolver.getLedgerNarrationTransactions(
        ledgerId,
        { narration: "Groceries" },
        mockContext,
      );

      expect(mockDataService.getNarrationTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ narration: "Groceries" }),
      );
      expect(result.narration).toBe("Groceries");
    });

    it("should throw when service returns null", async () => {
      mockDataService.getNarrationTransactions.mockResolvedValue(null);

      await expect(
        resolver.getLedgerNarrationTransactions(
          ledgerId,
          { narration: "X" },
          mockContext,
        ),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("getLedgerPayeeAccounts", () => {
    it("should delegate to dataService and return accounts", async () => {
      mockDataService.getPayeeAccounts.mockResolvedValue([
        "Expenses:Food",
        "Expenses:Transport",
      ]);

      const result = await resolver.getLedgerPayeeAccounts(
        ledgerId,
        { payee: "Grocery" },
        mockContext,
      );

      expect(mockDataService.getPayeeAccounts).toHaveBeenCalledWith(
        expect.objectContaining({ payee: "Grocery" }),
      );
      expect(result).toEqual(["Expenses:Food", "Expenses:Transport"]);
    });
  });

  describe("getLedgerErrors", () => {
    it("should delegate to dataService and map errors", async () => {
      mockDataService.getErrors.mockResolvedValue([
        {
          message: "Syntax error",
          source: { filename: "main.beancount", lineno: 42 },
        },
      ]);

      const result = await resolver.getLedgerErrors(ledgerId, mockContext);

      expect(mockDataService.getErrors).toHaveBeenCalledWith({
        ledgerId,
        identity: IDENTITY,
      });
      expect(result[0].message).toBe("Syntax error");
      expect(result[0].filename).toBe("main.beancount");
      expect(result[0].lineno).toBe(42);
    });
  });

  describe("simple string list queries", () => {
    it("getLedgerCurrencies delegates correctly", async () => {
      mockDataService.getCurrencies.mockResolvedValue(["USD", "EUR"]);
      const result = await resolver.getLedgerCurrencies(ledgerId, mockContext);
      expect(mockDataService.getCurrencies).toHaveBeenCalledWith({
        ledgerId,
        identity: IDENTITY,
      });
      expect(result).toEqual(["USD", "EUR"]);
    });

    it("getLedgerTags delegates correctly", async () => {
      mockDataService.getTags.mockResolvedValue(["tag1", "tag2"]);
      const result = await resolver.getLedgerTags(ledgerId, mockContext);
      expect(result).toEqual(["tag1", "tag2"]);
    });

    it("getLedgerYears delegates correctly", async () => {
      mockDataService.getYears.mockResolvedValue(["2023", "2024"]);
      const result = await resolver.getLedgerYears(ledgerId, mockContext);
      expect(result).toEqual(["2023", "2024"]);
    });

    it("getLedgerLinks delegates correctly", async () => {
      mockDataService.getLinks.mockResolvedValue(["^link1"]);
      const result = await resolver.getLedgerLinks(ledgerId, mockContext);
      expect(result).toEqual(["^link1"]);
    });

    it("getLedgerNarrations delegates correctly", async () => {
      mockDataService.getNarrations.mockResolvedValue(["Groceries"]);
      const result = await resolver.getLedgerNarrations(ledgerId, mockContext);
      expect(result).toEqual(["Groceries"]);
    });

    it("getLedgerPayees delegates correctly", async () => {
      mockDataService.getPayees.mockResolvedValue(["Amazon", "Grocery"]);
      const result = await resolver.getLedgerPayees(ledgerId, mockContext);
      expect(result).toEqual(["Amazon", "Grocery"]);
    });
  });

  describe("getLedgerAccountLastEntries", () => {
    it("should delegate to dataService and map entries", async () => {
      mockDataService.getAccountLastEntries.mockResolvedValue([
        {
          account: "Assets:Bank",
          date: "2024-01-15",
          balance: { USD: "1000" },
        },
      ]);

      const result = await resolver.getLedgerAccountLastEntries(
        ledgerId,
        undefined,
        undefined,
        undefined,
        mockContext,
      );

      expect(mockDataService.getAccountLastEntries).toHaveBeenCalledWith(
        expect.objectContaining({ ledgerId, identity: IDENTITY }),
      );
      expect(result[0].account).toBe("Assets:Bank");
    });
  });

  describe("getLedgerEntriesCountPerType", () => {
    it("should delegate to dataService and map counts", async () => {
      mockDataService.getEntriesCountPerType.mockResolvedValue([
        { type: "Transaction", number: 42 },
      ]);

      const result = await resolver.getLedgerEntriesCountPerType(
        ledgerId,
        undefined,
        undefined,
        undefined,
        mockContext,
      );

      expect(mockDataService.getEntriesCountPerType).toHaveBeenCalledWith(
        expect.objectContaining({ ledgerId, identity: IDENTITY }),
      );
      expect(result[0].type).toBe("Transaction");
      expect(result[0].number).toBe(42);
    });
  });

  describe("getLedgerAccountReport", () => {
    it("should delegate to dataService and map report data", async () => {
      mockDataService.getAccountReport.mockResolvedValue({
        linechart_data: [{ date: "2024-01-01", balance: { USD: "1000" } }],
        interval_totals_data: [{ date: "2024-01", balance: { USD: "500" } }],
        account_balance_data: [
          { date: "2024-01-01", balance: { USD: "1000" } },
        ],
      });

      const result = await resolver.getLedgerAccountReport(
        ledgerId,
        { accountName: "Assets:Bank", conversion: "USD", interval: "monthly" },
        mockContext,
      );

      expect(mockDataService.getAccountReport).toHaveBeenCalledWith(
        expect.objectContaining({
          ledgerId,
          identity: IDENTITY,
          accountName: "Assets:Bank",
        }),
      );
      expect(result.linechartData).toHaveLength(1);
      expect(result.intervalTotalsData[0].date).toBe("2024-01");
    });
  });

  describe("getLedgerIntervalTotals", () => {
    it("should delegate to dataService and map interval totals", async () => {
      mockDataService.getIntervalTotals.mockResolvedValue([
        {
          date: "2024-01",
          balance: { USD: "500" },
          account_balances: { "Assets:Bank": { USD: "500" } },
        },
      ]);

      const result = await resolver.getLedgerIntervalTotals(
        ledgerId,
        { accountName: "Assets:Bank", conversion: "USD", interval: "monthly" },
        mockContext,
      );

      expect(mockDataService.getIntervalTotals).toHaveBeenCalledWith(
        expect.objectContaining({
          ledgerId,
          identity: IDENTITY,
          accountName: "Assets:Bank",
        }),
      );
      expect(result[0].date).toBe("2024-01");
      expect(result[0].accountBalances).toEqual({
        "Assets:Bank": { USD: "500" },
      });
    });
  });
});
