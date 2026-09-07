import { readFeatureFlags } from "@/features/healthz/utils/public-configuration";
import type { ILedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import {
  ArgsType,
  Field,
  ObjectType,
  Query,
  Args,
  Ctx,
  Int,
} from "type-graphql";
import { AllowAnonymous, Authenticated } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import { GraphQLJSONObject } from "graphql-scalars";
import {
  SerializableTreeNodePublic,
  DateAndBalancePublic,
  unwrapFavaResponse,
} from "@/foundation/fava";
import { parseLedgerId } from "@/shared/str";
import { BaseLedgerResolver } from "./ledger-legacy-resolver.base";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import {
  AUTHORIZATION_ACTIONS,
  type IAuthorizationService,
} from "@/server/api/authorization";

@ArgsType()
class LedgerMetaRequest {
  @Field(() => String)
  userId: string;

  @Field(() => String, { nullable: true })
  ledgerId?: string | null;
}

@ObjectType()
class Options {
  @Field(() => String)
  name_assets: string;

  @Field(() => String)
  name_equity: string;

  @Field(() => String)
  name_expenses: string;

  @Field(() => String)
  name_income: string;

  @Field(() => String)
  name_liabilities: string;

  @Field(() => [String])
  operating_currency: Array<string>;
}

@ObjectType()
class LedgerMeta {
  @Field(() => [String])
  accounts: Array<string>;

  @Field(() => [String])
  currencies: Array<string>;

  @Field(() => Number)
  errors: number;

  @Field(() => Options)
  options: Options;
}

@ObjectType()
class LedgerMetaResponse {
  @Field(() => LedgerMeta)
  data: LedgerMeta;

  @Field(() => Boolean)
  success: boolean;
}

@ArgsType()
class ChartsRequest {
  @Field(() => String)
  userId: string;

  @Field(() => String, { nullable: true })
  ledgerId?: string | null;
}

interface IAccountBalance {
  account: string;
  balance: Record<string, number>;
  balance_children: Record<string, number>;
  children: Array<IAccountBalance>;
}

@ObjectType()
class AccountBalance implements IAccountBalance {
  @Field(() => String)
  account: string;

  @Field(() => GraphQLJSONObject)
  balance: Record<string, number>;

  @Field(() => GraphQLJSONObject)
  balance_children: Record<string, number>;

  @Field(() => [AccountBalance])
  children: Array<AccountBalance>;
}

@ObjectType()
class LabeledHierarchyItem {
  @Field(() => String)
  type: string;

  @Field(() => String)
  label: string;

  @Field(() => AccountBalance)
  data: AccountBalance;
}

@ObjectType()
class AccountHierarchyResponse {
  @Field(() => [LabeledHierarchyItem])
  data: Array<LabeledHierarchyItem>;

  @Field(() => Boolean)
  success: boolean;
}

interface IChartItem {
  balance: Record<string, number>;
  budgets: Record<string, number>;
  date: string;
}

@ObjectType()
class ChartItemV2 implements IChartItem {
  @Field(() => GraphQLJSONObject)
  balance: Record<string, number>;

  @Field(() => String)
  date: string;

  @Field(() => GraphQLJSONObject, { nullable: true })
  budgets: Record<string, number>;
}

@ObjectType()
class LabeledChartItem {
  @Field(() => String)
  type: string;

  @Field(() => String)
  label: string;

  @Field(() => [ChartItemV2])
  data: Array<ChartItemV2>;
}

@ObjectType()
class HomeChartsResponse {
  @Field(() => [LabeledChartItem])
  data: Array<LabeledChartItem>;

  @Field(() => Boolean)
  success: boolean;
}

// Helper function to transform SerializableTreeNodePublic to AccountBalance
function transformToAccountBalance(
  node: SerializableTreeNodePublic,
): AccountBalance {
  const transformBalance = (
    balance: Record<string, string>,
  ): Record<string, number> => {
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(balance)) {
      const numValue = parseFloat(value);
      result[key] = isNaN(numValue) ? 0 : numValue;
    }
    return result;
  };

  return {
    account: node.account,
    balance: transformBalance(node.balance),
    balance_children: transformBalance(node.balance_children),
    children: node.children.map((child) => transformToAccountBalance(child)),
  };
}

