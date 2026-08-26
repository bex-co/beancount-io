import { Arg, Args, Authorized, Ctx, Mutation, Resolver } from "type-graphql";
import { IContext } from "@/server/graphql/context";
import { ILedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import {
  Ledger,
  LedgerFileContent,
  CreateLedgerInput,
  UpdateLedgerInput,
  CreateLedgerFileInput,
  UpdateLedgerFileInput,
  DeleteLedgerFileInput,
  RenameLedgerFileInput,
  DeleteLedgerResponse,
  DeleteLedgerFileResponse,
  RenameLedgerFileResponse,
  StarLedgerResponse,
} from "./ledger-resolver.types";

@Resolver(() => Ledger)
export class LedgerMutationResolver {
  constructor(private readonly workflow: ILedgerWorkflow) {}

  @Authorized("ledger.admin")
  @Mutation(() => Ledger, {
    description: "Create a new ledger for the current user",
  })
  async createLedger(
    @Args() input: CreateLedgerInput,
    @Ctx() ctx: IContext,
  ): Promise<Ledger> {
    return this.workflow.createLedger({
      userId: ctx.getCurrentUserId(),
      input,
    });
  }

  @Authorized("ledger.admin")
  @Mutation(() => Ledger, {
    description: "Update a specific ledger",
  })
  async updateLedger(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() input: UpdateLedgerInput,
    @Ctx() ctx: IContext,
  ): Promise<Ledger> {
    return this.workflow.updateLedger({
      userId: ctx.getCurrentUserId(),
      ledgerId,
      input,
    });
  }

  @Authorized("ledger.admin")
  @Mutation(() => DeleteLedgerResponse, {
    description: "Delete a specific ledger",
  })
  async deleteLedger(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<DeleteLedgerResponse> {
    return this.workflow.deleteLedger({
      userId: ctx.getCurrentUserId(),
      ledgerId,
    });
  }

  @Authorized()
  @Mutation(() => LedgerFileContent, {
    description: "Create a new file in a specific ledger",
  })
  async createLedgerFile(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() input: CreateLedgerFileInput,
    @Ctx() ctx: IContext,
  ): Promise<LedgerFileContent> {
    return this.workflow.createLedgerFile({
      userId: ctx.getCurrentUserId(),
      ledgerId,
      input,
      platform: ctx.platform,
    });
  }

  @Authorized()
  @Mutation(() => LedgerFileContent, {
    description: "Update an existing file in a specific ledger",
  })
  async updateLedgerFile(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() input: UpdateLedgerFileInput,
    @Ctx() ctx: IContext,
  ): Promise<LedgerFileContent> {
    return this.workflow.updateLedgerFile({
      userId: ctx.getCurrentUserId(),
      ledgerId,
      input,
      platform: ctx.platform,
    });
  }

  @Authorized()
  @Mutation(() => DeleteLedgerFileResponse, {
    description: "Delete a file from a specific ledger",
  })
  async deleteLedgerFile(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() input: DeleteLedgerFileInput,
    @Ctx() ctx: IContext,
  ): Promise<DeleteLedgerFileResponse> {
    return this.workflow.deleteLedgerFile({
      userId: ctx.getCurrentUserId(),
      ledgerId,
      input,
    });
  }

  @Authorized()
  @Mutation(() => RenameLedgerFileResponse, {
    description: "Rename a file in a specific ledger",
  })
  async renameLedgerFile(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() input: RenameLedgerFileInput,
    @Ctx() ctx: IContext,
  ): Promise<RenameLedgerFileResponse> {
    return this.workflow.renameLedgerFile({
      userId: ctx.getCurrentUserId(),
      ledgerId,
      input,
    });
  }

  @Authorized()
  @Mutation(() => StarLedgerResponse, {
    description: "Star a specific ledger",
  })
  async starLedger(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<StarLedgerResponse> {
    return this.workflow.starLedger({
      userId: ctx.getCurrentUserId(),
      ledgerId,
    });
  }

  @Authorized()
  @Mutation(() => StarLedgerResponse, {
    description: "Unstar a specific ledger",
  })
  async unstarLedger(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<StarLedgerResponse> {
    return this.workflow.unstarLedger({
      userId: ctx.getCurrentUserId(),
      ledgerId,
    });
  }
}
