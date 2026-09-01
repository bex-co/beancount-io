import "reflect-metadata";
import { LLMParserResolver } from "../llm-parser-resolver";
import type { ILLMService } from "../../service/llm-service";
import type { IContext } from "@/server/graphql/context";
import type { Identity } from "@/server/api/identity";

describe("LLMParserResolver", () => {
  let resolver: LLMParserResolver;
  let mockLLMService: jest.Mocked<ILLMService>;
  let mockContext: IContext;

  /** An OAuth grant pinned to one ledger — the narrowing that must survive. */
  const pinnedIdentity: Identity = {
    userId: "user123",
    method: "oauth",
    scopes: new Set(["ledger.read", "ledger.write"]),
    ledgerScope: "ledger123",
  };

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
      getCurrentIdentity: jest.fn().mockReturnValue(pinnedIdentity),
    } as unknown as IContext;

    resolver = new LLMParserResolver(mockLLMService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("parseFile", () => {
    it("hands the service the caller's real identity", async () => {
      const result = await resolver.parseFile(
        "tmp/file.csv",
        "csv",
        mockContext,
      );

      expect(mockLLMService.parseFile).toHaveBeenCalledWith(
        pinnedIdentity,
        "tmp/file.csv",
        "csv",
      );
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].payee).toBe("Starbucks");
    });
  });

  describe("parseReceipt", () => {
    it("hands the service the caller's real identity, still pinned", async () => {
      const result = await resolver.parseReceipt(
        "tmp/receipt.jpg",
        "ledger123",
        mockContext,
      );

      // A bare userId here would strip `ledgerScope` and leave the service's
      // own scope assertion with nothing to compare.
      expect(mockLLMService.parseReceipt).toHaveBeenCalledWith(
        pinnedIdentity,
        "tmp/receipt.jpg",
        "ledger123",
      );
      expect(result.sourceAccount).toBe("Assets:Bank");
      expect(result.targetAccount).toBe("Expenses:Food");
    });
  });
});
