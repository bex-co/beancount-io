import "reflect-metadata";
import { LLMCategorizationQueryResolver } from "../ai-categorization-resolver";
import type { ILLMService } from "../../service/llm-service";
import type { IContext } from "@/server/graphql/context";

describe("LLMCategorizationQueryResolver", () => {
  let resolver: LLMCategorizationQueryResolver;
  let mockLLMService: jest.Mocked<ILLMService>;
  let mockContext: IContext;

  const testLedgerId = "dGVzdG93bmVyL215LWJvb2s";

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

    it("should delegate to llm.suggestCategories with userId from context", async () => {
      const result = await resolver.suggestTransactionCategories(
        testLedgerId,
        mockTransactions,
        mockContext,
      );

      expect(mockLLMService.suggestCategories).toHaveBeenCalledWith(
        "user123",
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