// Helper function to transform DateAndBalancePublic to ChartItemV2
function transformToChartItem(item: DateAndBalancePublic): ChartItemV2 {
  const transformBalance = (
    balance: Record<string, string>,
  ): Record<string, number> => {
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(balance)) {
      const numValue = parseFloat(value);
      result[key] = isNaN(numValue) ? 0 : numValue;
    }
    return result;
  };

  return {
    date: item.date,
    balance: transformBalance(item.balance),
    budgets: {},
  };
}

export interface IEntryMeta {
  __tolerances__: Record<string, number>;
  filename: string;
  lineno: number;
}

@ObjectType()
export class PageInfo {
  @Field(() => Boolean, {
    description: "Whether there are more entries after the current page",
  })
  hasNextPage: boolean;

  @Field(() => Boolean, {
    description: "Whether there are more entries before the current page",
  })
  hasPreviousPage: boolean;

  @Field(() => String, {
    nullable: true,
    description: "Cursor for the start of the current page",
  })
  startCursor?: string;

  @Field(() => String, {
    nullable: true,
    description: "Cursor for the end of the current page",
  })
  endCursor?: string;

  @Field(() => Int, {
    nullable: true,
    description: "Total number of entries available",
  })
  totalCount?: number;
}

@ObjectType()
export class EntryMeta {
  @Field(() => String)
  filename: string;

  @Field(() => Number)
  lineno: number;
}

@ObjectType()
export class PostingUnits {
  @Field(() => String, { nullable: true })
  currency: string;

  @Field(() => Number, { nullable: true })
  number: number;
}

@ObjectType()
export class PostingMeta {
  @Field(() => String)
  filename: string;

  @Field(() => Number)
  lineno: number;
}

@ObjectType()
export class JournalEntryPosting {
  @Field(() => String)
  account: string;

  @Field(() => String, { nullable: true })
  amount?: string;

  @Field(() => String, { nullable: true })
  cost?: string;

  @Field(() => String, { nullable: true })
  flag?: string;

  @Field(() => PostingMeta, { nullable: true })
  meta?: PostingMeta;

  @Field(() => String, { nullable: true })
  price?: string;

  @Field(() => PostingUnits, { nullable: true })
  units?: PostingUnits;
}

@ObjectType()
export class JournalEntry {
  // Core fields matching IAddedEntry
  @Field(() => String, {
    nullable: true,
    description: "Entry type (Transaction, Balance, Open, etc.)",
  })
  type?: string;

  @Field(() => String)
  date: string;

  @Field(() => EntryMeta, { nullable: true })
  meta?: EntryMeta;

  // Transaction-specific fields (when type === "Transaction")
  @Field(() => String, { nullable: true })
  flag?: string;

  @Field(() => [String], { nullable: "itemsAndList" })
  links?: string[];

  @Field(() => String, { nullable: true })
  narration?: string;

  @Field(() => String, { nullable: true })
  payee?: string;

  @Field(() => [JournalEntryPosting], { nullable: true })
  postings?: JournalEntryPosting[];

  @Field(() => [String], { nullable: "itemsAndList" })
  tags?: string[];

  // Open/Close entry fields (when type === "Open" or "Close")
  @Field(() => String, { nullable: true })
  account?: string;

  @Field(() => String, { nullable: true })
  booking?: string;

  @Field(() => [String], { nullable: true })
  currencies?: string[];

  // Balance entry fields (when type === "Balance")
  @Field(() => PostingUnits, {
    nullable: true,
    description: "Amount for balance entries",
  })
  amount?: PostingUnits;

  // Note/Document entry fields
  @Field(() => String, { nullable: true })
  comment?: string;

  @Field(() => String, { nullable: true })
  filename?: string;

  // Entry hash for detailed mode
  @Field(() => String, { nullable: true })
  entry_hash?: string;

  @Field(() => String, { nullable: true })
  entry_type?: string;

  // Error handling
  @Field(() => String, { nullable: true })
  error?: string;

  @Field(() => String, { nullable: true })
  error_message?: string;

  // Enhanced fields for UI rendering (computed fields)
  @Field(() => Number, {
    nullable: true,
    description: "Net amount for the transaction",
  })
  netAmount?: number;

