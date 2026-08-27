import { LLMService } from "../llm-service";
import type { Identity } from "@/server/api/identity";
import { ForbiddenError } from "@/shared/errors";

/**
 * The parse verbs turn a caller-supplied S3 key into object metadata plus a
 * presigned read handed to the LLM — the key is the only authorization on
 * that path, so these tests pin the uploader-ownership check in front of
 * every S3 call. The ledger-scope side of the same verbs is covered by
 * `llm-service-scope.test.ts`; a session identity is used here so the scope
 * gate passes and only the key ownership can be what refuses.
 */
describe("LLMService temp-asset ownership", () => {
  const sessionUser: Identity = {
    userId: "usr_1",
    method: "session",
    scopes: new Set(),
    capabilityExempt: true,
  };

  const getObjectMetadata = jest.fn();
  const generateDownloadUrl = jest.fn();
  const usageCheck = jest.fn();

  function makeService() {
    return new LLMService(
      { getApiContext: jest.fn() } as never,
      { getObjectMetadata, generateDownloadUrl } as never,
      { check: usageCheck, addTokenUsage: jest.fn() } as never,
      { blockeden: { accessKey: "test-key" } } as never,
      {} as never,
      {} as never,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    usageCheck.mockResolvedValue({ allowed: true });
  });

  it("parseFile refuses another tenant's key before touching S3", async () => {
    await expect(
      makeService().parseFile(sessionUser, "tmp/other/statement.csv", "csv"),
    ).rejects.toThrow(ForbiddenError);

    expect(getObjectMetadata).not.toHaveBeenCalled();
    expect(generateDownloadUrl).not.toHaveBeenCalled();
  });

  it("parseFile refuses an ownerless (pre-binding) key", async () => {
    await expect(
      makeService().parseFile(
        sessionUser,
        "tmp/2026-01-01-statement.csv",
        "csv",
      ),
    ).rejects.toThrow(ForbiddenError);

    expect(getObjectMetadata).not.toHaveBeenCalled();
  });

  it("parseReceipt refuses another tenant's key before touching S3", async () => {
    await expect(
      makeService().parseReceipt(
        sessionUser,
        "tmp/other/receipt.jpg",
        "alice/a",
      ),
    ).rejects.toThrow(ForbiddenError);

    expect(getObjectMetadata).not.toHaveBeenCalled();
    expect(generateDownloadUrl).not.toHaveBeenCalled();
  });

  it("parseReceipt refuses a permanent-asset key", async () => {
    await expect(
      makeService().parseReceipt(
        sessionUser,
        "assets/repo_42/receipt.jpg",
        "alice/a",
      ),
    ).rejects.toThrow(ForbiddenError);

    expect(getObjectMetadata).not.toHaveBeenCalled();
  });
});
