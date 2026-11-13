import {
  Arg,
  Args,
  ArgsType,
  Ctx,
  Field,
  Int,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import { AllowAnonymous } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import { filterNullish } from "@/shared/tools";
import { GraphQLJSONObject } from "graphql-scalars";
import {
  DateAndBalance,
  ConversionArgs,
  BaseQueryArgs,
  LedgerAttributes,
} from "./ledger-report-resolver.types";
import type { ILedgerDataService } from "@/features/ledger/service/ledger-data-service";

@ObjectType()
class PricePoint {
  @Field(() => String)
  date: string;

  @Field(() => String)
  value: string;
}

@ObjectType()
class CommodityPairWithPrices {
  @Field(() => String)
  base: string;

  @Field(() => String)
  quote: string;

  @Field(() => [PricePoint])
  prices: PricePoint[];
}

@ObjectType()
class Event {
  @Field(() => String)
  date: string;

  @Field(() => String)
  type: string;

  @Field(() => String)
  description: string;
}

type JsonValue = string | number | boolean | null;
type MetadataRecord = Record<string, JsonValue>;

@ObjectType()
class Document {
  @Field(() => String)
  date: string;

  @Field(() => String)
  account: string;

  @Field(() => String)
  filename: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field(() => [String], { nullable: true })
  links?: string[];

  @Field(() => GraphQLJSONObject, { nullable: true })
  meta?: MetadataRecord;
}

@ObjectType()
class Posting {
  @Field(() => String)
  account: string;

  @Field(() => String)
  amount: string;

  @Field(() => String)
  commodity: string;

  @Field(() => String, { nullable: true })
  price?: string;
}

@ObjectType()
class Transaction {
  @Field(() => String)
  date: string;

  @Field(() => String, { nullable: true })
  payee?: string;

  @Field(() => String, { nullable: true })
  narration?: string;

  @Field(() => [Posting])
  postings: Posting[];
}

@ObjectType()
class BeancountError {
  @Field(() => String, { nullable: true })
  filename?: string;

  @Field(() => Number, { nullable: true })
  lineno?: number;

  @Field(() => String)
  message: string;

  @Field(() => String, {
    description:
      "`error` for what bean-check fails on; the engine's `warning`s are not returned by getLedgerErrors.",
  })
  severity: string;

  @Field(() => String, {
    nullable: true,
    description:
      "Stable engine error code, e.g. E3001 for a transaction that does not balance. Classify on this, not on the message. The same value REST and MCP return.",
  })
  code?: string;

  @Field(() => String, {
    nullable: true,
    description:
      "The engine's own remediation hint for this error, when it has one. The same value REST and MCP return.",
  })
  hint?: string;
}

@ObjectType({
  description: "One include line that names a managed price URL.",
})
class ManagedPriceInclude {
  @Field(() => String)
  file: string;

  @Field(() => Int)
  line: number;

  @Field(() => String, { description: "The include target as written." })
  target: string;
}

@ObjectType({
  description:
    "Status of one managed price include (ADR 015). `freshness` is `recent` within ten minutes of the latest observation, `stale` beyond it, and `unavailable` when no revision has validated.",
})
export class ManagedPriceSource {
  @Field(() => String)
  url: string;

  @Field(() => String)
  alias: string;

  @Field(() => [ManagedPriceInclude])
  includedFrom: ManagedPriceInclude[];

  @Field(() => String, { nullable: true })
  commodity: string | null;

  @Field(() => String, { nullable: true })
  quote: string | null;

  @Field(() => String, { nullable: true })
  source: string | null;

  @Field(() => String, { nullable: true })
  revision: string | null;

  @Field(() => String, { nullable: true })
  etag: string | null;

  @Field(() => String, { nullable: true })
  observedAt: string | null;

  @Field(() => String, { nullable: true })
  fetchedAt: string | null;

  @Field(() => String, { nullable: true })
  nextRefreshAt: string | null;

  @Field(() => String)
  freshness: "recent" | "stale" | "unavailable";

  @Field(() => String, { nullable: true })
  error: string | null;

  @Field(() => Int)
  shadowedCount: number;
}

@ObjectType()
class AccountLastEntry {
  @Field(() => String)
  account: string;

  @Field(() => String, { nullable: true })
  date: string | null;

  @Field(() => GraphQLJSONObject, { nullable: true })
  balance?: Record<string, string> | null;
}

@ObjectType()
class EntriesByType {
  @Field(() => String)
  type: string;

  @Field(() => Number)
  number: number;
}

@ObjectType()
class PostingsPerAccount {
  @Field(() => String)
  account: string;

  @Field(() => Number)
  count: number;
}

@ObjectType()
class AccountReport {
  @Field(() => [DateAndBalance])
  linechartData: DateAndBalance[];

  @Field(() => [DateAndBalance])
  intervalTotalsData: DateAndBalance[];

  @Field(() => [DateAndBalance])
  accountBalanceData: DateAndBalance[];
}

@ObjectType()
class IntervalTotalItem {
  @Field(() => String)
  date: string;

  @Field(() => GraphQLJSONObject)
  balance: Record<string, string>;

  @Field(() => GraphQLJSONObject)
  accountBalances: Record<string, Record<string, string>>;
}

@ArgsType()
class EventsArgs extends BaseQueryArgs {}

@ArgsType()
class DocumentsArgs extends BaseQueryArgs {}

@ArgsType()
class PayeeArgs {
  @Field(() => String)
  payee: string;
}

@ArgsType()
class NarrationArgs {
  @Field(() => String)
  narration: string;
}

@ArgsType()
class AccountReportArgs extends ConversionArgs {
  @Field(() => String)
  accountName: string;

  @Field(() => String, { defaultValue: "monthly" })
  interval?: string;
}

@Resolver()
export class LedgerDataQueryResolver {
  constructor(private readonly dataService: ILedgerDataService) {}

  @AllowAnonymous()
  @Query(() => LedgerAttributes, {
    description: "Get the filter options of a specific ledger",
  })
  async getLedgerAttributes(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<LedgerAttributes> {
    const data = await this.dataService.getAttributes({
      ledgerId,
      identity: ctx.identity,
    });
    return {
      accounts: data.accounts,
      tags: data.tags,
      years: data.years,
      links: data.links,
      payees: data.payees,
      currencies: data.currencies,
    };
  }

  @AllowAnonymous()
  @Query(() => [CommodityPairWithPrices], {
    description: "Get the commodities of a specific ledger",
  })
  async getLedgerCommodities(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<CommodityPairWithPrices[]> {
    const data = await this.dataService.getCommodities({
      ledgerId,
      identity: ctx.identity,
    });
    return data.map((commodity) => ({
      base: commodity.base,
      quote: commodity.quote,
      prices: commodity.prices.map((price) => ({
        date: price.date,
        value: price.value,
      })),
    }));
  }

  @AllowAnonymous()
  @Query(() => [Event], {
    description: "Export events from a specific ledger with optional filtering",
  })
  async getLedgerEvents(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() args: EventsArgs,
    @Ctx() ctx: IContext,
  ): Promise<Event[]> {
    const data = await this.dataService.getEvents({
      ledgerId,
      identity: ctx.identity,
      account: args.account,
      filter: args.filter,
      time: args.time,
    });
    return data.map((event) => ({
      date: event.date,
      type: event.type,
      description: event.description,
    }));
  }

  @AllowAnonymous()
  @Query(() => [Document], {
    description: "Get documents from a specific ledger with optional filtering",
  })
  async getLedgerDocuments(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() args: DocumentsArgs,
    @Ctx() ctx: IContext,
  ): Promise<Document[]> {
    const data = await this.dataService.getDocuments({
      ledgerId,
      identity: ctx.identity,
      account: args.account,
      filter: args.filter,
      time: args.time,
    });
    return data.map((document) => ({
      date: document.date,
      account: document.account,
      filename: document.filename,
      tags: document.tags || undefined,
      links: document.links || undefined,
      meta: document.meta || undefined,
    }));
  }

  @AllowAnonymous()
  @Query(() => Transaction, {
    nullable: true,
    description:
      "Get the most recent transaction for a payee, or null when none matches",
  })
  async getLedgerPayeeTransactions(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() args: PayeeArgs,
    @Ctx() ctx: IContext,
  ): Promise<Transaction | null> {
    const data = await this.dataService.getPayeeTransactions({
      ledgerId,
      identity: ctx.identity,
      payee: args.payee,
    });
    if (data === null) return null;
    return {
      date: data.date,
      payee: data.payee || undefined,
      narration: data.narration ?? undefined,
      postings: data.postings.map((posting) => ({
        account: posting.account,
        amount: posting.amount,
        commodity: posting.commodity,
        price: posting.price || undefined,
      })),
    };
  }

  @AllowAnonymous()
  @Query(() => Transaction, {
    nullable: true,
    description:
      "Get the most recent transaction for a narration, or null when none matches",
  })
  async getLedgerNarrationTransactions(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() args: NarrationArgs,
    @Ctx() ctx: IContext,
  ): Promise<Transaction | null> {
    const data = await this.dataService.getNarrationTransactions({
      ledgerId,
      identity: ctx.identity,
      narration: args.narration,
    });
    if (data === null) return null;
    return {
      date: data.date,
      payee: data.payee || undefined,
      narration: data.narration ?? undefined,
      postings: data.postings.map((posting) => ({
        account: posting.account,
        amount: posting.amount,
        commodity: posting.commodity,
        price: posting.price || undefined,
      })),
    };
  }

  @AllowAnonymous()
  @Query(() => [String], {
    description: "Get the accounts for a payee",
  })
  async getLedgerPayeeAccounts(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() args: PayeeArgs,
    @Ctx() ctx: IContext,
  ): Promise<string[]> {
    return this.dataService.getPayeeAccounts({
      ledgerId,
      identity: ctx.identity,
      payee: args.payee,
    });
  }

  @AllowAnonymous()
  @Query(() => [ManagedPriceSource], {
    description:
      "Status of every managed price include the ledger names: feed pair and source, serving revision, observed/fetched/next-refresh times, freshness and the last refresh error. Empty when the ledger has none.",
  })
  async getLedgerManagedPrices(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<ManagedPriceSource[]> {
    return this.dataService.getManagedPrices({
      ledgerId,
      identity: ctx.identity,
    });
  }

  @AllowAnonymous()
  @Query(() => [BeancountError], {
    description:
      "Get the ledger's errors: what bean-check fails on. The engine's warnings (a one-posting entry, closing an account with a balance) are not listed.",
  })
  async getLedgerErrors(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<BeancountError[]> {
    const data = await this.dataService.getErrors({
      ledgerId,
      identity: ctx.identity,
    });
    return data.map((error) => ({
      filename: error.source?.filename || undefined,
      lineno: error.source?.lineno || undefined,
      message: error.message,
      severity: error.severity === "warning" ? "warning" : "error",
      code: error.code || undefined,
      hint: error.hint || undefined,
    }));
  }

  @AllowAnonymous()
  @Query(() => [String], {
    description: "Get the currencies of a specific ledger",
  })
  async getLedgerCurrencies(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<string[]> {
    return this.dataService.getCurrencies({ ledgerId, identity: ctx.identity });
  }

  @AllowAnonymous()
  @Query(() => [String], {
    description:
      "Get the Beancount source files of a ledger (main.bean plus every file it includes)",
  })
  async getLedgerSourceFiles(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<string[]> {
    return this.dataService.getSourceFiles({
      ledgerId,
      identity: ctx.identity,
    });
  }

  @AllowAnonymous()
  @Query(() => [String], {
    description: "Get the tags of a specific ledger",
  })
  async getLedgerTags(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<string[]> {
    return this.dataService.getTags({ ledgerId, identity: ctx.identity });
  }

  @AllowAnonymous()
  @Query(() => [String], {
    description: "Get the years of a specific ledger",
  })
  async getLedgerYears(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<string[]> {
    return this.dataService.getYears({ ledgerId, identity: ctx.identity });
  }

  @AllowAnonymous()
  @Query(() => [String], {
    description: "Get the links of a specific ledger",
  })
  async getLedgerLinks(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<string[]> {
    return this.dataService.getLinks({ ledgerId, identity: ctx.identity });
  }

  @AllowAnonymous()
  @Query(() => [String])
  async getLedgerNarrations(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<string[]> {
    return this.dataService.getNarrations({ ledgerId, identity: ctx.identity });
  }

  @AllowAnonymous()
  @Query(() => [String], {
    description: "Get the payees of a specific ledger",
  })
  async getLedgerPayees(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<string[]> {
    return this.dataService.getPayees({ ledgerId, identity: ctx.identity });
  }

  @AllowAnonymous()
  @Query(() => [AccountLastEntry], {
    description: "Get the last entries of assets and liabilities accounts",
  })
  async getLedgerAccountLastEntries(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Arg("time", () => String, { nullable: true }) time: string | undefined,
    @Arg("filter", () => String, { nullable: true }) filter: string | undefined,
    @Arg("account", () => String, { nullable: true })
    account: string | undefined,
    @Ctx() ctx: IContext,
  ): Promise<AccountLastEntry[]> {
    const data = await this.dataService.getAccountLastEntries({
      ledgerId,
      identity: ctx.identity,
      time,
      filter,
      account,
    });
    return data.map((entry) => ({
      account: entry.account,
      date: entry.date,
      balance: entry.balance,
    }));
  }

  @AllowAnonymous()
  @Query(() => [EntriesByType], {
    description:
      "Get the count of entries per type. Managed price feed directives are not counted, because the plan limit reads this count; the journal and BQL do include them, so Price here can be lower than their count.",
  })
  async getLedgerEntriesCountPerType(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Arg("time", () => String, { nullable: true }) time: string | undefined,
    @Arg("filter", () => String, { nullable: true }) filter: string | undefined,
    @Arg("account", () => String, { nullable: true })
    account: string | undefined,
    @Ctx() ctx: IContext,
  ): Promise<EntriesByType[]> {
    const data = await this.dataService.getEntriesCountPerType({
      ledgerId,
      identity: ctx.identity,
      time,
      filter,
      account,
    });
    return data.map((entry) => ({
      type: entry.type,
      number: entry.number,
    }));
  }

  @AllowAnonymous()
  @Query(() => [PostingsPerAccount], {
    description:
      "Count postings per account over the filtered Statistics report stream",
  })
  async getLedgerPostingsPerAccount(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Arg("time", () => String, { nullable: true }) time: string | undefined,
    @Arg("filter", () => String, { nullable: true }) filter: string | undefined,
    @Arg("account", () => String, { nullable: true })
    account: string | undefined,
    @Ctx() ctx: IContext,
  ): Promise<PostingsPerAccount[]> {
    const data = await this.dataService.getPostingsPerAccount({
      ledgerId,
      identity: ctx.identity,
      time,
      filter,
      account,
    });
    return data.map((entry) => ({
      account: entry.account,
      count: entry.count,
    }));
  }

  @AllowAnonymous()
  @Query(() => AccountReport, {
    description: "Get the report of a specific account",
  })
  async getLedgerAccountReport(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() args: AccountReportArgs,
    @Ctx() ctx: IContext,
  ): Promise<AccountReport> {
    const data = await this.dataService.getAccountReport({
      ledgerId,
      identity: ctx.identity,
      accountName: args.accountName,
      ...filterNullish({
        account: args.account,
        filter: args.filter,
        time: args.time,
        conversion: args.conversion,
        interval: args.interval,
      }),
    });
    return {
      linechartData: data.linechart_data.map((item) => ({
        date: item.date,
        balance: item.balance,
      })),
      intervalTotalsData: data.interval_totals_data.map((item) => ({
        date: item.date,
        balance: item.balance,
      })),
      accountBalanceData: data.account_balance_data.map((item) => ({
        date: item.date,
        balance: item.balance,
      })),
    };
  }

  @AllowAnonymous()
  @Query(() => [IntervalTotalItem], {
    description: "Get interval totals for a specific account",
  })
  async getLedgerIntervalTotals(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() args: AccountReportArgs,
    @Ctx() ctx: IContext,
  ): Promise<IntervalTotalItem[]> {
    const data = await this.dataService.getIntervalTotals({
      ledgerId,
      identity: ctx.identity,
      accountName: args.accountName,
      ...filterNullish({
        account: args.account,
        filter: args.filter,
        time: args.time,
        conversion: args.conversion,
        interval: args.interval,
      }),
    });
    return data.map((item) => ({
      date: item.date,
      balance: item.balance,
      accountBalances: item.account_balances,
    }));
  }
}
