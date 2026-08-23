import "reflect-metadata";
import { AssetStorageResolver } from "../api/asset-storage-resolver";
import type { IAssetStorageService } from "../service/asset-storage-service";

describe("AssetStorageResolver", () => {
  let resolver: AssetStorageResolver;
  let mockS3Service: jest.Mocked<
    Pick<IAssetStorageService, "generateUploadUrl" | "generateDownloadUrl">
  >;

  beforeEach(() => {
    mockS3Service = {
      generateUploadUrl: jest.fn().mockResolvedValue({
        uploadUrl: "https://s3.amazonaws.com/test-bucket/upload-url",
        objectKey: "tmp/user123/2026-03-30-testnanoi.pdf",
        expiresIn: 300,
      }),
      generateDownloadUrl: jest.fn().mockResolvedValue({
        downloadUrl: "https://s3.amazonaws.com/test-bucket/download-url",
        expiresIn: 600,
      }),
    };

    resolver = new AssetStorageResolver(
      mockS3Service as unknown as IAssetStorageService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("generateTempAssetUploadUrl", () => {
    it("should pass filename and mimeType to service and return result", async () => {
      const result = await resolver.generateTempAssetUploadUrl(
        "application/pdf",
        "invoice.pdf",
      );

      expect(mockS3Service.generateUploadUrl).toHaveBeenCalledWith({
        filename: "invoice.pdf",
        mimeType: "application/pdf",
      });
      expect(result).toEqual({
        uploadUrl: "https://s3.amazonaws.com/test-bucket/upload-url",
        objectKey: "tmp/user123/2026-03-30-testnanoi.pdf",
        expiresIn: 300,
      });
    });

    it("should pass undefined filename when not provided", async () => {
      await resolver.generateTempAssetUploadUrl("application/pdf", undefined);

      expect(mockS3Service.generateUploadUrl).toHaveBeenCalledWith({
        filename: undefined,
        mimeType: "application/pdf",
      });
    });

    it("should pass undefined mimeType and filename when not provided", async () => {
      await resolver.generateTempAssetUploadUrl(undefined, undefined);

      expect(mockS3Service.generateUploadUrl).toHaveBeenCalledWith({
        filename: undefined,
        mimeType: undefined,
      });
    });
  });

  // Rate limiting used to live on this resolver as its own in-process
  // `GraphQLRateLimiter`. w1/m22 replaced it with one Redis-backed limiter
  // shared by all three surfaces; the upload budget survives as an entry in
  // `OP_BUDGETS`, and its behaviour is tested in
  // `src/server/api/__tests__/rate-limit.test.ts`.
});
