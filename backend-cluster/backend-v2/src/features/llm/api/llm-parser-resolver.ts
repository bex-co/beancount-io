import { Arg, Authorized, Ctx, Mutation, Resolver } from "type-graphql";
import { IContext } from "@/server/graphql/context";
import type { ILLMService } from "../service/llm-service";
import { assertLedgerScope } from "@/features/ledger/utils/authorize-ledger";
import {
  FileParseResult,
  ReceiptParseResult,
} from "./llm-parser-resolver.types";

@Resolver()
export class LLMParserResolver {
  constructor(private readonly llm: ILLMService) {}

  @Authorized()
  @Mutation(() => FileParseResult, {
    description:
      "Parse an uploaded file (multimodal support for PDF/images/any format) into structured transactions. File must be uploaded to S3 first.",
  })
  async parseFile(
    @Arg("s3ObjectKey", () => String, {
      description: "S3 object key from upload",
    })
    s3ObjectKey: string,
    @Arg("fileFormat", () => String, {
      description: "File format type (e.g., csv, pdf, xlsx, json, etc.)",
    })
    fileFormat: string,
    @Ctx() ctx: IContext,
  ): Promise<FileParseResult> {
    return this.llm.parseFile(ctx.getCurrentUserId(), s3ObjectKey, fileFormat);
  }

  @Authorized()
  @Mutation(() => ReceiptParseResult, {
    description:
      "Parse a receipt image or PDF and return a single summarized transaction with account recommendations. File must be uploaded to S3 first.",
  })
  async parseReceipt(
    @Arg("s3ObjectKey", () => String, {
      description: "S3 object key of the receipt (image or PDF only)",
    })
    s3ObjectKey: string,
    @Arg("ledgerId", () => String, {
      description:
        "Ledger ID used to fetch available accounts for recommendation",
    })
    ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<ReceiptParseResult> {
    const identity = ctx.getCurrentIdentity();
    assertLedgerScope(identity, ledgerId);
    return this.llm.parseReceipt(identity.userId, s3ObjectKey, ledgerId);
  }
}
