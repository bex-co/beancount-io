import { ObjectType, Field } from "type-graphql";
import { GraphQLJSONObject } from "graphql-scalars";

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

  @Field(() => GraphQLJSONObject, {
    nullable: true,
    description:
      "Headers the PUT must send; present when mimeType was given, which the URL signs.",
  })
  uploadHeaders?: { "Content-Type": string };
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
