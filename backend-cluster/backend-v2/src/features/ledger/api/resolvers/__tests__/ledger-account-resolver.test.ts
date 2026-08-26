import "reflect-metadata";
import { LedgerAccountQueryResolver } from "../ledger-account-resolver.query";
import type { ILedgerAccountService } from "@/features/ledger/service/ledger-account-service";
import type { IContext } from "@/server/graphql/context";
import type { Identity } from "@/server/api/identity";

const IDENTITY: Identity = {
  userId: "user-123",
  method: "oauth",
  scopes: new Set(),
  capabilityExempt: false,
};

jest.mock("@/shared/str", () => ({
  parseLedgerId: jest.fn().mockReturnValue({
    ledgerOwner: "testuser",
    ledgerName: "testrepo",
  }),
  createLedgerId: jest.fn().mockReturnValue("testuser/testrepo"),
}));

describe("LedgerAccountQueryResolver", () => {
  let queryResolver: LedgerAccountQueryResolver;
  let mockLedgerAccountService: jest.Mocked<ILedgerAccountService>;
  let mockContext: IContext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLedgerAccountService = {
      getAccounts: jest.fn(),
      getAccountsDetail: jest.fn(),
      getAccountDirectives: jest.fn(),
    };

    mockContext = {
      userId: "user-123",
      identity: IDENTITY,
      getCurrentUserId: jest.fn().mockReturnValue("user-123"),
    } as unknown as IContext;

    queryResolver = new LedgerAccountQueryResolver(mockLedgerAccountService);
  });

  describe("getLedgerAccounts", () => {
    it("should delegate to ledgerAccount.getAccounts with userId from context", async () => {
      mockLedgerAccountService.getAccounts.mockResolvedValue([
        "Assets:Bank:Checking",
        "Expenses:Food",
      ]);

      const result = await queryResolver.getLedgerAccounts(
        "dXNlci90ZXN0LWxlZGdlcg",
        "open",
        mockContext,
      );

      expect(mockLedgerAccountService.getAccounts).toHaveBeenCalledWith(
        "testuser",
        "testrepo",
        "open",
        IDENTITY,
      );
      expect(result).toEqual(["Assets:Bank:Checking", "Expenses:Food"]);
    });

    it("should pass undefined status when omitted", async () => {
      mockLedgerAccountService.getAccounts.mockResolvedValue([
        "Assets:Bank:Checking",
      ]);

      await queryResolver.getLedgerAccounts(
        "dXNlci90ZXN0LWxlZGdlcg",
        undefined,
        mockContext,
      );

      expect(mockLedgerAccountService.getAccounts).toHaveBeenCalledWith(
        "testuser",
        "testrepo",
        undefined,
        IDENTITY,
      );
    });
  });

  describe("getLedgerAccountDirectives", () => {
    it("should delegate to ledgerAccount.getAccountDirectives with userId from context", async () => {
      const mockDirectives = [
        {
          account: "Assets:Cash",
          openedAt: "2020-01-01",
          closedAt: undefined,
          balance: { USD: "100.00" },
          entryCount: 10,
          entryHash: "hash-1",
          closeEntryHash: undefined,
        },
      ];
      mockLedgerAccountService.getAccountDirectives.mockResolvedValue(
        mockDirectives,
      );

      const result = await queryResolver.getLedgerAccountDirectives(
        "testuser/testrepo",
        mockContext,
      );

      expect(
        mockLedgerAccountService.getAccountDirectives,
      ).toHaveBeenCalledWith("testuser", "testrepo", IDENTITY);
      expect(result).toEqual(mockDirectives);
    });

    it("passes through the open directive's metadata", async () => {
      const withMeta = [
        {
          account: "Assets:Bank:Checking",
          openedAt: "2024-01-01",
          entryCount: 3,
          entryHash: "hash-1",
          meta: { "cash-flow-role": "cash", priority: 1, active: true },
        },
      ];
      mockLedgerAccountService.getAccountDirectives.mockResolvedValue(withMeta);

      const result = await queryResolver.getLedgerAccountDirectives(
        "testuser/testrepo",
        mockContext,
      );

      expect(result).toEqual(withMeta);
    });
  });
});
