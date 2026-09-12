import { LedgerRepoService } from "../ledger-repo-service";
import { authorizeLedger } from "@/features/ledger/utils/authorize-ledger";
import type { Identity } from "@/server/api/identity";

// Exercises this service's own behavior; authorizeLedger has its own suite.
jest.mock("@/features/ledger/utils/authorize-ledger", () => ({
  ...jest.requireActual("@/features/ledger/utils/authorize-ledger"),
  authorizeLedger: jest.fn(),
}));

const mockRepoGetAllCommits = jest.fn();
const mockGetLedgerDirContent = jest.fn();
const mockGetLedgerFilesContent = jest.fn();
const mockChangeLedgerFiles = jest.fn();

const mockFavaApiClient = {
  repo: { repoGetAllCommits: mockRepoGetAllCommits },
  ledgers: {
    getLedgerDirContent: mockGetLedgerDirContent,
    getLedgerFilesContent: mockGetLedgerFilesContent,
    changeLedgerFiles: mockChangeLedgerFiles,
  },
};

const mockFavaClientFactory = {
  getPublicApiClient: jest.fn().mockResolvedValue(mockFavaApiClient),
};

const LEDGER_ID = "testowner/testledger";
const USER_ID = "user-123";

const IDENTITY: Identity = {
  userId: USER_ID,
  method: "oauth",
  scopes: new Set(),
};

