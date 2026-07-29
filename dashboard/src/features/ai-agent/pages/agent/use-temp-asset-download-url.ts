/**
 * Hook to generate a presigned S3 download URL for a previously uploaded temporary asset.
 *
 * This is a separate query from generateTempAssetUploadUrl (which handles S3 PUT).
 * The download URL is fetched lazily — typically right before passing it to the AI agent
 * as a FileUIPart.url — so the presigned URL is as fresh as possible.
 *
 * Once `yarn codegen` runs (after backend restart), replace the inline gql + manual types
 * with the generated GenerateTempAssetDownloadUrlDocument from @/graphql/definitions.
 */
import { gql } from "@apollo/client";
import { useLazyQuery } from "@apollo/client/react";

// Manual type — matches what codegen will generate once the backend schema is updated.
type GenerateTempAssetDownloadUrlQuery = {
  generateTempAssetDownloadUrl: {
    __typename: "TempAssetDownloadUrl";
    downloadUrl: string;
    expiresIn: number;
  };
};
type GenerateTempAssetDownloadUrlQueryVariables = { objectKey: string };

const GENERATE_TEMP_ASSET_DOWNLOAD_URL = gql`
  query GenerateTempAssetDownloadUrl($objectKey: String!) {
    generateTempAssetDownloadUrl(objectKey: $objectKey) {
      downloadUrl
      expiresIn
    }
  }
`;

export function useTempAssetDownloadUrl() {
  const [getDownloadUrl] = useLazyQuery<
    GenerateTempAssetDownloadUrlQuery,
    GenerateTempAssetDownloadUrlQueryVariables
  >(GENERATE_TEMP_ASSET_DOWNLOAD_URL, {
    fetchPolicy: "no-cache", // always fetch a fresh presigned URL
  });

  const fetchDownloadUrl = async (objectKey: string): Promise<string> => {
    const result = await getDownloadUrl({ variables: { objectKey } });
    const url = result.data?.generateTempAssetDownloadUrl?.downloadUrl;
    if (!url) throw new Error("Failed to get download URL for attachment");
    return url;
  };

  return { fetchDownloadUrl };
}
