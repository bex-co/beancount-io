import { Resolver, Mutation, Query, Arg, Authorized } from "type-graphql";
import type { IAssetStorageService } from "@/features/s3/service/asset-storage-service";
import {
  TempAssetUploadUrlResponse,
  TempAssetDownloadUrlResponse,
} from "./asset-storage-resolver.types";

@Resolver()
export class AssetStorageResolver {
  constructor(private readonly assetStorage: IAssetStorageService) {}

  @Authorized()
  @Mutation(() => TempAssetUploadUrlResponse)
  async generateTempAssetUploadUrl(
    @Arg("mimeType", () => String, { nullable: true })
    mimeType: string | undefined,
    @Arg("filename", () => String, { nullable: true })
    filename: string | undefined,
  ): Promise<TempAssetUploadUrlResponse> {
    return this.assetStorage.generateUploadUrl({ filename, mimeType });
  }

  @Authorized()
  @Query(() => TempAssetDownloadUrlResponse, {
    description:
      "Generate a presigned download URL for a previously uploaded temporary asset. Use this to obtain a short-lived GET URL for an objectKey returned by generateTempAssetUploadUrl.",
  })
  async generateTempAssetDownloadUrl(
    @Arg("objectKey", () => String, {
      description: "S3 object key returned by generateTempAssetUploadUrl",
    })
    objectKey: string,
  ): Promise<TempAssetDownloadUrlResponse> {
    return this.assetStorage.generateDownloadUrl(objectKey);
  }
}
