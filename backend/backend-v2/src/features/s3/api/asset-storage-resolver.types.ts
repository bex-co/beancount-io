import { ObjectType, Field } from "type-graphql";

/**
 * Response type for temporary asset upload URL generation
 */
@ObjectType("TempAssetUploadUrl")
export class TempAssetUploadUrlResponse {
  @Field()
  uploadUrl!: string;

  @Field()
  objectKey!: string;

  @Field()
  expiresIn!: number;
}

/**
 * Response type for temporary asset download URL generation
 */
@ObjectType("TempAssetDownloadUrl")
export class TempAssetDownloadUrlResponse {
  @Field()
  downloadUrl!: string;

  @Field()
  expiresIn!: number;
}
