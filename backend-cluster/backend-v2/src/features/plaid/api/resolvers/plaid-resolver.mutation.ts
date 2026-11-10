import { Arg, Ctx, Mutation, Resolver } from "type-graphql";
import { Authenticated } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import {
  PlaidLinkToken,
  PlaidItemType,
  PlaidSyncResult,
  PlaidSubmitResult,
  PlaidDeleteResult,
  PlaidAccountReconcileResult,
  PlaidTransactionSubmitInput,
} from "./plaid-resolver.types";
import { parseLedgerId } from "@/shared/str";
import type { IPlaidItemService } from "@/features/plaid/service/plaid-item-service";
import type { IPlaidSyncService } from "@/features/plaid/service/plaid-sync-service";
import {
  DRY_RUN_NAMES,
  resolveFlagAlias,
} from "@/features/ledger/utils/flag-alias";
import { PREVIEW_FLAG_DESCRIPTION } from "@/features/ledger/utils/preview-flag-description";

/**
 * The preview flag under either spelling, as REST and MCP take it on the same
 * five bank writes (w1/211); two different values are refused.
 */
const preview = (flags: { dryRun?: boolean; dry_run?: boolean }) =>
  resolveFlagAlias(
    { primary: flags.dry_run, legacy: flags.dryRun },
    DRY_RUN_NAMES,
  );

@Resolver()
export class PlaidMutationResolver {
  constructor(
    private readonly plaidItemService: IPlaidItemService,
    private readonly plaidSyncService: IPlaidSyncService,
  ) {}

