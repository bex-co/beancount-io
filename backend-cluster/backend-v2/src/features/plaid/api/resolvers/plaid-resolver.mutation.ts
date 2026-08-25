import { Arg, Authorized, Ctx, Mutation, Resolver } from "type-graphql";
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
import { assertLedgerAuthorization } from "@/features/ledger/utils/authorize-ledger";

@Resolver()
export class PlaidMutationResolver {
  constructor(
    private readonly plaidItemService: IPlaidItemService,
    private readonly plaidSyncService: IPlaidSyncService,
  ) {}

  @Authorized()
  @Mutation(() => PlaidLinkToken, {
    description: "Create a Plaid Link token for connecting bank accounts",
  })
  async createPlaidLinkToken(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<PlaidLinkToken> {
    const identity = ctx.getCurrentIdentity();
    assertLedgerAuthorization(identity, ledgerId, "write");
    return this.plaidItemService.createLinkToken(identity, ledgerId);
  }

  @Authorized()
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
    assertLedgerAuthorization(identity, ledgerId, "write");
    return this.plaidItemService.createUpdateModeLinkToken(
      identity,
      itemId,
      ledgerId,
      accountSelection,
    );
  }

  @Authorized()
  @Mutation(() => PlaidAccountReconcileResult, {
    description:
      "Re-read the accounts Plaid shares for an Item and reconcile them against stored accounts. Call this after an update-mode Link session with Account Select.",
  })
  async reconcilePlaidAccounts(
    @Arg("itemId", () => String) itemId: string,
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<PlaidAccountReconcileResult> {
    const identity = ctx.getCurrentIdentity();
    assertLedgerAuthorization(identity, ledgerId, "write");
    return this.plaidItemService.reconcileItemAccounts(
      identity,
      itemId,
      ledgerId,
    );
  }

  @Authorized()
  @Mutation(() => PlaidItemType, {
    description: "Exchange Plaid public token for access token and store Item",
  })
  async exchangePlaidPublicToken(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Arg("publicToken", () => String) publicToken: string,
    @Ctx() ctx: IContext,
  ): Promise<PlaidItemType> {
    const identity = ctx.getCurrentIdentity();
    assertLedgerAuthorization(identity, ledgerId, "write");
    return this.plaidItemService.exchangePublicToken(
      identity,
      ledgerId,
      publicToken,
    );
  }

  @Authorized()
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
    assertLedgerAuthorization(identity, ledgerId, "write");
    return this.plaidItemService.updateAccountMapping(
      identity,
      accountId,
      ledgerAccount,
      ledgerId,
    );
  }

  @Authorized()
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
    assertLedgerAuthorization(identity, ledgerId, "write");
    return this.plaidItemService.updateAccountCurrency(
      identity,
      accountId,
      currency,
      ledgerId,
    );
  }

  @Authorized()
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
    assertLedgerAuthorization(identity, ledgerId, "write");
    return this.plaidItemService.refreshItemStatus(
      identity,
      itemId,
      ledgerId,
    );
  }

  @Authorized()
  @Mutation(() => Boolean, {
    description:
      "Unlink a Plaid Item (remove from Plaid and delete from database)",
  })
  async unlinkPlaidItem(
    @Arg("itemId", () => String) itemId: string,
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<boolean> {
    const identity = ctx.getCurrentIdentity();
    assertLedgerAuthorization(identity, ledgerId, "write");
    return this.plaidItemService.unlinkItem(identity, itemId, ledgerId);
  }

  @Authorized()
  @Mutation(() => PlaidSyncResult, {
    description: "Manually sync transactions for a specific Plaid Item",
  })
  async syncPlaidTransactions(
    @Arg("itemId", () => String) itemId: string,
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<PlaidSyncResult> {
    const identity = ctx.getCurrentIdentity();
    assertLedgerAuthorization(identity, ledgerId, "write");
    return this.plaidSyncService.syncItemTransactions(
      identity,
      itemId,
      "manual",
      ledgerId,
    );
  }

  @Authorized()
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
  ): Promise<PlaidSubmitResult> {
    const identity = ctx.getCurrentIdentity();
    assertLedgerAuthorization(identity, ledgerId, "write");
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    return this.plaidSyncService.submitTransactionsToLedger(
      identity,
      ledgerOwner,
      ledgerName,
      transactions,
      filename,
    );
  }

  @Authorized()
  @Mutation(() => PlaidDeleteResult, {
    description:
      "Delete pending (unsynced) Plaid transactions from the review list",
  })
  async deletePlaidTransactions(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Arg("transactionIds", () => [String]) transactionIds: string[],
    @Ctx() ctx: IContext,
  ): Promise<PlaidDeleteResult> {
    const identity = ctx.getCurrentIdentity();
    assertLedgerAuthorization(identity, ledgerId, "write");
    return this.plaidSyncService.deleteTransactions(
      identity,
      ledgerId,
      transactionIds,
    );
  }
}
