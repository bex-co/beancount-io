import "reflect-metadata";
import { LedgerFinanceQueryResolver } from "../ledger-finance-resolver.query";
import { IContext } from "@/server/graphql/context";
import type { Identity } from "@/server/api/identity";
import { InternalServerError } from "@/shared/errors";

const IDENTITY: Identity = {
  userId: "user-123",
  method: "oauth",
  scopes: new Set(),
};

describe("LedgerFinanceQueryResolver", () => {
  let resolver: LedgerFinanceQueryResolver;
  let mockContext: IContext;
  let mockFinanceService: {
    getOverview: jest.Mock;
    getIncomeStatement: jest.Mock;
    getBalanceSheet: jest.Mock;
    getTrialBalance: jest.Mock;
    getHoldings: jest.Mock;
    getRegister: jest.Mock;
    getCapitalGains: jest.Mock;
  };

  const ledgerId = "user/test-ledger";

  const createMockTreeNode = (account: string) => ({
    account,
    balance: { USD: "1000.00" },
    balance_children: { USD: "1500.00" },
    children: [],
    has_txns: true,
    cost: { USD: "950.00" },
    cost_children: { USD: "1400.00" },
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockFinanceService = {
      getOverview: jest.fn(),
      getIncomeStatement: jest.fn(),
      getBalanceSheet: jest.fn(),
      getTrialBalance: jest.fn(),
      getHoldings: jest.fn(),
      getRegister: jest.fn(),
      getCapitalGains: jest.fn(),
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

    resolver = new LedgerFinanceQueryResolver(mockFinanceService as any);
  });

  describe("getLedgerOverview", () => {
    it("should delegate to financeService and map the result", async () => {
      mockFinanceService.getOverview.mockResolvedValue({
        net_worth_data: [{ date: "2024-01-01", balance: { USD: "10000" } }],
        assets_data: [{ date: "2024-01-01", balance: { USD: "15000" } }],
        assets_hierarchy_data: createMockTreeNode("Assets"),
        liabilities_data: [{ date: "2024-01-01", balance: { USD: "5000" } }],
        liabilities_hierarchy_data: createMockTreeNode("Liabilities"),
        income_data: [{ date: "2024-01-01", balance: { USD: "3000" } }],
        income_interval_data: [
          {
            date: "2024-01",
            balance: { USD: "3000" },
            account_balances: { "Income:Salary": { USD: "3000" } },
          },
        ],
        expenses_data: [{ date: "2024-01-01", balance: { USD: "2000" } }],
        expenses_interval_data: [
          {
            date: "2024-01",
            balance: { USD: "2000" },
            account_balances: { "Expenses:Food": { USD: "500" } },
          },
        ],
        expenses_hierarchy_data: createMockTreeNode("Expenses"),
        income_hierarchy_data: createMockTreeNode("Income"),
      });

      const result = await resolver.getLedgerOverview(
        ledgerId,
        { conversion: "USD", interval: "monthly" },
        mockContext,
      );

      expect(mockFinanceService.getOverview).toHaveBeenCalledWith(
        expect.objectContaining({
          ledgerId,
          identity: IDENTITY,
          conversion: "USD",
          interval: "monthly",
        }),
      );
      expect(result.netWorthData).toHaveLength(1);
      expect(result.netWorthData[0].date).toBe("2024-01-01");
      expect(result.assetsHierarchyData.account).toBe("Assets");
    });

    it("should propagate errors thrown by the service", async () => {
      mockFinanceService.getOverview.mockRejectedValue(
        new InternalServerError("get ledger overview"),
      );

      await expect(
        resolver.getLedgerOverview(ledgerId, {}, mockContext),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("getLedgerIncomeStatement", () => {
    it("should delegate to financeService and map the result", async () => {
      mockFinanceService.getIncomeStatement.mockResolvedValue({
        net_profit_data: [{ date: "2024-01", balance: { USD: "1000" } }],
        income_data: [
          {
            date: "2024-01",
            balance: { USD: "3000" },
            account_balances: { "Income:Salary": { USD: "3000" } },
          },
        ],
        expenses_data: [
          {
            date: "2024-01",
            balance: { USD: "2000" },
            account_balances: { "Expenses:Food": { USD: "500" } },
          },
        ],
        income_hierarchy_data: createMockTreeNode("Income"),
        expenses_hierarchy_data: createMockTreeNode("Expenses"),
      });

      const result = await resolver.getLedgerIncomeStatement(
        ledgerId,
        { conversion: "USD", interval: "monthly" },
        mockContext,
      );

      expect(mockFinanceService.getIncomeStatement).toHaveBeenCalledWith(
        expect.objectContaining({ ledgerId, identity: IDENTITY }),
      );
      expect(result.netProfitData).toHaveLength(1);
      expect(result.incomeHierarchyData.account).toBe("Income");
    });

    it("should propagate errors thrown by the service", async () => {
      mockFinanceService.getIncomeStatement.mockRejectedValue(
        new InternalServerError("get ledger income statement"),
      );

      await expect(
        resolver.getLedgerIncomeStatement(ledgerId, {}, mockContext),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("getLedgerBalanceSheet", () => {
    it("should delegate to financeService and map the result", async () => {
      mockFinanceService.getBalanceSheet.mockResolvedValue({
        net_worth_data: [{ date: "2024-01-01", balance: { USD: "10000" } }],
        assets_data: [{ date: "2024-01-01", balance: { USD: "15000" } }],
        liabilities_data: [{ date: "2024-01-01", balance: { USD: "5000" } }],
        equity_data: [{ date: "2024-01-01", balance: { USD: "0" } }],
        assets_hierarchy_data: createMockTreeNode("Assets"),
        liabilities_hierarchy_data: createMockTreeNode("Liabilities"),
        equity_hierarchy_data: createMockTreeNode("Equity"),
      });

      const result = await resolver.getLedgerBalanceSheet(
        ledgerId,
        { conversion: "USD" },
        mockContext,
      );

      expect(mockFinanceService.getBalanceSheet).toHaveBeenCalledWith(
        expect.objectContaining({ ledgerId, identity: IDENTITY }),
      );
      expect(result.netWorthData).toHaveLength(1);
      expect(result.assetsHierarchyData.account).toBe("Assets");
      expect(result.equityHierarchyData.account).toBe("Equity");
    });

    it("should propagate errors thrown by the service", async () => {
      mockFinanceService.getBalanceSheet.mockRejectedValue(
        new InternalServerError("get ledger balance sheet"),
      );

      await expect(
        resolver.getLedgerBalanceSheet(ledgerId, {}, mockContext),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("getLedgerTrialBalance", () => {
    it("should delegate to financeService and map the result", async () => {
      mockFinanceService.getTrialBalance.mockResolvedValue({
        income_hierarchy_data: createMockTreeNode("Income"),
        liabilities_hierarchy_data: createMockTreeNode("Liabilities"),
        equity_hierarchy_data: createMockTreeNode("Equity"),
        expenses_hierarchy_data: createMockTreeNode("Expenses"),
        assets_hierarchy_data: createMockTreeNode("Assets"),
      });

      const result = await resolver.getLedgerTrialBalance(
        ledgerId,
        { conversion: "USD" },
        mockContext,
      );

      expect(mockFinanceService.getTrialBalance).toHaveBeenCalledWith(
        expect.objectContaining({ ledgerId, identity: IDENTITY }),
      );
      expect(result.incomeHierarchyData.account).toBe("Income");
      expect(result.assetsHierarchyData.account).toBe("Assets");
    });

    it("should propagate errors thrown by the service", async () => {
      mockFinanceService.getTrialBalance.mockRejectedValue(
        new InternalServerError("get ledger trial balance"),
      );

      await expect(
        resolver.getLedgerTrialBalance(ledgerId, {}, mockContext),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("getLedgerHoldings", () => {
    const holdings = {
      group_by: "account",
      groups: [
        {
          account: "Assets:Broker:AAPL",
          commodity: "AAPL",
          units: { number: "10", currency: "AAPL" },
          average_cost: { number: "150", currency: "USD" },
          cost_basis: { number: "1500", currency: "USD" },
          market_value: { number: "1800", currency: "USD" },
          price: { number: "180", currency: "USD" },
        },
      ],
      totals: {
        cost_basis: { USD: "1500" },
        market_value: { USD: "1800" },
      },
      valuation: "complete",
      missing_prices: [],
      missing_price_summary: [],
      as_of: "2026-10-25",
    };

    it("should delegate to financeService and map the result", async () => {
      mockFinanceService.getHoldings.mockResolvedValue(holdings);

      const result = await resolver.getLedgerHoldings(
        ledgerId,
        { conversion: "USD", groupBy: "account" },
        mockContext,
      );

      expect(mockFinanceService.getHoldings).toHaveBeenCalledWith(
        expect.objectContaining({
          ledgerId,
          identity: IDENTITY,
          conversion: "USD",
          groupBy: "account",
        }),
      );
      expect(result.groupBy).toBe("account");
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0]).toMatchObject({
        account: "Assets:Broker:AAPL",
        averageCost: { number: "150", currency: "USD" },
        costBasis: { number: "1500", currency: "USD" },
        marketValue: { number: "1800", currency: "USD" },
      });
      expect(result.asOf).toBe("2026-10-25");
    });

    it("should refuse an unsupported grouping", async () => {
      await expect(
        resolver.getLedgerHoldings(
          ledgerId,
          { groupBy: "currency" },
          mockContext,
        ),
      ).rejects.toThrow('Unsupported groupBy "currency"');
      expect(mockFinanceService.getHoldings).not.toHaveBeenCalled();
    });

    // w23/144: the read echoes group_by, so GraphQL accepts it as an
    // alias of groupBy, like the REST/MCP seam.
    it("should fold the echoed group_by spelling", async () => {
      mockFinanceService.getHoldings.mockResolvedValue(holdings);

      await resolver.getLedgerHoldings(
        ledgerId,
        { group_by: "commodity" },
        mockContext,
      );

      expect(mockFinanceService.getHoldings).toHaveBeenCalledWith(
        expect.objectContaining({ groupBy: "commodity" }),
      );
    });

    it("should refuse a split grouping pair", async () => {
      await expect(
        resolver.getLedgerHoldings(
          ledgerId,
          { groupBy: "account", group_by: "commodity" },
          mockContext,
        ),
      ).rejects.toThrow(
        "Pass group_by or groupBy, not two different groupings.",
      );
      expect(mockFinanceService.getHoldings).not.toHaveBeenCalled();
    });

    it("should propagate errors thrown by the service", async () => {
      mockFinanceService.getHoldings.mockRejectedValue(
        new InternalServerError("get ledger holdings"),
      );

      await expect(
        resolver.getLedgerHoldings(ledgerId, {}, mockContext),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("getLedgerRegister", () => {
    it("should delegate to financeService and map the result", async () => {
      mockFinanceService.getRegister.mockResolvedValue({
        account: "Assets:Checking",
        rows: [
          {
            date: "2024-01-05",
            entry: "transaction",
            payee: "Employer",
            narration: "Salary",
            postings: [
              {
                account: "Assets:Checking",
                amount: { number: "3000.00", currency: "USD" },
                cost: null,
              },
            ],
            change: { USD: "3000.00" },
            balance: { USD: "3000.00" },
          },
        ],
      });

      const result = await resolver.getLedgerRegister(
        ledgerId,
        { account: "Assets:Checking", conversion: "USD" },
        mockContext,
      );

      expect(mockFinanceService.getRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          ledgerId,
          identity: IDENTITY,
          account: "Assets:Checking",
          conversion: "USD",
        }),
      );
      expect(result.account).toBe("Assets:Checking");
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        date: "2024-01-05",
        entry: "transaction",
        payee: "Employer",
      });
    });

    it("should propagate errors thrown by the service", async () => {
      mockFinanceService.getRegister.mockRejectedValue(
        new InternalServerError("get ledger register"),
      );

      await expect(
        resolver.getLedgerRegister(
          ledgerId,
          { account: "Assets:Checking" },
          mockContext,
        ),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("getLedgerCapitalGains", () => {
    it("should delegate to financeService and map the result", async () => {
      mockFinanceService.getCapitalGains.mockResolvedValue({
        rows: [
          {
            account: "Assets:Broker",
            commodity: "HOOL",
            acquired: "2023-01-10",
            sold: "2024-03-15",
            held_days: 430,
            long_held: true,
            quantity: { number: "10", currency: "HOOL" },
            proceeds: { number: "1500", currency: "USD" },
            basis: { number: "1000", currency: "USD" },
            gain: { number: "500", currency: "USD" },
          },
        ],
        totals: {
          one_year_or_less: {},
          more_than_one_year: { USD: "500" },
          holding_unknown: {},
        },
      });

      const result = await resolver.getLedgerCapitalGains(
        ledgerId,
        { fromDate: "2024-01-01", toDate: "2024-12-31" },
        mockContext,
      );

      expect(mockFinanceService.getCapitalGains).toHaveBeenCalledWith(
        expect.objectContaining({
          ledgerId,
          identity: IDENTITY,
          fromDate: "2024-01-01",
          toDate: "2024-12-31",
        }),
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        heldDays: 430,
        longHeld: true,
        gain: { number: "500", currency: "USD" },
      });
    });

    it("should propagate errors thrown by the service", async () => {
      mockFinanceService.getCapitalGains.mockRejectedValue(
        new InternalServerError("get ledger capital gains"),
      );

      await expect(
        resolver.getLedgerCapitalGains(ledgerId, {}, mockContext),
      ).rejects.toThrow(InternalServerError);
    });
  });
});
