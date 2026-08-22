import { Resolver, Mutation, Query, Arg, Ctx, Authorized } from "type-graphql";
import type { IContext } from "@/server/graphql/context";
import type { IAssetStorageService } from "@/features/s3/service/asset-storage-service";
import {
  TempAssetUploadUrlResponse,
  TempAssetDownloadUrlResponse,
} from "./asset-storage-resolver.types";
import { GraphQLRateLimiter } from "@/shared/graphql-rate-limiter";

@Resolver()
export class AssetStorageResolver {
  private uploadRateLimiter = new GraphQLRateLimiter({
    windowMs: 60 * 1000,
    max: 10,
    message:
      "Too many upload requests. Please wait before uploading more files.",
  });

  constructor(private readonly assetStorage: IAssetStorageService) {}

  @Authorized()
  @Mutation(() => TempAssetUploadUrlResponse)
  async generateTempAssetUploadUrl(
    @Arg("mimeType", () => String, { nullable: true })
    mimeType: string | undefined,
    @Arg("filename", () => String, { nullable: true })
    filename: string | undefined,
    @Ctx() context: IContext,
  ): Promise<TempAssetUploadUrlResponse> {
    this.uploadRateLimiter.check(context);
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
