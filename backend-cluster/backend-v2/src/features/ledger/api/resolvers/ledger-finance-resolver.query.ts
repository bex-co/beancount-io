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
import { IContext } from "@/server/graphql/context";
import { filterNullish } from "@/shared/tools";
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

@Resolver()
export class LedgerFinanceQueryResolver {
  constructor(private readonly financeService: ILedgerFinanceService) {}

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

  @Query(() => BalanceSheetData, {
    description: "Get the balance sheet of a specific ledger",
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
