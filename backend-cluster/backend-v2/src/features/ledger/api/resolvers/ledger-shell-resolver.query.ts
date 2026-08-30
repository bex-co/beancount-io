import {
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
import { GraphQLJSON } from "graphql-scalars";
import type { ILedgerShellService } from "@/features/ledger/service/ledger-shell-service";

// Type for row cells - can be string, number, boolean, null or object
type RowCell = string | number | boolean | null | Record<string, unknown>;

@ObjectType()
class QueryColumn {
  @Field(() => String)
  name: string;

  @Field(() => String)
  dtype: string;
}

@ObjectType()
class QueryResultTable {
  @Field(() => [QueryColumn])
  types: QueryColumn[];

  @Field(() => [[GraphQLJSON]], {
    description: "Query result rows as array of arrays",
  })
  rows: RowCell[][];

  @Field(() => String, { nullable: true })
  t?: string;
}

@ObjectType()
class QueryResultText {
  @Field(() => String)
  contents: string;

  @Field(() => String, { nullable: true })
  t?: string;
}

@ObjectType()
class QueryShellTextResult {
  @Field(() => String)
  text: string;
}

@ObjectType()
class QueryResult {
  @Field(() => QueryResultTable, { nullable: true })
  table?: QueryResultTable;

  @Field(() => QueryResultText, { nullable: true })
  text?: QueryResultText;

  @Field(() => String, { description: "Result type: 'table' or 'text'" })
  resultType: string;
}

@ArgsType()
class ShellQueryArgs {
  @Field(() => String)
  ledgerId: string;

  @Field(() => String)
  query: string;
}

@Resolver()
export class LedgerShellQueryResolver {
  constructor(private readonly shellService: ILedgerShellService) {}

  @AllowAnonymous()
  @Query(() => QueryResult, {
    description: "Execute a shell query on a ledger",
    nullable: true,
  })
  public async queryShell(
    @Args() args: ShellQueryArgs,
    @Ctx() ctx: IContext,
  ): Promise<QueryResult | null> {
    return this.shellService.queryShell({
      ledgerId: args.ledgerId,
      identity: ctx.identity,
      query: args.query,
    });
  }

  @AllowAnonymous()
  @Query(() => QueryShellTextResult, {
    description:
      "Execute a shell query on a ledger and return plain text output",
    nullable: true,
  })
  public async queryShellText(
    @Args() args: ShellQueryArgs,
    @Ctx() ctx: IContext,
  ): Promise<QueryShellTextResult | null> {
    return this.shellService.queryShellText({
      ledgerId: args.ledgerId,
      identity: ctx.identity,
      query: args.query,
    });
  }
}
