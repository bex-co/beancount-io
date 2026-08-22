import "reflect-metadata";
import { LLMParserResolver } from "../llm-parser-resolver";
import type { ILLMService } from "../../service/llm-service";
import type { IContext } from "@/server/graphql/context";

describe("LLMParserResolver", () => {
  let resolver: LLMParserResolver;
  let mockLLMService: jest.Mocked<ILLMService>;
  let mockContext: IContext;

  beforeEach(() => {
    mockLLMService = {
      parseFile: jest.fn().mockResolvedValue({
        rows: [
          {
            date: "2024-01-15",
            payee: "Starbucks",
            description: "Coffee purchase",
            amount: -5.5,
          },
        ],
      }),
      parseReceipt: jest.fn().mockResolvedValue({
        date: "2024-01-15",
        payee: "Starbucks",
        description: "Coffee purchase",
        amount: -5.5,
        sourceAccount: "Assets:Bank",
        targetAccount: "Expenses:Food",
      }),
      suggestCategories: jest.fn(),
    };

    mockContext = {
      getCurrentUserId: jest.fn().mockReturnValue("user123"),
      getCurrentIdentity: jest.fn().mockReturnValue({
        userId: "user123",
        method: "session",
        scopes: new Set(),
        capabilityExempt: true,
      }),
    } as unknown as IContext;

    resolver = new LLMParserResolver(mockLLMService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("parseFile", () => {
    it("should delegate to llm.parseFile with userId from context", async () => {
      const result = await resolver.parseFile(
        "tmp/file.csv",
        "csv",
        mockContext,
      );

      expect(mockLLMService.parseFile).toHaveBeenCalledWith(
        "user123",
        "tmp/file.csv",
        "csv",
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].payee).toBe("Starbucks");
    });
  });

  describe("parseReceipt", () => {
    it("should delegate to llm.parseReceipt with userId from context", async () => {
      const result = await resolver.parseReceipt(
        "tmp/receipt.jpg",
        "ledger123",
        mockContext,
      );

      expect(mockLLMService.parseReceipt).toHaveBeenCalledWith(
        "user123",
        "tmp/receipt.jpg",
        "ledger123",
      );
      expect(result.sourceAccount).toBe("Assets:Bank");
      expect(result.targetAccount).toBe("Expenses:Food");
    });
  });
});
