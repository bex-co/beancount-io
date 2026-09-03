import "reflect-metadata";
import { AssetStorageResolver } from "../api/asset-storage-resolver";
import type { IAssetStorageService } from "../service/asset-storage-service";
import type { IContext } from "@/server/graphql/context";
import type { Identity } from "@/server/api/identity";

describe("AssetStorageResolver", () => {
  let resolver: AssetStorageResolver;
  let mockS3Service: jest.Mocked<
    Pick<
      IAssetStorageService,
      "generateUploadUrl" | "generateDownloadUrl" | "generateTempDownloadUrl"
    >
  >;
  let mockContext: IContext;
  const identity: Identity = {
    userId: "user123",
    method: "session",
    scopes: new Set(),
  };

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
      generateTempDownloadUrl: jest.fn().mockResolvedValue({
        downloadUrl: "https://s3.amazonaws.com/test-bucket/download-url",
        expiresIn: 600,
      }),
    };

    mockContext = {
      getCurrentUserId: jest.fn().mockReturnValue("user123"),
      getCurrentIdentity: jest.fn().mockReturnValue(identity),
    } as unknown as IContext;

    resolver = new AssetStorageResolver(
      mockS3Service as unknown as IAssetStorageService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("generateTempAssetUploadUrl", () => {
    it("should bind the session user as the upload owner", async () => {
      const result = await resolver.generateTempAssetUploadUrl(
        "application/pdf",
        "invoice.pdf",
        mockContext,
      );

      expect(mockS3Service.generateUploadUrl).toHaveBeenCalledWith(identity, {
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
      await resolver.generateTempAssetUploadUrl(
        "application/pdf",
        undefined,
        mockContext,
      );

      expect(mockS3Service.generateUploadUrl).toHaveBeenCalledWith(identity, {
        filename: undefined,
        mimeType: "application/pdf",
      });
    });

    it("should pass undefined mimeType and filename when not provided", async () => {
      await resolver.generateTempAssetUploadUrl(
        undefined,
        undefined,
        mockContext,
      );

      expect(mockS3Service.generateUploadUrl).toHaveBeenCalledWith(identity, {
        filename: undefined,
        mimeType: undefined,
      });
    });
  });

  describe("generateTempAssetDownloadUrl", () => {
    it("should delegate to the ownership-checked temp presign with the session user", async () => {
      const result = await resolver.generateTempAssetDownloadUrl(
        "tmp/user123/2026-03-30-testnanoi.pdf",
        mockContext,
      );

      expect(mockS3Service.generateTempDownloadUrl).toHaveBeenCalledWith(
        identity,
        "tmp/user123/2026-03-30-testnanoi.pdf",
      );
      // The unrestricted presign takes arbitrary bucket keys with no
      // ownership check — it must not be this resolver's path.
      expect(mockS3Service.generateDownloadUrl).not.toHaveBeenCalled();
      expect(result).toEqual({
        downloadUrl: "https://s3.amazonaws.com/test-bucket/download-url",
        expiresIn: 600,
      });
    });
  });

  // Rate limiting used to live on this resolver as its own in-process
  // `GraphQLRateLimiter`. w1/m22 replaced it with one Redis-backed limiter
  // shared by all three surfaces; the upload budget survives as an entry in
  // `OP_BUDGETS`, and its behaviour is tested in
  // `src/server/api/__tests__/rate-limit.test.ts`.
});
