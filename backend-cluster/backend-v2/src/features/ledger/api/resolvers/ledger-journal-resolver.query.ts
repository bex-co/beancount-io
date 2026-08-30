import {
  Arg,
  Ctx,
  Field,
  ObjectType,
  InputType,
  Query,
  Resolver,
} from "type-graphql";
import { AllowAnonymous } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import { GraphQLJSONObject } from "graphql-scalars";
import {
  CustomSubtype,
  DirectiveType,
  DocumentSubtype,
  TransactionSubtype,
} from "@/foundation/fava";
import type { ILedgerJournalService } from "@/features/ledger/service/ledger-journal-service";

@ObjectType()
class JournalResponse {
  @Field(() => Number)
  total: number;

  @Field(() => [GraphQLJSONObject])
  data: Record<string, unknown>[];

  @Field(() => Boolean)
  is_empty: boolean;
}

@ObjectType()
class EntryContext {
  @Field(() => GraphQLJSONObject)
  entry: Record<string, unknown>;

  @Field(() => GraphQLJSONObject, { nullable: true })
  balances_before?: Record<string, string[]> | null;

  @Field(() => GraphQLJSONObject, { nullable: true })
  balances_after?: Record<string, string[]> | null;

  @Field(() => String)
  sha256sum: string;

  @Field(() => String)
  slice: string;
}

@InputType()
class JournalQueryInput {
  @Field(() => String, { nullable: true })
  account?: string;

  @Field(() => String, { nullable: true })
  filter?: string;

  @Field(() => String, { nullable: true })
  time?: string;

  @Field(() => Number, { nullable: true, defaultValue: 20 })
  limit?: number;

  @Field(() => Number, { nullable: true, defaultValue: 0 })
  offset?: number;

  @Field(() => [String], { nullable: true })
  directiveTypes?: DirectiveType[];

  @Field(() => [String], { nullable: true })
  transactionSubtypes?: TransactionSubtype[];

  @Field(() => [String], { nullable: true })
  documentSubtypes?: DocumentSubtype[];

  @Field(() => [String], { nullable: true })
  customSubtypes?: CustomSubtype[];
}

@ObjectType()
class PlaintextJournalResponse {
  @Field(() => String)
  content: string;
}

@ObjectType()
class AccountJournalEntry {
  @Field(() => GraphQLJSONObject)
  entry: Record<string, unknown>;

  @Field(() => GraphQLJSONObject)
  change: Record<string, string>;

  @Field(() => GraphQLJSONObject)
  balance: Record<string, string>;
}

@ObjectType()
class AccountJournalResponse {
  @Field(() => [AccountJournalEntry])
  items: AccountJournalEntry[];

  @Field(() => Number)
  total: number;

  @Field(() => String)
  account: string;

  @Field(() => Boolean)
  with_children: boolean;
}

@InputType()
class PlaintextJournalQueryInput {
  @Field(() => String, { nullable: true })
  account?: string;

  @Field(() => String, { nullable: true })
  filter?: string;

  @Field(() => String, { nullable: true })
  time?: string;
}

@InputType()
class AccountJournalQueryInput {
  @Field(() => String)
  account: string;

  @Field(() => String, { nullable: true })
  filter?: string;

  @Field(() => String, { nullable: true })
  time?: string;

  @Field(() => Number, { nullable: true, defaultValue: 20 })
  limit?: number;

  @Field(() => Number, { nullable: true, defaultValue: 0 })
  offset?: number;

  @Field(() => Boolean, { nullable: true, defaultValue: true })
  with_children?: boolean;

  @Field(() => String, { nullable: true, defaultValue: "at_cost" })
  conversion?: string;
}

@Resolver()
export class LedgerJournalQueryResolver {
  constructor(private readonly journalService: ILedgerJournalService) {}

  @AllowAnonymous()
  @Query(() => JournalResponse, {
    description: "Get journal entries for a specific ledger",
  })
  async getLedgerJournal(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
    @Arg("query", () => JournalQueryInput, { nullable: true })
    queryInput?: JournalQueryInput,
  ): Promise<JournalResponse> {
    return this.journalService.getJournal({
      ledgerId,
      identity: ctx.identity,
      query: queryInput,
    });
  }

  @AllowAnonymous()
  @Query(() => EntryContext, {
    description: "Get context for a specific journal entry",
  })
  async getLedgerEntryContext(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Arg("entryHash", () => String) entryHash: string,
    @Ctx() ctx: IContext,
  ): Promise<EntryContext> {
    return this.journalService.getContext({
      ledgerId,
      identity: ctx.identity,
      entryHash,
    });
  }

  @AllowAnonymous()
  @Query(() => PlaintextJournalResponse, {
    description: "Get plaintext journal in beancount format",
  })
  async getLedgerPlaintextJournal(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
    @Arg("query", () => PlaintextJournalQueryInput, { nullable: true })
    queryInput?: PlaintextJournalQueryInput,
  ): Promise<PlaintextJournalResponse> {
    return this.journalService.plaintextJournal({
      ledgerId,
      identity: ctx.identity,
      query: queryInput,
    });
  }

  @AllowAnonymous()
  @Query(() => AccountJournalResponse, {
    description: "Get account journal with change and balance information",
  })
  async getLedgerAccountJournal(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
    @Arg("query", () => AccountJournalQueryInput)
    queryInput: AccountJournalQueryInput,
  ): Promise<AccountJournalResponse> {
    return this.journalService.getAccountJournal({
      ledgerId,
      identity: ctx.identity,
      query: queryInput,
    });
  }
}
