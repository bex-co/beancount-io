import { Arg, Args, Ctx, Mutation, Resolver } from "type-graphql";
import { Authenticated } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import { ILedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import { resolveCommitMessage } from "@/features/ledger/utils/commit-message-alias";
import {
  DRY_RUN_NAMES,
  resolveFlagAlias,
} from "@/features/ledger/utils/flag-alias";
import { DELETE_INCLUDE_GUARD_DESCRIPTION } from "@/features/ledger/utils/include-references";

/**
 * Fold the `dry_run` alias into `dryRun` (w23/m9/t002), dropping the alias
 * key so the workflow sees its own contract only.
 */
function withResolvedPreview<
  T extends { dryRun?: boolean | null; dry_run?: boolean | null },
>(input: T): Omit<T, "dry_run"> & { dryRun: boolean } {
  const { dry_run, ...rest } = input;
  return {
    ...rest,
    // The workflow reads `dryRun === true`, so false and missing agree;
    // the resolver also reads explicit null as missing.
    dryRun: resolveFlagAlias(
      { primary: dry_run, legacy: rest.dryRun },
      DRY_RUN_NAMES,
    ),
  };
}

/**
 * Fold the `description` alias into `message` (w23/m3/t002), dropping the
 * alias key so the workflow sees its own contract only.
 */
function withResolvedMessage<
  T extends { description?: string | null; message?: string | null },
>(input: T): Omit<T, "description"> & { message: string | undefined } {
  const { description, ...rest } = input;
  return {
    ...rest,
    message: resolveCommitMessage(
      { description, message: input.message },
      { required: false },
    ),
  };
}
import type { CreateLedgerCommand } from "@/features/ledger/workflow/ledger-workflow.types";
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
    description:
      "Create a new ledger for the current user. STARTER (the default, including null) contains options and accounts without transactions or opening balances; SAMPLE contains demonstration transactions. Existing ledgers are unchanged. Refused with FORBIDDEN for a ledger-pinned credential: use a credential without a pin.",
  })
  async createLedger(
    @Args() input: CreateLedgerInput,
    @Ctx() ctx: IContext,
  ): Promise<Ledger> {
    return this.workflow.createLedger({
      identity: ctx.getCurrentIdentity(),
      // The builder validates capability/opening values at runtime, so the
      // GraphQL string records cross into the strict setup type here.
      input: input as CreateLedgerCommand,
      platform: ctx.platform,
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
      input: withResolvedPreview(input),
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
      input: withResolvedMessage(input),
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
      input: withResolvedMessage(input),
      platform: ctx.platform,
    });
  }

  @Authenticated()
  @Mutation(() => DeleteLedgerFileResponse, {
    description:
      "Delete a file from a specific ledger. " +
      DELETE_INCLUDE_GUARD_DESCRIPTION,
  })
  async deleteLedgerFile(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() input: DeleteLedgerFileInput,
    @Ctx() ctx: IContext,
  ): Promise<DeleteLedgerFileResponse> {
    return this.workflow.deleteLedgerFile({
      identity: ctx.getCurrentIdentity(),
      ledgerId,
      input: withResolvedMessage(input),
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
      input: withResolvedMessage(withResolvedPreview(input)),
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