  @Field(() => String, {
    nullable: true,
    description: "Primary account for display",
  })
  primaryAccount?: string;

  @Field(() => String, {
    nullable: true,
    description: "Combined searchable text",
  })
  searchableText?: string;
}

@ArgsType()
class FeatureFlagRequest {
  @Field(() => String)
  userId: string;
}

@ObjectType()
export class JournalEntriesResponse {
  @Field(() => [JournalEntry])
  data: JournalEntry[];

  @Field(() => Boolean)
  success: boolean;

  @Field(() => PageInfo, {
    nullable: true,
    description: "Pagination information",
  })
  pageInfo?: PageInfo;
}

@ArgsType()
export class JournalEntriesArgs {
  // Existing pagination parameters
  @Field(() => Int, {
    nullable: true,
    description: "Number of entries to fetch from the start",
  })
  first?: number;

  @Field(() => String, {
    nullable: true,
    description:
      "Cursor for pagination (can be date string YYYY-MM-DD or index)",
  })
  after?: string;

  @Field(() => Int, {
    nullable: true,
    description: "Number of entries to fetch from the end",
  })
  last?: number;

  @Field(() => String, {
    nullable: true,
    description:
      "Cursor for pagination (can be date string YYYY-MM-DD or index)",
  })
  before?: string;

  @Field(() => Boolean, {
    nullable: true,
    description: "Whether to include detailed entry metadata",
  })
  detailed?: boolean;

  // Enhanced search and filtering parameters
  @Field(() => String, {
    nullable: true,
    description: "Text search across payee, narration, and account fields",
  })
  searchQuery?: string;

  @Field(() => String, {
    nullable: true,
    description: "Account regex filter (e.g., 'Assets:*' or 'Expenses:Food:*')",
  })
  accountFilter?: string;

  @Field(() => Number, {
    nullable: true,
    description: "Minimum amount filter for transactions",
  })
  amountMin?: number;

  @Field(() => Number, {
    nullable: true,
    description: "Maximum amount filter for transactions",
  })
  amountMax?: number;

  @Field(() => [String!], {
    nullable: true,
    description:
      "Entry types to include (Transaction, Balance, Open, Close, etc.)",
  })
  entryTypes?: string[];

  @Field(() => String, {
    nullable: true,
    description: "Sort field: date, amount, payee, account",
  })
  sortBy?: string;

  @Field(() => String, {
    nullable: true,
    description: "Sort order: asc or desc",
  })
  sortOrder?: string;

  @Field(() => String, {
    nullable: true,
    description: "Group entries by: date, account, payee",
  })
  groupBy?: string;
}

export class LedgerLegacyQueryResolver extends BaseLedgerResolver {
  constructor(
    favaClientFactory: IFavaClientFactory,
    authorization: IAuthorizationService,
    private readonly ledgerWorkflow: Pick<
      ILedgerWorkflow,
      "getLegacyMetadata" | "getLegacyJournal"
    >,
  ) {
    super(favaClientFactory, authorization);
  }

  @Authenticated()
  @Query(() => LedgerMetaResponse, {
    description: "Get a specific ledger",
  })
  async ledgerMeta(
    @Args() ledgerMetaRequest: LedgerMetaRequest,
    @Ctx() ctx: IContext,
  ): Promise<LedgerMetaResponse> {
    return this.ledgerWorkflow.getLegacyMetadata({
      identity: ctx.getCurrentIdentity(),
      ledgerId: ledgerMetaRequest.ledgerId,
    });
  }

