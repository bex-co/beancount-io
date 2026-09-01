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
});
