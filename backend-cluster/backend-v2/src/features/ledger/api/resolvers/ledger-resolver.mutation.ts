import { Arg, Args, Ctx, Mutation, Resolver } from "type-graphql";
import { Authenticated } from "@/server/graphql/authenticated";
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

  @Authenticated()
  @Mutation(() => Ledger, {
    description: "Create a new ledger for the current user",
  })
  async createLedger(
    @Args() input: CreateLedgerInput,
    @Ctx() ctx: IContext,
  ): Promise<Ledger> {
    return this.workflow.createLedger({
      identity: ctx.getCurrentIdentity(),
      input,
    });
  }

  @Authenticated()
  @Mutation(() => Ledger, {
    description: "Update a specific ledger",
  })
  async updateLedger(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() input: UpdateLedgerInput,
    @Ctx() ctx: IContext,
  ): Promise<Ledger> {
    return this.workflow.updateLedger({
      identity: ctx.getCurrentIdentity(),
      ledgerId,
      input,
    });
  }

  @Authenticated()
  @Mutation(() => DeleteLedgerResponse, {
    description: "Delete a specific ledger",
  })
  async deleteLedger(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<DeleteLedgerResponse> {
    return this.workflow.deleteLedger({
      identity: ctx.getCurrentIdentity(),
      ledgerId,
    });
  }

  @Authenticated()
  @Mutation(() => LedgerFileContent, {
    description: "Create a new file in a specific ledger",
  })
  async createLedgerFile(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() input: CreateLedgerFileInput,
    @Ctx() ctx: IContext,
  ): Promise<LedgerFileContent> {
    return this.workflow.createLedgerFile({
      identity: ctx.getCurrentIdentity(),
      ledgerId,
      input,
      platform: ctx.platform,
    });
  }

  @Authenticated()
  @Mutation(() => LedgerFileContent, {
    description: "Update an existing file in a specific ledger",
  })
  async updateLedgerFile(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() input: UpdateLedgerFileInput,
    @Ctx() ctx: IContext,
  ): Promise<LedgerFileContent> {
    return this.workflow.updateLedgerFile({
      identity: ctx.getCurrentIdentity(),
      ledgerId,
      input,
      platform: ctx.platform,
    });
  }

  @Authenticated()
  @Mutation(() => DeleteLedgerFileResponse, {
    description: "Delete a file from a specific ledger",
  })
  async deleteLedgerFile(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() input: DeleteLedgerFileInput,
    @Ctx() ctx: IContext,
  ): Promise<DeleteLedgerFileResponse> {
    return this.workflow.deleteLedgerFile({
      identity: ctx.getCurrentIdentity(),
      ledgerId,
      input,
    });
  }

  @Authenticated()
  @Mutation(() => RenameLedgerFileResponse, {
    description: "Rename a file in a specific ledger",
  })
  async renameLedgerFile(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() input: RenameLedgerFileInput,
    @Ctx() ctx: IContext,
  ): Promise<RenameLedgerFileResponse> {
    return this.workflow.renameLedgerFile({
      identity: ctx.getCurrentIdentity(),
      ledgerId,
      input,
    });
  }

  @Authenticated()
  @Mutation(() => StarLedgerResponse, {
    description: "Star a specific ledger",
  })
  async starLedger(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<StarLedgerResponse> {
    return this.workflow.starLedger({
      identity: ctx.getCurrentIdentity(),
      ledgerId,
    });
  }

  @Authenticated()
  @Mutation(() => StarLedgerResponse, {
    description: "Unstar a specific ledger",
  })
  async unstarLedger(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<StarLedgerResponse> {
    return this.workflow.unstarLedger({
      identity: ctx.getCurrentIdentity(),
      ledgerId,
    });
  }
}
