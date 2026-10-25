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
import { AllowAnonymous } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import { filterNullish } from "@/shared/tools";
import { BadUserInputError } from "@/shared/errors";
import { GraphQLJSONObject } from "graphql-scalars";
import { DateAndBalance, ConversionArgs } from "./ledger-report-resolver.types";
import type { ILedgerFinanceService } from "@/features/ledger/service/ledger-finance-service";

interface ApiTreeNode {
  account: string;
  balance: Record<string, string>;
  balance_children: Record<string, string>;
  children: ApiTreeNode[];
  has_txns: boolean;
  cost?: Record<string, string> | null;
  cost_children?: Record<string, string> | null;
}

@ObjectType()
class DateAndBalanceWithAccountBalance {
  @Field(() => String)
  date: string;

  @Field(() => GraphQLJSONObject)
  balance: Record<string, string>;

  @Field(() => GraphQLJSONObject)
  accountBalances: Record<string, Record<string, string>>;
}

@ObjectType()
class SerializableTreeNode {
  @Field(() => String)
  account: string;

  @Field(() => GraphQLJSONObject)
  balance: Record<string, string>;

  @Field(() => GraphQLJSONObject)
  balanceChildren: Record<string, string>;

  @Field(() => [GraphQLJSONObject])
  children: SerializableTreeNode[];

  @Field(() => Boolean)
  hasTxns: boolean;

  @Field(() => GraphQLJSONObject, { nullable: true })
  cost?: Record<string, string>;

  @Field(() => GraphQLJSONObject, { nullable: true })
  costChildren?: Record<string, string>;
}

@ObjectType()
class LedgerOverview {
  @Field(() => [DateAndBalance])
  netWorthData: DateAndBalance[];

  @Field(() => [DateAndBalance])
  assetsData: DateAndBalance[];

  @Field(() => SerializableTreeNode)
  assetsHierarchyData: SerializableTreeNode;

  @Field(() => [DateAndBalance])
  liabilitiesData: DateAndBalance[];

  @Field(() => SerializableTreeNode)
  liabilitiesHierarchyData: SerializableTreeNode;

  @Field(() => [DateAndBalanceWithAccountBalance])
  incomeIntervalData: DateAndBalanceWithAccountBalance[];

  @Field(() => SerializableTreeNode)
  incomeHierarchyData: SerializableTreeNode;

  @Field(() => [DateAndBalance])
  incomeData: DateAndBalance[];

  @Field(() => [DateAndBalanceWithAccountBalance])
  expensesIntervalData: DateAndBalanceWithAccountBalance[];

  @Field(() => SerializableTreeNode)
  expensesHierarchyData: SerializableTreeNode;

  @Field(() => [DateAndBalance])
  expensesData: DateAndBalance[];
}

@ObjectType()
class BalanceSheetData {
  @Field(() => [DateAndBalance])
  netWorthData: DateAndBalance[];

  @Field(() => [DateAndBalance])
  assetsData: DateAndBalance[];

  @Field(() => [DateAndBalance])
  liabilitiesData: DateAndBalance[];

  @Field(() => [DateAndBalance])
  equityData: DateAndBalance[];

  @Field(() => SerializableTreeNode)
  assetsHierarchyData: SerializableTreeNode;

  @Field(() => SerializableTreeNode)
  liabilitiesHierarchyData: SerializableTreeNode;

  @Field(() => SerializableTreeNode)
  equityHierarchyData: SerializableTreeNode;
}

@ObjectType()
class IncomeStatementData {
  @Field(() => [DateAndBalance])
  netProfitData: DateAndBalance[];

  @Field(() => [DateAndBalanceWithAccountBalance])
  incomeData: DateAndBalanceWithAccountBalance[];

  @Field(() => [DateAndBalanceWithAccountBalance])
  expensesData: DateAndBalanceWithAccountBalance[];

  @Field(() => SerializableTreeNode)
  incomeHierarchyData: SerializableTreeNode;

  @Field(() => SerializableTreeNode)
  expensesHierarchyData: SerializableTreeNode;
}

@ObjectType()
class TrialBalanceData {
  @Field(() => SerializableTreeNode)
  incomeHierarchyData: SerializableTreeNode;

  @Field(() => SerializableTreeNode)
  liabilitiesHierarchyData: SerializableTreeNode;

  @Field(() => SerializableTreeNode)
  equityHierarchyData: SerializableTreeNode;

  @Field(() => SerializableTreeNode)
  expensesHierarchyData: SerializableTreeNode;