  @Authenticated()
  @Mutation(() => PlaidLinkToken, {
    description: "Create a Plaid Link token for connecting bank accounts",
  })
  async createPlaidLinkToken(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<PlaidLinkToken> {
    const identity = ctx.getCurrentIdentity();
    return this.plaidItemService.createLinkToken(identity, ledgerId);
  }

  @Authenticated()
  @Mutation(() => PlaidLinkToken, {
    description:
      "Create a Plaid Link token in update mode for reauthentication",
  })
  async createPlaidUpdateModeLinkToken(
    @Arg("itemId", () => String) itemId: string,
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
    @Arg("accountSelection", () => Boolean, {
      nullable: true,
      defaultValue: false,
      description:
        "Request Plaid's Account Select pane so the user can add or remove accounts. A no-op at OAuth institutions, which always show it in update mode.",
    })
    accountSelection?: boolean,
  ): Promise<PlaidLinkToken> {
    const identity = ctx.getCurrentIdentity();
    return this.plaidItemService.createUpdateModeLinkToken(
      identity,
      itemId,
      ledgerId,
      accountSelection,
    );
  }

  @Authenticated()
  @Mutation(() => PlaidAccountReconcileResult, {
    description:
      "Re-read the accounts Plaid shares for an Item and reconcile them against stored accounts. Call this after an update-mode Link session with Account Select.",
  })
  async reconcilePlaidAccounts(
    @Arg("itemId", () => String) itemId: string,
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
    @Arg("dryRun", () => Boolean, {
      nullable: true,
      description: PREVIEW_FLAG_DESCRIPTION,
    })
    dryRun?: boolean,
    @Arg("dry_run", () => Boolean, {
      nullable: true,
      description: "Alias of dryRun, as MCP spells it.",
    })
    dry_run?: boolean,
  ): Promise<PlaidAccountReconcileResult> {
    const identity = ctx.getCurrentIdentity();
    return this.plaidItemService.reconcileItemAccounts(
      identity,
      itemId,
      ledgerId,
      preview({ dryRun, dry_run }),
    );
  }

  @Authenticated()
  @Mutation(() => PlaidItemType, {
    description: "Exchange Plaid public token for access token and store Item",
  })
  async exchangePlaidPublicToken(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Arg("publicToken", () => String) publicToken: string,
    @Ctx() ctx: IContext,
  ): Promise<PlaidItemType> {
    const identity = ctx.getCurrentIdentity();
    return this.plaidItemService.exchangePublicToken(
      identity,
      ledgerId,
      publicToken,
    );
  }

  @Authenticated()
  @Mutation(() => Boolean, {
    description: "Update the ledger account mapping for a Plaid account",
  })
  async updatePlaidAccountMapping(
    @Arg("accountId", () => String) accountId: string,
    @Arg("ledgerAccount", () => String) ledgerAccount: string,
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<boolean> {
    const identity = ctx.getCurrentIdentity();
    return this.plaidItemService.updateAccountMapping(
      identity,
      accountId,
      ledgerAccount,
      ledgerId,
    );
  }

  @Authenticated()
  @Mutation(() => Boolean, {
    description: "Update the currency used for a Plaid account's transactions",
  })
  async updatePlaidAccountCurrency(
    @Arg("accountId", () => String) accountId: string,
    @Arg("currency", () => String) currency: string,
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<boolean> {
    const identity = ctx.getCurrentIdentity();
    return this.plaidItemService.updateAccountCurrency(
      identity,
      accountId,
      currency,
      ledgerId,
    );
  }

  @Authenticated()
  @Mutation(() => PlaidItemType, {
    description:
      "Refresh Plaid Item status from Plaid API (useful after reauthentication)",
  })
  async refreshPlaidItemStatus(
    @Arg("itemId", () => String) itemId: string,
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<PlaidItemType> {
    const identity = ctx.getCurrentIdentity();
    return this.plaidItemService.refreshItemStatus(identity, itemId, ledgerId);
  }

  @Authenticated()
  @Mutation(() => Boolean, {
    description:
      "Unlink a Plaid Item (remove from Plaid and delete from database)",
  })
  async unlinkPlaidItem(
    @Arg("itemId", () => String) itemId: string,
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
    @Arg("dryRun", () => Boolean, {
      nullable: true,
      description: PREVIEW_FLAG_DESCRIPTION,
    })
    dryRun?: boolean,
    @Arg("dry_run", () => Boolean, {
      nullable: true,
      description: "Alias of dryRun, as MCP spells it.",
    })
    dry_run?: boolean,
  ): Promise<boolean> {
    const identity = ctx.getCurrentIdentity();
    // GraphQL's contract stays boolean, which the dashboard and the app
    // select: a preview runs every check the unlink makes and answers true
    // without unlinking (w1/211). What it would sever is read through
    // `getPlaidItem` and `getPlaidAccounts`. The service throws rather than
    // returning false on failure.
    await this.plaidItemService.unlinkItem(
      identity,
      itemId,
      ledgerId,
      preview({ dryRun, dry_run }),
    );
    return true;
  }

  @Authenticated()
  @Mutation(() => PlaidSyncResult, {
    description: "Manually sync transactions for a specific Plaid Item",
  })
  async syncPlaidTransactions(
    @Arg("itemId", () => String) itemId: string,
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
    @Arg("dryRun", () => Boolean, {
      nullable: true,
      description: PREVIEW_FLAG_DESCRIPTION,
    })
    dryRun?: boolean,
    @Arg("dry_run", () => Boolean, {
      nullable: true,
      description: "Alias of dryRun, as MCP spells it.",
    })
    dry_run?: boolean,
  ): Promise<PlaidSyncResult> {
    const identity = ctx.getCurrentIdentity();
    return this.plaidSyncService.syncItemTransactions(
      identity,
      itemId,
      "manual",
      ledgerId,
      preview({ dryRun, dry_run }),
    );
  }

  @Authenticated()
  @Mutation(() => PlaidSubmitResult, {
    description:
      "Submit Plaid transactions with user-reviewed target accounts to ledger",
  })
  async submitPlaidTransactionsToLedger(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Arg("transactions", () => [PlaidTransactionSubmitInput])
    transactions: PlaidTransactionSubmitInput[],
    @Ctx() ctx: IContext,
    @Arg("filename", () => String, {
      nullable: true,
      description:
        "Existing ledger file to write the transactions to; defaults to main.bean",
    })
    filename?: string,
    @Arg("dryRun", () => Boolean, {
      nullable: true,
      description: PREVIEW_FLAG_DESCRIPTION,
    })
    dryRun?: boolean,
    @Arg("dry_run", () => Boolean, {
      nullable: true,
      description: "Alias of dryRun, as MCP spells it.",
    })
    dry_run?: boolean,
  ): Promise<PlaidSubmitResult> {
    const identity = ctx.getCurrentIdentity();
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    return this.plaidSyncService.submitTransactionsToLedger(
      identity,
      ledgerOwner,
      ledgerName,
      transactions,
      filename,
      preview({ dryRun, dry_run }),
    );
  }

  @Authenticated()
  @Mutation(() => PlaidDeleteResult, {
    description:
      "Delete pending (unsynced) Plaid transactions from the review list",
  })
  async deletePlaidTransactions(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Arg("transactionIds", () => [String]) transactionIds: string[],
    @Ctx() ctx: IContext,
    @Arg("dryRun", () => Boolean, {
      nullable: true,
      description: PREVIEW_FLAG_DESCRIPTION,
    })
    dryRun?: boolean,
    @Arg("dry_run", () => Boolean, {
      nullable: true,
      description: "Alias of dryRun, as MCP spells it.",
    })
    dry_run?: boolean,
  ): Promise<PlaidDeleteResult> {
    const identity = ctx.getCurrentIdentity();
    return this.plaidSyncService.deleteTransactions(
      identity,
      ledgerId,
      transactionIds,
      preview({ dryRun, dry_run }),
    );
  }
}
