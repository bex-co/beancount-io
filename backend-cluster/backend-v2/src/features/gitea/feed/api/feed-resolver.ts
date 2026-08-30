import { Args, Ctx, Query, Resolver } from "type-graphql";
import { Authenticated } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import type { IFeedService } from "../service/feed-service";
import { FeedResponse, GetFeedArgs } from "./feed-resolver.types";

@Resolver()
export class FeedResolver {
  constructor(private readonly feedService: IFeedService) {}

  /**
   * Get feed items with pagination
   * Fetches RSS feed based on user's language preference
   * @param args Pagination and filter arguments
   * @param ctx GraphQL context
   * @returns Paginated feed response
   */
  @Authenticated()
  @Query(() => FeedResponse)
  async getFeed(
    @Args() args: GetFeedArgs,
    @Ctx() ctx: IContext,
  ): Promise<FeedResponse> {
    return this.feedService.getFeed(args, ctx.getCurrentUserId());
  }
}