  @Field(() => SerializableTreeNode)
  assetsHierarchyData: SerializableTreeNode;
}

@ArgsType()
class IncomeStatementArgs extends ConversionArgs {}

@ArgsType()
class HoldingsArgs {
  @Field(() => String, { nullable: true })
  account?: string;

  // No default: an omitted conversion values in the operating currency
  // when the ledger declares exactly one, else each group's held
  // currency — as on REST and MCP.
  @Field(() => String, { nullable: true })
  conversion?: string;

  @Field(() => String, { defaultValue: "account" })
  groupBy?: string;
}

@ObjectType()
class HoldingsMoney {
  @Field(() => String)
  number: string;

  @Field(() => String)
  currency: string;
}

@ObjectType()
class HoldingsGroup {
  @Field(() => String, { nullable: true })
  account?: string;

  @Field(() => [String], { nullable: true })
  accounts?: string[];

  @Field(() => String)
  commodity: string;

  @Field(() => HoldingsMoney)
  units: HoldingsMoney;

  @Field(() => HoldingsMoney)
  averageCost: HoldingsMoney;

  @Field(() => HoldingsMoney)
  costBasis: HoldingsMoney;

  @Field(() => HoldingsMoney)
  marketValue: HoldingsMoney;

  @Field(() => HoldingsMoney, { nullable: true })
  price?: HoldingsMoney | null;
}

@ObjectType()
class MissingPriceLeg {
  @Field(() => String)
  from: string;

  @Field(() => String)
  to: string;
}

@ObjectType()
class HoldingsData {
  @Field(() => String)
  groupBy: string;

  @Field(() => [HoldingsGroup])
  groups: HoldingsGroup[];

  @Field(() => GraphQLJSONObject)
  totals: {
    cost_basis: Record<string, string>;
    market_value: Record<string, string>;
  };

  @Field(() => String)
  valuation: string;

  @Field(() => [MissingPriceLeg])
  missingPrices: MissingPriceLeg[];

  @Field(() => [String])
  missingPriceSummary: string[];

  @Field(() => String)
  asOf: string;
}

@ArgsType()
class RegisterArgs {
  @Field(() => String)
  account: string;

  @Field(() => String, { nullable: true })
  time?: string;

  // No default: an omitted conversion values in the operating currency
  // when the ledger declares exactly one, else each row's held
  // currencies — as on REST and MCP.
  @Field(() => String, { nullable: true })
  conversion?: string;
}

@ObjectType()
class RegisterCost {
  @Field(() => String)
  number: string;

  @Field(() => String)
  currency: string;

  @Field(() => String)
  date: string;
}

@ObjectType()
class RegisterPosting {
  @Field(() => String)
  account: string;

  @Field(() => HoldingsMoney)
  amount: HoldingsMoney;

  @Field(() => RegisterCost, { nullable: true })
  cost?: RegisterCost | null;
}

@ObjectType()
class RegisterRow {
  @Field(() => String)
  date: string;

  @Field(() => String)
  entry: string;

  @Field(() => String, { nullable: true })
  payee?: string | null;

  @Field(() => String, { nullable: true })
  narration?: string | null;

  @Field(() => [RegisterPosting])
  postings: RegisterPosting[];

  @Field(() => GraphQLJSONObject)
  change: Record<string, string>;

  @Field(() => GraphQLJSONObject)
  balance: Record<string, string>;
}

@ObjectType()
class RegisterData {
  @Field(() => String, { nullable: true })
  account?: string | null;

  @Field(() => [RegisterRow])
  rows: RegisterRow[];
}

@ArgsType()
class CapitalGainsArgs {
  @Field(() => String, { nullable: true })
  account?: string;

  @Field(() => String, { nullable: true })
  time?: string;

  @Field(() => String, { nullable: true })
  fromDate?: string;

  @Field(() => String, { nullable: true })
  toDate?: string;
}

@ObjectType()
class GainsRow {
  @Field(() => String)
  account: string;

  @Field(() => String)
  commodity: string;

  @Field(() => String, { nullable: true })
  acquired?: string | null;

  @Field(() => String)
  sold: string;

  @Field(() => Number, { nullable: true })
  heldDays?: number | null;

  @Field(() => Boolean, { nullable: true })
  longHeld?: boolean | null;

  @Field(() => HoldingsMoney)
  quantity: HoldingsMoney;

  @Field(() => HoldingsMoney)
  proceeds: HoldingsMoney;

  @Field(() => HoldingsMoney)
  basis: HoldingsMoney;

