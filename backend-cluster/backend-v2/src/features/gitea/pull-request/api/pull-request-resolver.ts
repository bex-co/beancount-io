import { Resolver, Query, Mutation, Arg, Ctx, Int } from "type-graphql";
import { Authenticated } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import type { IPullRequestWorkflow } from "../workflow/pull-request-workflow";
import {
  CreatePRFromPatchInput,
  PullRequestResult,
  PullRequestDetails,
} from "./pull-request-resolver.types";

@Resolver()
export class PullRequestResolver {
  constructor(private readonly workflow: IPullRequestWorkflow) {}

  @Authenticated()
  @Mutation(() => PullRequestResult)
  async createPullRequestFromPatch(
    @Arg("input") input: CreatePRFromPatchInput,
    @Ctx() ctx: IContext,
  ): Promise<PullRequestResult> {
    return this.workflow.createPullRequestFromPatch(
      input,
      ctx.getCurrentIdentity(),
    );
  }

  @Authenticated()
  @Query(() => PullRequestDetails)
  async getPullRequestDetails(
    @Arg("ledgerOwner") ledgerOwner: string,
    @Arg("ledgerName") ledgerName: string,
    @Arg("prNumber", () => Int) prNumber: number,
    @Ctx() ctx: IContext,
  ): Promise<PullRequestDetails> {
    return this.workflow.getPullRequestDetails(
      ledgerOwner,
      ledgerName,
      prNumber,
      ctx.getCurrentIdentity(),
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
    return this.workflow.approvePullRequest(
      ledgerOwner,
      ledgerName,
      prNumber,
      ctx.getCurrentIdentity(),
    );
  }

  @Authenticated()
  @Mutation(() => PullRequestResult)
  async rejectPullRequest(
    @Arg("ledgerOwner") ledgerOwner: string,
    @Arg("ledgerName") ledgerName: string,
    @Arg("prNumber", () => Int) prNumber: number,
    @Ctx() ctx: IContext,
  ): Promise<PullRequestResult> {
    return this.workflow.rejectPullRequest(
      ledgerOwner,
      ledgerName,
      prNumber,
      ctx.getCurrentIdentity(),
    );
  }
}
