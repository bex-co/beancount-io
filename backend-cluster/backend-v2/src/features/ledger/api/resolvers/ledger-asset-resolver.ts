/**
 * GraphQL resolver for ledger asset access.
 * Delegates permission checks and URL generation to LedgerAssetService.
 */

import {
  Arg,
  Ctx,
  Field,
  Int,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import { IContext } from "@/server/graphql/context";
import { BadUserInputError } from "@/shared/errors";
import type { ILedgerAssetService } from "@/features/ledger/service/ledger-asset-service";

@ObjectType()
export class LedgerAssetDownloadUrlResult {
  @Field(() => String)
  downloadUrl: string;
}

@Resolver()
export class LedgerAssetQueryResolver {
  constructor(private readonly assetService: ILedgerAssetService) {}

  @Query(() => LedgerAssetDownloadUrlResult, {
    description:
      "Get a presigned S3 download URL for a ledger asset. Validates ledger access — public ledgers require no auth; private ledgers require a valid session.",
  })
  async getLedgerAssetDownloadUrl(
    @Arg("ledgerRepoId", () => Int) ledgerRepoId: number,
    @Arg("filename", () => String) filename: string,
    @Ctx() ctx: IContext,
  ): Promise<LedgerAssetDownloadUrlResult> {
    if (!Number.isInteger(ledgerRepoId) || ledgerRepoId <= 0) {
      throw new BadUserInputError("Invalid ledgerRepoId");
    }

    const downloadUrl = await this.assetService.getAssetDownloadUrl(
      ledgerRepoId,
      filename,
      ctx.identity,
    );
    return { downloadUrl };
  }

  @Query(() => LedgerAssetDownloadUrlResult, {
    description:
      "Get a downloadable URL for a ledger Git archive (main.zip). " +
      "Authenticated callers receive a single-use, 60-second ticket URL; " +
      "public ledgers are readable without auth.",
  })
  async getLedgerArchiveDownloadUrl(
    @Arg("ledgerId", () => String) ledgerId: string,
    @Ctx() ctx: IContext,
  ): Promise<LedgerAssetDownloadUrlResult> {
    const downloadUrl = await this.assetService.getLedgerArchiveDownloadUrl(
      ledgerId,
      ctx.identity,
    );
    return { downloadUrl };
  }
}
