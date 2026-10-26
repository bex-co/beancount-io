import {
  Arg,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  InputType,
  Resolver,
} from "type-graphql";
import { Authenticated } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import type {
  ILedgerReceiptWorkflow,
  InsertReceiptInput,
} from "@/features/ledger/workflow/ledger-receipt-workflow";
import { resolveObjectKey } from "@/features/ledger/utils/object-key-alias";

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

  @Field(() => [String], {
    description:
      "The hash each committed entry now carries, in request order, for getLedgerEntryContext and the source-slice update and delete; empty when it could not be resolved after the commit",
  })
  entryHashes: string[];
}

@Resolver()
export class LedgerReceiptMutationResolver {
  constructor(private readonly receiptWorkflow: ILedgerReceiptWorkflow) {}

  @Authenticated()
  @Mutation(() => InsertReceiptResult, {
    description:
      "Upload a receipt and insert a transaction entry. Storage strategy (S3 or git) is controlled by the `receipt_storage` beancountio-option.",
  })
  async insertReceiptTransaction(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Arg("receiptObjectKey", () => String, { nullable: true })
    receiptObjectKey: string | undefined,
    @Arg("input", () => InsertReceiptTransactionInput)
    input: InsertReceiptTransactionInput,
    @Arg("objectKey", () => String, {
      nullable: true,
      description: "Alias of receiptObjectKey, as the upload URL spells it.",
    })
    objectKey: string | undefined,
    @Arg("s3ObjectKey", () => String, {
      nullable: true,
      description: "Alias of receiptObjectKey, as the parse routes spell it.",
    })
    s3ObjectKey: string | undefined,
    @Ctx() ctx: IContext,
  ): Promise<InsertReceiptResult> {
    const result = await this.receiptWorkflow.insertReceiptTransaction({
      ledgerId,
      receiptObjectKey: resolveObjectKey({
        objectKey,
        s3ObjectKey,
        receiptObjectKey,
      }),
      input,
      identity: ctx.getCurrentIdentity(),
    });
    return { success: result.success, entryHashes: result.entryHashes ?? [] };
  }
}
