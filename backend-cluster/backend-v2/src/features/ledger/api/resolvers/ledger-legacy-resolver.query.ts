import {
  ArgsType,
  Authorized,
  Field,
  ObjectType,
  Query,
  Args,
  Ctx,
  Int,
} from "type-graphql";
import { IContext } from "@/server/graphql/context";
import { InternalServerError } from "@/shared/errors";
import { GraphQLJSONObject } from "graphql-scalars";
import {
  SerializableTreeNodePublic,
  DateAndBalancePublic,
  unwrapFavaResponse,
} from "@/foundation/fava";
import { parseLedgerId } from "@/shared/str";
import { BaseLedgerResolver } from "./ledger-legacy-resolver.base";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";

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

export interface IAccountBalance {
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

export interface IChartItem {
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

interface IAddedPosting {
  account: string;
  cost: string | null;
  flag: string | null;
  meta: {
    filename: string;
    lineno: number;
  };
  price: string | null;
  units: {
    currency: string;
    number: number;
  };
}

export interface IAddedEntry {
  // Common fields for all entry types
  type: string; // "Transaction", "Open", "Close", "Balance", "Note", etc.
  date: string;
  meta: {
    filename: string;
    lineno: number;
  };

  // Transaction-specific fields (when type === "Transaction")
  flag?: "*" | "!" | string;
  links?: string[];
  narration?: string;
  payee?: string | null;
  postings?: Array<IAddedPosting>;
  tags?: string[];

  // Open/Close entry fields (when type === "Open" or "Close")
  account?: string;
  booking?: string | null;
  currencies?: string[] | null;

  // Balance entry fields (when type === "Balance")
  amount?: {
    currency: string;
    number: number;
  };

  // Note/Document entry fields
  comment?: string;
  filename?: string;

  // Entry hash for detailed mode
  entry_hash?: string;
  entry_type?: string;

  // Error handling
  error?: string;
  error_message?: string;
}

export class LedgerLegacyQueryResolver extends BaseLedgerResolver {
  constructor(favaClientFactory: IFavaClientFactory) {
    super(favaClientFactory);
  }

  @Authorized()
  @Query(() => LedgerMetaResponse, {
    description: "Get a specific ledger",
  })
  async ledgerMeta(
    @Args() ledgerMetaRequest: LedgerMetaRequest,
    @Ctx() ctx: IContext,
  ): Promise<LedgerMetaResponse> {
    const userId = ctx.getCurrentUserId();
    const defaultLedgerId = await this.getDefaultLedgerId(
      userId,
      ledgerMetaRequest.ledgerId,
    );
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      defaultLedgerId,
      userId,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(defaultLedgerId);
    const ledgerOptions = await unwrapFavaResponse(
      favaApiClient.reports.getLedgerOptions(ledgerOwner, ledgerName),
      "get the ledger data",
    );

    const ledgerAttributesData = await unwrapFavaResponse(
      favaApiClient.reports.getLedgerAttributes(ledgerOwner, ledgerName),
      "get the ledger data",
    );

    const ledgerErrorsData = await unwrapFavaResponse(
      favaApiClient.reports.getLedgerErrors(ledgerOwner, ledgerName),
      "get the ledger data",
    );

    return {
      data: {
        accounts: ledgerAttributesData.accounts,
        currencies: ledgerAttributesData.currencies,
        errors: ledgerErrorsData.length,
        options: ledgerOptions,
      },
      success: true,
    };
  }

