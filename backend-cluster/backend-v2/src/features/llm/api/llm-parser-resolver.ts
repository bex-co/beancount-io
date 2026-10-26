import { Arg, Ctx, Mutation, Resolver } from "type-graphql";
import { Authenticated } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import type { ILLMService } from "../service/llm-service";
import { resolveObjectKey } from "@/features/ledger/utils/object-key-alias";
import {
  FileParseResult,
  ReceiptParseResult,
} from "./llm-parser-resolver.types";

@Resolver()
export class LLMParserResolver {
  constructor(private readonly llm: ILLMService) {}

  @Authenticated()
  @Mutation(() => FileParseResult, {
    description:
      "Parse an uploaded file (multimodal support for PDF/images/any format) into structured transactions. File must be uploaded to S3 first.",
  })
  async parseFile(
    @Arg("s3ObjectKey", () => String, {
      nullable: true,
      description: "S3 object key from upload",
    })
    s3ObjectKey: string | undefined,
    @Arg("objectKey", () => String, {
      nullable: true,
      description: "Alias of s3ObjectKey, as the upload URL spells it.",
    })
    objectKey: string | undefined,
    @Arg("receiptObjectKey", () => String, {
      nullable: true,
      description: "Alias of s3ObjectKey, as the insert path spells it.",
    })
    receiptObjectKey: string | undefined,
    @Arg("fileFormat", () => String, {
      description: "File format type (e.g., csv, pdf, xlsx, json, etc.)",
    })
    fileFormat: string,
    @Ctx() ctx: IContext,
  ): Promise<FileParseResult> {
    return this.llm.parseFile(
      ctx.getCurrentIdentity(),
      resolveObjectKey({ objectKey, s3ObjectKey, receiptObjectKey }),
      fileFormat,
      ctx.platform,
    );
  }

  @Authenticated()
  @Mutation(() => ReceiptParseResult, {
    description:
      "Parse a receipt image or PDF and return a single summarized transaction with account recommendations. File must be uploaded to S3 first.",
  })
  async parseReceipt(
    @Arg("s3ObjectKey", () => String, {
      nullable: true,
      description: "S3 object key of the receipt (image or PDF only)",
    })
    s3ObjectKey: string | undefined,
    @Arg("objectKey", () => String, {
      nullable: true,
      description: "Alias of s3ObjectKey, as the upload URL spells it.",
    })
    objectKey: string | undefined,
    @Arg("receiptObjectKey", () => String, {
      nullable: true,
      description: "Alias of s3ObjectKey, as the insert path spells it.",
    })
    receiptObjectKey: string | undefined,
    @Arg("ledgerId", () => String, {
      description:
        "Ledger ID used to fetch available accounts for recommendation",
    })
    ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<ReceiptParseResult> {
    // The ledger-scope check lives in the service now, so every surface that
    // reaches `parseReceipt` gets it — not just this resolver.
    return this.llm.parseReceipt(
      ctx.getCurrentIdentity(),
      resolveObjectKey({ objectKey, s3ObjectKey, receiptObjectKey }),
      ledgerId,
      ctx.platform,
    );
  }
}
