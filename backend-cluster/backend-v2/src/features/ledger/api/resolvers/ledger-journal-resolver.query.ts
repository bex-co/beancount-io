import {
  Arg,
  Ctx,
  Field,
  Int,
  ObjectType,
  InputType,
  Query,
  Resolver,
} from "type-graphql";
import { AllowAnonymous } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import { GraphQLJSONObject } from "graphql-scalars";
import type { ILedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import { JOURNAL_FILTER_DESCRIPTION } from "@/features/ledger/utils/journal-filter-description";
import { resolveEntryHash } from "@/features/ledger/utils/entry-hash-alias";
import {
  resolveFilterAccount,
  resolveWithChildren,
} from "@/features/ledger/utils/query-param-alias";

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

  @Field(() => String, {
    nullable: true,
    description:
      "The feed URL when the entry comes from a managed price include; such an entry is read-only.",
  })
  managed_source: string | null;

  @Field(() => String, {
    nullable: true,
    description:
      "The entry hash of the source entry when this entry is a copy a plugin or a pad generated from it (amortize_over, forecast, padding). A copy shares its source's text and checksum, so editing or deleting it changes the source and every other copy.",
  })
  generated_from: string | null;
}

@InputType()
class JournalQueryInput {
  @Field(() => String, { nullable: true })
  account?: string;

  @Field(() => String, {
    nullable: true,
    description: JOURNAL_FILTER_DESCRIPTION,
  })
  filter?: string;

  @Field(() => String, {
    nullable: true,
    description:
      "Fava time expression, e.g. 2026-08. Pre-window `open` directives are preserved as context and counted in total.",
  })
  time?: string;

  @Field(() => Number, { nullable: true, defaultValue: 20 })
  limit?: number;

  @Field(() => Number, { nullable: true, defaultValue: 0 })
  offset?: number;

  @Field(() => [String], { nullable: true })
  directiveTypes?: string[];

  // w23/150: narrows transactions only — other families pass through.
  @Field(() => [String], {
    nullable: true,
    description:
      "Transaction flag filter: narrows transactions only — other directive families pass through. Combine with directiveTypes to restrict the families returned.",
  })
  transactionSubtypes?: string[];

  // w23/150: narrows documents only — other families pass through.
  @Field(() => [String], {
    nullable: true,
    description:
      "Document subtype filter: narrows documents only — other directive families pass through. Combine with directiveTypes to restrict the families returned.",
  })
  documentSubtypes?: string[];

  // w23/150: narrows custom directives only — other families pass through.
  @Field(() => [String], {
    nullable: true,
    description:
      "Custom-directive subtype filter: narrows custom directives only — other families pass through. Combine with directiveTypes to restrict the families returned.",
  })
  customSubtypes?: string[];
}

@ObjectType()
class PlaintextJournalResponse {
  @Field(() => String)
  content: string;

  @Field(() => Int, {
    description: "Entries the filters select, before offset and limit.",
  })
  total: number;

  @Field(() => Boolean, {
    description: "Whether entries remain after this page.",
  })
  truncated: boolean;
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

  @Field(() => String, {
    nullable: true,
    description: JOURNAL_FILTER_DESCRIPTION,
  })
  filter?: string;

  @Field(() => String, { nullable: true })
  time?: string;

  @Field(() => Int, {
    nullable: true,
    description: "Entries per page, 1 to 1000; omitted, every entry.",
  })
  limit?: number;

  @Field(() => Int, { nullable: true })
  offset?: number;
}

@InputType()
class AccountJournalQueryInput {
  @Field(() => String)
  account: string;

  @Field(() => String, {
    nullable: true,
    description:
      "Optional shared report-stream AccountFilter (URL ?account=). Distinct from the required target `account`.",
  })
  filterAccount?: string;

  // Twin (w23/m10/t002): MCP and REST spell it `filter_account`.
  @Field(() => String, {
    nullable: true,
    description: "Alias of filterAccount, as MCP and REST spell it.",
  })
  filter_account?: string;

  @Field(() => String, {
    nullable: true,
    description: JOURNAL_FILTER_DESCRIPTION,
  })
  filter?: string;

  @Field(() => String, {
    nullable: true,
    description:
      "Fava time expression, e.g. 2026-08. Pre-window `open` directives are preserved as context and counted in total.",
  })
  time?: string;

  @Field(() => Number, { nullable: true, defaultValue: 20 })
  limit?: number;

  @Field(() => Number, { nullable: true, defaultValue: 0 })
  offset?: number;

  // No defaultValue (w23/m10/t003): a defaulted `true` would
  // split-conflict with any explicit `withChildren: false`. The service
  // already defaults missing to true.
  @Field(() => Boolean, { nullable: true })
  with_children?: boolean;

  // Twin (w23/m10/t003): the camel spelling, accepted on every surface.
  @Field(() => Boolean, {
    nullable: true,
    description: "Alias of with_children.",
  })
  withChildren?: boolean;

  @Field(() => String, { nullable: true, defaultValue: "at_cost" })
  conversion?: string;

  @Field(() => [String], { nullable: true })
  directiveTypes?: string[];

  // w23/150: narrows transactions only — other families pass through.
  @Field(() => [String], {
    nullable: true,
    description:
      "Transaction flag filter: narrows transactions only — other directive families pass through. Combine with directiveTypes to restrict the families returned.",
  })
  transactionSubtypes?: string[];

  // w23/150: narrows documents only — other families pass through.
  @Field(() => [String], {
    nullable: true,
    description:
      "Document subtype filter: narrows documents only — other directive families pass through. Combine with directiveTypes to restrict the families returned.",
  })
  documentSubtypes?: string[];

  // w23/150: narrows custom directives only — other families pass through.
  @Field(() => [String], {
    nullable: true,
    description:
      "Custom-directive subtype filter: narrows custom directives only — other families pass through. Combine with directiveTypes to restrict the families returned.",
  })
  customSubtypes?: string[];
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
    @Ctx() ctx: IContext,
    @Arg("entryHash", () => String, { nullable: true }) entryHash?: string,
    @Arg("entry_hash", () => String, {
      nullable: true,
      description: "Alias of entryHash, as list output spells it.",
    })
    entry_hash?: string,
  ): Promise<EntryContext> {
    return this.journalService.getContext({
      ledgerId,
      identity: ctx.identity,
      entryHash: resolveEntryHash({ entryHash, entry_hash }),
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
    const { filter_account, with_children, withChildren, ...rest } =
      queryInput;
    return this.journalService.getAccountJournal({
      ledgerId,
      identity: ctx.identity,
      query: {
        ...rest,
        filterAccount: resolveFilterAccount({
          primary: filter_account,
          legacy: queryInput.filterAccount,
        }),
        with_children: resolveWithChildren({
          primary: with_children,
          legacy: withChildren,
        }),
      },
    });
  }
}
