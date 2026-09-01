import {
  Arg,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  InputType,
  Resolver,
  registerEnumType,
} from "type-graphql";
import { Authenticated } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import { BadUserInputError } from "@/shared/errors";
import { parseLedgerId } from "@/shared/str";
import type {
  ILedgerEntryService,
  LedgerEntryInput,
} from "@/features/ledger/service/ledger-entry-service";

enum BudgetInterval {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
}

registerEnumType(BudgetInterval, {
  name: "BudgetInterval",
  description: "Budget recurrence interval",
});

export enum LedgerEntryType {
  TRANSACTION = "transaction",
  COMMODITY = "commodity",
  PRICE = "price",
  NOTE = "note",
  BALANCE = "balance",
  OPEN = "open",
  CLOSE = "close",
  BUDGET = "budget",
  DOCUMENT = "document",
  EVENT = "event",
}

registerEnumType(LedgerEntryType, {
  name: "LedgerEntryType",
  description: "Discriminator selecting which entry payload to add",
});

@ObjectType()
class AddLedgerEntryResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => String, { nullable: true })
  message?: string;
}

@InputType()
class LedgerAmountInput {
  @Field(() => String)
  number: string;

  @Field(() => String)
  currency: string;
}

@InputType()
class LedgerPostingInput {
  @Field(() => LedgerAmountInput)
  units: LedgerAmountInput;

  @Field(() => String)
  account: string;

  @Field(() => LedgerAmountInput, { nullable: true })
  price?: LedgerAmountInput;

  @Field(() => String, { nullable: true })
  flag?: string;
}

@InputType()
class LedgerTransactionInput {
  @Field(() => String)
  date: string;

  @Field(() => String)
  flag: string;

  @Field(() => String, { nullable: true })
  payee?: string;

  @Field(() => String, { nullable: true })
  narration?: string;

  @Field(() => [LedgerPostingInput])
  postings: LedgerPostingInput[];

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field(() => [String], { nullable: true })
  links?: string[];
}

@InputType()
class LedgerCommodityInput {
  @Field(() => String)
  date: string;

  @Field(() => String)
  currency: string;
}

@InputType()
class LedgerPriceInput {
  @Field(() => String)
  date: string;

  @Field(() => String)
  currency: string;

  @Field(() => LedgerAmountInput)
  amount: LedgerAmountInput;
}

@InputType()
class LedgerNoteInput {
  @Field(() => String)
  date: string;

  @Field(() => String)
  content: string;

  @Field(() => String)
  account: string;
}

@InputType()
class LedgerBalanceInput {
  @Field(() => String)
  date: string;

  @Field(() => String)
  account: string;

  @Field(() => LedgerAmountInput)
  amount: LedgerAmountInput;
}

@InputType()
class LedgerOpenInput {
  @Field(() => String)
  date: string;

  @Field(() => String)
  account: string;

  @Field(() => [String])
  currencies: string[];
}

@InputType()
class LedgerCloseInput {
  @Field(() => String)
  date: string;

  @Field(() => String)
  account: string;
}

@InputType()
class LedgerDocumentInput {
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
}

@InputType()
class LedgerBudgetInput {
  @Field(() => String)
  date: string;

  @Field(() => String)
  account: string;

  @Field(() => BudgetInterval)
  interval: BudgetInterval;

  @Field(() => LedgerAmountInput)
  amount: LedgerAmountInput;
}

@InputType()
class LedgerEventInput {
  @Field(() => String)
  date: string;

  @Field(() => String)
  type: string;

  @Field(() => String)
  description: string;
}

/**
 * Polymorphic entry input. GraphQL has no input unions, so the payload is
 * modeled as a `type` discriminator plus one nullable field per directive type;
 * exactly the field matching `type` must be provided.
 */
@InputType()
class AddEntryInput {
  @Field(() => LedgerEntryType)
  type: LedgerEntryType;

  @Field(() => LedgerTransactionInput, { nullable: true })
  transaction?: LedgerTransactionInput;

  @Field(() => LedgerCommodityInput, { nullable: true })
  commodity?: LedgerCommodityInput;

  @Field(() => LedgerPriceInput, { nullable: true })
  price?: LedgerPriceInput;

  @Field(() => LedgerNoteInput, { nullable: true })
  note?: LedgerNoteInput;

  @Field(() => LedgerBalanceInput, { nullable: true })
  balance?: LedgerBalanceInput;

  @Field(() => LedgerOpenInput, { nullable: true })
  open?: LedgerOpenInput;

  @Field(() => LedgerCloseInput, { nullable: true })
  close?: LedgerCloseInput;

  @Field(() => LedgerBudgetInput, { nullable: true })
  budget?: LedgerBudgetInput;

  @Field(() => LedgerDocumentInput, { nullable: true })
  document?: LedgerDocumentInput;

  @Field(() => LedgerEventInput, { nullable: true })
  event?: LedgerEventInput;
}

/** Map a GraphQL entry input onto the service's discriminated union. */
function toServiceEntry(input: AddEntryInput): LedgerEntryInput {
  switch (input.type) {
    case LedgerEntryType.TRANSACTION:
      return {
        type: "transaction",
        entry: requirePayload(input, input.transaction),
      };
    case LedgerEntryType.COMMODITY:
      return {
        type: "commodity",
        entry: requirePayload(input, input.commodity),
      };
    case LedgerEntryType.PRICE:
      return { type: "price", entry: requirePayload(input, input.price) };
    case LedgerEntryType.NOTE:
      return { type: "note", entry: requirePayload(input, input.note) };
    case LedgerEntryType.BALANCE:
      return { type: "balance", entry: requirePayload(input, input.balance) };
    case LedgerEntryType.OPEN:
      return { type: "open", entry: requirePayload(input, input.open) };
    case LedgerEntryType.CLOSE:
      return { type: "close", entry: requirePayload(input, input.close) };
    case LedgerEntryType.BUDGET:
      return { type: "budget", entry: requirePayload(input, input.budget) };
    case LedgerEntryType.DOCUMENT:
      return { type: "document", entry: requirePayload(input, input.document) };
    case LedgerEntryType.EVENT:
      return { type: "event", entry: requirePayload(input, input.event) };
  }
}

/** Assert the payload field matching the entry's `type` was provided. */
function requirePayload<T>(input: AddEntryInput, payload: T | undefined): T {
  if (payload === undefined || payload === null) {
    throw new BadUserInputError(
      `Entry of type "${input.type}" is missing its "${input.type}" payload`,
    );
  }
  return payload;
}

@Resolver()
export class LedgerEntryMutationResolver {
  constructor(private readonly ledgerEntry: ILedgerEntryService) {}

  @Authenticated()
  @Mutation(() => AddLedgerEntryResponse, {
    description: "Add one or more entries to a specific ledger (atomic)",
  })
  async bulkEntries(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Arg("entries", () => [AddEntryInput]) entries: AddEntryInput[],
    @Ctx() ctx: IContext,
  ): Promise<AddLedgerEntryResponse> {
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    return this.ledgerEntry.addBulkEntries(
      ctx.getCurrentIdentity(),
      ledgerOwner,
      ledgerName,
      entries.map(toServiceEntry),
      ctx.platform,
    );
  }
}
