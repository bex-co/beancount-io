import "reflect-metadata";
import { PullRequestResolver } from "../pull-request-resolver";
import type { IPullRequestService } from "../../service/pull-request-service";
import { IContext } from "@/server/graphql/context";
import { User } from "@/features/auth/data/user-model";

describe("PullRequestResolver", () => {
  let resolver: PullRequestResolver;
  let mockContext: IContext;
  let mockUser: User;
  let mockService: jest.Mocked<IPullRequestService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      id: "user-id",
      email: "test@example.com",
      ledger_username: "testuser",
      ledger_password: "testpass",
    } as User;

    mockContext = {
      getCurrentUser: jest.fn().mockResolvedValue(mockUser),
    } as unknown as IContext;

    mockService = {
      createPRFromPatch: jest.fn(),
      getPRDetails: jest.fn(),
      mergePR: jest.fn(),
      closePR: jest.fn(),
    } as unknown as jest.Mocked<IPullRequestService>;

    resolver = new PullRequestResolver(mockService);
  });

  describe("createPullRequestFromPatch", () => {
    const validInput = {
      ledgerOwner: "testowner",
      ledgerName: "test-ledger",
      title: "Test PR",
      description: "Test description",
      baseBranch: "main",
      changes: [{ path: "test.txt", content: "Hello World" }],
    };

    it("should create PR successfully", async () => {
      mockService.createPRFromPatch.mockResolvedValue({
        prNumber: 123,
        prUrl: "https://git.example.com/pr/123",
      });

      const result = await resolver.createPullRequestFromPatch(
        validInput,
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.prNumber).toBe(123);
      expect(result.prUrl).toBe("https://git.example.com/pr/123");
      expect(result.message).toBe("Pull request created successfully");
      expect(mockService.createPRFromPatch).toHaveBeenCalledWith(
        "user-id",
        "testowner",
        "test-ledger",
        "Test PR",
        "Test description",
        "main",
        expect.any(Array),
      );
    });

    it("should return error if ledger credentials not configured", async () => {
      delete (mockUser as any).ledger_username;
      delete (mockUser as any).ledger_password;

      const result = await resolver.createPullRequestFromPatch(
        validInput,
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe("Ledger credentials not configured");
      expect(mockService.createPRFromPatch).not.toHaveBeenCalled();
    });

    it("should return error if username is missing", async () => {
      delete (mockUser as any).ledger_username;

      const result = await resolver.createPullRequestFromPatch(
        validInput,
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe("Ledger credentials not configured");
    });

    it("should return error if password is missing", async () => {
      delete (mockUser as any).ledger_password;

      const result = await resolver.createPullRequestFromPatch(
        validInput,
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe("Ledger credentials not configured");
    });

    it("should handle service error gracefully", async () => {
      mockService.createPRFromPatch.mockRejectedValue(
        new Error("Gitea API error"),
      );

      const result = await resolver.createPullRequestFromPatch(
        validInput,
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe("Failed to create PR: Gitea API error");
    });

    it("should use empty string for description if not provided", async () => {
      mockService.createPRFromPatch.mockResolvedValue({
        prNumber: 123,
        prUrl: "https://git.example.com/pr/123",
      });

      const inputWithoutDescription = {
        ...validInput,
        description: undefined,
      };

      await resolver.createPullRequestFromPatch(
        inputWithoutDescription,
        mockContext,
      );

      expect(mockService.createPRFromPatch).toHaveBeenCalledWith(
        "user-id",
        "testowner",
        "test-ledger",
        "Test PR",
        "",
        "main",
        expect.any(Array),
      );
    });
  });

  describe("getPullRequestDetails", () => {
    const mockPRDetails = {
      number: 123,
      title: "Test PR",
      description: "Test description",
      state: "open",
      author: "testuser",
      headBranch: "feature-branch",
      baseBranch: "main",
      files: [{ filename: "test.txt", additions: 5, deletions: 2, changes: 7 }],
      diff: "diff content",
    };

    it("should get PR details successfully", async () => {
      mockService.getPRDetails.mockResolvedValue(mockPRDetails);

      const result = await resolver.getPullRequestDetails(
        "testowner",
        "test-ledger",
        123,
        mockContext,
      );

      expect(result).toEqual(mockPRDetails);
      expect(mockService.getPRDetails).toHaveBeenCalledWith(
        "user-id",
        "testowner",
        "test-ledger",
        123,
      );
    });

    it("should throw error if ledger credentials not configured", async () => {
      delete (mockUser as any).ledger_username;
      delete (mockUser as any).ledger_password;

      await expect(
        resolver.getPullRequestDetails(
          "testowner",
          "test-ledger",
          123,
          mockContext,
        ),
      ).rejects.toThrow("Ledger credentials not configured");
    });

    it("should propagate service errors", async () => {
      mockService.getPRDetails.mockRejectedValue(new Error("PR not found"));

      await expect(
        resolver.getPullRequestDetails(
          "testowner",
          "test-ledger",
          123,
          mockContext,
        ),
      ).rejects.toThrow("PR not found");
    });
  });

  describe("approvePullRequest", () => {
    it("should approve PR successfully", async () => {
      mockService.mergePR.mockResolvedValue({
        success: true,
        message: "PR merged successfully",
      });

      const result = await resolver.approvePullRequest(
        "testowner",
        "test-ledger",
        123,
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe("PR merged successfully");
      expect(mockService.mergePR).toHaveBeenCalledWith(
        "user-id",
        "testowner",
        "test-ledger",
        123,
      );
    });

    it("should return error if ledger credentials not configured", async () => {
      delete (mockUser as any).ledger_username;

      const result = await resolver.approvePullRequest(
        "testowner",
        "test-ledger",
        123,
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe("Ledger credentials not configured");
    });

    it("should handle merge failure", async () => {
      mockService.mergePR.mockResolvedValue({
        success: false,
        message: "Merge conflict",
      });

      const result = await resolver.approvePullRequest(
        "testowner",
        "test-ledger",
        123,
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe("Merge conflict");
    });
  });

  describe("rejectPullRequest", () => {
    it("should reject PR successfully", async () => {
      mockService.closePR.mockResolvedValue({
        success: true,
        message: "PR closed successfully",
      });

      const result = await resolver.rejectPullRequest(
        "testowner",
        "test-ledger",
        123,
        mockContext,
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe("PR closed successfully");
      expect(mockService.closePR).toHaveBeenCalledWith(
        "user-id",
        "testowner",
        "test-ledger",
        123,
      );
    });

    it("should return error if ledger credentials not configured", async () => {
      delete (mockUser as any).ledger_password;

      const result = await resolver.rejectPullRequest(
        "testowner",
        "test-ledger",
        123,
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe("Ledger credentials not configured");
    });

    it("should handle close failure", async () => {
      mockService.closePR.mockResolvedValue({
        success: false,
        message: "Failed to close PR",
      });

      const result = await resolver.rejectPullRequest(
        "testowner",
        "test-ledger",
        123,
        mockContext,
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe("Failed to close PR");
    });
  });
});
