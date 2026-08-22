import { Authorized, Args, Ctx, Query, Mutation, Resolver } from "type-graphql";
import { IContext } from "@/server/graphql/context";
import type { IUserProfileService } from "../service/user-profile-service";
import {
  PublicUserProfileResponse,
  FollowUserResponse,
  GetUserProfileArgs,
  FollowUserArgs,
  UserListResponse,
  RepositoryListResponse,
  GetUserListArgs,
} from "./user-profile-resolver.types";

@Resolver()
export class UserProfileResolver {
  constructor(private readonly userProfileService: IUserProfileService) {}

  /**
   * Get user profile (PUBLIC - no auth required)
   * Fetches user profile, activities, and repositories
   * If user is authenticated, also returns isFollowing status
   * @param args Arguments with username
   * @param ctx GraphQL context
   * @returns PublicUserProfileResponse with profile data
   */
  @Query(() => PublicUserProfileResponse, {
    description: "Get user profile by username",
  })
  async getUserProfile(
    @Args() args: GetUserProfileArgs,
    @Ctx() ctx: IContext,
  ): Promise<PublicUserProfileResponse> {
    return this.userProfileService.getUserProfile(args.username, ctx.userId);
  }

  /**
   * Follow a user (AUTHENTICATED)
   * Requires user to be logged in
   * @param args Arguments with username to follow
   * @param ctx GraphQL context
   * @returns FollowUserResponse with success status
   */
  @Authorized()
  @Mutation(() => FollowUserResponse, { description: "Follow a user" })
  async followUser(
    @Args() args: FollowUserArgs,
    @Ctx() ctx: IContext,
  ): Promise<FollowUserResponse> {
    return this.userProfileService.followUser(
      args.username,
      ctx.getCurrentUserId(),
    );
  }

  /**
   * Unfollow a user (AUTHENTICATED)
   * Requires user to be logged in
   * @param args Arguments with username to unfollow
   * @param ctx GraphQL context
   * @returns FollowUserResponse with success status
   */
  @Authorized()
  @Mutation(() => FollowUserResponse, { description: "Unfollow a user" })
  async unfollowUser(
    @Args() args: FollowUserArgs,
    @Ctx() ctx: IContext,
  ): Promise<FollowUserResponse> {
    return this.userProfileService.unfollowUser(
      args.username,
      ctx.getCurrentUserId(),
    );
  }

  /**
   * Get user's followers (PUBLIC - no auth required)
   * @param args Arguments with username and pagination
   * @param ctx GraphQL context
   * @returns UserListResponse with followers
   */
  @Query(() => UserListResponse, { description: "Get user's followers" })
  async getUserFollowers(
    @Args() args: GetUserListArgs,
  ): Promise<UserListResponse> {
    return this.userProfileService.getUserFollowers(
      args.username,
      args.page,
      args.limit,
    );
  }

  /**
   * Get users that this user is following (PUBLIC - no auth required)
   * @param args Arguments with username and pagination
   * @param ctx GraphQL context
   * @returns UserListResponse with following
   */
  @Query(() => UserListResponse, {
    description: "Get users that this user is following",
  })
  async getUserFollowing(
    @Args() args: GetUserListArgs,
  ): Promise<UserListResponse> {
    return this.userProfileService.getUserFollowing(
      args.username,
      args.page,
      args.limit,
    );
  }

  /**
   * Get user's starred repositories (PUBLIC - no auth required)
   * @param args Arguments with username and pagination
   * @param ctx GraphQL context
   * @returns RepositoryListResponse with starred repos
   */
  @Query(() => RepositoryListResponse, {
    description: "Get user's starred repositories",
  })
  async getUserStarredRepos(
    @Args() args: GetUserListArgs,
  ): Promise<RepositoryListResponse> {
    return this.userProfileService.getUserStarredRepos(
      args.username,
      args.page,
      args.limit,
    );
  }
}
