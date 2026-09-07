import {
  ArgsType,
  Field,
  ObjectType,
  Args,
  Ctx,
  Mutation,
  InputType,
  Resolver,
} from "type-graphql";
import { Authenticated } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import { GraphQLJSONObject } from "graphql-scalars";
import type { ILegacyEntryWorkflow } from "@/features/ledger/workflow/legacy-entry-workflow";

interface IEntryMeta {
  __tolerances__: Record<string, number>;
  filename: string;
  lineno: number;
}

@InputType()
class EntryInput {
  @Field(() => String)
  date: string;

  @Field(() => String)
  flag: "*";

  @Field(() => GraphQLJSONObject)
  meta: IEntryMeta;

  @Field(() => String)
  narration: string;

  @Field(() => String)
  payee: string;

  @Field(() => [PostingInput])
  postings: PostingInput[];

  @Field(() => String)
  type: "Transaction" | "Note" | "Balance";
}

@InputType()
class PostingInput {
  @Field(() => String)
  account: string;

  @Field(() => String)
  amount: string;
}

@ArgsType()
class EntriesInput {
  @Field(() => [EntryInput])
  entriesInput: Array<EntryInput>;

  @Field(() => String, { nullable: true })
  ledgerId?: string | null;
}

@ObjectType()
class AddEntryResponse {
  @Field(() => String, { nullable: true })
  data: string;

  @Field(() => Boolean)
  success: boolean;
}

@Resolver()
export class LedgerLegacyMutationResolver {
  constructor(private readonly workflow: ILegacyEntryWorkflow) {}

  @Authenticated()
  @Mutation(() => AddEntryResponse)
  async addEntries(
    @Args() entriesInput: EntriesInput,
    @Ctx() ctx: IContext,
  ): Promise<AddEntryResponse> {
    return this.workflow.addEntries({
      identity: ctx.getCurrentIdentity(),
      ledgerId: entriesInput.ledgerId,
      entriesInput: entriesInput.entriesInput.map((entry) => ({
        ...entry,
        meta: { ...entry.meta },
      })),
      platform: ctx.platform,
    });
  }
}
