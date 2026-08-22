import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { extname } from "path";
import { nanoid } from "nanoid";
import type { AssetS3Config } from "@/config/config";
import { BadUserInputError } from "@/shared/errors";

export const S3_PREFIX_TMP = "tmp";
export const S3_PREFIX_ASSETS = "assets";

/** Build the S3 object key for a ledger repo asset: assets/repo_{repoId}/{filename} */
export function buildLedgerRepoAssetKey(
  repoId: number,
  filename: string,
): string {
  return `${S3_PREFIX_ASSETS}/repo_${repoId}/${filename}`;
}

/**
 * AssetStorageService - Object-storage gateway for assets in S3.
 *
 * Accepts an AssetS3Config directly, allowing the same class to be used
 * for both temporary and permanent S3 buckets.
 */
export type CopyTempToPermanentInput = {
  objectKey: string;
  /** Optional sub-directory inserted between assets/ and the filename. */
  scope?: string;
};

export type CopyTempToPermanentOutput = {
  /** The new permanent object key under assets/. */
  objectKey: string;
  /** The filename portion (the path relative to the tmp/ prefix). */
  filename: string;
};

export type GenerateUploadUrlInput = {
  filename?: string;
  mimeType?: string;
};

export type GenerateUploadUrlOutput = {
  uploadUrl: string;
  objectKey: string;
  expiresIn: number;
};

export interface IAssetStorageService {
  generateUploadUrl(
    params: GenerateUploadUrlInput,
  ): Promise<GenerateUploadUrlOutput>;
  /**
   * Copy a temporary object to permanent storage. Idempotent: re-running with
   * the same input overwrites the destination. Does NOT delete the source —
   * call {@link deleteTempAsset} only after the dependent write has committed.
   */
  copyTempToPermanent(
    params: CopyTempToPermanentInput,
  ): Promise<CopyTempToPermanentOutput>;
  /** Delete a temporary object (must live under the tmp/ prefix). */
  deleteTempAsset(objectKey: string): Promise<void>;
  generateDownloadUrl(objectKey: string): Promise<{
    downloadUrl: string;
    expiresIn: number;
  }>;
  getObjectMetadata(objectKey: string): Promise<{
    contentType?: string;
    contentLength?: number;
    lastModified?: Date;
  }>;
}

export class AssetStorageService implements IAssetStorageService {
  private s3Client: S3Client;

  constructor(private config: AssetS3Config) {
    this.s3Client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  /**
   * Generate presigned upload URL
   *
   * Generates a unique objectKey under the tmp/ prefix:
   * tmp/{year}-{month}-{day}-{nanoid(8)}{.ext}
   *
   * @param params - Optional filename and mimeType
   * @returns Presigned upload URL, generated objectKey, and expiry
   */
  async generateUploadUrl(
    params: GenerateUploadUrlInput,
  ): Promise<GenerateUploadUrlOutput> {
    const ext = extname(params.filename ?? "");
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const objectKey = `${S3_PREFIX_TMP}/${year}-${month}-${day}-${nanoid(8)}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: objectKey,
      ContentType: params.mimeType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: this.config.uploadUrlExpiration,
    });

    return {
      uploadUrl,
      objectKey,
      expiresIn: this.config.uploadUrlExpiration,
    };
  }

  /**
   * Copy a temporary object to permanent storage.
   *
   * Copies from tmp/{path} to assets/{scope}/{path} (scope is optional). This is
   * idempotent — re-running overwrites the destination — and does NOT delete the
   * source. Callers must invoke {@link deleteTempAsset} only after the dependent
   * write (e.g. a ledger entry) has committed, so a failure leaves the source
   * intact and the whole operation safely retryable.
   *
   * @param objectKey - Must start with "tmp/"
   * @param scope - Optional sub-directory; must contain only alphanumeric, hyphen, or underscore characters
   * @returns The new permanent objectKey under assets/ and its filename
   */
  async copyTempToPermanent(
    params: CopyTempToPermanentInput,
  ): Promise<CopyTempToPermanentOutput> {
    const { objectKey, scope } = params;

    if (!objectKey.startsWith(`${S3_PREFIX_TMP}/`)) {
      throw new BadUserInputError(
        `objectKey must start with "${S3_PREFIX_TMP}/"`,
      );
    }

    if (scope !== undefined && !/^[a-zA-Z0-9_-]+$/.test(scope)) {
      throw new BadUserInputError(
        `scope must contain only alphanumeric, hyphen, or underscore characters`,
      );
    }

    const relativePath = objectKey.slice(`${S3_PREFIX_TMP}/`.length);
    const newObjectKey = scope
      ? `${S3_PREFIX_ASSETS}/${scope}/${relativePath}`
      : `${S3_PREFIX_ASSETS}/${relativePath}`;

    await this.s3Client.send(
      new CopyObjectCommand({
        Bucket: this.config.bucket,
        CopySource: `${this.config.bucket}/${objectKey}`,
        Key: newObjectKey,
      }),
    );

    return {
      objectKey: newObjectKey,
      filename: relativePath,
    };
  }

  /**
   * Delete a temporary object. Intended to be called after the copy has been
   * promoted and the dependent write has committed, so an earlier failure never
   * destroys a still-needed source object.
   *
   * @param objectKey - Must start with "tmp/"
   */
  async deleteTempAsset(objectKey: string): Promise<void> {
    if (!objectKey.startsWith(`${S3_PREFIX_TMP}/`)) {
      throw new BadUserInputError(
        `objectKey must start with "${S3_PREFIX_TMP}/"`,
      );
    }

    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: objectKey,
      }),
    );
  }

  /**
   * Generate presigned download URL
   *
   * @param objectKey - S3 object key
   * @returns Presigned download URL
   */
  async generateDownloadUrl(objectKey: string): Promise<{
    downloadUrl: string;
    expiresIn: number;
  }> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: objectKey,
    });

    const downloadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: this.config.downloadUrlExpiration,
    });

    return {
      downloadUrl,
      expiresIn: this.config.downloadUrlExpiration,
    };
  }

  /**
   * Get object metadata including content type
   *
   * @param objectKey - S3 object key
   * @returns Object metadata including contentType
   */
  async getObjectMetadata(objectKey: string): Promise<{
    contentType?: string;
    contentLength?: number;
    lastModified?: Date;
  }> {
    const command = new HeadObjectCommand({
      Bucket: this.config.bucket,
      Key: objectKey,
    });

    const response = await this.s3Client.send(command);

    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
    };
  }
}
