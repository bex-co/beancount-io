import "reflect-metadata";
import { AssetStorageResolver } from "../api/asset-storage-resolver";
import type { IAssetStorageService } from "../service/asset-storage-service";
import type { IContext } from "@/server/graphql/context";
import { config } from "@/config/config";

describe("AssetStorageResolver", () => {
  let resolver: AssetStorageResolver;
  let mockContext: IContext;
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

    mockContext = {
      userId: "user123",
      config,
      getCurrentUserId: jest.fn().mockReturnValue("user123"),
    } as unknown as IContext;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("generateTempAssetUploadUrl", () => {
    it("should pass filename and mimeType to service and return result", async () => {
      const result = await resolver.generateTempAssetUploadUrl(
        "application/pdf",
        "invoice.pdf",
        mockContext,
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
      await resolver.generateTempAssetUploadUrl(
        "application/pdf",
        undefined,
        mockContext,
      );

      expect(mockS3Service.generateUploadUrl).toHaveBeenCalledWith({
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

      expect(mockS3Service.generateUploadUrl).toHaveBeenCalledWith({
        filename: undefined,
        mimeType: undefined,
      });
    });
  });

  describe("rate limiting", () => {
    it("should allow up to 10 upload requests per minute", async () => {
      // Make 10 requests - all should succeed
      for (let i = 0; i < 10; i++) {
        await resolver.generateTempAssetUploadUrl(
          "application/pdf",
          "test.pdf",
          mockContext,
        );
      }

      // All 10 requests should have succeeded
      expect(mockS3Service.generateUploadUrl).toHaveBeenCalledTimes(10);
    });

    it("should rate limit after 10 upload requests per minute", async () => {
      // Make 10 requests - all should succeed
      for (let i = 0; i < 10; i++) {
        await resolver.generateTempAssetUploadUrl(
          "application/pdf",
          "test.pdf",
          mockContext,
        );
      }

      // 11th request should throw rate limit error
      await expect(
        resolver.generateTempAssetUploadUrl(
          "application/pdf",
          "test.pdf",
          mockContext,
        ),
      ).rejects.toThrow(
        "Too many upload requests. Please wait before uploading more files.",
      );

      // S3 service should only have been called 10 times (11th was rate limited)
      expect(mockS3Service.generateUploadUrl).toHaveBeenCalledTimes(10);
    });

    it("should rate limit per user independently", async () => {
      const user1Context = {
        ...mockContext,
        userId: "user1",
        getCurrentUserId: jest.fn().mockReturnValue("user1"),
      } as unknown as IContext;
      const user2Context = {
        ...mockContext,
        userId: "user2",
        getCurrentUserId: jest.fn().mockReturnValue("user2"),
      } as unknown as IContext;

      // User 1: Make 10 requests
      for (let i = 0; i < 10; i++) {
        await resolver.generateTempAssetUploadUrl(
          "application/pdf",
          "test.pdf",
          user1Context,
        );
      }

      // User 2: Should still be able to make requests
      const result = await resolver.generateTempAssetUploadUrl(
        "application/pdf",
        "test.pdf",
        user2Context,
      );

      expect(result.objectKey).toBeDefined();
      expect(mockS3Service.generateUploadUrl).toHaveBeenCalledTimes(11);
    });
  });
});
