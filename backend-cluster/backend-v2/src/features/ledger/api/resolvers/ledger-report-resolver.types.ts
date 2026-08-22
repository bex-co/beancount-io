import { ArgsType, Field, Int, ObjectType } from "type-graphql";
import { GraphQLJSONObject } from "graphql-scalars";

// Shared args/types used by both LedgerFinanceQueryResolver and LedgerDataQueryResolver.
// Defined here once to avoid TypeGraphQL duplicate-type errors.

@ArgsType()
export class BaseQueryArgs {
  @Field(() => String, { nullable: true })
  account?: string;

  @Field(() => String, { nullable: true })
  filter?: string;

  @Field(() => String, { nullable: true })
  time?: string;
}

@ArgsType()
export class ConversionArgs extends BaseQueryArgs {
  @Field(() => String, { defaultValue: "USD" })
  conversion?: string;

  @Field(() => String, { defaultValue: "monthly" })
  interval?: string;
}

@ObjectType()
export class DateAndBalance {
  @Field(() => String)
  date: string;

  @Field(() => GraphQLJSONObject)
  balance: Record<string, string>;
}

@ObjectType()
export class LedgerAttributes {
  @Field(() => [String])
  accounts: string[];

  @Field(() => [String])
  tags: string[];

  @Field(() => [String])
  years: string[];

  @Field(() => [String])
  links: string[];

  @Field(() => [String])
  payees: string[];

  @Field(() => [String])
  currencies: string[];
}

@ObjectType()
export class LedgerOptions {
  @Field(() => String)
  title: string;

  @Field(() => String)
  nameAssets: string;

  @Field(() => String)
  nameEquity: string;

  @Field(() => String)
  nameExpenses: string;

  @Field(() => String)
  nameIncome: string;

  @Field(() => String)
  nameLiabilities: string;

  @Field(() => String)
  accountCurrentConversions: string;

  @Field(() => String)
  accountCurrentEarnings: string;

  @Field(() => Boolean)
  renderCommas: boolean;

  @Field(() => [String])
  operatingCurrency: Array<string>;
}

@ObjectType()
export class FiscalYearEnd {
  @Field(() => Int)
  month: number;

  @Field(() => Int)
  day: number;
}

@ObjectType()
export class FavaOptions {
  @Field(() => Boolean)
  accountJournalIncludeChildren: boolean;

  @Field(() => Boolean)
  autoReload: boolean;

  @Field(() => [String])
  collapsePattern: string[];

  @Field(() => [String])
  conversionCurrencies: string[];

  @Field(() => Int)
  currencyColumn: number;

  @Field(() => String)
  defaultPage: string;

  @Field(() => FiscalYearEnd)
  fiscalYearEnd: FiscalYearEnd;

  @Field(() => Int)
  indent: number;

  @Field(() => Boolean)
  invertIncomeLiabilitiesEquity: boolean;

  @Field(() => String, { nullable: true })
  language: string | null;

  @Field(() => String, { nullable: true })
  locale: string | null;

  @Field(() => Boolean)
  showAccountsWithZeroBalance: boolean;

  @Field(() => Boolean)
  showAccountsWithZeroTransactions: boolean;

  @Field(() => Boolean)
  showClosedAccounts: boolean;

  @Field(() => Int)
  sidebarShowQueries: number;

  @Field(() => String)
  unrealized: string;

  @Field(() => Int)
  upcomingEvents: number;

  @Field(() => Int)
  uptodateIndicatorGreyLookbackDays: number;

  @Field(() => Boolean)
  useExternalEditor: boolean;
}

@ObjectType()
export class BcioOptions {
  @Field(() => String)
  defaultFile: string;

  @Field(() => String, { nullable: true })
  transactionFile: string | null;

  @Field(() => String, { nullable: true })
  accountFile: string | null;

  @Field(() => String, { nullable: true })
  priceFile: string | null;

  @Field(() => String, { nullable: true })
  balanceFile: string | null;

  @Field(() => String, { nullable: true })
  noteFile: string | null;

  @Field(() => String, { nullable: true })
  padFile: string | null;

  @Field(() => String, { nullable: true })
  budgetFile: string | null;

  @Field(() => String, { nullable: true })
  receiptBaseFolder: string | null;

  @Field(() => String, { nullable: true })
  receiptStorage: string | null;

  @Field(() => String, { nullable: true })
  documentFile: string | null;
}
