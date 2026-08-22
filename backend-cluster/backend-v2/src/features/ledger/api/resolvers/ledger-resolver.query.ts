import {
  Arg,
  Args,
  Authorized,
  Ctx,
  FieldResolver,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import { IContext } from "@/server/graphql/context";
import { ILedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import {
  BcioOptions,
  FavaOptions,
  LedgerAttributes,
  LedgerOptions,
} from "./ledger-report-resolver.types";
import {
  Ledger,
  LedgerFileContent,
  ListLedgersArgs,
  SearchLedgersArgs,
  GetLedgerFileArgs,
  GetLedgerDirContentArgs,
} from "./ledger-resolver.types";

@Resolver(() => Ledger)
export class LedgerQueryResolver {
  constructor(private readonly workflow: ILedgerWorkflow) {}

  @Authorized()
  @Query(() => [Ledger], {
    description: "List all ledgers for the current user",
  })
  async listLedgers(
    @Args() args: ListLedgersArgs,
    @Ctx() ctx: IContext,
  ): Promise<Ledger[]> {
    return this.workflow.listLedgers({ userId: ctx.getCurrentUserId(), args });
  }

  @Authorized()
  @Query(() => [Ledger], {
    description: "List all user owned ledgers for the current user",
  })
  async listUserOwnedLedgers(
    @Args() args: ListLedgersArgs,
    @Ctx() ctx: IContext,
  ): Promise<Ledger[]> {
    return this.workflow.listUserOwnedLedgers({
      userId: ctx.getCurrentUserId(),
      args,
    });
  }

  @Authorized()
  @Query(() => [Ledger], {
    description: "Search for ledgers/repositories",
  })
  async searchLedgers(
    @Args() args: SearchLedgersArgs,
    @Ctx() ctx: IContext,
  ): Promise<Ledger[]> {
    return this.workflow.searchLedgers({
      userId: ctx.getCurrentUserId(),
      args,
    });
  }

  @Query(() => Ledger, {
    description: "Get a specific ledger",
  })
  async getLedger(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<Ledger> {
    return this.workflow.getLedger({ ledgerId, userId: ctx.userId });
  }

  @Query(() => LedgerFileContent, {
    description: "Get the content of a specific ledger file",
    nullable: true,
  })
  async getLedgerFile(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() args: GetLedgerFileArgs,
    @Ctx() ctx: IContext,
  ): Promise<LedgerFileContent | null> {
    return this.workflow.getLedgerFile({ ledgerId, userId: ctx.userId, args });
  }

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
      userId: ctx.userId,
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
      userId: ctx.userId,
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
      userId: ctx.userId,
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
      userId: ctx.userId,
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
      userId: ctx.userId,
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
      userId: ctx.userId,
    });
  }
}
