import "reflect-metadata";
import { FeedResolver } from "../feed-resolver";
import type { IFeedService } from "../../service/feed-service";
import { FeedSource } from "../feed-resolver.types";
import { createMockContext } from "../../service/__tests__/test-fixtures";

describe("FeedResolver (delegation)", () => {
  let resolver: FeedResolver;
  let mockService: jest.Mocked<IFeedService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockService = {
      getFeed: jest.fn(),
    } as unknown as jest.Mocked<IFeedService>;

    resolver = new FeedResolver(mockService);
  });

  describe("getFeed", () => {
    it("delegates to the feed service with args and the current user id", async () => {
      const mockContext = createMockContext();
      const mockArgs = { offset: 0, limit: 10 };
      const mockResponse = { items: [], total: 0, hasMore: false };
      mockService.getFeed.mockResolvedValue(mockResponse);

      const result = await resolver.getFeed(mockArgs, mockContext);

      expect(mockService.getFeed).toHaveBeenCalledWith(
        mockArgs,
        mockContext.getCurrentIdentity(),
      );
      expect(result).toBe(mockResponse);
    });

    it("passes the locale through in args", async () => {
      const mockContext = createMockContext();
      const mockArgs = { offset: 20, limit: 15, locale: "zh" };
      mockService.getFeed.mockResolvedValue({
        items: [
          {
            id: "test-1",
            title: "Test Item",
            link: "https://example.com/test",
            publishedAt: new Date(),
            source: FeedSource.BLOG,
          },
        ],
        total: 1,
        hasMore: false,
      });

      const result = await resolver.getFeed(mockArgs, mockContext);

      expect(mockService.getFeed).toHaveBeenCalledWith(
        mockArgs,
        mockContext.getCurrentIdentity(),
      );
      expect(result.items).toHaveLength(1);
    });

    it("propagates service errors", async () => {
      const mockContext = createMockContext();
      mockService.getFeed.mockRejectedValue(new Error("Service error"));

      await expect(
        resolver.getFeed({ offset: 0, limit: 10 }, mockContext),
      ).rejects.toThrow("Service error");
    });
  });
});
