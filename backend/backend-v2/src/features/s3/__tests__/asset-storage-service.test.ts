import { S3Client } from "@aws-sdk/client-s3";
import {
  AssetStorageService,
  S3_PREFIX_TMP,
  S3_PREFIX_ASSETS,
} from "../service/asset-storage-service";
import type { AssetS3Config } from "@/config/config";
import * as S3Presigner from "@aws-sdk/s3-request-presigner";
import { BadUserInputError } from "@/shared/errors";

// Mock AWS SDK
jest.mock("@aws-sdk/client-s3");
jest.mock("@aws-sdk/s3-request-presigner");

jest.mock("nanoid", () => ({
  nanoid: jest.fn(() => "testnanoi"),
}));

describe("AssetStorageService", () => {
  let mockConfig: AssetS3Config;
  let s3Service: AssetStorageService;

  beforeEach(() => {
    mockConfig = {
      region: "us-east-1",
      bucket: "test-bucket",
      accessKeyId: "test-key",
      secretAccessKey: "test-secret",
      endpoint: "",
      uploadUrlExpiration: 300,
      downloadUrlExpiration: 600,
    };

    // Mock getSignedUrl to return a fake presigned URL
    jest
      .spyOn(S3Presigner, "getSignedUrl")
      .mockResolvedValue(
        "https://s3.amazonaws.com/test-bucket/test-key?signature=abc123",
      );

    s3Service = new AssetStorageService(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("generateUploadUrl", () => {
    it("should generate presigned upload URL with filename", async () => {
      const result = await s3Service.generateUploadUrl({
        filename: "receipt.pdf",
        mimeType: "application/pdf",
      });

      expect(result).toMatchObject({
        uploadUrl: expect.stringContaining(
          "https://s3.amazonaws.com/test-bucket",
        ),
        expiresIn: 300,
        objectKey: expect.stringMatching(
          /^tmp\/\d{4}-\d{2}-\d{2}-testnanoi\.pdf$/,
        ),
      });
    });

    it("should generate upload URL without filename (no extension)", async () => {
      const result = await s3Service.generateUploadUrl({
        filename: undefined,
      });

      expect(result).toMatchObject({
        uploadUrl: expect.stringContaining(
          "https://s3.amazonaws.com/test-bucket",
        ),
        expiresIn: 300,
        objectKey: expect.stringMatching(/^tmp\/\d{4}-\d{2}-\d{2}-testnanoi$/),
      });
    });

    it("should generate upload URL without any params", async () => {
      const result = await s3Service.generateUploadUrl({});

      expect(result.objectKey).toMatch(/^tmp\/\d{4}-\d{2}-\d{2}-testnanoi$/);
    });
  });

  describe("copyTempToPermanent", () => {
    it("should copy tmp object to assets prefix WITHOUT deleting the source", async () => {
      jest.spyOn(S3Client.prototype, "send").mockResolvedValue({} as never);

      const result = await s3Service.copyTempToPermanent({
        objectKey: "tmp/2026-03-30-testnanoi.pdf",
      });

      expect(result).toEqual({
        objectKey: `${S3_PREFIX_ASSETS}/2026-03-30-testnanoi.pdf`,
        filename: "2026-03-30-testnanoi.pdf",
      });
      // Copy only — the source delete is a separate, later step (deleteTempAsset)
      // so a failed dependent write leaves the source intact and retryable.
      expect(S3Client.prototype.send).toHaveBeenCalledTimes(1);
    });

    it("should place file under scope sub-directory when scope is provided", async () => {
      jest.spyOn(S3Client.prototype, "send").mockResolvedValue({} as never);

      const result = await s3Service.copyTempToPermanent({
        objectKey: "tmp/2026-03-30-testnanoi.pdf",
        scope: "user123",
      });

      expect(result).toEqual({
        objectKey: `${S3_PREFIX_ASSETS}/user123/2026-03-30-testnanoi.pdf`,
        filename: "2026-03-30-testnanoi.pdf",
      });
    });

    it("should throw BadUserInputError for non-tmp objectKey", async () => {
      await expect(
        s3Service.copyTempToPermanent({ objectKey: "assets/user123/file.pdf" }),
      ).rejects.toThrow(BadUserInputError);
    });

    it("should throw BadUserInputError for scope with path traversal", async () => {
      await expect(
        s3Service.copyTempToPermanent({
          objectKey: "tmp/2026-01-01-abc12345",
          scope: "../etc",
        }),
      ).rejects.toThrow(BadUserInputError);
    });

    it("should throw BadUserInputError for scope with slash", async () => {
      await expect(
        s3Service.copyTempToPermanent({
          objectKey: "tmp/2026-01-01-abc12345",
          scope: "a/b",
        }),
      ).rejects.toThrow(BadUserInputError);
    });

    it(`should correctly map ${S3_PREFIX_TMP} prefix to ${S3_PREFIX_ASSETS} prefix`, async () => {
      jest.spyOn(S3Client.prototype, "send").mockResolvedValue({} as never);

      const { objectKey } = await s3Service.copyTempToPermanent({
        objectKey: "tmp/2026-01-01-abc12345",
      });

      expect(objectKey).toBe("assets/2026-01-01-abc12345");
    });
  });

  describe("deleteTempAsset", () => {
    it("should delete a tmp object", async () => {
      jest.spyOn(S3Client.prototype, "send").mockResolvedValue({} as never);

      await s3Service.deleteTempAsset("tmp/2026-03-30-testnanoi.pdf");

      expect(S3Client.prototype.send).toHaveBeenCalledTimes(1);
    });

    it("should throw BadUserInputError for non-tmp objectKey", async () => {
      await expect(
        s3Service.deleteTempAsset("assets/user123/file.pdf"),
      ).rejects.toThrow(BadUserInputError);
    });
  });

  describe("generateDownloadUrl", () => {
    it("should generate presigned download URL", async () => {
      const objectKey = "user123/abc123def456";

      const result = await s3Service.generateDownloadUrl(objectKey);

      expect(result).toEqual({
        downloadUrl: expect.stringContaining(
          "https://s3.amazonaws.com/test-bucket",
        ),
        expiresIn: 600,
      });
    });
  });
});
