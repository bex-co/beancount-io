import {
  Arg,
  Authorized,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  InputType,
  Resolver,
} from "type-graphql";
import { IContext } from "@/server/graphql/context";
import type {
  ILedgerReceiptWorkflow,
  InsertReceiptInput,
} from "@/features/ledger/workflow/ledger-receipt-workflow";

@InputType()
class ReceiptPostingInput {
  @Field(() => String)
  account: string;

  @Field(() => String)
  amountNumber: string;

  @Field(() => String)
  amountCurrency: string;
}

@InputType()
class InsertReceiptTransactionInput implements InsertReceiptInput {
  @Field(() => String)
  date: string;

  @Field(() => String)
  payee: string;

  @Field(() => String)
  description: string;

  @Field(() => [ReceiptPostingInput])
  postings: ReceiptPostingInput[];

  @Field(() => String)
  documentAccount: string;
}

@ObjectType()
class InsertReceiptResult {
  @Field(() => Boolean)
  success: boolean;
}

@Resolver()
export class LedgerReceiptMutationResolver {
  constructor(private readonly receiptWorkflow: ILedgerReceiptWorkflow) {}

  @Authorized()
  @Mutation(() => InsertReceiptResult, {
    description:
      "Upload a receipt and insert a transaction entry. Storage strategy (S3 or git) is controlled by the `receipt_storage` beancountio-option.",
  })
  async insertReceiptTransaction(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Arg("receiptObjectKey", () => String) receiptObjectKey: string,
    @Arg("input", () => InsertReceiptTransactionInput)
    input: InsertReceiptTransactionInput,
    @Ctx() ctx: IContext,
  ): Promise<InsertReceiptResult> {
    return this.receiptWorkflow.insertReceiptTransaction({
      ledgerId,
      receiptObjectKey,
      input,
      identity: ctx.getCurrentIdentity(),
    });
  }
}
