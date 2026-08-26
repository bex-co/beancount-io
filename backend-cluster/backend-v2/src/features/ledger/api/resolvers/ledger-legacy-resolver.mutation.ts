import {
  ArgsType,
  Authorized,
  Field,
  ObjectType,
  Args,
  Ctx,
  Mutation,
  InputType,
  Resolver,
} from "type-graphql";
import { IContext } from "@/server/graphql/context";
import { BadUserInputError } from "@/shared/errors";
import { GraphQLJSONObject } from "graphql-scalars";
import { parseLedgerId } from "@/shared/str";
import { BaseLedgerResolver } from "./ledger-legacy-resolver.base";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type {
  ILedgerEntryService,
  LedgerEntryInput,
} from "@/features/ledger/service/ledger-entry-service";

export interface IEntryMeta {
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

/** Parse a legacy amount string like "11.11 EUR" into a { number, currency } pair. */
function parsePostingAmount(amount: string): {
  number: string;
  currency: string;
} {
  const amountMatch = amount.match(/^(-?[\d,.]+)\s+([A-Z]{3})$/);
  if (amountMatch) {
    const [, numberStr, currencyStr] = amountMatch;
    return { number: numberStr.replace(/,/g, ""), currency: currencyStr };
  }
  // Fallback: no currency suffix found — treat the whole string as the number.
  const stripped = amount.replace(/,/g, "");
  return {
    number: Number.isNaN(parseFloat(stripped)) ? "0" : stripped,
    currency: "USD",
  };
}

@Resolver()
export class LedgerLegacyMutationResolver extends BaseLedgerResolver {
  constructor(
    favaClientFactory: IFavaClientFactory,
    private readonly ledgerEntry: ILedgerEntryService,
  ) {
    super(favaClientFactory);
  }

  @Authorized()
  @Mutation(() => AddEntryResponse)
  async addEntries(
    @Args() entriesInput: EntriesInput,
    @Ctx() ctx: IContext,
  ): Promise<AddEntryResponse> {
    const userId = ctx.getCurrentUserId();
    const defaultLedgerId = await this.resolveLedgerId(
      ctx.identity,
      userId,
      entriesInput.ledgerId,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(defaultLedgerId);

    const inputs: LedgerEntryInput[] = entriesInput.entriesInput.map(
      (entry) => {
        if (entry.type !== "Transaction") {
          throw new BadUserInputError("Invalid entry type");
        }
        return {
          type: "transaction",
          entry: {
            date: entry.date,
            flag: entry.flag,
            payee: entry.payee,
            narration: entry.narration,
            postings: entry.postings.map((posting) => ({
              account: posting.account,
              units: parsePostingAmount(posting.amount),
            })),
          },
        };
      },
    );

    await this.ledgerEntry.addBulkEntries(
      ctx.getCurrentIdentity(),
      ledgerOwner,
      ledgerName,
      inputs,
      ctx.platform,
    );

    return {
      data: "",
      success: true,
    };
  }
}
