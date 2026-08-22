import {
  Arg,
  Args,
  ArgsType,
  Ctx,
  Field,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import { InternalServerError } from "@/shared/errors";
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

  @Query(() => Transaction, {
    description: "Get the transactions for a payee",
  })
  async getLedgerPayeeTransactions(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() args: PayeeArgs,
    @Ctx() ctx: IContext,
  ): Promise<Transaction> {
    const data = await this.dataService.getPayeeTransactions({
      ledgerId,
      identity: ctx.identity,
      payee: args.payee,
    });
    if (!data) {
      throw new InternalServerError(
        "No data returned for ledger payee transactions",
      );
    }
    return {
      date: data.date,
      payee: data.payee || undefined,
      narration: data.narration || undefined,
      postings: data.postings.map((posting) => ({
        account: posting.account,
        amount: posting.amount,
        commodity: posting.commodity,
        price: posting.price || undefined,
      })),
    };
  }

  @Query(() => Transaction, {
    description: "Get the transactions for a narration",
  })
  async getLedgerNarrationTransactions(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() args: NarrationArgs,
    @Ctx() ctx: IContext,
  ): Promise<Transaction> {
    const data = await this.dataService.getNarrationTransactions({
      ledgerId,
      identity: ctx.identity,
      narration: args.narration,
    });
    if (!data) {
      throw new InternalServerError(
        "No data returned for ledger narration transactions",
      );
    }
    return {
      date: data.date,
      payee: data.payee || undefined,
      narration: data.narration || undefined,
      postings: data.postings.map((posting) => ({
        account: posting.account,
        amount: posting.amount,
        commodity: posting.commodity,
        price: posting.price || undefined,
      })),
    };
  }

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

  @Query(() => [BeancountError], {
    description: "Get all errors from the ledger",
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
    }));
  }

  @Query(() => [String], {
    description: "Get the currencies of a specific ledger",
  })
  async getLedgerCurrencies(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<string[]> {
    return this.dataService.getCurrencies({ ledgerId, identity: ctx.identity });
  }

  @Query(() => [String], {
    description:
      "Get the Beancount source files of a ledger (main.bean plus every file it includes)",
  })
  async getLedgerSourceFiles(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<string[]> {
    return this.dataService.getSourceFiles({ ledgerId, identity: ctx.identity });
  }

  @Query(() => [String], {
    description: "Get the tags of a specific ledger",
  })
  async getLedgerTags(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<string[]> {
    return this.dataService.getTags({ ledgerId, identity: ctx.identity });
  }

  @Query(() => [String], {
    description: "Get the years of a specific ledger",
  })
  async getLedgerYears(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<string[]> {
    return this.dataService.getYears({ ledgerId, identity: ctx.identity });
  }

  @Query(() => [String], {
    description: "Get the links of a specific ledger",
  })
  async getLedgerLinks(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<string[]> {
    return this.dataService.getLinks({ ledgerId, identity: ctx.identity });
  }

  @Query(() => [String])
  async getLedgerNarrations(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<string[]> {
    return this.dataService.getNarrations({ ledgerId, identity: ctx.identity });
  }

  @Query(() => [String], {
    description: "Get the payees of a specific ledger",
  })
  async getLedgerPayees(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<string[]> {
    return this.dataService.getPayees({ ledgerId, identity: ctx.identity });
  }

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

  @Query(() => [EntriesByType], {
    description: "Get the count of entries per type",
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