describe("LedgerRepoService", () => {
  let service: LedgerRepoService;

  beforeEach(() => {
    jest.clearAllMocks();
    (authorizeLedger as jest.Mock).mockResolvedValue({
      ledgerRepoId: 1,
      ownerUserId: USER_ID,
    });
    service = new LedgerRepoService(mockFavaClientFactory as any, {} as any);
  });

  describe("getLatestCommit", () => {
    it("returns null when there are no commits", async () => {
      mockRepoGetAllCommits.mockResolvedValue({
        data: { success: true, data: [] },
      });

      const result = await service.getLatestCommit({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
      });

      expect(result).toBeNull();
    });

    it("maps commit fields to LatestCommitResult", async () => {
      mockRepoGetAllCommits.mockResolvedValue({
        data: {
          success: true,
          data: [
            {
              sha: "abc123",
              commit: { message: "feat: add balance sheet" },
              author: {
                login: "alice",
                full_name: "Alice Smith",
                email: "alice@example.com",
              },
              committer: {
                login: "alice",
                full_name: "Alice Smith",
                email: "alice@example.com",
              },
              created: "2024-01-15T10:00:00Z",
            },
          ],
        },
      });

      const result = await service.getLatestCommit({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
      });

      expect(result).toEqual({
        sha: "abc123",
        message: "feat: add balance sheet",
        author: {
          login: "alice",
          fullName: "Alice Smith",
          email: "alice@example.com",
        },
        committer: {
          login: "alice",
          fullName: "Alice Smith",
          email: "alice@example.com",
        },
        created: "2024-01-15T10:00:00Z",
      });
    });

    it("handles missing author/committer gracefully", async () => {
      mockRepoGetAllCommits.mockResolvedValue({
        data: {
          success: true,
          data: [
            {
              sha: "def456",
              commit: { message: null },
              author: null,
              committer: null,
              created: null,
            },
          ],
        },
      });

      const result = await service.getLatestCommit({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
      });

      expect(result).toEqual({
        sha: "def456",
        message: null,
        author: null,
        committer: null,
        created: null,
      });
    });

    it("defaults branchName to main and passes it as sha", async () => {
      mockRepoGetAllCommits.mockResolvedValue({
        data: { success: true, data: [] },
      });

      await service.getLatestCommit({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
      });

      expect(mockRepoGetAllCommits).toHaveBeenCalledWith(
        "testowner",
        "testledger",
        { sha: "main", limit: 1 },
      );
    });

    it("passes custom branchName as sha", async () => {
      mockRepoGetAllCommits.mockResolvedValue({
        data: { success: true, data: [] },
      });

      await service.getLatestCommit({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        branchName: "develop",
      });

      expect(mockRepoGetAllCommits).toHaveBeenCalledWith(
        "testowner",
        "testledger",
        { sha: "develop", limit: 1 },
      );
    });

    it("propagates the identity's userId to the fava client factory", async () => {
      mockRepoGetAllCommits.mockResolvedValue({
        data: { success: true, data: [] },
      });

      await service.getLatestCommit({
        ledgerId: LEDGER_ID,
        identity: { ...IDENTITY, userId: "special-user" },
      });

      expect(mockFavaClientFactory.getPublicApiClient).toHaveBeenCalledWith(
        LEDGER_ID,
        "special-user",
      );
    });
  });

  describe("listDirContent", () => {
    it("authorizes as read", async () => {
      mockGetLedgerDirContent.mockResolvedValue({
        data: { success: true, data: [] },
      });
      await service.listDirContent({ ledgerId: LEDGER_ID, identity: IDENTITY });
      expect(authorizeLedger).toHaveBeenCalledWith(
        IDENTITY,
        LEDGER_ID,
        "ledger.files.read",
        expect.anything(),
      );
    });

    it("sorts directories before files, then alphabetically", async () => {
      mockGetLedgerDirContent.mockResolvedValue({
        data: {
          success: true,
          data: [
            { path: "z.bean", name: "z.bean", type: "file" },
            { path: "sub", name: "sub", type: "dir" },
            { path: "a.bean", name: "a.bean", type: "file" },
          ],
        },
      });

      const result = await service.listDirContent({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
      });

      expect(result).toEqual([
        { path: "sub", name: "sub", type: "dir" },
        { path: "a.bean", name: "a.bean", type: "file" },
        { path: "z.bean", name: "z.bean", type: "file" },
      ]);
    });

    it("passes dirPath through to the fava call", async () => {
      mockGetLedgerDirContent.mockResolvedValue({
        data: { success: true, data: [] },
      });
      await service.listDirContent({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        dirPath: "subdir",
      });
      expect(mockGetLedgerDirContent).toHaveBeenCalledWith(
        "testowner",
        "testledger",
        { dir_path: "subdir" },
      );
    });

    it("allows an anonymous (undefined) identity through to authorizeLedger", async () => {
      mockGetLedgerDirContent.mockResolvedValue({
        data: { success: true, data: [] },
      });
      await service.listDirContent({
        ledgerId: LEDGER_ID,
        identity: undefined,
      });
      expect(authorizeLedger).toHaveBeenCalledWith(
        undefined,
        LEDGER_ID,
        "ledger.files.read",
        expect.anything(),
      );
      expect(mockFavaClientFactory.getPublicApiClient).toHaveBeenCalledWith(
        LEDGER_ID,
        undefined,
      );
    });
  });

  describe("getFilesContent", () => {
    it("authorizes as read and decodes base64 content", async () => {
      mockGetLedgerFilesContent.mockResolvedValue({
        data: {
          success: true,
          data: [
            {
              path: "main.bean",
              sha: "sha1",
              content: Buffer.from("2024-01-01 open Assets:Cash").toString(
                "base64",
              ),
              encoding: "base64",
            },
          ],
        },
      });

      const result = await service.getFilesContent({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        paths: ["main.bean"],
      });

      expect(authorizeLedger).toHaveBeenCalledWith(
        IDENTITY,
        LEDGER_ID,
        "ledger.files.read",
        expect.anything(),
      );
      expect(result).toEqual([
        {
          path: "main.bean",
          sha: "sha1",
          content: "2024-01-01 open Assets:Cash",
        },
      ]);
    });

    it("passes plain (non-base64) content through unchanged", async () => {
      mockGetLedgerFilesContent.mockResolvedValue({
        data: {
          success: true,
          data: [
            {
              path: "a.bean",
              sha: "sha2",
              content: "plain text",
              encoding: null,
            },
          ],
        },
      });

      const result = await service.getFilesContent({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        paths: ["a.bean"],
      });

      expect(result[0].content).toBe("plain text");
    });

    it("de-duplicates requested paths before calling fava", async () => {
      mockGetLedgerFilesContent.mockResolvedValue({
        data: { success: true, data: [] },
      });
      await service.getFilesContent({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        paths: ["a.bean", "a.bean", "b.bean"],
      });
      expect(mockGetLedgerFilesContent).toHaveBeenCalledWith(
        "testowner",
        "testledger",
        { files: ["a.bean", "b.bean"] },
      );
    });
  });

  describe("changeFiles", () => {
    it("authorizes as write, not read", async () => {
      mockChangeLedgerFiles.mockResolvedValue({ data: { success: true } });
      await service.changeFiles({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        operations: [
          { operation: "create", path: "new.bean", content: "Zm9v" },
        ],
        message: "add file",
      });
      expect(authorizeLedger).toHaveBeenCalledWith(
        IDENTITY,
        LEDGER_ID,
        "ledger.files.write",
        expect.anything(),
      );
    });

    it("denies the commit when authorizeLedger rejects, without calling fava", async () => {
      (authorizeLedger as jest.Mock).mockRejectedValueOnce(
        new Error("forbidden"),
      );
      await expect(
        service.changeFiles({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          operations: [{ operation: "delete", path: "x.bean" }],
          message: "delete file",
        }),
      ).rejects.toThrow("forbidden");
      expect(mockChangeLedgerFiles).not.toHaveBeenCalled();
    });

    it("runs a dry run through the same authorization and stops before the commit", async () => {
      await service.changeFiles({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        operations: [
          { operation: "create", path: "new.bean", content: "Zm9v" },
        ],
        message: "add file",
        dryRun: true,
      });
      expect(authorizeLedger).toHaveBeenCalledWith(
        IDENTITY,
        LEDGER_ID,
        "ledger.files.write",
        expect.anything(),
      );
      expect(mockChangeLedgerFiles).not.toHaveBeenCalled();
    });

    it("refuses an unsafe path on a dry run exactly like the commit", async () => {
      await expect(
        service.changeFiles({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          operations: [
            { operation: "create", path: "../escape.bean", content: "Zm9v" },
          ],
          message: "add file",
          dryRun: true,
        }),
      ).rejects.toThrow();
      expect(mockChangeLedgerFiles).not.toHaveBeenCalled();
    });

    it("base64-encodes content for the ledger service and forwards the rest verbatim", async () => {
      mockChangeLedgerFiles.mockResolvedValue({ data: { success: true } });
      await service.changeFiles({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        operations: [
          {
            operation: "update" as const,
            path: "main.bean",
            content: '2026-06-01 * "Caf\u00e9" "\u2014 caf\u00e9 au lait"\n',
            sha: "sha1",
          },
        ],
        message: "reconcile",
      });
      expect(mockChangeLedgerFiles).toHaveBeenCalledWith(
        "testowner",
        "testledger",
        {
          files: [
            {
              operation: "update",
              path: "main.bean",
              content: Buffer.from(
                '2026-06-01 * "Caf\u00e9" "\u2014 caf\u00e9 au lait"\n',
                "utf8",
              ).toString("base64"),
              sha: "sha1",
            },
          ],
          message: "reconcile",
        },
      );
    });

    it("leaves a delete alone — it carries no content to encode", async () => {
      mockChangeLedgerFiles.mockResolvedValue({ data: { success: true } });
      await service.changeFiles({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        operations: [{ operation: "delete", path: "gone.bean", sha: "sha1" }],
        message: "delete file",
      });
      expect(mockChangeLedgerFiles).toHaveBeenCalledWith(
        "testowner",
        "testledger",
        {
          files: [{ operation: "delete", path: "gone.bean", sha: "sha1" }],
          message: "delete file",
        },
      );
    });

    it("round-trips text a caller read back through a write (w2/011)", async () => {
      // The regression: REST `PUT …/files/{path}` forwarded the request body
      // verbatim and Gitea refused it as illegal base64, while the MCP edit
      // tool encoded first and worked. Reading, editing and writing back is
      // the flow both surfaces perform, so it is the one asserted.
      mockChangeLedgerFiles.mockResolvedValue({ data: { success: true } });
      const text = 'option "title" "My \u00c6ther Ledger"\n';
      mockGetLedgerFilesContent.mockResolvedValue({
        data: {
          success: true,
          data: [
            {
              path: "main.bean",
              content: Buffer.from(text, "utf8").toString("base64"),
              encoding: "base64",
              sha: "sha1",
            },
          ],
        },
      });
      const [file] = await service.getFilesContent({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        paths: ["main.bean"],
      });
      expect(file.content).toBe(text);

      await service.changeFiles({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        operations: [
          {
            operation: "update" as const,
            path: "main.bean",
            content: file.content,
            sha: file.sha,
          },
        ],
        message: "retitle",
      });
      const sent = mockChangeLedgerFiles.mock.calls.at(-1)![2];
      expect(
        Buffer.from(sent.files[0].content, "base64").toString("utf8"),
      ).toBe(text);
    });
  });
});
