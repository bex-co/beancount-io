import "reflect-metadata";
import { LedgerShellQueryResolver } from "../ledger-shell-resolver.query";
import { IContext } from "@/server/graphql/context";
import type { Identity } from "@/server/api/identity";
import { InternalServerError } from "@/shared/errors";
import { createLedgerId } from "@/shared/str";

const IDENTITY: Identity = {
  userId: "user-123",
  method: "oauth",
  scopes: new Set(),
};

describe("LedgerShellResolver", () => {
  let resolver: LedgerShellQueryResolver;
  let mockContext: IContext;
  let mockShellService: {
    queryShell: jest.Mock;
    queryShellText: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockShellService = {
      queryShell: jest.fn(),
      queryShellText: jest.fn(),
    };

    mockContext = {
      userId: "user-123",
      identity: IDENTITY,
      service: {} as any,
    } as unknown as IContext;

    resolver = new LedgerShellQueryResolver(mockShellService as any);
  });

  describe("queryShell", () => {
    const ledgerId = createLedgerId("testuser", "testledger");
    const args = { ledgerId, query: "SELECT * FROM test" };

    it("should delegate to service and return result", async () => {
      const expected = {
        resultType: "table" as const,
        table: {
          types: [{ name: "col1", dtype: "string" }],
          rows: [["value1"]],
          t: "table",
        },
      };
      mockShellService.queryShell.mockResolvedValue(expected);

      const result = await resolver.queryShell(args, mockContext);

      expect(mockShellService.queryShell).toHaveBeenCalledWith({
        ledgerId,
        identity: IDENTITY,
        query: "SELECT * FROM test",
      });
      expect(result).toEqual(expected);
    });

    it("should return text result from service", async () => {
      const expected = {
        resultType: "text" as const,
        text: { contents: "Query result text", t: "text" },
      };
      mockShellService.queryShell.mockResolvedValue(expected);

      const result = await resolver.queryShell(args, mockContext);

      expect(result).toEqual(expected);
    });

    it("should propagate errors thrown by the service", async () => {
      mockShellService.queryShell.mockRejectedValue(
        new InternalServerError("Failed to execute shell query"),
      );

      await expect(resolver.queryShell(args, mockContext)).rejects.toThrow(
        InternalServerError,
      );
    });
  });

  describe("queryShellText", () => {
    const ledgerId = createLedgerId("testuser", "testledger");
    const args = { ledgerId, query: "SELECT * FROM test" };

    it("should delegate to service and return result", async () => {
      const expected = { text: "result text" };
      mockShellService.queryShellText.mockResolvedValue(expected);

      const result = await resolver.queryShellText(args, mockContext);

      expect(mockShellService.queryShellText).toHaveBeenCalledWith({
        ledgerId,
        identity: IDENTITY,
        query: "SELECT * FROM test",
      });
      expect(result).toEqual(expected);
    });

    it("should propagate errors thrown by the service", async () => {
      mockShellService.queryShellText.mockRejectedValue(
        new InternalServerError("Failed to execute shell query"),
      );

      await expect(resolver.queryShellText(args, mockContext)).rejects.toThrow(
        InternalServerError,
      );
    });
  });
});
