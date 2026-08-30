import { Resolver, Query, Arg, Ctx, Int } from "type-graphql";
import { Authenticated } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import type { ICommitsService } from "../service/commits-service";
import { CommitListItem, CommitDetails } from "./commits-resolver.types";

@Resolver()
export class CommitsResolver {
  constructor(private readonly commitsService: ICommitsService) {}

  @Authenticated()
  @Query(() => [CommitListItem])
  async listCommits(
    @Arg("ledgerId") ledgerId: string,
    @Arg("branch", { defaultValue: "main" }) branch: string,
    @Arg("page", () => Int, { defaultValue: 1 }) page: number,
    @Arg("limit", () => Int, { defaultValue: 30 }) limit: number,
    @Ctx() ctx: IContext,
  ): Promise<CommitListItem[]> {
    return this.commitsService.listCommits({
      userId: ctx.userId,
      ledgerId,
      branch,
      page,
      limit,
    });
  }

  @Authenticated()
  @Query(() => CommitDetails)
  async getCommitDetails(
    @Arg("ledgerId") ledgerId: string,
    @Arg("sha") sha: string,
    @Ctx() ctx: IContext,
  ): Promise<CommitDetails> {
    return this.commitsService.getCommitDetails({
      userId: ctx.userId,
      ledgerId,
      sha,
    });
  }
}