  @Field(() => HoldingsMoney)
  gain: HoldingsMoney;
}

@ObjectType()
class GainsData {
  @Field(() => [GainsRow])
  rows: GainsRow[];

  @Field(() => GraphQLJSONObject)
  totals: {
    one_year_or_less: Record<string, string>;
    more_than_one_year: Record<string, string>;
    holding_unknown: Record<string, string>;
  };
}

@Resolver()
export class LedgerFinanceQueryResolver {
  constructor(private readonly financeService: ILedgerFinanceService) {}

  @AllowAnonymous()
  @Query(() => LedgerOverview, {
    description: "Get the overview of a specific ledger",
  })
  async getLedgerOverview(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() args: ConversionArgs,
    @Ctx() ctx: IContext,
  ): Promise<LedgerOverview> {
    const data = await this.financeService.getOverview({
      ledgerId,
      identity: ctx.identity,
      ...filterNullish({
        account: args.account,
        filter: args.filter,
        time: args.time,
        conversion: args.conversion,
        interval: args.interval,
      }),
    });
    return {
      netWorthData: data.net_worth_data.map((item) => ({
        date: item.date,
        balance: item.balance,
      })),
      assetsData: data.assets_data.map((item) => ({
        date: item.date,
        balance: item.balance,
      })),
      assetsHierarchyData: this.mapTreeNode(data.assets_hierarchy_data),
      liabilitiesData: data.liabilities_data.map((item) => ({
        date: item.date,
        balance: item.balance,
      })),
      liabilitiesHierarchyData: this.mapTreeNode(
        data.liabilities_hierarchy_data,
      ),
      incomeData: data.income_data.map((item) => ({
        date: item.date,
        balance: item.balance,
      })),
      incomeIntervalData: data.income_interval_data.map((item) => ({
        date: item.date,
        balance: item.balance,
        accountBalances: item.account_balances,
      })),
      expensesData: data.expenses_data.map((item) => ({
        date: item.date,
        balance: item.balance,
      })),
      expensesIntervalData: data.expenses_interval_data.map((item) => ({
        date: item.date,
        balance: item.balance,
        accountBalances: item.account_balances,
      })),
      expensesHierarchyData: this.mapTreeNode(data.expenses_hierarchy_data),
      incomeHierarchyData: this.mapTreeNode(data.income_hierarchy_data),
    };
  }

  @AllowAnonymous()
  @Query(() => IncomeStatementData, {
    description: "Get the income statement of a specific ledger",
  })
  async getLedgerIncomeStatement(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() args: IncomeStatementArgs,
    @Ctx() ctx: IContext,
  ): Promise<IncomeStatementData> {
    const data = await this.financeService.getIncomeStatement({
      ledgerId,
      identity: ctx.identity,
      ...filterNullish({
        account: args.account,
        filter: args.filter,
        time: args.time,
        conversion: args.conversion,
        interval: args.interval,
      }),
    });
    return {
      netProfitData: data.net_profit_data.map((item) => ({
        date: item.date,
        balance: item.balance,
      })),
      incomeData: data.income_data.map((item) => ({
        date: item.date,
        balance: item.balance,
        accountBalances: item.account_balances,
      })),
      expensesData: data.expenses_data.map((item) => ({
        date: item.date,
        balance: item.balance,
        accountBalances: item.account_balances,
      })),
      incomeHierarchyData: this.mapTreeNode(data.income_hierarchy_data),
      expensesHierarchyData: this.mapTreeNode(data.expenses_hierarchy_data),
    };
  }

  @AllowAnonymous()
  @Query(() => BalanceSheetData, {
    description:
      "Get the balance sheet of a specific ledger, including report-only current earnings in equity and its interval series under the configured account names",
  })
  async getLedgerBalanceSheet(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() args: ConversionArgs,
    @Ctx() ctx: IContext,
  ): Promise<BalanceSheetData> {
    const data = await this.financeService.getBalanceSheet({
      ledgerId,
      identity: ctx.identity,
      ...filterNullish({
        account: args.account,
        filter: args.filter,
        time: args.time,
        conversion: args.conversion,
        interval: args.interval,
      }),
    });
    return {
      netWorthData: data.net_worth_data.map((item) => ({
        date: item.date,
        balance: item.balance,
      })),
      assetsData: data.assets_data.map((item) => ({
        date: item.date,
        balance: item.balance,
      })),
      liabilitiesData: data.liabilities_data.map((item) => ({
        date: item.date,
        balance: item.balance,
      })),
      equityData: data.equity_data.map((item) => ({
        date: item.date,
        balance: item.balance,
      })),
      assetsHierarchyData: this.mapTreeNode(data.assets_hierarchy_data),
      liabilitiesHierarchyData: this.mapTreeNode(
        data.liabilities_hierarchy_data,
      ),
      equityHierarchyData: this.mapTreeNode(data.equity_hierarchy_data),
    };
  }

