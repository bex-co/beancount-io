import { Resolver, Query, Mutation, Arg, Ctx, Int } from "type-graphql";
import { Authenticated } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import type { IPullRequestService } from "../service/pull-request-service";
import { DomainError } from "@/shared/errors";
import {
  CreatePRFromPatchInput,
  PullRequestResult,
  PullRequestDetails,
} from "./pull-request-resolver.types";

@Resolver()
export class PullRequestResolver {
  constructor(private readonly pullRequestService: IPullRequestService) {}

  @Authenticated()
  @Mutation(() => PullRequestResult)
  async createPullRequestFromPatch(
    @Arg("input") input: CreatePRFromPatchInput,
    @Ctx() ctx: IContext,
  ): Promise<PullRequestResult> {
    try {
      const user = await ctx.getCurrentUser();

      if (!user.ledger_username || !user.ledger_password) {
        return {
          success: false,
          message: "Ledger credentials not configured",
        };
      }

      const result = await this.pullRequestService.createPRFromPatch(
        ctx.getCurrentIdentity(),
        input.ledgerOwner,
        input.ledgerName,
        input.title,
        input.description || "",
        input.baseBranch,
        input.changes,
      );

      return {
        success: true,
        prNumber: result.prNumber,
        prUrl: result.prUrl,
        message: "Pull request created successfully",
      };
    } catch (error) {
      if (error instanceof DomainError) throw error;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        message: `Failed to create PR: ${errorMessage}`,
      };
    }
  }

  @Authenticated()
  @Query(() => PullRequestDetails)
  async getPullRequestDetails(
    @Arg("ledgerOwner") ledgerOwner: string,
    @Arg("ledgerName") ledgerName: string,
    @Arg("prNumber", () => Int) prNumber: number,
    @Ctx() ctx: IContext,
  ): Promise<PullRequestDetails> {
    const user = await ctx.getCurrentUser();

    if (!user.ledger_username || !user.ledger_password) {
      throw new Error("Ledger credentials not configured");
    }

    return await this.pullRequestService.getPRDetails(
      ctx.getCurrentIdentity(),
      ledgerOwner,
      ledgerName,
      prNumber,
    );
  }

  @Authenticated()
  @Mutation(() => PullRequestResult)
  async approvePullRequest(
    @Arg("ledgerOwner") ledgerOwner: string,
    @Arg("ledgerName") ledgerName: string,
    @Arg("prNumber", () => Int) prNumber: number,
    @Ctx() ctx: IContext,
  ): Promise<PullRequestResult> {
    const user = await ctx.getCurrentUser();

    if (!user.ledger_username || !user.ledger_password) {
      return {
        success: false,
        message: "Ledger credentials not configured",
      };
    }

    const result = await this.pullRequestService.mergePR(
      ctx.getCurrentIdentity(),
      ledgerOwner,
      ledgerName,
      prNumber,
    );

    return {
      success: result.success,
      message: result.message,
    };
  }

  @Authenticated()
  @Mutation(() => PullRequestResult)
  async rejectPullRequest(
    @Arg("ledgerOwner") ledgerOwner: string,
    @Arg("ledgerName") ledgerName: string,
    @Arg("prNumber", () => Int) prNumber: number,
    @Ctx() ctx: IContext,
  ): Promise<PullRequestResult> {
    const user = await ctx.getCurrentUser();

    if (!user.ledger_username || !user.ledger_password) {
      return {
        success: false,
        message: "Ledger credentials not configured",
      };
    }

    const result = await this.pullRequestService.closePR(
      ctx.getCurrentIdentity(),
      ledgerOwner,
      ledgerName,
      prNumber,
    );

    return {
      success: result.success,
      message: result.message,
    };
  }
}
