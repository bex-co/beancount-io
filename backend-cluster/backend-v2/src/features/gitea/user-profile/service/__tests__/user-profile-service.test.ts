import "reflect-metadata";
import { UserProfileService } from "../user-profile-service";
import { IContext } from "@/server/graphql/context";
import {
  AUTHORIZATION_ACTIONS,
  userResource,
} from "@/server/api/authorization";
import {
  createMockContext,
  createMockUser,
  createMockGiteaClient,
  createMockGiteaUser,
  createMockGiteaRepository,
  createMockGiteaActivity,
} from "./test-fixtures";

describe("UserProfileService", () => {
  let service: UserProfileService;
  let mockContext: jest.Mocked<IContext>;
  let mockGiteaClient: ReturnType<typeof createMockGiteaClient>;
  let mockModels: { user: { getById: jest.Mock } };
  let mockGetUserApiClient: jest.Mock;
  let authorizeOrThrow: jest.Mock;
  let mockGiteaClientFactory: {
    getAnonymousApiClient: jest.Mock;
    getAdminApiClient: jest.Mock;
    getUserApiClient: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = createMockContext();
    mockGiteaClient = createMockGiteaClient();
    mockModels = { user: { getById: jest.fn() } };

    mockGetUserApiClient = jest.fn();
    authorizeOrThrow = jest.fn().mockResolvedValue({ allowed: true });
    mockGiteaClientFactory = {
      getAnonymousApiClient: jest.fn().mockReturnValue(mockGiteaClient),
      getAdminApiClient: jest.fn().mockReturnValue(mockGiteaClient),
      getUserApiClient: mockGetUserApiClient,
    };

    service = new UserProfileService(
      mockGiteaClientFactory as never,
      mockModels as never,
      {} as never,
      { authorizeOrThrow } as never,
    );
  });

  describe("getUserProfile", () => {
    it("should fetch and transform user profile successfully", async () => {
      const mockUser = createMockGiteaUser();
      mockGiteaClient.users.userGet.mockResolvedValue({ data: mockUser });
      mockGiteaClient.users.userListActivityFeeds.mockResolvedValue({
        data: [],
      });
      mockGiteaClient.users.userListRepos.mockResolvedValue({ data: [] });

      // Mock unauthenticated context (no userId)
      mockContext.userId = undefined;

      const result = await service.getUserProfile(
        "testuser",
        mockContext.userId,
      );

      expect(mockGiteaClient.users.userGet).toHaveBeenCalledWith("testuser", {
        format: "json",
      });
      expect(result.profile).toMatchObject({
        username: "testuser",
        fullName: "Test User",
        followersCount: 10,
        followingCount: 5,
        starredReposCount: 15,
      });
      expect(result.isFollowing).toBeUndefined();
      expect(result.activities).toEqual([]);
      expect(result.repositories).toEqual([]);
    });

    it("should include isFollowing status when user is authenticated", async () => {
      const mockUser = createMockGiteaUser();
      mockGiteaClient.users.userGet.mockResolvedValue({ data: mockUser });
      mockGiteaClient.users.userListActivityFeeds.mockResolvedValue({
        data: [],
      });
      mockGiteaClient.users.userListRepos.mockResolvedValue({ data: [] });

      // Mock authenticated context
      mockContext.userId = "user-123";
      const mockAuthClient = createMockGiteaClient();
      mockAuthClient.user.userCurrentCheckFollowing.mockResolvedValue({
        status: 204,
      } as any);
      mockGetUserApiClient.mockResolvedValue(mockAuthClient);

      const result = await service.getUserProfile(
        "testuser",
        mockContext.userId,
      );

      expect(
        mockAuthClient.user.userCurrentCheckFollowing,
      ).toHaveBeenCalledWith("testuser", { format: "json" });
      expect(result.isFollowing).toBe(true);
    });

    it("should set isFollowing to false when user is not following", async () => {
      const mockUser = createMockGiteaUser();
      mockGiteaClient.users.userGet.mockResolvedValue({ data: mockUser });
      mockGiteaClient.users.userListActivityFeeds.mockResolvedValue({
        data: [],
      });
      mockGiteaClient.users.userListRepos.mockResolvedValue({ data: [] });

      // Mock authenticated context
      mockContext.userId = "user-123";
      const mockAuthClient = createMockGiteaClient();
      mockAuthClient.user.userCurrentCheckFollowing.mockRejectedValue(
        new Error("404"),
      );
      mockGetUserApiClient.mockResolvedValue(mockAuthClient);

      const result = await service.getUserProfile(
        "testuser",
        mockContext.userId,
      );

      expect(result.isFollowing).toBe(false);
    });

    it("should throw error when user not found", async () => {
      mockGiteaClient.users.userGet.mockRejectedValue(
        new Error("User not found"),
      );

      await expect(
        service.getUserProfile("nonexistent", mockContext.userId),
      ).rejects.toThrow("Failed to fetch user from Gitea");
    });

    it("should throw error when user data is null", async () => {
      mockGiteaClient.users.userGet.mockResolvedValue({ data: null } as any);
      mockGiteaClient.users.userListActivityFeeds.mockResolvedValue({
        data: [],
      });
      mockGiteaClient.users.userListRepos.mockResolvedValue({ data: [] });

      await expect(
        service.getUserProfile("testuser", mockContext.userId),
      ).rejects.toThrow("User 'testuser' not found in Gitea");
    });

    it("should fetch and transform activities", async () => {
      const mockUser = createMockGiteaUser();
      const mockActivity = createMockGiteaActivity();
      mockGiteaClient.users.userGet.mockResolvedValue({ data: mockUser });
      mockGiteaClient.users.userListActivityFeeds.mockResolvedValue({
        data: [mockActivity],
      });
      mockGiteaClient.users.userListRepos.mockResolvedValue({ data: [] });

      const result = await service.getUserProfile(
        "testuser",
        mockContext.userId,
      );

      expect(mockGiteaClient.users.userListActivityFeeds).toHaveBeenCalledWith(
        "testuser",
        { limit: 20 },
        { format: "json" },
      );
      expect(result.activities).toHaveLength(1);
      expect(result.activities[0]).toMatchObject({
        id: "activity-1",
        type: "commit_repo",
        content: "Committed to test-repo",
        repoName: "test-repo",
      });
    });

    it("should fetch and transform repositories", async () => {
      const mockUser = createMockGiteaUser();
      const mockRepo = createMockGiteaRepository();
      mockGiteaClient.users.userGet.mockResolvedValue({ data: mockUser });
      mockGiteaClient.users.userListActivityFeeds.mockResolvedValue({
        data: [],
      });
      mockGiteaClient.users.userListRepos.mockResolvedValue({
        data: [mockRepo],
      });

      const result = await service.getUserProfile(
        "testuser",
        mockContext.userId,
      );

      expect(mockGiteaClient.users.userListRepos).toHaveBeenCalledWith(
        "testuser",
        { limit: 50 },
        { format: "json" },
      );
      expect(result.repositories).toHaveLength(1);
      expect(result.repositories[0]).toMatchObject({
        name: "test-repo",
        fullName: "testuser/test-repo",
        description: "A test repository",
        isPrivate: false,
      });
    });

    it("should return empty arrays on activity fetch error", async () => {
      const mockUser = createMockGiteaUser();
      mockGiteaClient.users.userGet.mockResolvedValue({ data: mockUser });
      mockGiteaClient.users.userListActivityFeeds.mockRejectedValue(
        new Error("API Error"),
      );
      mockGiteaClient.users.userListRepos.mockResolvedValue({ data: [] });

      const result = await service.getUserProfile(
        "testuser",
        mockContext.userId,
      );

      expect(result.activities).toEqual([]);
    });

    it("should return empty arrays on repository fetch error", async () => {
      const mockUser = createMockGiteaUser();
      mockGiteaClient.users.userGet.mockResolvedValue({ data: mockUser });
      mockGiteaClient.users.userListActivityFeeds.mockResolvedValue({
        data: [],
      });
      mockGiteaClient.users.userListRepos.mockRejectedValue(
        new Error("API Error"),
      );

      const result = await service.getUserProfile(
        "testuser",
        mockContext.userId,
      );

      expect(result.repositories).toEqual([]);
    });
  });

  describe("followUser", () => {
    it("should follow user successfully", async () => {
      const mockUser = createMockUser({ ledger_username: "currentuser" });
      mockModels.user.getById.mockResolvedValue(mockUser);
      mockGiteaClient.user.userCurrentPutFollow.mockResolvedValue({} as any);
      mockGetUserApiClient.mockResolvedValue(mockGiteaClient);

      const result = await service.followUser(
        "targetuser",
        mockContext.getCurrentIdentity(),
      );

      expect(mockGiteaClient.user.userCurrentPutFollow).toHaveBeenCalledWith(
        "targetuser",
        { format: "json" },
      );
      expect(authorizeOrThrow).toHaveBeenCalledWith({
        principal: mockContext.getCurrentIdentity(),
        action: AUTHORIZATION_ACTIONS.USER_SOCIAL_FOLLOW_CREATE,
        resource: userResource("user-123"),
      });
      expect(result).toEqual({
        success: true,
        isFollowing: true,
        message: "Successfully followed targetuser",
      });
    });

    it("should prevent user from following themselves", async () => {
      const mockUser = createMockUser({ ledger_username: "testuser" });
      mockModels.user.getById.mockResolvedValue(mockUser);

      const result = await service.followUser(
        "testuser",
        mockContext.getCurrentIdentity(),
      );

      expect(mockGiteaClient.user.userCurrentPutFollow).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        isFollowing: false,
        message: "You cannot follow yourself",
      });
    });

    it("should return error on API failure", async () => {
      const mockUser = createMockUser({ ledger_username: "currentuser" });
      mockModels.user.getById.mockResolvedValue(mockUser);
      mockGiteaClient.user.userCurrentPutFollow.mockRejectedValue(
        new Error("API Error"),
      );
      mockGetUserApiClient.mockResolvedValue(mockGiteaClient);

      const result = await service.followUser(
        "targetuser",
        mockContext.getCurrentIdentity(),
      );

      expect(result).toEqual({
        success: false,
        isFollowing: undefined,
        message: "Failed to follow targetuser",
      });
    });
  });

  describe("unfollowUser", () => {
    it("should unfollow user successfully", async () => {
      mockGiteaClient.user.userCurrentDeleteFollow.mockResolvedValue({} as any);
      mockGetUserApiClient.mockResolvedValue(mockGiteaClient);

      const result = await service.unfollowUser(
        "targetuser",
        mockContext.getCurrentIdentity(),
      );

      expect(mockGiteaClient.user.userCurrentDeleteFollow).toHaveBeenCalledWith(
        "targetuser",
        { format: "json" },
      );
      expect(authorizeOrThrow).toHaveBeenCalledWith({
        principal: mockContext.getCurrentIdentity(),
        action: AUTHORIZATION_ACTIONS.USER_SOCIAL_FOLLOW_DELETE,
        resource: userResource("user-123"),
      });
      expect(result).toEqual({
        success: true,
        isFollowing: false,
        message: "Successfully unfollowed targetuser",
      });
    });

    it("should return error on API failure", async () => {
      mockGiteaClient.user.userCurrentDeleteFollow.mockRejectedValue(
        new Error("API Error"),
      );
      mockGetUserApiClient.mockResolvedValue(mockGiteaClient);

      const result = await service.unfollowUser(
        "targetuser",
        mockContext.getCurrentIdentity(),
      );

      expect(result).toEqual({
        success: false,
        isFollowing: true,
        message: "Failed to unfollow targetuser",
      });
    });

    it("makes no Gitea write when authorization denies", async () => {
      authorizeOrThrow.mockRejectedValueOnce(new Error("denied"));
      await expect(
        service.unfollowUser("targetuser", mockContext.getCurrentIdentity()),
      ).rejects.toThrow("denied");
      expect(mockGetUserApiClient).not.toHaveBeenCalled();
      expect(
        mockGiteaClient.user.userCurrentDeleteFollow,
      ).not.toHaveBeenCalled();
    });
  });

  describe("transformUserProfile", () => {
    it("should transform Gitea User to UserProfile", () => {
      const mockUser = createMockGiteaUser({
        login: "john",
        full_name: "John Doe",
        avatar_url: "https://example.com/avatar.jpg",
        description: "Software Engineer",
        location: "New York",
        website: "https://johndoe.com",
        followers_count: 50,
        following_count: 30,
        starred_repos_count: 100,
        created: "2023-06-15T12:00:00Z",
      });

      const result = (service as any).transformUserProfile(mockUser);

      expect(result).toEqual({
        username: "john",
        fullName: "John Doe",
        avatarUrl: "https://example.com/avatar.jpg",
        bio: "Software Engineer",
        location: "New York",
        website: "https://johndoe.com",
        followersCount: 50,
        followingCount: 30,
        starredReposCount: 100,
        created: new Date("2023-06-15T12:00:00Z"),
      });
    });

    it("should handle missing optional fields", () => {
      const mockUser = createMockGiteaUser({
        login: "minimal",
        full_name: undefined,
        description: undefined,
        location: undefined,
        website: undefined,
        followers_count: undefined,
        following_count: undefined,
        starred_repos_count: undefined,
        created: undefined,
      });

      const result = (service as any).transformUserProfile(mockUser);

      expect(result).toEqual({
        username: "minimal",
        fullName: undefined,
        avatarUrl: "https://example.com/avatar.jpg",
        bio: undefined,
        location: undefined,
        website: undefined,
        followersCount: 0,
        followingCount: 0,
        starredReposCount: 0,
        created: undefined,
      });
    });
  });

  describe("transformActivity", () => {
    it("should transform commit activity", () => {
      const mockActivity = createMockGiteaActivity({
        id: 42,
        op_type: "commit_repo",
        repo: {
          name: "my-ledger",
          full_name: "user/my-ledger",
        },
        created: "2024-01-20T15:30:00Z",
      });

      const result = (service as any).transformActivity(mockActivity);

      expect(result).toEqual({
        id: "activity-42",
        type: "commit_repo",
        content: "Committed to my-ledger",
        createdAt: new Date("2024-01-20T15:30:00Z"),
        repoName: "my-ledger",
        repoFullName: "user/my-ledger",
      });
    });

    it("should handle activity with missing repo", () => {
      const mockActivity = createMockGiteaActivity({
        id: 99,
        op_type: "commit_repo",
        repo: undefined,
      });

      const result = (service as any).transformActivity(mockActivity);

      expect(result.content).toBe("Committed to repository");
      expect(result.repoName).toBeUndefined();
    });
  });

  describe("generateActivityContent", () => {
    it("should generate content for create_repo", () => {
      const activity = { op_type: "create_repo", repo: { name: "test" } };
      const result = (service as any).generateActivityContent(activity);
      expect(result).toBe("Created repository test");
    });

    it("should generate content for star_repo", () => {
      const activity = { op_type: "star_repo", repo: { name: "test" } };
      const result = (service as any).generateActivityContent(activity);
      expect(result).toBe("Starred test");
    });

    it("should generate content for commit_repo", () => {
      const activity = { op_type: "commit_repo", repo: { name: "test" } };
      const result = (service as any).generateActivityContent(activity);
      expect(result).toBe("Committed to test");
    });

    it("should generate content for create_issue", () => {
      const activity = { op_type: "create_issue", repo: { name: "test" } };
      const result = (service as any).generateActivityContent(activity);
      expect(result).toBe("Created issue in test");
    });

    it("should use activity.content as fallback", () => {
      const activity = {
        op_type: "delete_tag" as any, // Using a valid but unmapped op_type
        repo: { name: "test" },
        content: "Custom activity content",
      };
      const result = (service as any).generateActivityContent(activity);
      expect(result).toBe("Custom activity content");
    });

    it("should use default message for unknown activity", () => {
      const activity = {
        op_type: "delete_tag" as any, // Using a valid but unmapped op_type
        repo: { name: "test" },
      };
      const result = (service as any).generateActivityContent(activity);
      expect(result).toBe("Activity in test");
    });
  });

  describe("transformRepository", () => {
    it("should transform Gitea Repository to UserRepository", () => {
      const mockRepo = createMockGiteaRepository({
        name: "awesome-repo",
        full_name: "user/awesome-repo",
        description: "An awesome repository",
        private: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-20T12:00:00Z",
      });

      const result = (service as any).transformRepository(mockRepo);

      expect(result).toEqual({
        name: "awesome-repo",
        fullName: "user/awesome-repo",
        description: "An awesome repository",
        isPrivate: true,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-20T12:00:00Z"),
      });
    });

    it("should handle missing optional fields", () => {
      const mockRepo = createMockGiteaRepository({
        name: "minimal-repo",
        full_name: "user/minimal-repo",
        description: undefined,
        private: undefined,
        created_at: undefined,
        updated_at: undefined,
      });

      const result = (service as any).transformRepository(mockRepo);

      expect(result).toMatchObject({
        name: "minimal-repo",
        fullName: "user/minimal-repo",
        description: undefined,
        isPrivate: false,
      });
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("getUserFollowers", () => {
    it("should fetch followers using admin client", async () => {
      const mockFollower1 = createMockGiteaUser({
        login: "follower1",
        full_name: "Follower One",
      });
      const mockFollower2 = createMockGiteaUser({
        login: "follower2",
        full_name: "Follower Two",
      });

      mockGiteaClient.users.userListFollowers.mockResolvedValue({
        data: [mockFollower1, mockFollower2],
      } as any);

      const result = await service.getUserFollowers("testuser", 1, 20);

      expect(mockGiteaClient.users.userListFollowers).toHaveBeenCalledWith(
        "testuser",
        { page: 1, limit: 20 },
        { format: "json" },
      );
      expect(result.users).toHaveLength(2);
      expect(result.users[0]).toMatchObject({
        username: "follower1",
        fullName: "Follower One",
      });
      expect(result.total).toBe(2);
    });

    it("should return empty array when no followers", async () => {
      mockGiteaClient.users.userListFollowers.mockResolvedValue({
        data: [],
      } as any);

      const result = await service.getUserFollowers("testuser");

      expect(result).toEqual({
        users: [],
        total: 0,
      });
    });

    it("should handle API errors gracefully", async () => {
      mockGiteaClient.users.userListFollowers.mockRejectedValue(
        new Error("API Error"),
      );

      const result = await service.getUserFollowers("testuser");

      expect(result).toEqual({
        users: [],
        total: 0,
      });
    });

    it("should use default pagination parameters", async () => {
      mockGiteaClient.users.userListFollowers.mockResolvedValue({
        data: [],
      } as any);

      await service.getUserFollowers("testuser");

      expect(mockGiteaClient.users.userListFollowers).toHaveBeenCalledWith(
        "testuser",
        { page: 1, limit: 20 },
        { format: "json" },
      );
    });

    it("should use custom pagination parameters", async () => {
      mockGiteaClient.users.userListFollowers.mockResolvedValue({
        data: [],
      } as any);

      await service.getUserFollowers("testuser", 2, 50);

      expect(mockGiteaClient.users.userListFollowers).toHaveBeenCalledWith(
        "testuser",
        { page: 2, limit: 50 },
        { format: "json" },
      );
    });
  });

  describe("getUserFollowing", () => {
    it("should fetch following list using admin client", async () => {
      const mockUser1 = createMockGiteaUser({
        login: "user1",
        full_name: "User One",
      });
      const mockUser2 = createMockGiteaUser({
        login: "user2",
        full_name: "User Two",
      });

      mockGiteaClient.users.userListFollowing.mockResolvedValue({
        data: [mockUser1, mockUser2],
      } as any);

      const result = await service.getUserFollowing("testuser", 1, 20);

      expect(mockGiteaClient.users.userListFollowing).toHaveBeenCalledWith(
        "testuser",
        { page: 1, limit: 20 },
        { format: "json" },
      );
      expect(result.users).toHaveLength(2);
      expect(result.users[0]).toMatchObject({
        username: "user1",
        fullName: "User One",
      });
      expect(result.total).toBe(2);
    });

    it("should return empty array when not following anyone", async () => {
      mockGiteaClient.users.userListFollowing.mockResolvedValue({
        data: [],
      } as any);

      const result = await service.getUserFollowing("testuser");

      expect(result).toEqual({
        users: [],
        total: 0,
      });
    });

    it("should handle API errors gracefully", async () => {
      mockGiteaClient.users.userListFollowing.mockRejectedValue(
        new Error("API Error"),
      );

      const result = await service.getUserFollowing("testuser");

      expect(result).toEqual({
        users: [],
        total: 0,
      });
    });

    it("should work without user authentication", async () => {
      mockContext.userId = undefined;
      mockGiteaClient.users.userListFollowing.mockResolvedValue({
        data: [createMockGiteaUser()],
      } as any);

      const result = await service.getUserFollowing("testuser");

      expect(mockGiteaClient.users.userListFollowing).toHaveBeenCalled();
      expect(result.users).toHaveLength(1);
    });

    it("should use custom pagination parameters", async () => {
      mockGiteaClient.users.userListFollowing.mockResolvedValue({
        data: [],
      } as any);

      await service.getUserFollowing("testuser", 3, 10);

      expect(mockGiteaClient.users.userListFollowing).toHaveBeenCalledWith(
        "testuser",
        { page: 3, limit: 10 },
        { format: "json" },
      );
    });
  });

  describe("getUserStarredRepos", () => {
    it("should fetch starred repos using admin client", async () => {
      const mockRepo1 = createMockGiteaRepository({
        name: "repo1",
        full_name: "owner/repo1",
        stars_count: 50,
      });
      const mockRepo2 = createMockGiteaRepository({
        name: "repo2",
        full_name: "owner/repo2",
        stars_count: 100,
      });

      mockGiteaClient.users.userListStarred.mockResolvedValue({
        data: [mockRepo1, mockRepo2],
      } as any);

      const result = await service.getUserStarredRepos("testuser", 1, 20);

      expect(mockGiteaClient.users.userListStarred).toHaveBeenCalledWith(
        "testuser",
        { page: 1, limit: 20 },
        { format: "json" },
      );
      expect(result.repositories).toHaveLength(2);
      expect(result.repositories[0]).toMatchObject({
        name: "repo1",
        fullName: "owner/repo1",
        starsCount: 50,
      });
      expect(result.total).toBe(2);
    });

    it("should return empty array when no starred repos", async () => {
      mockGiteaClient.users.userListStarred.mockResolvedValue({
        data: [],
      } as any);

      const result = await service.getUserStarredRepos("testuser");

      expect(result).toEqual({
        repositories: [],
        total: 0,
      });
    });

    it("should handle API errors gracefully", async () => {
      mockGiteaClient.users.userListStarred.mockRejectedValue(
        new Error("API Error"),
      );

      const result = await service.getUserStarredRepos("testuser");

      expect(result).toEqual({
        repositories: [],
        total: 0,
      });
    });

    it("should work without user authentication", async () => {
      mockContext.userId = undefined;
      mockGiteaClient.users.userListStarred.mockResolvedValue({
        data: [createMockGiteaRepository()],
      } as any);

      const result = await service.getUserStarredRepos("testuser");

      expect(mockGiteaClient.users.userListStarred).toHaveBeenCalled();
      expect(result.repositories).toHaveLength(1);
    });

    it("should use custom pagination parameters", async () => {
      mockGiteaClient.users.userListStarred.mockResolvedValue({
        data: [],
      } as any);

      await service.getUserStarredRepos("testuser", 2, 30);

      expect(mockGiteaClient.users.userListStarred).toHaveBeenCalledWith(
        "testuser",
        { page: 2, limit: 30 },
        { format: "json" },
      );
    });

    it("should transform repositories correctly", async () => {
      const mockRepo = createMockGiteaRepository({
        name: "awesome-project",
        full_name: "user/awesome-project",
        description: "An awesome project",
        private: false,
        stars_count: 250,
        updated_at: "2024-01-20T10:00:00Z",
      });

      mockGiteaClient.users.userListStarred.mockResolvedValue({
        data: [mockRepo],
      } as any);

      const result = await service.getUserStarredRepos("testuser");

      expect(result.repositories[0]).toEqual({
        name: "awesome-project",
        fullName: "user/awesome-project",
        description: "An awesome project",
        isPrivate: false,
        starsCount: 250,
        updatedAt: new Date("2024-01-20T10:00:00Z"),
      });
    });
  });
});
