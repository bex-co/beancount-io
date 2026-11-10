import { AssetStorageService } from "../service/asset-storage-service";
import { AuthorizationService } from "@/server/api/authorization";
import type { AssetS3Config } from "@/config/config";
import type { Identity } from "@/server/api/identity";

/**
 * w1/231, through the real AWS presigner (offline: signing needs no
 * network). A declared mimeType was not signed, so a PUT could send any
 * type or none, and the URL carried the CRC32 of an empty body, which AWS S3
 * rejects for every non-empty upload.
 */
const config: AssetS3Config = {
  region: "us-east-1",
  bucket: "test-bucket",
  accessKeyId: "test-access-key",
  secretAccessKey: "test-secret",
  endpoint: "https://s3.example.test",
  uploadUrlExpiration: 300,
  downloadUrlExpiration: 600,
};
const identity: Identity = {
  userId: "usr_1",
  method: "session",
  scopes: new Set(),
};
const service = () =>
  new AssetStorageService(
    config,
    new AuthorizationService({ check: async () => true }),
  );

it("signs a declared mimeType and returns it as the header to send", async () => {
  const result = await service().generateUploadUrl(identity, {
    filename: "qa-receipt.jpg",
    mimeType: "image/jpeg",
  });
  const query = new URL(result.uploadUrl).searchParams;
  expect(query.get("X-Amz-SignedHeaders")?.split(";")).toContain(
    "content-type",
  );
  expect(result.uploadHeaders).toEqual({ "Content-Type": "image/jpeg" });
});

it("signs only the host, and returns no header, when no mimeType is given", async () => {
  const result = await service().generateUploadUrl(identity, {
    filename: "qa-receipt.jpg",
  });
  expect(
    new URL(result.uploadUrl).searchParams.get("X-Amz-SignedHeaders"),
  ).toBe("host");
  expect(result.uploadHeaders).toBeUndefined();
});

it("carries no empty-body checksum", async () => {
  const result = await service().generateUploadUrl(identity, {
    mimeType: "text/csv",
  });
  const keys = [...new URL(result.uploadUrl).searchParams.keys()].map((k) =>
    k.toLowerCase(),
  );
  expect(keys.filter((k) => k.startsWith("x-amz-checksum"))).toEqual([]);
  expect(keys).not.toContain("x-amz-sdk-checksum-algorithm");
});
