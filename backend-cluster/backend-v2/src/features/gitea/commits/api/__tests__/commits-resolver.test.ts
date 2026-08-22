import "reflect-metadata";
import { CommitsResolver } from "../commits-resolver";
import type { ICommitsService } from "../../service/commits-service";
import { IContext } from "@/server/graphql/context";

jest.mock("@/shared/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe("CommitsResolver", () => {
  let resolver: CommitsResolver;
  let mockContext: jest.Mocked<IContext>;
  let mockService: jest.Mocked<ICommitsService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockService = {
      listCommits: jest.fn(),
      getCommitDetails: jest.fn(),
    } as unknown as jest.Mocked<ICommitsService>;

    resolver = new CommitsResolver(mockService);

    mockContext = {
      userId: "user123",
      getCurrentUser: jest.fn(),
    } as any;
  });

  describe("listCommits", () => {
    const ledgerId = "testowner/testledger";
    const branch = "main";
    const page = 1;
    const limit = 30;

    it("should list commits for authenticated user", async () => {
      const mockCommits = [
        {
          sha: "abc123",
          message: "Test commit",
          author: "Test Author",
          date: "2025-01-01T00:00:00Z",
        },
      ];

      mockService.listCommits.mockResolvedValue(mockCommits as any);

      const result = await resolver.listCommits(
        ledgerId,
        branch,
        page,
        limit,
        mockContext,
      );

      expect(result).toEqual(mockCommits);
      expect(mockService.listCommits).toHaveBeenCalledWith({
        userId: "user123",
        ledgerId,
        branch,
        page,
        limit,
      });
    });

    it("should list commits for anonymous user", async () => {
      const mockCommits = [{ sha: "abc123", message: "Test commit" }];
      mockContext.userId = undefined as any;
      mockService.listCommits.mockResolvedValue(mockCommits as any);

      const result = await resolver.listCommits(
        ledgerId,
        branch,
        page,
        limit,
        mockContext,
      );

      expect(result).toEqual(mockCommits);
      expect(mockService.listCommits).toHaveBeenCalledWith({
        userId: undefined,
        ledgerId,
        branch,
        page,
        limit,
      });
    });
  });

  describe("getCommitDetails", () => {
    const ledgerId = "testowner/testledger";
    const sha = "abc123";

    it("should get commit details for authenticated user", async () => {
      const mockDetails = {
        sha: "abc123",
        message: "Test commit",
        author: "Test Author",
        date: "2025-01-01T00:00:00Z",
        diff: "diff content",
        files: [],
      };

      mockService.getCommitDetails.mockResolvedValue(mockDetails as any);

      const result = await resolver.getCommitDetails(
        ledgerId,
        sha,
        mockContext,
      );

      expect(result).toEqual(mockDetails);
      expect(mockService.getCommitDetails).toHaveBeenCalledWith({
        userId: "user123",
        ledgerId,
        sha,
      });
    });

    it("should get commit details for anonymous user", async () => {
      const mockDetails = { sha: "abc123", message: "Test commit", files: [] };
      mockContext.userId = undefined as any;
      mockService.getCommitDetails.mockResolvedValue(mockDetails as any);

      const result = await resolver.getCommitDetails(
        ledgerId,
        sha,
        mockContext,
      );

      expect(result).toEqual(mockDetails);
      expect(mockService.getCommitDetails).toHaveBeenCalledWith({
        userId: undefined,
        ledgerId,
        sha,
      });
    });
  });
});