  @AllowAnonymous()
  @Query(() => TrialBalanceData, {
    description: "Get the trial balance of a specific ledger",
  })
  async getLedgerTrialBalance(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() args: ConversionArgs,
    @Ctx() ctx: IContext,
  ): Promise<TrialBalanceData> {
    const data = await this.financeService.getTrialBalance({
      ledgerId,
      identity: ctx.identity,
      ...filterNullish({
        account: args.account,
        filter: args.filter,
        time: args.time,
        conversion: args.conversion,
      }),
    });
    return {
      incomeHierarchyData: this.mapTreeNode(data.income_hierarchy_data),
      liabilitiesHierarchyData: this.mapTreeNode(
        data.liabilities_hierarchy_data,
      ),
      equityHierarchyData: this.mapTreeNode(data.equity_hierarchy_data),
      expensesHierarchyData: this.mapTreeNode(data.expenses_hierarchy_data),
      assetsHierarchyData: this.mapTreeNode(data.assets_hierarchy_data),
    };
  }

  @AllowAnonymous()
  @Query(() => HoldingsData, {
    description: "Get the holdings of a specific ledger",
  })
  async getLedgerHoldings(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() args: HoldingsArgs,
    @Ctx() ctx: IContext,
  ): Promise<HoldingsData> {
    if (
      args.groupBy !== undefined &&
      args.groupBy !== "account" &&
      args.groupBy !== "commodity"
    ) {
      throw new BadUserInputError(
        `Unsupported groupBy "${args.groupBy}": pass "account" or "commodity".`,
      );
    }
    const data = await this.financeService.getHoldings({
      ledgerId,
      identity: ctx.identity,
      ...filterNullish({
        account: args.account,
        conversion: args.conversion,
        groupBy: args.groupBy,
      }),
    });
    return {
      groupBy: data.group_by,
      groups: data.groups.map((group) => ({
        account: group.account,
        accounts: group.accounts,
        commodity: group.commodity,
        units: group.units,
        averageCost: group.average_cost,
        costBasis: group.cost_basis,
        marketValue: group.market_value,
        price: group.price,
      })),
      totals: data.totals,
      valuation: data.valuation,
      missingPrices: data.missing_prices,
      missingPriceSummary: data.missing_price_summary,
      asOf: data.as_of,
    };
  }

  @AllowAnonymous()
  @Query(() => RegisterData, {
    description: "Get the register of a specific ledger account",
  })
  async getLedgerRegister(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() args: RegisterArgs,
    @Ctx() ctx: IContext,
  ): Promise<RegisterData> {
    const data = await this.financeService.getRegister({
      ledgerId,
      identity: ctx.identity,
      account: args.account,
      ...filterNullish({
        time: args.time,
        conversion: args.conversion,
      }),
    });
    return {
      account: data.account,
      rows: data.rows,
    };
  }

  @AllowAnonymous()
  @Query(() => GainsData, {
    description: "Get the realized capital gains of a specific ledger",
  })
  async getLedgerCapitalGains(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Args() args: CapitalGainsArgs,
    @Ctx() ctx: IContext,
  ): Promise<GainsData> {
    const data = await this.financeService.getCapitalGains({
      ledgerId,
      identity: ctx.identity,
      ...filterNullish({
        account: args.account,
        time: args.time,
        fromDate: args.fromDate,
        toDate: args.toDate,
      }),
    });
    return {
      rows: data.rows.map((row) => ({
        account: row.account,
        commodity: row.commodity,
        acquired: row.acquired,
        sold: row.sold,
        heldDays: row.held_days,
        longHeld: row.long_held,
        quantity: row.quantity,
        proceeds: row.proceeds,
        basis: row.basis,
        gain: row.gain,
      })),
      totals: data.totals,
    };
  }

  private mapTreeNode(node: ApiTreeNode): SerializableTreeNode {
    return {
      account: node.account,
      balance: node.balance,
      balanceChildren: node.balance_children,
      children: node.children.map((child) => this.mapTreeNode(child)),
      hasTxns: node.has_txns,
      cost: node.cost ? node.cost : undefined,
      costChildren: node.cost_children ? node.cost_children : undefined,
    };
  }
}
