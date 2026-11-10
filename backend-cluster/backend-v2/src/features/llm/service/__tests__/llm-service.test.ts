import { LLMService } from "../llm-service";
import type { Identity } from "@/server/api/identity";
import { AuthorizationService } from "@/server/api/authorization";

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
  };

  const getObjectMetadata = jest.fn();
  const generateDownloadUrl = jest.fn();
  const usageCheck = jest.fn();

  function makeService() {
    const authorization = new AuthorizationService({
      check: async ({ user, object }) => {
        if (object.startsWith("user:")) return user === object;
        const key = object.slice("temp_asset:".length);
        return (
          object.startsWith("temp_asset:") &&
          key.startsWith(`tmp/${user.slice("user:".length)}/`) &&
          key.length > `tmp/${user.slice("user:".length)}/`.length
        );
      },
    });
    return new LLMService(
      { getApiContext: jest.fn() } as never,
      { getObjectMetadata, generateDownloadUrl } as never,
      { check: usageCheck, addTokenUsage: jest.fn() } as never,
      { blockeden: { accessKey: "test-key" } } as never,
      authorization,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    usageCheck.mockResolvedValue({ allowed: true });
  });

  it("parseFile refuses another tenant's key before touching S3", async () => {
    await expect(
      makeService().parseFile(sessionUser, "tmp/other/statement.csv", "csv"),
    ).rejects.toMatchObject({ category: "NOT_FOUND" });

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
    ).rejects.toMatchObject({ category: "NOT_FOUND" });

    expect(getObjectMetadata).not.toHaveBeenCalled();
  });

  it("parseReceipt refuses another tenant's key before touching S3", async () => {
    await expect(
      makeService().parseReceipt(
        sessionUser,
        "tmp/other/receipt.jpg",
        "alice/a",
      ),
    ).rejects.toMatchObject({ category: "NOT_FOUND" });

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
    ).rejects.toMatchObject({ category: "NOT_FOUND" });

    expect(getObjectMetadata).not.toHaveBeenCalled();
  });
});

// w21/108: any image/* passed, so an iPhone HEIC reached the model and failed
// there as an unreadable receipt.
describe("LLMService receipt formats", () => {
  const user: Identity = {
    userId: "usr_1",
    method: "session",
    scopes: new Set(),
  };
  const getObjectMetadata = jest.fn();
  const generateDownloadUrl = jest.fn();

  function makeService() {
    return new LLMService(
      { getApiContext: jest.fn() } as never,
      { getObjectMetadata, generateDownloadUrl } as never,
      {
        check: jest.fn().mockResolvedValue({ allowed: true }),
        addTokenUsage: jest.fn(),
      } as never,
      { blockeden: { accessKey: "test-key" } } as never,
      new AuthorizationService({ check: async () => true }),
    );
  }

  it("refuses a HEIC with a clear message before the model sees it", async () => {
    getObjectMetadata.mockResolvedValue({ contentType: "image/heic" });
    await expect(
      makeService().parseReceipt(user, "tmp/usr_1/receipt.heic", "alice/a"),
    ).rejects.toMatchObject({
      category: "BAD_USER_INPUT",
      message: expect.stringContaining("JPEG, PNG, GIF, WEBP"),
    });
    expect(generateDownloadUrl).not.toHaveBeenCalled();
  });

  // w1/231: a PUT without a Content-Type stored the JPEG as
  // binary/octet-stream, and the parser refused it as "not an image".
  it.each(["binary/octet-stream", "application/octet-stream", undefined])(
    "reads a JPEG stored as %p by its key's extension",
    async (contentType) => {
      getObjectMetadata.mockResolvedValue({ contentType });
      generateDownloadUrl.mockRejectedValue(new Error("past the gate"));
      await expect(
        makeService().parseReceipt(user, "tmp/usr_1/receipt.jpg", "alice/a"),
      ).rejects.toThrow("past the gate");
    },
  );

  it("names objectKey and the stored type when neither says image", async () => {
    getObjectMetadata.mockResolvedValue({ contentType: "binary/octet-stream" });
    generateDownloadUrl.mockReset();
    await expect(
      makeService().parseReceipt(user, "tmp/usr_1/receipt", "alice/a"),
    ).rejects.toMatchObject({
      category: "BAD_USER_INPUT",
      message:
        "objectKey must name an image (JPEG, PNG, GIF, WEBP) or PDF file; it was uploaded as binary/octet-stream",
      metadata: {
        field: "objectKey",
        hint: expect.stringContaining("uploadHeaders"),
      },
    });
    expect(generateDownloadUrl).not.toHaveBeenCalled();
  });
});

// w21/325: a statement import sent a HEIC to the model too, and it failed as a
// generic parse error; only receipts had the allowlist.
describe("LLMService statement formats", () => {
  const user: Identity = {
    userId: "usr_1",
    method: "session",
    scopes: new Set(),
  };
  const getObjectMetadata = jest.fn();
  const generateDownloadUrl = jest.fn();

  function makeService() {
    return new LLMService(
      { getApiContext: jest.fn() } as never,
      { getObjectMetadata, generateDownloadUrl } as never,
      {
        check: jest.fn().mockResolvedValue({ allowed: true }),
        addTokenUsage: jest.fn(),
      } as never,
      { blockeden: { accessKey: "test-key" } } as never,
      new AuthorizationService({ check: async () => true }),
    );
  }

  beforeEach(() => {
    getObjectMetadata.mockReset();
    generateDownloadUrl.mockReset();
  });

  it.each(["image/heic", "image/heif", "image/tiff", "image/bmp; charset=x"])(
    "refuses %s with the accepted formats, before the model sees it",
    async (contentType) => {
      getObjectMetadata.mockResolvedValue({ contentType });
      await expect(
        makeService().parseFile(user, "tmp/usr_1/statement.heic", "image"),
      ).rejects.toMatchObject({
        category: "BAD_USER_INPUT",
        message: expect.stringContaining("JPEG, PNG, GIF, WEBP"),
      });
      expect(generateDownloadUrl).not.toHaveBeenCalled();
    },
  );

  it.each([
    "text/csv",
    "application/pdf",
    "application/x-ofx",
    "image/jpeg",
    "image/png; charset=binary",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ])("lets %s through to the model as before", async (contentType) => {
    getObjectMetadata.mockResolvedValue({ contentType });
    // Past the format check the service asks for the download URL.
    generateDownloadUrl.mockRejectedValue(new Error("stop here"));
    await expect(
      makeService().parseFile(user, "tmp/usr_1/statement.csv", "csv"),
    ).rejects.toThrow("stop here");
    expect(generateDownloadUrl).toHaveBeenCalled();
  });
});
