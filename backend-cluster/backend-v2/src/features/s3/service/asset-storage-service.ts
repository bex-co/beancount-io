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
import { BadUserInputError, ForbiddenError } from "@/shared/errors";

export const S3_PREFIX_TMP = "tmp";
export const S3_PREFIX_ASSETS = "assets";

// Uploaders are addressed by one path segment: user ids are ObjectId hex or
// prefixed base58 nanoids, so this charset covers every shape without
// admitting separators that would break out of the segment.
const OWNER_ID_RE = /^[A-Za-z0-9_-]+$/;

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
  /** Uploader binding: embedded in the key and enforced at every read. */
  ownerId: string;
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
  /**
   * Presign a GET for a temporary asset after verifying the caller owns it.
   * The only presign path that accepts a caller-supplied key without a
   * ledger-authorization seam in front of it, so ownership is checked here.
   */
  generateTempDownloadUrl(
    objectKey: string,
    ownerId: string,
  ): Promise<{
    downloadUrl: string;
    expiresIn: number;
  }>;
  getObjectMetadata(objectKey: string): Promise<{
    contentType?: string;
    contentLength?: number;
    lastModified?: Date;
  }>;
}

/**
 * Assert that a caller-supplied object key is a temporary asset uploaded by
 * the named user.
 *
 * Temp keys are capabilities: `tmp/{ownerId}/{filename}` with no separate
 * ownership record. Every boundary that accepts a key from a caller — temp
 * download URL minting, LLM parsing, receipt promotion — must call this before
 * touching S3, or the key alone authorizes reading another tenant's uploads
 * (and, for non-tmp keys, their permanent assets).
 *
 * @throws ForbiddenError when the key is not under `tmp/{ownerId}/`
 */
export function assertTempAssetOwnership(
  objectKey: string,
  ownerId: string,
): void {
  const expected = `${S3_PREFIX_TMP}/${ownerId}/`;
  if (!objectKey.startsWith(expected) || objectKey.length === expected.length) {
    throw new ForbiddenError(
      "Temporary asset not owned by the caller",
      "asset",
    );
  }
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
   * Generates a unique objectKey bound to the uploader under the tmp/ prefix:
   * tmp/{ownerId}/{year}-{month}-{day}-{nanoid(8)}{.ext}
   *
   * @param params - Owner id plus optional filename and mimeType
   * @returns Presigned upload URL, generated objectKey, and expiry
   */
  async generateUploadUrl(
    params: GenerateUploadUrlInput,
  ): Promise<GenerateUploadUrlOutput> {
    const { ownerId } = params;
    if (!OWNER_ID_RE.test(ownerId)) {
      throw new BadUserInputError("ownerId must be a single path segment");
    }

    const ext = extname(params.filename ?? "");
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const objectKey = `${S3_PREFIX_TMP}/${ownerId}/${year}-${month}-${day}-${nanoid(8)}${ext}`;

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
    // Temp keys embed the uploader as their first segment
    // (tmp/{ownerId}/{filename}). The owner is addressing, not content, so it
    // never becomes part of the permanent key or the served filename; keys
    // without the segment (minted before owner binding) pass through whole.
    const filename = relativePath.slice(relativePath.indexOf("/") + 1);
    const newObjectKey = scope
      ? `${S3_PREFIX_ASSETS}/${scope}/${filename}`
      : `${S3_PREFIX_ASSETS}/${filename}`;

    await this.s3Client.send(
      new CopyObjectCommand({
        Bucket: this.config.bucket,
        CopySource: `${this.config.bucket}/${objectKey}`,
        Key: newObjectKey,
      }),
    );

    return {
      objectKey: newObjectKey,
      filename,
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

  async generateTempDownloadUrl(
    objectKey: string,
    ownerId: string,
  ): Promise<{
    downloadUrl: string;
    expiresIn: number;
  }> {
    assertTempAssetOwnership(objectKey, ownerId);
    return this.generateDownloadUrl(objectKey);
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
