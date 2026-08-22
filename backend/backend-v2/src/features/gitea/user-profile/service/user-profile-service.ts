import type { DbExecutor } from "@/drizzle/drizzle";
import type { IModels } from "@/foundation/models";
import type { IGiteaClientFactory } from "@/foundation/clients/gitea-client-factory";
import { Activity, Repository, User } from "@/features/gitea/client/gitea-api";
import {
  UserProfile,
  UserActivityFeedItem,
  UserRepository,
  PublicUserProfileResponse,
  FollowUserResponse,
  UserListItem,
  UserListResponse,
  RepositoryListItem,
  RepositoryListResponse,
} from "../api/user-profile-resolver.types";
import { logger } from "@/shared/logger";

export interface IUserProfileService {
  getUserProfile(
    username: string,
    userId?: string,
  ): Promise<PublicUserProfileResponse>;
  followUser(username: string, userId: string): Promise<FollowUserResponse>;
  unfollowUser(username: string, userId: string): Promise<FollowUserResponse>;
  getUserFollowers(
    username: string,
    page?: number,
    limit?: number,
  ): Promise<UserListResponse>;
  getUserFollowing(
    username: string,
    page?: number,
    limit?: number,
  ): Promise<UserListResponse>;
  getUserStarredRepos(
    username: string,
    page?: number,
    limit?: number,
  ): Promise<RepositoryListResponse>;
}

/**
 * Service for user profile operations
 * Handles fetching user data, activities, repositories, and follow/unfollow operations
 */
export class UserProfileService implements IUserProfileService {
  constructor(
    private readonly giteaClientFactory: IGiteaClientFactory,
    private readonly models: Pick<IModels, "user">,
    private readonly db: DbExecutor,
  ) {}

