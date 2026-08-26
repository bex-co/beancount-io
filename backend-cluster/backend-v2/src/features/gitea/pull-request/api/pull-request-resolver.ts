import {
  Resolver,
  Query,
  Mutation,
  Arg,
  Ctx,
  Authorized,
  Int,
} from "type-graphql";
import { IContext } from "@/server/graphql/context";
import { assertLedgerScope } from "@/features/ledger/utils/authorize-ledger";
import type { IPullRequestService } from "../service/pull-request-service";
import {
  CreatePRFromPatchInput,
  PullRequestResult,
  PullRequestDetails,
} from "./pull-request-resolver.types";

@Resolver()
export class PullRequestResolver {
  constructor(private readonly pullRequestService: IPullRequestService) {}

  @Authorized()
  @Mutation(() => PullRequestResult)
  async createPullRequestFromPatch(
    @Arg("input") input: CreatePRFromPatchInput,
    @Ctx() ctx: IContext,
  ): Promise<PullRequestResult> {
    // The ledger is named inside the input object, so the pin middleware —
    // which reads top-level arguments — never saw it. Outside the try on
    // purpose: the catch below turns anything thrown into a `success: false`
    // payload, and an authorization refusal reported as a failed merge is a
    // refusal nobody can tell from a git error.
    assertLedgerScope(ctx.identity, `${input.ledgerOwner}/${input.ledgerName}`);

    try {
      const user = await ctx.getCurrentUser();

      if (!user.ledger_username || !user.ledger_password) {
        return {
          success: false,
          message: "Ledger credentials not configured",
        };
      }

      const result = await this.pullRequestService.createPRFromPatch(
        user.id,
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
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        message: `Failed to create PR: ${errorMessage}`,
      };
    }
  }

  @Authorized()
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
      user.id,
      ledgerOwner,
      ledgerName,
      prNumber,
    );
  }

  @Authorized()
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
      user.id,
      ledgerOwner,
      ledgerName,
      prNumber,
    );

    return {
      success: result.success,
      message: result.message,
    };
  }

  @Authorized()
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
      user.id,
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
