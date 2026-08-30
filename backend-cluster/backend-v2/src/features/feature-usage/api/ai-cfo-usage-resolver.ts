import { Ctx, Field, ObjectType, Query, Resolver } from "type-graphql";
import { Authenticated } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import type { IAiCfoUsageService } from "@/features/feature-usage/service/ai-cfo-usage-service";

@ObjectType()
class AiCfoUsageResponse {
  @Field(() => Number)
  aiCfoTokensUsed: number;

  @Field(() => Number)
  aiCfoTokensMax: number;
}

@Resolver()
export class AiCfoUsageResolver {
  constructor(private readonly aiCfoUsageService: IAiCfoUsageService) {}

  @Authenticated()
  @Query(() => AiCfoUsageResponse, {
    description: "Get AI CFO usage for the current billing month",
  })
  async aiCfoUsage(@Ctx() ctx: IContext): Promise<AiCfoUsageResponse> {
    const usage = await this.aiCfoUsageService.getUsage(ctx.getCurrentUserId());
    return {
      aiCfoTokensUsed: usage.currentCount,
      aiCfoTokensMax: usage.maxAllowed,
    };
  }
}