  /**
   * Get user profile (public - no auth required)
   * Fetches user info, activities, and repositories
   * @param username Username to fetch profile for
   * @returns PublicUserProfileResponse with profile, isFollowing, activities, and repositories
   */
  async getUserProfile(
    username: string,
    userId?: string,
  ): Promise<PublicUserProfileResponse> {
    const giteaClient = this.giteaClientFactory.getAnonymousApiClient();

    // Fetch user profile
    let userResponse;
    try {
      userResponse = await giteaClient.users.userGet(username, {
        format: "json",
      });
    } catch (error) {
      logger.error("Error fetching user from Gitea", { username, error });
      throw new Error(
        `Failed to fetch user from Gitea: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    const user = userResponse.data;

    if (!user) {
      throw new Error(`User '${username}' not found in Gitea`);
    }

    // Check if current user is following (if authenticated)
    let isFollowing: boolean | undefined;
    if (userId) {
      try {
        const authClient =
          await this.giteaClientFactory.getUserApiClient(userId);
        const followResponse = await authClient.user.userCurrentCheckFollowing(
          username,
          {
            format: "json",
          },
        );
        // 204 = following, 404 = not following
        isFollowing = followResponse.status === 204;
      } catch {
        // If error (likely 404), user is not following
        isFollowing = false;
      }
    }

    // Fetch activities with conditional authentication
    // If user is viewing their own profile, use authenticated client to fetch activities
    // Otherwise, use unauthenticated client which will return empty (activities remain private)
    // NOTE: This is an intentional limit to prevent performance issues.
    // TODO: Add pagination support if users need to see more activities.
    let activities: Activity[] = [];
    try {
      const currentGiteaUsername = await this.getCurrentGiteaUsername(userId);
      const isViewingOwnProfile = !!userId && currentGiteaUsername === username;

      if (isViewingOwnProfile && userId) {
        // User is viewing their own profile - use authenticated client
        const authClient =
          await this.giteaClientFactory.getUserApiClient(userId);
        const activitiesResponse = await authClient.users.userListActivityFeeds(
          username,
          {
            limit: 20,
          },
          {
            format: "json",
          },
        );
        activities = activitiesResponse.data || [];
      } else {
        // User is viewing someone else's profile OR not authenticated
        // Use unauthenticated client (will return empty - Gitea requires auth for activities)
        const activitiesResponse =
          await giteaClient.users.userListActivityFeeds(
            username,
            {
              limit: 20,
            },
            {
              format: "json",
            },
          );
        activities = activitiesResponse.data || [];
      }
    } catch (error) {
      logger.error("Failed to fetch activities", { username, error });
      // Return empty array on error - UI will show "No recent activity"
    }

    // Fetch repositories with conditional authentication
    // If user is viewing their own profile, use authenticated client to include private repos
    // Otherwise, use unauthenticated client to show only public repos
    // NOTE: Limit to 50 repos to prevent performance issues.
    // TODO: Add pagination support if users need to see more repositories.
    let repositories: Repository[] = [];
    try {
      const currentGiteaUsername = await this.getCurrentGiteaUsername(userId);
      const isViewingOwnProfile = !!userId && currentGiteaUsername === username;

      if (isViewingOwnProfile && userId) {
        // User is viewing their own profile - use authenticated client
        const authClient =
          await this.giteaClientFactory.getUserApiClient(userId);
        const reposResponse = await authClient.users.userListRepos(
          username,
          {
            limit: 50,
          },
          {
            format: "json",
          },
        );
        repositories = reposResponse.data || [];
      } else {
        // User is viewing someone else's profile OR not authenticated - use public client
        const reposResponse = await giteaClient.users.userListRepos(
          username,
          {
            limit: 50,
          },
          {
            format: "json",
          },
        );
        repositories = reposResponse.data || [];
      }
    } catch (error) {
      logger.error("Failed to fetch repositories", { username, error });
      // Return empty array on error - UI will show "No repositories"
    }

    // Transform and return
    return {
      profile: this.transformUserProfile(user),
      isFollowing,
      activities: activities.map((a) => this.transformActivity(a)),
      repositories: repositories.map((r) => this.transformRepository(r)),
    };
  }

  /**
   * Follow a user (authenticated)
   * @param username Username to follow
   * @returns FollowUserResponse with success status
   */
  async followUser(
    username: string,
    userId: string,
  ): Promise<FollowUserResponse> {
    try {
      // Get current user to check if they're trying to follow themselves
      const currentUser = await this.models.user.getById(this.db, userId);
      if (currentUser?.ledger_username === username) {
        return {
          success: false,
          isFollowing: false,
          message: "You cannot follow yourself",
        };
      }

      const giteaClient =
        await this.giteaClientFactory.getUserApiClient(userId);
      await giteaClient.user.userCurrentPutFollow(username, {
        format: "json",
      });

      return {
        success: true,
        isFollowing: true,
        message: `Successfully followed ${username}`,
      };
    } catch (error) {
      logger.error("Failed to follow user", { username, error });
      return {
        success: false,
        isFollowing: undefined,
        message: `Failed to follow ${username}`,
      };
    }
  }

  /**
   * Unfollow a user (authenticated)
   * @param username Username to unfollow
   * @returns FollowUserResponse with success status
   */
  async unfollowUser(
    username: string,
    userId: string,
  ): Promise<FollowUserResponse> {
    try {
      const giteaClient =
        await this.giteaClientFactory.getUserApiClient(userId);
      await giteaClient.user.userCurrentDeleteFollow(username, {
        format: "json",
      });

      return {
        success: true,
        isFollowing: false,
        message: `Successfully unfollowed ${username}`,
      };
    } catch (error) {
      logger.error("Failed to unfollow user", { username, error });
      return {
        success: false,
        isFollowing: true,
        message: `Failed to unfollow ${username}`,
      };
    }
  }

  /**
   * Get user's followers
   * @param username Username to fetch followers for
   * @param page Page number (default: 1)
   * @param limit Items per page (default: 20)
   * @returns UserListResponse with followers
   */
  async getUserFollowers(
    username: string,
    page = 1,
    limit = 20,
  ): Promise<UserListResponse> {
    try {
      const giteaClient = this.giteaClientFactory.getAdminApiClient();
      const response = await giteaClient.users.userListFollowers(
        username,
        { page, limit },
        { format: "json" },
      );

      const users = response.data || [];
      return {
        users: users.map((user) => this.transformUserListItem(user)),
        total: users.length,
      };
    } catch (error) {
      logger.error("Failed to fetch followers", { username, error });
      return { users: [], total: 0 };
    }
  }

  /**
   * Get users that this user is following
   * NOTE: Gitea requires authentication to view who a user is following
   * @param username Username to fetch following list for
   * @param page Page number (default: 1)
   * @param limit Items per page (default: 20)
   * @returns UserListResponse with following
   */
  async getUserFollowing(
    username: string,
    page = 1,
    limit = 20,
  ): Promise<UserListResponse> {
    try {
      const giteaClient = this.giteaClientFactory.getAdminApiClient();
      const response = await giteaClient.users.userListFollowing(
        username,
        { page, limit },
        { format: "json" },
      );

      const users = response.data || [];
      return {
        users: users.map((user) => this.transformUserListItem(user)),
        total: users.length,
      };
    } catch (error) {
      logger.error("Failed to fetch following", { username, error });
      return { users: [], total: 0 };
    }
  }

  /**
   * Get user's starred repositories
   * NOTE: Gitea requires authentication to view a user's starred repositories
   * @param username Username to fetch starred repos for
   * @param page Page number (default: 1)
   * @param limit Items per page (default: 20)
   * @returns RepositoryListResponse with starred repos
   */
  async getUserStarredRepos(
    username: string,
    page = 1,
    limit = 20,
  ): Promise<RepositoryListResponse> {
    try {
      const giteaClient = this.giteaClientFactory.getAdminApiClient();
      const response = await giteaClient.users.userListStarred(
        username,
        { page, limit },
        { format: "json" },
      );

      const repositories = response.data || [];
      return {
        repositories: repositories.map((repo) =>
          this.transformRepositoryListItem(repo),
        ),
        total: repositories.length,
      };
    } catch (error) {
      logger.error("Failed to fetch starred repos", { username, error });
      return { repositories: [], total: 0 };
    }
  }

  /**
   * Transform Gitea User to UserProfile GraphQL type
   * @param user Gitea User object
   * @returns UserProfile
   */
  private transformUserProfile(user: User): UserProfile {
    return {
      username: user.login || "",
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      bio: user.description,
      location: user.location,
      website: user.website,
      followersCount: user.followers_count || 0,
      followingCount: user.following_count || 0,
      starredReposCount: user.starred_repos_count || 0,
      created: user.created ? new Date(user.created) : undefined,
    };
  }

  /**
   * Transform Gitea Activity to UserActivityFeedItem
   * @param activity Gitea Activity object
   * @returns UserActivityFeedItem
   */
  private transformActivity(activity: Activity): UserActivityFeedItem {
    return {
      id: `activity-${activity.id || Math.random()}`,
      type: activity.op_type || "unknown",
      content: this.generateActivityContent(activity),
      createdAt: new Date(activity.created || Date.now()),
      repoName: activity.repo?.name,
      repoFullName: activity.repo?.full_name,
    };
  }

  /**
   * Generate user-friendly content for activity
   * @param activity Gitea Activity object
   * @returns Formatted content string
   */
  private generateActivityContent(activity: Activity): string {
    const repoName = activity.repo?.name || "repository";
    const opType = activity.op_type || "unknown";

    const contentMap: Record<string, string> = {
      create_repo: `Created repository ${repoName}`,
      star_repo: `Starred ${repoName}`,
      commit_repo: `Committed to ${repoName}`,
      create_issue: `Created issue in ${repoName}`,
      create_pull_request: `Created pull request in ${repoName}`,
      merge_pull_request: `Merged pull request in ${repoName}`,
      close_issue: `Closed issue in ${repoName}`,
      comment_issue: `Commented on issue in ${repoName}`,
      comment_pull: `Commented on pull request in ${repoName}`,
      publish_release: `Published release in ${repoName}`,
    };

    return contentMap[opType] || activity.content || `Activity in ${repoName}`;
  }

  /**
   * Transform Gitea Repository to UserRepository
   * @param repo Gitea Repository object
   * @returns UserRepository
   */
  private transformRepository(repo: Repository): UserRepository {
    return {
      name: repo.name || "",
      fullName: repo.full_name || "",
      description: repo.description,
      isPrivate: repo.private || false,
      createdAt: new Date(repo.created_at || Date.now()),
      updatedAt: new Date(repo.updated_at || Date.now()),
    };
  }

  /**
   * Transform Gitea User to UserListItem
   * @param user Gitea User object
   * @returns UserListItem
   */
  private transformUserListItem(user: User): UserListItem {
    return {
      username: user.login || "",
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      bio: user.description,
    };
  }

  /**
   * Transform Gitea Repository to RepositoryListItem
   * @param repo Gitea Repository object
   * @returns RepositoryListItem
   */
  private transformRepositoryListItem(repo: Repository): RepositoryListItem {
    return {
      name: repo.name || "",
      fullName: repo.full_name || "",
      description: repo.description,
      isPrivate: repo.private || false,
      updatedAt: new Date(repo.updated_at || Date.now()),
      starsCount: repo.stars_count,
    };
  }

  /**
   * Get the authenticated user's Gitea username if they are logged in
   * @returns Gitea username or null if not authenticated
   */
  private async getCurrentGiteaUsername(
    userId?: string,
  ): Promise<string | null> {
    if (!userId) {
      return null;
    }

    try {
      const user = await this.models.user.getById(this.db, userId);
      if (!user) {
        return null;
      }
      return user.ledger_username;
    } catch {
      // User not found or error fetching user
      return null;
    }
  }
}