  @Authenticated()
  @Query(() => AccountHierarchyResponse)
  async accountHierarchy(
    @Args() chartsRequest: ChartsRequest,
    @Ctx() ctx: IContext,
  ): Promise<AccountHierarchyResponse> {
    const identity = ctx.getCurrentIdentity();
    const userId = identity.userId;
    const defaultLedgerId = await this.resolveLedgerId(
      identity,
      chartsRequest.ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_ACCOUNTS_READ,
    );
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      defaultLedgerId,
      userId,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(defaultLedgerId);
    const ledgerOptionsData = await unwrapFavaResponse(
      favaApiClient.reports.getLedgerOptions(ledgerOwner, ledgerName),
      "get the ledger data",
    );
    const assetAccountHierarchy = await unwrapFavaResponse(
      favaApiClient.reports.getLedgerHierarchy(ledgerOwner, ledgerName, {
        conversion: "USD",
        account_name: ledgerOptionsData.name_assets,
      }),
      "get the account hierarchy",
    );

    const liabilityAccountHierarchy = await unwrapFavaResponse(
      favaApiClient.reports.getLedgerHierarchy(ledgerOwner, ledgerName, {
        conversion: "USD",
        account_name: ledgerOptionsData.name_liabilities,
      }),
      "get the account hierarchy",
    );

    const incomeAccountHierarchy = await unwrapFavaResponse(
      favaApiClient.reports.getLedgerHierarchy(ledgerOwner, ledgerName, {
        conversion: "USD",
        account_name: ledgerOptionsData.name_income,
      }),
      "get the account hierarchy",
    );

    const expenseAccountHierarchy = await unwrapFavaResponse(
      favaApiClient.reports.getLedgerHierarchy(ledgerOwner, ledgerName, {
        conversion: "USD",
        account_name: ledgerOptionsData.name_expenses,
      }),
      "get the account hierarchy",
    );
    const equityAccountHierarchy = await unwrapFavaResponse(
      favaApiClient.reports.getLedgerHierarchy(ledgerOwner, ledgerName, {
        conversion: "USD",
        account_name: ledgerOptionsData.name_equity,
      }),
      "get the account hierarchy",
    );
    return {
      data: [
        {
          type: "hierarchy",
          label: ledgerOptionsData.name_assets,
          data: transformToAccountBalance(assetAccountHierarchy),
        },
        {
          type: "hierarchy",
          label: ledgerOptionsData.name_liabilities,
          data: transformToAccountBalance(liabilityAccountHierarchy),
        },
        {
          type: "hierarchy",
          label: ledgerOptionsData.name_equity,
          data: transformToAccountBalance(equityAccountHierarchy),
        },
        {
          type: "hierarchy",
          label: ledgerOptionsData.name_income,
          data: transformToAccountBalance(incomeAccountHierarchy),
        },
        {
          type: "hierarchy",
          label: ledgerOptionsData.name_expenses,
          data: transformToAccountBalance(expenseAccountHierarchy),
        },
      ],
      success: true,
    };
  }

  @Authenticated()
  @Query(() => HomeChartsResponse)
  async homeCharts(
    @Args() chartsRequest: ChartsRequest,
    @Ctx() ctx: IContext,
  ): Promise<HomeChartsResponse> {
    const identity = ctx.getCurrentIdentity();
    const userId = identity.userId;
    const defaultLedgerId = await this.resolveLedgerId(
      identity,
      chartsRequest.ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_REPORTS_READ,
    );
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      defaultLedgerId,
      userId,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(defaultLedgerId);
    const incomeStatementData = await unwrapFavaResponse(
      favaApiClient.reports.getLedgerIncomeStatement(ledgerOwner, ledgerName),
      "get the income statement",
    );
    const balanceSheetData = await unwrapFavaResponse(
      favaApiClient.reports.getLedgerBalanceSheet(ledgerOwner, ledgerName),
      "get the balance sheet",
    );
    return {
      data: [
        {
          type: "bar",
          label: "Net Profit",
          data: incomeStatementData.net_profit_data.map(transformToChartItem),
        },
        {
          type: "balances",
          label: "Net Worth",
          data: balanceSheetData.net_worth_data.map(transformToChartItem),
        },
      ],
      success: true,
    };
  }

  @Authenticated()
  @Query(() => JournalEntriesResponse, {
    description:
      "Get journal entries with enhanced search, filtering, and pagination",
  })
  async journalEntries(
    @Args() journalEntriesArgs: JournalEntriesArgs,
    @Ctx() ctx: IContext,
  ): Promise<JournalEntriesResponse> {
    return this.ledgerWorkflow.getLegacyJournal({
      identity: ctx.getCurrentIdentity(),
      args: journalEntriesArgs,
    });
  }

  // legacy feature flags(used by the mobile app)
  @AllowAnonymous()
  @Query(() => GraphQLJSONObject)
  public async featureFlags(
    @Args() { userId }: FeatureFlagRequest,
  ): Promise<Record<string, unknown>> {
    void userId;
    return readFeatureFlags();
  }
}
