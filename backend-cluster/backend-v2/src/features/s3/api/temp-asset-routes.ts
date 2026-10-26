import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import { resolveObjectKey } from "@/features/ledger/utils/object-key-alias";

export const tempAssetUploadInput = z
  .object({
    filename: z.string().nullish(),
    mimeType: z.string().nullish(),
  })
  .strict();
export const tempAssetDownloadQuery = z
  .object({
    objectKey: z.string().optional(),
    // Twins (w23/m11/t002): every key spelling works at every input.
    s3ObjectKey: z
      .string()
      .optional()
      .describe("Alias of objectKey, as the parse routes spell it."),
    receiptObjectKey: z
      .string()
      .optional()
      .describe("Alias of objectKey, as the insert path spells it."),
  })
  .strict();
export const tempAssetUploadResult = z.object({
  uploadUrl: z.string(),
  objectKey: z.string(),
  expiresIn: z.number(),
});
const tempAssetDownloadResult = z.object({
  downloadUrl: z.string(),
  expiresIn: z.number(),
});

export const TEMP_ASSET_ROUTES = [
  v1Route({
    method: "post",
    path: "/api-gateway/v1/temp-assets/upload-url",
    summary: "Create a temporary asset upload URL",
    description:
      "Presign a PUT with optional filename and MIME type. The current user owns the generated key; expiresIn is seconds. No preview.",
    body: tempAssetUploadInput.default({}),
    responses: {
      200: json(
        "Upload URL, uploader-owned object key, and lifetime in seconds",
        tempAssetUploadResult,
      ),
    },
    handler: async ({ layers }, { identity, body }) =>
      layers.services.assetStorage.generateUploadUrl(identity, {
        filename: body.filename ?? undefined,
        mimeType: body.mimeType ?? undefined,
      }),
  }),
  v1Route({
    method: "get",
    path: "/api-gateway/v1/temp-assets/download-url",
    summary: "Create a download URL for the caller's temporary asset",
    description:
      "Authorize ownership of objectKey and presign a GET using the configured download lifetime. No ledger selector is required.",
    query: tempAssetDownloadQuery,
    responses: {
      200: json(
        "Download URL and lifetime in seconds",
        tempAssetDownloadResult,
      ),
    },
    handler: async ({ layers }, { identity, query }) =>
      layers.services.assetStorage.generateTempDownloadUrl(
        identity,
        resolveObjectKey(query),
      ),
  }),
];
