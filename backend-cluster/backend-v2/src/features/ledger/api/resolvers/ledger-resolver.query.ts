import {
  Arg,
  Args,
  Ctx,
  FieldResolver,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import { AllowAnonymous, Authenticated } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import { ILedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import type { LedgerSetup } from "@/features/ledger/setup/build-ledger";
import {
  BcioOptions,
  FavaOptions,
  LedgerAttributes,
  LedgerOptions,
} from "./ledger-report-resolver.types";
import {
  Ledger,
  LedgerFileContent,
  LedgerSetupInput,
  LedgerSetupPreview,
  ListLedgersArgs,
  SearchLedgersArgs,
  GetLedgerFileArgs,
  GetLedgerDirContentArgs,
} from "./ledger-resolver.types";

@Resolver(() => Ledger)
export class LedgerQueryResolver {
  constructor(private readonly workflow: ILedgerWorkflow) {}

  @Authenticated()
  @Query(() => LedgerSetupPreview, {
    description:
      "Preview a ledger setup (ADR026) without creating anything: the files, account list, and validation result the specification would produce.",
  })
  async previewLedgerSetup(
    @Arg("setup", () => LedgerSetupInput) setup: LedgerSetupInput,
    @Ctx() ctx: IContext,
  ): Promise<LedgerSetupPreview> {
    return this.workflow.previewLedgerSetup({
      identity: ctx.getCurrentIdentity(),
      setup: setup as LedgerSetup,
    });
  }

  @Authenticated()
  @Query(() => [Ledger], {
    description: "List all ledgers for the current user",
  })
  async listLedgers(
    @Args() args: ListLedgersArgs,
    @Ctx() ctx: IContext,
  ): Promise<Ledger[]> {
    return this.workflow.listLedgers({
      identity: ctx.getCurrentIdentity(),
      args,
    });
  }

  @Authenticated()
  @Query(() => [Ledger], {
    description: "List all user owned ledgers for the current user",
  })
  async listUserOwnedLedgers(
    @Args() args: ListLedgersArgs,
    @Ctx() ctx: IContext,
  ): Promise<Ledger[]> {
    return this.workflow.listUserOwnedLedgers({
      identity: ctx.getCurrentIdentity(),
      args,
    });
  }

  @Authenticated()
  @Query(() => [Ledger], {
    description: "Search for ledgers/repositories",
  })
  async searchLedgers(
    @Args() args: SearchLedgersArgs,
    @Ctx() ctx: IContext,
  ): Promise<Ledger[]> {
    return this.workflow.searchLedgers({
      identity: ctx.getCurrentIdentity(),
      args,
    });
  }

  @AllowAnonymous()
  @Query(() => Ledger, {
    description: "Get a specific ledger",
  })
  async getLedger(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<Ledger> {
    return this.workflow.getLedger({ ledgerId, identity: ctx.identity });
  }

  /** The root twin of `Ledger.options` that REST and MCP bind to (w6/m3). */
  @AllowAnonymous()
  @Query(() => LedgerOptions, {
    description:
      "Get the effective beancount options of a ledger: title, account-root names, conversion and earnings accounts, comma rendering, and operating currencies",
  })
  async getLedgerOptions(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<LedgerOptions> {
    return this.workflow.getLedgerOptions({ ledgerId, identity: ctx.identity });
  }

  @AllowAnonymous()
  @Query(() => LedgerFileContent, {
    description: "Get the content of a specific ledger file",
    nullable: true,
  })
  async getLedgerFile(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() args: GetLedgerFileArgs,
    @Ctx() ctx: IContext,
  ): Promise<LedgerFileContent | null> {
    return this.workflow.getLedgerFile({
      ledgerId,
      identity: ctx.identity,
      args,
    });
  }

  @AllowAnonymous()
  @Query(() => [LedgerFileContent], {
    description: "Get the content of a specific ledger directory",
  })
  async getLedgerDirContent(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() args: GetLedgerDirContentArgs,
    @Ctx() ctx: IContext,
  ): Promise<LedgerFileContent[]> {
    return this.workflow.getLedgerDirContent({
      ledgerId,
      identity: ctx.identity,
      args,
    });
  }

  @FieldResolver(() => LedgerAttributes, {
    description: "Get the filter options (attributes) of a ledger",
  })
  async attributes(
    @Root() ledger: Ledger,
    @Ctx() ctx: IContext,
  ): Promise<LedgerAttributes> {
    return this.workflow.getLedgerAttributes({
      ledgerId: ledger.id,
      identity: ctx.identity,
    });
  }

  @FieldResolver(() => LedgerOptions, {
    description: "Get the beancount options of a ledger",
  })
  async options(
    @Root() ledger: Ledger,
    @Ctx() ctx: IContext,
  ): Promise<LedgerOptions> {
    return this.workflow.getLedgerOptions({
      ledgerId: ledger.id,
      identity: ctx.identity,
    });
  }

  @FieldResolver(() => FavaOptions, {
    description: "Get the fava options of a ledger",
  })
  async favaOptions(
    @Root() ledger: Ledger,
    @Ctx() ctx: IContext,
  ): Promise<FavaOptions> {
    return this.workflow.getLedgerFavaOptions({
      ledgerId: ledger.id,
      identity: ctx.identity,
    });
  }

  @FieldResolver(() => BcioOptions, {
    description: "Get the beancount.io-specific options of a ledger",
  })
  async bcioOptions(
    @Root() ledger: Ledger,
    @Ctx() ctx: IContext,
  ): Promise<BcioOptions> {
    return this.workflow.getLedgerBcioOptions({
      ledgerId: ledger.id,
      identity: ctx.identity,
    });
  }

  @FieldResolver(() => Boolean, {
    description: "Check if the current user has starred this ledger",
    nullable: true,
  })
  async isStarred(
    @Root() ledger: Ledger,
    @Ctx() ctx: IContext,
  ): Promise<boolean | undefined> {
    return this.workflow.isLedgerStarred({
      ledgerId: ledger.id,
      identity: ctx.identity,
    });
  }
}
