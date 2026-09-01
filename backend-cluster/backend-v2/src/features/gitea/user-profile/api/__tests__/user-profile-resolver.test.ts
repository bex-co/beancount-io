import "reflect-metadata";
import { UserProfileResolver } from "../user-profile-resolver";
import type { IUserProfileService } from "../../service/user-profile-service";
import { createMockContext } from "../../service/__tests__/test-fixtures";

describe("UserProfileResolver (delegation)", () => {
  let resolver: UserProfileResolver;
  let mockService: jest.Mocked<IUserProfileService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockService = {
      getUserProfile: jest.fn(),
      followUser: jest.fn(),
      unfollowUser: jest.fn(),
      getUserFollowers: jest.fn(),
      getUserFollowing: jest.fn(),
      getUserStarredRepos: jest.fn(),
    } as unknown as jest.Mocked<IUserProfileService>;

    resolver = new UserProfileResolver(mockService);
  });

  describe("getUserProfile", () => {
    it("delegates with the username and the (optional) authenticated userId", async () => {
      const mockContext = createMockContext();
      const mockResponse = {
        profile: {
          username: "testuser",
          fullName: "Test User",
          avatarUrl: "https://example.com/avatar.jpg",
          followersCount: 10,
          followingCount: 5,
          starredReposCount: 15,
          created: new Date("2024-01-01"),
        },
        isFollowing: undefined,
        activities: [],
        repositories: [],
      };
      mockService.getUserProfile.mockResolvedValue(mockResponse);

      const result = await resolver.getUserProfile(
        { username: "testuser" },
        mockContext,
      );

      expect(mockService.getUserProfile).toHaveBeenCalledWith(
        "testuser",
        "user-123",
      );
      expect(result).toEqual(mockResponse);
    });

    it("passes userId undefined for unauthenticated requests", async () => {
      const mockContext = createMockContext({ userId: undefined });
      mockService.getUserProfile.mockResolvedValue({
        profile: {
          username: "publicuser",
          followersCount: 0,
          followingCount: 0,
          starredReposCount: 0,
        },
        isFollowing: undefined,
        activities: [],
        repositories: [],
      } as never);

      await resolver.getUserProfile({ username: "publicuser" }, mockContext);

      expect(mockService.getUserProfile).toHaveBeenCalledWith(
        "publicuser",
        undefined,
      );
    });

    it("propagates service errors", async () => {
      const mockContext = createMockContext();
      mockService.getUserProfile.mockRejectedValue(new Error("User not found"));

      await expect(
        resolver.getUserProfile({ username: "nonexistent" }, mockContext),
      ).rejects.toThrow("User not found");
    });
  });

  describe("followUser", () => {
    it("delegates with the username and the current user id", async () => {
      const mockContext = createMockContext();
      const mockResponse = {
        success: true,
        isFollowing: true,
        message: "Successfully followed targetuser",
      };
      mockService.followUser.mockResolvedValue(mockResponse);

      const result = await resolver.followUser(
        { username: "targetuser" },
        mockContext,
      );

      expect(mockService.followUser).toHaveBeenCalledWith(
        "targetuser",
        mockContext.getCurrentIdentity(),
      );
      expect(result).toEqual(mockResponse);
    });

    it("propagates service errors", async () => {
      const mockContext = createMockContext();
      mockService.followUser.mockRejectedValue(new Error("Service error"));

      await expect(
        resolver.followUser({ username: "targetuser" }, mockContext),
      ).rejects.toThrow("Service error");
    });
  });

  describe("unfollowUser", () => {
    it("delegates with the username and the current user id", async () => {
      const mockContext = createMockContext();
      const mockResponse = {
        success: true,
        isFollowing: false,
        message: "Successfully unfollowed targetuser",
      };
      mockService.unfollowUser.mockResolvedValue(mockResponse);

      const result = await resolver.unfollowUser(
        { username: "targetuser" },
        mockContext,
      );

      expect(mockService.unfollowUser).toHaveBeenCalledWith(
        "targetuser",
        mockContext.getCurrentIdentity(),
      );
      expect(result).toEqual(mockResponse);
    });

    it("propagates service errors", async () => {
      const mockContext = createMockContext();
      mockService.unfollowUser.mockRejectedValue(new Error("Service error"));

      await expect(
        resolver.unfollowUser({ username: "targetuser" }, mockContext),
      ).rejects.toThrow("Service error");
    });
  });

  describe("list queries", () => {
    it("getUserFollowers delegates with username + pagination", async () => {
      mockService.getUserFollowers.mockResolvedValue({ users: [], total: 0 });

      await resolver.getUserFollowers({
        username: "testuser",
        page: 2,
        limit: 10,
      });

      expect(mockService.getUserFollowers).toHaveBeenCalledWith(
        "testuser",
        2,
        10,
      );
    });

    it("getUserFollowing delegates with username + pagination", async () => {
      mockService.getUserFollowing.mockResolvedValue({ users: [], total: 0 });

      await resolver.getUserFollowing({
        username: "testuser",
        page: 1,
        limit: 20,
      });

      expect(mockService.getUserFollowing).toHaveBeenCalledWith(
        "testuser",
        1,
        20,
      );
    });

    it("getUserStarredRepos delegates with username + pagination", async () => {
      mockService.getUserStarredRepos.mockResolvedValue({
        repositories: [],
        total: 0,
      });

      await resolver.getUserStarredRepos({
        username: "testuser",
        page: 1,
        limit: 20,
      });

      expect(mockService.getUserStarredRepos).toHaveBeenCalledWith(
        "testuser",
        1,
        20,
      );
    });
  });
});
