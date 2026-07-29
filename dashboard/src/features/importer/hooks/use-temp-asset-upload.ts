/**
 * Hook for uploading temporary assets to S3 using presigned URLs
 *
 * This hook handles temporary file uploads (e.g., receipts, invoices for LLM parsing).
 * Files use short-lived presigned URLs and are not meant for permanent storage.
 *
 * Best practice for GraphQL file uploads:
 * 1. Request presigned upload URL from GraphQL API
 * 2. Upload file directly to S3 using presigned URL
 * 3. Use the returned objectKey for further processing
 */

import { useState, useCallback } from "react";
import { useMutation } from "@apollo/client/react";
import { GenerateTempAssetUploadUrlDocument } from "@/graphql/definitions";

export interface TempAssetUploadResult {
  objectKey: string;
  uploadUrl: string;
}

export function useTempAssetUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateUploadUrl] = useMutation(GenerateTempAssetUploadUrlDocument);

  const uploadFile = useCallback(
    async (file: File): Promise<TempAssetUploadResult> => {
      setIsUploading(true);
      setError(null);

      try {
        // Step 1: Request presigned upload URL from GraphQL API
        const result = await generateUploadUrl({
          variables: {
            mimeType: file.type || undefined,
            filename: file.name || undefined,
          },
        });

        const uploadData = result.data?.generateTempAssetUploadUrl;
        if (!uploadData) {
          throw new Error("Failed to generate upload URL");
        }

        const { uploadUrl, objectKey } = uploadData;

        // Step 2: Upload file directly to S3
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(
            `Temporary asset upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`,
          );
        }

        // Step 3: Return objectKey for further processing
        setIsUploading(false);
        return { objectKey, uploadUrl };
      } catch (err) {
        // Keep the raw message for the hook's diagnostic `error` state, but
        // rethrow the original error so callers can classify it (GraphQL
        // extensions, network failures) and map it to a localized message.
        setError(
          err instanceof Error
            ? err.message
            : "Failed to upload temporary asset",
        );
        setIsUploading(false);
        throw err;
      }
    },
    [generateUploadUrl],
  );

  return {
    uploadFile,
    isUploading,
    error,
  };
}
