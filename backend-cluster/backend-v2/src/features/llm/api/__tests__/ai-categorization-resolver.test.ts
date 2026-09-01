import "reflect-metadata";
import { LLMCategorizationQueryResolver } from "../ai-categorization-resolver";
import type { ILLMService } from "../../service/llm-service";
import type { IContext } from "@/server/graphql/context";
import type { Identity } from "@/server/api/identity";

describe("LLMCategorizationQueryResolver", () => {
  let resolver: LLMCategorizationQueryResolver;
  let mockLLMService: jest.Mocked<ILLMService>;
  let mockContext: IContext;

  const testLedgerId = "dGVzdG93bmVyL215LWJvb2s";

  /** An OAuth grant pinned to one ledger — the narrowing that must survive. */
  const pinnedIdentity: Identity = {
    userId: "user123",
    method: "oauth",
    scopes: new Set(["ledger.read"]),
    ledgerScope: testLedgerId,
  };

  beforeEach(() => {
    mockLLMService = {
      parseFile: jest.fn(),
      parseReceipt: jest.fn(),
      suggestCategories: jest.fn().mockResolvedValue([
        {
          rowIndex: 1,
          targetAccount: "Expenses:Food:Coffee",
          confidence: 0.95,
          source: "llm" as const,
          reasoning: "Known coffee shop",
        },
      ]),
    };

    mockContext = {
      getCurrentUserId: jest.fn().mockReturnValue("user123"),
      getCurrentIdentity: jest.fn().mockReturnValue(pinnedIdentity),
    } as unknown as IContext;

    resolver = new LLMCategorizationQueryResolver(mockLLMService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("suggestTransactionCategories", () => {
    const mockTransactions = [
      {
        rowIndex: 1,
        date: "2024-01-15",
        payee: "Starbucks",
        description: "Coffee purchase",
        amount: -5.5,
      },
    ];

    it("hands the service the caller's real identity, still narrowed", async () => {
      const result = await resolver.suggestTransactionCategories(
        testLedgerId,
        mockTransactions,
        mockContext,
      );

      // Not `ctx.getCurrentUserId()`: a bare userId would arrive at the
      // service as a capability-exempt, unpinned identity and defeat both
      // checks the service runs.
      expect(mockLLMService.suggestCategories).toHaveBeenCalledWith(
        pinnedIdentity,
        testLedgerId,
        mockTransactions,
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        rowIndex: 1,
        targetAccount: "Expenses:Food:Coffee",
        confidence: 0.95,
        source: "llm",
        reasoning: "Known coffee shop",
      });
    });

    it("should return empty array when service returns no suggestions", async () => {
      mockLLMService.suggestCategories.mockResolvedValue([]);

      const result = await resolver.suggestTransactionCategories(
        testLedgerId,
        mockTransactions,
        mockContext,
      );

      expect(result).toEqual([]);
    });
  });
});
