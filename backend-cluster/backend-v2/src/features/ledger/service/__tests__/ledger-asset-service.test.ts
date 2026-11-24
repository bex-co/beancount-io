import { LedgerAssetService } from "../ledger-asset-service";
import { authorizeLedger } from "@/features/ledger/utils/authorize-ledger";
import type { Identity } from "@/server/api/identity";
import {
  BadUserInputError,
  NotFoundError,
  ForbiddenError,
} from "@/shared/errors";

// Exercises this service's own behavior; authorizeLedger has its own suite.
jest.mock("@/features/ledger/utils/authorize-ledger", () => ({
  ...jest.requireActual("@/features/ledger/utils/authorize-ledger"),
  authorizeLedger: jest.fn(),
}));

const mockGetLedgerByRepoId = jest.fn();
const mockGetLedger = jest.fn();

const mockFavaClientFactory = {
  getAdminClient: () => ({
    admin: { getLedgerByRepoId: mockGetLedgerByRepoId },
    ledgers: { getLedger: mockGetLedger },
  }),
};

const mockAssetStorage = {
  generateDownloadUrl: jest
    .fn()
    .mockResolvedValue({ downloadUrl: "https://s3.example/signed" }),
};

const mockConfig = {
  // w23/023: the backend's own host differs from the public origin; the URL
  // must name the origin MCP tokens are minted for, never this one.
  server: { url: "https://api.v3.example.invalid" },
  oauth: { issuer: "https://beancount.io/" },
};

const IDENTITY: Identity = {
  userId: "alice",
  method: "oauth",
  scopes: new Set(["ledger.read"]),
};

describe("LedgerAssetService", () => {
  let service: LedgerAssetService;

  beforeEach(() => {
    jest.clearAllMocks();
    (authorizeLedger as jest.Mock).mockResolvedValue({
      ledgerRepoId: 1,
      ownerUserId: "alice",
    });
    service = new LedgerAssetService(
      mockFavaClientFactory as any,
      mockAssetStorage as any,
      mockConfig as any,
      {} as any,
    );
  });

  describe("getAssetDownloadUrl", () => {
    it("resolves the repoId to a ledgerId, authorizes as read, then signs the URL", async () => {
      mockGetLedgerByRepoId.mockResolvedValue({
        data: { success: true, data: { id: 42, full_name: "alice/personal" } },
      });

      const url = await service.getAssetDownloadUrl(
        42,
        "receipt.png",
        IDENTITY,
      );

      expect(authorizeLedger).toHaveBeenCalledWith(
        IDENTITY,
        "alice/personal",
        "ledger.files.read",
        expect.anything(),
      );
      expect(url).toBe("https://s3.example/signed");
    });

    it("throws NotFoundError when the repoId does not resolve", async () => {
      mockGetLedgerByRepoId.mockResolvedValue({ data: { success: false } });
      await expect(
        service.getAssetDownloadUrl(999, "x.png", IDENTITY),
      ).rejects.toThrow(NotFoundError);
      expect(authorizeLedger).not.toHaveBeenCalled();
    });

    it("propagates a denial from authorizeLedger without signing a URL", async () => {
      mockGetLedgerByRepoId.mockResolvedValue({
        data: { success: true, data: { id: 42, full_name: "alice/personal" } },
      });
      (authorizeLedger as jest.Mock).mockRejectedValue(
        new ForbiddenError("no"),
      );

      await expect(
        service.getAssetDownloadUrl(42, "x.png", undefined),
      ).rejects.toThrow(ForbiddenError);
      expect(mockAssetStorage.generateDownloadUrl).not.toHaveBeenCalled();
    });

    it.each([
      ["spaces only", "   "],
      ["tab only", "\t"],
      ["CRLF only", "\r\n"],
      ["leading whitespace-only segment", " /a.pdf"],
      ["trailing whitespace-only segment", "dir/  "],
      ["inner whitespace-only segment", "dir/   /a.pdf"],
      ["LF control character", "a\nb.pdf"],
      ["CRLF control characters", "a\r\nb.pdf"],
      ["tab control character", "a\tb.pdf"],
      ["ASCII 0x01 control character", "a\x01b.pdf"],
      ["ASCII 0x1f control character", "a\x1fb.pdf"],
      ["DEL control character", "a\x7fb.pdf"],
      ["C1 0x80 control character", "a\x80b.pdf"],
      ["C1 0x9f control character", "a\x9fb.pdf"],
      ["Unicode line separator", "a\u2028b.pdf"],
      ["Unicode paragraph separator", "a\u2029b.pdf"],
    ])(
      "rejects %s filename before ledger lookup, authorization, or signing",
      async (_label, badFilename) => {
        await expect(
          service.getAssetDownloadUrl(42, badFilename, IDENTITY),
        ).rejects.toMatchObject({
          category: "BAD_USER_INPUT",
          metadata: { field: "filename" },
        });
        await expect(
          service.getAssetDownloadUrl(42, badFilename, IDENTITY),
        ).rejects.toBeInstanceOf(BadUserInputError);
        expect(mockGetLedgerByRepoId).not.toHaveBeenCalled();
        expect(authorizeLedger).not.toHaveBeenCalled();
        expect(mockAssetStorage.generateDownloadUrl).not.toHaveBeenCalled();
      },
    );

    it.each([
      "2026/receipt.pdf",
      "my receipt.pdf",
      "receipt#1.pdf",
      "レシート.pdf",
    ])(
      "preserves valid asset filename %s and presigns its S3 key",
      async (validFilename) => {
        mockGetLedgerByRepoId.mockResolvedValue({
          data: {
            success: true,
            data: { id: 42, full_name: "alice/personal" },
          },
        });

        const url = await service.getAssetDownloadUrl(
          42,
          validFilename,
          IDENTITY,
        );

        expect(url).toBe("https://s3.example/signed");
        expect(mockAssetStorage.generateDownloadUrl).toHaveBeenCalledWith(
          `assets/repo_42/${validFilename}`,
        );
      },
    );
  });

  describe("getLedgerArchiveDownloadUrl", () => {
    it("returns the stable v1 URL for an authenticated caller without embedding a credential", async () => {
      mockGetLedger.mockResolvedValue({
        data: { success: true, data: { private: true } },
      });

      const url = await service.getLedgerArchiveDownloadUrl(
        "alice/personal",
        IDENTITY,
      );

      expect(authorizeLedger).toHaveBeenCalledWith(
        IDENTITY,
        "alice/personal",
        "ledger.archive.read",
        expect.anything(),
      );
      expect(url).toBe(
        "https://beancount.io/api-gateway/v1/ledgers/alice/personal/archive/main.zip",
      );
      expect(url).not.toContain("ticket=");
      expect(url).not.toContain("token=");
    });

    it("returns a credential-free legacy URL, ledgerId encoded, for an anonymous public read", async () => {
      mockGetLedger.mockResolvedValue({
        data: { success: true, data: { private: false } },
      });

      const url = await service.getLedgerArchiveDownloadUrl(
        "alice/personal",
        undefined,
      );

      expect(url).toBe(
        "https://beancount.io/api-gateway/ledgers/alice%2Fpersonal/archive/main.zip",
      );
    });

    it("denies before returning a URL when authorizeLedger rejects", async () => {
      mockGetLedger.mockResolvedValue({
        data: { success: true, data: { private: true } },
      });
      (authorizeLedger as jest.Mock).mockRejectedValue(
        new ForbiddenError("no"),
      );

      await expect(
        service.getLedgerArchiveDownloadUrl("alice/personal", IDENTITY),
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
