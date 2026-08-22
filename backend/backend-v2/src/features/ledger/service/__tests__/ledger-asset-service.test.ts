import { LedgerAssetService } from "../ledger-asset-service";
import { authorizeLedger } from "@/features/ledger/utils/authorize-ledger";
import type { Identity } from "@/server/api/identity";
import { NotFoundError, ForbiddenError } from "@/shared/errors";

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
  generateDownloadUrl: jest.fn().mockResolvedValue({ downloadUrl: "https://s3.example/signed" }),
};

const mockConfig = { server: { url: "https://beancount.io/" } };

const IDENTITY: Identity = {
  userId: "alice",
  method: "oauth",
  scopes: new Set(["ledger.read"]),
  capabilityExempt: false,
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
      {} as any,
      {} as any,
      mockAssetStorage as any,
      mockConfig as any,
    );
  });

  describe("getAssetDownloadUrl", () => {
    it("resolves the repoId to a ledgerId, authorizes as read, then signs the URL", async () => {
      mockGetLedgerByRepoId.mockResolvedValue({
        data: { success: true, data: { id: 42, full_name: "alice/personal" } },
      });

      const url = await service.getAssetDownloadUrl(42, "receipt.png", IDENTITY);

      expect(authorizeLedger).toHaveBeenCalledWith(
        IDENTITY,
        "alice/personal",
        "read",
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
      (authorizeLedger as jest.Mock).mockRejectedValue(new ForbiddenError("no"));

      await expect(
        service.getAssetDownloadUrl(42, "x.png", undefined),
      ).rejects.toThrow(ForbiddenError);
      expect(mockAssetStorage.generateDownloadUrl).not.toHaveBeenCalled();
    });
  });

  describe("getLedgerArchiveDownloadUrl", () => {
    it("appends the token only for a private ledger", async () => {
      mockGetLedger.mockResolvedValue({
        data: { success: true, data: { private: true } },
      });

      const url = await service.getLedgerArchiveDownloadUrl(
        "alice/personal",
        IDENTITY,
        "dl-token",
      );

      expect(authorizeLedger).toHaveBeenCalledWith(
        IDENTITY,
        "alice/personal",
        "read",
        expect.anything(),
      );
      expect(url).toBe(
        "https://beancount.io/api-gateway/ledgers/alice/personal/archive/main.zip?token=dl-token",
      );
    });

    it("omits the token for a public ledger even when one is supplied", async () => {
      mockGetLedger.mockResolvedValue({
        data: { success: true, data: { private: false } },
      });

      const url = await service.getLedgerArchiveDownloadUrl(
        "alice/personal",
        undefined,
        "dl-token",
      );

      expect(url).toBe(
        "https://beancount.io/api-gateway/ledgers/alice/personal/archive/main.zip",
      );
    });

    it("denies before returning a URL when authorizeLedger rejects", async () => {
      mockGetLedger.mockResolvedValue({
        data: { success: true, data: { private: true } },
      });
      (authorizeLedger as jest.Mock).mockRejectedValue(new ForbiddenError("no"));

      await expect(
        service.getLedgerArchiveDownloadUrl("alice/personal", undefined),
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
