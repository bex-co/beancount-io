import { Resolver, Mutation, Query, Arg, Ctx } from "type-graphql";
import { Authenticated } from "@/server/graphql/authenticated";
import { IContext } from "@/server/graphql/context";
import type { IAssetStorageService } from "@/features/s3/service/asset-storage-service";
import {
  TempAssetUploadUrlResponse,
  TempAssetDownloadUrlResponse,
} from "./asset-storage-resolver.types";

@Resolver()
export class AssetStorageResolver {
  constructor(private readonly assetStorage: IAssetStorageService) {}

  @Authenticated()
  @Mutation(() => TempAssetUploadUrlResponse)
  async generateTempAssetUploadUrl(
    @Arg("mimeType", () => String, { nullable: true })
    mimeType: string | undefined,
    @Arg("filename", () => String, { nullable: true })
    filename: string | undefined,
    @Ctx() ctx: IContext,
  ): Promise<TempAssetUploadUrlResponse> {
    // The uploader is bound into the object key; the session supplies it, so a
    // key can never be minted under another user's scope.
    return this.assetStorage.generateUploadUrl(ctx.getCurrentIdentity(), {
      filename,
      mimeType,
    });
  }

  @Authenticated()
  @Query(() => TempAssetDownloadUrlResponse, {
    description:
      "Generate a presigned download URL for a temporary asset uploaded by the current user. Foreign, malformed, and permanent keys are not exposed.",
  })
  async generateTempAssetDownloadUrl(
    @Arg("objectKey", () => String, {
      description: "S3 object key returned by generateTempAssetUploadUrl",
    })
    objectKey: string,
    @Ctx() ctx: IContext,
  ): Promise<TempAssetDownloadUrlResponse> {
    // Ownership is enforced in the service: only tmp/ keys uploaded by the
    // caller can be presigned, never another tenant's or a permanent asset.
    return this.assetStorage.generateTempDownloadUrl(
      ctx.getCurrentIdentity(),
      objectKey,
    );
  }
}
