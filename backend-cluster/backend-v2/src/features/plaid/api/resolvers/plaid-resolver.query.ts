import {
  Arg,
  Authorized,
  Ctx,
  FieldResolver,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import { IContext } from "@/server/graphql/context";
import {
  PlaidItemType,
  PlaidAccountType,
  PlaidAccountWithInstitutionType,
  PlaidTransactionType,
  PlaidLastSync,
  PlaidAccountMappingSuggestion,
} from "./plaid-resolver.types";
import { CategorySuggestion } from "@/features/llm/api/ai-categorization-resolver.types";
import type { IPlaidItemService } from "@/features/plaid/service/plaid-item-service";
import { assertLedgerAuthorization } from "@/features/ledger/utils/authorize-ledger";

@Resolver(() => PlaidItemType)
export class PlaidQueryResolver {
  constructor(private readonly plaidItemService: IPlaidItemService) {}

  @Authorized()
  @Query(() => [PlaidItemType], {
    description: "Get Plaid Items for the current user, scoped to a ledger.",
  })
  async getPlaidItems(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<PlaidItemType[]> {
    const identity = ctx.getCurrentIdentity();
    assertLedgerAuthorization(identity, ledgerId, "read");
    return this.plaidItemService.getItems(identity.userId, ledgerId);
  }

  @Authorized()
  @Query(() => PlaidItemType, {
    description: "Get a single Plaid Item by ID",
  })
  async getPlaidItem(
    @Arg("id", () => String) id: string,
    @Ctx() ctx: IContext,
  ): Promise<PlaidItemType> {
    return this.plaidItemService.getItem(ctx.getCurrentUserId(), id);
  }

  @FieldResolver(() => PlaidLastSync, { nullable: true })
  async lastSync(
    @Root() item: PlaidItemType,
    @Ctx() ctx: IContext,
  ): Promise<PlaidLastSync | null> {
    const syncLogs = await ctx.loaders.plaidSyncLogsByItemId.load(item.id);
    const lastSyncLog = syncLogs[0];
    if (!lastSyncLog) return null;
    return {
      status: lastSyncLog.status,
      timestamp: lastSyncLog.completedAt || lastSyncLog.startedAt,
      transactionsAdded: lastSyncLog.transactionsAdded,
      errorMessage: lastSyncLog.errorMessage,
    };
  }

  @Authorized()
  @Query(() => [PlaidAccountType], {
    description: "Get all accounts for a specific Plaid Item",
  })
  async getPlaidAccounts(
    @Arg("itemId", () => String) itemId: string,
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<PlaidAccountType[]> {
    const identity = ctx.getCurrentIdentity();
    assertLedgerAuthorization(identity, ledgerId, "read");
    return this.plaidItemService.getAccounts(identity.userId, itemId, ledgerId);
  }

  @Authorized()
  @Query(() => [PlaidAccountWithInstitutionType], {
    description:
      "Get every Plaid account in a ledger together with its owning institution. Powers ledger-wide account pickers.",
  })
  async getPlaidAccountsForLedger(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<PlaidAccountWithInstitutionType[]> {
    const identity = ctx.getCurrentIdentity();
    assertLedgerAuthorization(identity, ledgerId, "read");
    return this.plaidItemService.getAccountsForLedger(
      identity.userId,
      ledgerId,
    );
  }

  @Authorized()
  @Query(() => [PlaidTransactionType], {
    description:
      "Get unsynced transactions for a Plaid account, or for the whole ledger when accountId is omitted",
  })
  async getUnsyncedPlaidTransactions(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Arg("accountId", () => String, { nullable: true })
    accountId: string | undefined,
    @Ctx() ctx: IContext,
  ): Promise<PlaidTransactionType[]> {
    const identity = ctx.getCurrentIdentity();
    assertLedgerAuthorization(identity, ledgerId, "read");
    return this.plaidItemService.getUnsyncedTransactions(
      identity.userId,
      accountId,
      ledgerId,
    );
  }

  @Authorized()
  @Query(() => [CategorySuggestion], {
    description:
      "Suggest target accounts for unsynced Plaid transactions using AI, for one account or the whole ledger when accountId is omitted",
  })
  async suggestPlaidTransactionCategories(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Arg("accountId", () => String, { nullable: true })
    accountId: string | undefined,
    @Ctx() ctx: IContext,
  ): Promise<CategorySuggestion[]> {
    const identity = ctx.getCurrentIdentity();
    assertLedgerAuthorization(identity, ledgerId, "read");
    return this.plaidItemService.suggestCategories(
      identity.userId,
      ledgerId,
      accountId,
    );
  }

  @Authorized()
  @Query(() => [PlaidAccountMappingSuggestion], {
    description:
      "Suggest Beancount account mappings for a Plaid Item's unmapped accounts using AI",
  })
  async suggestPlaidAccountMapping(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Arg("itemId", () => String) itemId: string,
    @Ctx() ctx: IContext,
  ): Promise<PlaidAccountMappingSuggestion[]> {
    const identity = ctx.getCurrentIdentity();
    assertLedgerAuthorization(identity, ledgerId, "read");
    return this.plaidItemService.suggestAccountMapping(
      identity.userId,
      ledgerId,
      itemId,
    );
  }
}