  @Authorized()
  @Query(() => AccountHierarchyResponse)
  async accountHierarchy(
    @Args() chartsRequest: ChartsRequest,
    @Ctx() ctx: IContext,
  ): Promise<AccountHierarchyResponse> {
    const userId = ctx.getCurrentUserId();
    const defaultLedgerId = await this.getDefaultLedgerId(
      userId,
      chartsRequest.ledgerId,
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

  @Authorized()
  @Query(() => HomeChartsResponse)
  async homeCharts(
    @Args() chartsRequest: ChartsRequest,
    @Ctx() ctx: IContext,
  ): Promise<HomeChartsResponse> {
    const userId = ctx.getCurrentUserId();
    const defaultLedgerId = await this.getDefaultLedgerId(
      userId,
      chartsRequest.ledgerId,
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

  @Authorized()
  @Query(() => JournalEntriesResponse, {
    description:
      "Get journal entries with enhanced search, filtering, and pagination",
  })
  async journalEntries(
    @Args() journalEntriesArgs: JournalEntriesArgs,
    @Ctx() ctx: IContext,
  ): Promise<JournalEntriesResponse> {
    const { favaApiClient, favaUser } =
      await this.favaClientFactory.getApiContext(ctx.getCurrentUserId());
    const ledgers = await unwrapFavaResponse(
      favaApiClient.ledgers.listLedgers(),
      "get find out the ledgers",
    );
    const defaultLedger = ledgers[0];
    if (!defaultLedger) {
      throw new InternalServerError("Failed to get the default ledger");
    }

    const repoName = defaultLedger.name;
    const query = {
      first: journalEntriesArgs.first,
      after: journalEntriesArgs.after,
      last: journalEntriesArgs.last,
      before: journalEntriesArgs.before,
      detailed: journalEntriesArgs.detailed,
      search_query: journalEntriesArgs.searchQuery,
      account_filter: journalEntriesArgs.accountFilter,
      amount_min: journalEntriesArgs.amountMin,
      amount_max: journalEntriesArgs.amountMax,
      entry_types: journalEntriesArgs.entryTypes?.join(","),
      sort_by: journalEntriesArgs.sortBy,
      sort_order: journalEntriesArgs.sortOrder,
      group_by: journalEntriesArgs.groupBy,
    };

    const resp = await favaApiClient.legacy.getLegacyJournal(
      favaUser.username,
      repoName,
      query,
    );

    await unwrapFavaResponse(resp, "get the legacy journal");
    const result = resp.data as { data: IAddedEntry[] };
    // Process the raw data to add enhanced fields
    const enhancedData = result.data.map((entry) => {
      // Start with ALL fields from the Fava API
      const enhanced = { ...entry } as Record<string, unknown>;

      // Only transform fields that need it:
      // Ensure links and tags are arrays (Fava omits them when empty)
      enhanced.links = entry.links || [];
      enhanced.tags = entry.tags || [];

      // Transform postings to match GraphQL schema
      if (entry.postings && entry.postings.length > 0) {
        interface SourcePosting {
          account: string;
          cost?: string | null;
          flag?: string | null;
          price?: string | null;
          meta?: { filename: string; lineno: number } | null;
          units?: { currency: string; number: number } | null;
          amount?: string;
        }

        enhanced.postings = entry.postings.map((posting: SourcePosting) => {
          const transformedPosting: IAddedPosting = {
            account: posting.account,
            cost: posting.cost || null,
            flag: posting.flag || null,
            price: posting.price || null,
            // Provide entry's meta as fallback for posting meta
            meta: posting.meta || entry.meta,
            // Default to zero units if not provided (will be populated from amount string if present)
            units: posting.units || { currency: "", number: 0 },
          };

          // Convert amount string to units object if needed
          if (posting.amount && !posting.units) {
            const amountMatch = posting.amount.match(
              /^(-?[\d,.]+)\s*([A-Z]{3})$/,
            );
            if (amountMatch) {
              const [, numberStr, currency] = amountMatch;
              transformedPosting.units = {
                number: parseFloat(numberStr.replace(/,/g, "")),
                currency,
              };
            }
          }

          return transformedPosting;
        });
      }

      // Add computed fields for UI (only if not already present from Fava)

      // Calculate net amount for transactions using transformed postings
      if (!enhanced.netAmount) {
        const postings = enhanced.postings as IAddedPosting[];
        if (postings && postings.length > 0) {
          const totalAmount = postings.reduce(
            (sum: number, posting: IAddedPosting) => {
              return sum + (posting.units?.number || 0);
            },
            0,
          );
          enhanced.netAmount = totalAmount;
        }
      }

      // Set primary account (if not already set)
      if (!enhanced.primaryAccount) {
        // For Open/Close entries, use the account field
        if (entry.account) {
          enhanced.primaryAccount = entry.account;
        }
        // For transactions with postings, use first non-zero posting account
        else if (enhanced.postings) {
          const postings = enhanced.postings as IAddedPosting[];
          const primaryPosting = postings.find(
            (p: IAddedPosting) => p.units?.number !== 0,
          );
          enhanced.primaryAccount =
            primaryPosting?.account || postings[0]?.account;
        }
      }

      // Create searchable text (if not already present)
      if (!enhanced.searchableText) {
        const searchableText = [
          entry.payee || "",
          entry.narration || "",
          entry.account || "", // Include account field for Open/Close entries
          ...(entry.postings?.map((p) => p.account) || []),
        ]
          .join(" ")
          .toLowerCase();
        enhanced.searchableText = searchableText;
      }

      return enhanced;
    });

    // Determine if there are more entries
    // If we requested N entries and got exactly N, there might be more
    // If we got less than requested, we've reached the end
    // Special case: if we got 0 results, definitely no more
    const hasMore =
      journalEntriesArgs.first && result.data.length > 0
        ? result.data.length === journalEntriesArgs.first
        : false;

    return {
      data: enhancedData as unknown as JournalEntry[],
      success: true,
      pageInfo: {
        hasNextPage: hasMore,
        hasPreviousPage:
          !!journalEntriesArgs.after || !!journalEntriesArgs.before,
        startCursor:
          enhancedData.length > 0 ? String(enhancedData[0].date) : "",
        endCursor:
          enhancedData.length > 0
            ? String(enhancedData[enhancedData.length - 1].date)
            : "",
        totalCount: 0, // Return 0 instead of undefined
      },
    };
  }

  // legacy feature flags(used by the mobile app)
  @Query(() => GraphQLJSONObject)
  public async featureFlags(
    @Args() { userId }: FeatureFlagRequest,
  ): Promise<Record<string, unknown>> {
    if (userId) {
      const spendingReportSubscription = false;
      return {
        spendingReportSubscription,
      };
    }

    return {
      spendingReportSubscription: false,
    };
  }
}
