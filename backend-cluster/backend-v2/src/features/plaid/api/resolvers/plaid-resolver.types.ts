import { ObjectType, Field, InputType, Float } from "type-graphql";
import { GraphQLJSONObject } from "graphql-scalars";

// Link Token Response
@ObjectType()
export class PlaidLinkToken {
  @Field(() => String)
  linkToken: string;
}

// Last Sync Information
@ObjectType()
export class PlaidLastSync {
  @Field(() => String)
  status: string; // 'success', 'failed', 'in_progress'

  @Field(() => Date)
  timestamp: Date;

  @Field(() => Number, { nullable: true })
  transactionsAdded?: number;

  @Field(() => String, { nullable: true })
  errorMessage?: string;
}

// Plaid Item Type
@ObjectType()
export class PlaidItemType {
  @Field(() => String)
  id: string;

  @Field(() => String)
  itemId: string;

  @Field(() => String)
  institutionId: string;

  @Field(() => String)
  institutionName: string;

  @Field(() => String)
  status: string; // 'active', 'requires_reauth', 'disabled'

  @Field(() => String, { nullable: true })
  errorCode?: string;

  @Field(() => String, { nullable: true })
  errorMessage?: string;

  @Field(() => PlaidLastSync, { nullable: true })
  lastSync?: PlaidLastSync;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

// Plaid Account Type
@ObjectType()
export class PlaidAccountType {
  @Field(() => String)
  id: string;

  @Field(() => String)
  plaidItemId: string;

  @Field(() => String)
  accountId: string;

  @Field(() => String)
  accountName: string;

  @Field(() => String)
  accountType: string;

  @Field(() => String, { nullable: true })
  accountSubtype?: string;

  @Field(() => String, { nullable: true })
  mask?: string;

  @Field(() => String, { nullable: true })
  ledgerAccount?: string;

  @Field(() => String, {
    description:
      "Currency used when writing this account's transactions to the ledger",
  })
  currency: string;

  @Field(() => Boolean)
  enabled: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

// Plaid Account plus its owning institution, for ledger-wide account pickers
// that would otherwise need one getPlaidAccounts call per Item.
@ObjectType()
export class PlaidAccountWithInstitutionType extends PlaidAccountType {
  @Field(() => String, {
    description: "Name of the institution this account belongs to",
  })
  institutionName: string;
}

// Plaid Transaction Type
@ObjectType()
export class PlaidTransactionType {
  @Field(() => String)
  id: string;

  @Field(() => String)
  plaidAccountId: string;

  @Field(() => String)
  transactionId: string;

  @Field(() => Date)
  date: Date;

  @Field(() => String)
  amount: string;

  @Field(() => String, { nullable: true })
  merchantName?: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  category?: string;

  @Field(() => Boolean)
  isPending: boolean;

  @Field(() => Boolean)
  syncedToLedger: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => String, {
    description: "Name of the source Plaid account this transaction belongs to",
  })
  accountName: string;

  @Field(() => String, {
    description: "Name of the institution this transaction was synced from",
  })
  institutionName: string;

  @Field(() => String, {
    nullable: true,
    description: "Beancount account the source Plaid account is mapped to",
  })
  ledgerAccount?: string;
}

// Account Mapping Suggestion Type
@ObjectType()
export class PlaidAccountMappingSuggestion {
  @Field(() => String)
  accountId: string;

  @Field(() => String)
  suggestedAccount: string;

  @Field(() => Float)
  confidence: number;

  @Field(() => String, { nullable: true })
  reasoning?: string;
}

// Sync Result Type
@ObjectType()
export class PlaidSyncResult {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => Number)
  transactionsFetched: number;

  @Field(() => Number)
  transactionsAdded: number;

  @Field(() => Number)
  transactionsModified: number;

  @Field(() => Number)
  transactionsRemoved: number;

  @Field(() => String, { nullable: true })
  message?: string;

  // A `dryRun` answer only (w1/211): what a real sync would stage.
  @Field(() => Boolean, { nullable: true })
  dryRun?: boolean;

  @Field(() => Number, { nullable: true })
  wouldAdd?: number;

  @Field(() => Number, { nullable: true })
  wouldModify?: number;

  @Field(() => Number, { nullable: true })
  wouldRemove?: number;

  @Field(() => Boolean, { nullable: true })
  morePagesAvailable?: boolean;
}

/** One account a reconcile would add or delete (w1/211). */
@ObjectType()
export class PlaidReconcileAccountChange {
  @Field(() => String)
  accountId: string;

  @Field(() => String)
  accountName: string;

  @Field(() => String, { nullable: true })
  mask?: string;

  @Field(() => String, { nullable: true })
  ledgerAccount?: string;
}

/** One staged row a delete would remove (w1/211). */
@ObjectType()
export class PlaidDeletePreviewRow {
  @Field(() => String)
  transactionId: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  amount: string;
}

// Account Reconcile Result
@ObjectType()
export class PlaidAccountReconcileResult {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => Number, {
    description: "Accounts Plaid now shares that we had not stored yet",
  })
  addedCount: number;

  @Field(() => Number, {
    description:
      "Stored accounts Plaid no longer shares; these were deleted along with their transactions",
  })
  removedCount: number;

  // A `dryRun` answer only (w1/211): the diff a real reconcile would act on.
  @Field(() => Boolean, { nullable: true })
  dryRun?: boolean;

  @Field(() => [PlaidReconcileAccountChange], { nullable: true })
  wouldAdd?: PlaidReconcileAccountChange[];

  @Field(() => [PlaidReconcileAccountChange], { nullable: true })
  wouldDelete?: PlaidReconcileAccountChange[];
}

// Submit Result
@ObjectType()
export class PlaidSubmitResult {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => Number)
  addedCount: number;

  @Field(() => String, { nullable: true })
  message?: string;

  // A `dryRun` answer only (w1/211): the transactions it would write.
  @Field(() => Boolean, { nullable: true })
  dryRun?: boolean;

  @Field(() => Number, { nullable: true })
  wouldAddCount?: number;

  @Field(() => [GraphQLJSONObject], { nullable: true })
  preview?: unknown[];
}

// Delete Result
@ObjectType()
export class PlaidDeleteResult {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => Number)
  deletedCount: number;

  @Field(() => String, { nullable: true })
  message?: string;

  // A `dryRun` answer only (w1/211): the staged rows it would remove.
  @Field(() => Boolean, { nullable: true })
  dryRun?: boolean;

  @Field(() => Number, { nullable: true })
  wouldDeleteCount?: number;

  @Field(() => [PlaidDeletePreviewRow], { nullable: true })
  preview?: PlaidDeletePreviewRow[];
}

// Submit Input
@InputType()
export class PlaidTransactionSubmitInput {
  @Field(() => String, {
    description:
      "The staged row's transactionId. camelCase only here; the MCP bank tool also accepts transaction_id.",
  })
  transactionId: string;

  @Field(() => String, {
    description:
      "The ledger account to book this against. camelCase only here; the MCP bank tool also accepts target_account.",
  })
  targetAccount: string;

  @Field(() => String, {
    nullable: true,
    description:
      "Overrides the source account normally derived from the Plaid account's mapping. camelCase only here; the MCP bank tool also accepts source_account.",
  })
  sourceAccount?: string;
}
