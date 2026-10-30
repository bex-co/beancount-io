import { LedgerRepoService } from "../ledger-repo-service";
import { FavaApiError } from "@/foundation/fava";
import { OperationNotAllowedError } from "@/shared/errors";
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

    // w23/047: an unknown branch read "Ledger resource not found".
    it("names the branch the ledger does not have", async () => {
      mockRepoGetAllCommits.mockRejectedValue(
        new FavaApiError("Not Found", 404, {
          success: false,
          error: "The target couldn't be found.",
        } as never),
      );

      await expect(
        service.getLatestCommit({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          branchName: "master",
        }),
      ).rejects.toMatchObject({
        category: "NOT_FOUND",
        message: "Branch with ID 'master' not found",
      });
    });

    it("keeps any other ledger failure as the ledger's", async () => {
      mockRepoGetAllCommits.mockRejectedValue(
        new FavaApiError("down", 503, {
          success: false,
          error: "down",
        } as never),
      );

      await expect(
        service.getLatestCommit({ ledgerId: LEDGER_ID, identity: IDENTITY }),
      ).rejects.toMatchObject({ category: "SERVICE_UNAVAILABLE" });
    });

    // w21/314: only the commit's own fields are read.
    it("asks Gitea for one commit without stats, verification or files", async () => {
      mockRepoGetAllCommits.mockResolvedValue({
        data: { success: true, data: [] },
      });

      await service.getLatestCommit({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
      });

      expect(mockRepoGetAllCommits).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          limit: 1,
          stat: false,
          verification: false,
          files: false,
        }),
      );
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
        {
          sha: "main",
          limit: 1,
          stat: false,
          verification: false,
          files: false,
        },
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
        {
          sha: "develop",
          limit: 1,
          stat: false,
          verification: false,
          files: false,
        },
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
            {
              path: "z.bean",
              name: "z.bean",
              type: "file",
              size: 9,
              sha: "sz",
            },
            { path: "sub", name: "sub", type: "dir", size: 0, sha: "ss" },
            {
              path: "a.bean",
              name: "a.bean",
              type: "file",
              size: 4,
              sha: "sa",
              last_commit_sha: "c1",
            },
          ],
        },
      });

      const result = await service.listDirContent({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
      });

      // w21/200: size, sha and the last commit travel with the listing.
      expect(result).toEqual([
        {
          path: "sub",
          name: "sub",
          type: "dir",
          size: 0,
          sha: "ss",
          lastCommitSha: null,
        },
        {
          path: "a.bean",
          name: "a.bean",
          type: "file",
          size: 4,
          sha: "sa",
          lastCommitSha: "c1",
        },
        {
          path: "z.bean",
          name: "z.bean",
          type: "file",
          size: 9,
          sha: "sz",
          lastCommitSha: null,
        },
      ]);
    });

    it("passes dirPath through to the fava call", async () => {
      mockGetLedgerDirContent.mockResolvedValue({
        data: {
          success: true,
          data: [{ path: "subdir/a.bean", name: "a.bean", type: "file" }],
        },
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

    it("refuses a directory rather than returning it as an empty file", async () => {
      mockGetLedgerFilesContent.mockResolvedValue({
        data: {
          success: true,
          data: [
            { path: "main.bean", type: "file", sha: "s1", content: "x" },
            { path: "FY2026", type: "dir", sha: "s2", content: null },
          ],
        },
      });

      await expect(
        service.getFilesContent({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          paths: ["main.bean", "FY2026"],
        }),
      ).rejects.toMatchObject({
        category: "BAD_USER_INPUT",
        message: "FY2026 is a directory, not a file",
      });
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
      mockGetLedgerFilesContent.mockResolvedValue({
        data: { success: true, data: [] },
      });
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

    it("refuses a dry-run create over a file that already exists", async () => {
      mockGetLedgerFilesContent.mockResolvedValue({
        data: {
          success: true,
          data: [{ path: "main.bean", type: "file", sha: "s1", content: "" }],
        },
      });
      await expect(
        service.changeFiles({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          operations: [
            { operation: "create", path: "new.bean", content: "Zm9v" },
            { operation: "create", path: "main.bean", content: "Zm9v" },
          ],
          message: "add files",
          dryRun: true,
        }),
      ).rejects.toMatchObject({
        category: "CONFLICT",
        message: expect.stringContaining("main.bean already exists"),
      });
      expect(mockGetLedgerFilesContent).toHaveBeenCalledWith(
        "testowner",
        "testledger",
        { files: ["new.bean", "main.bean"] },
      );
      expect(mockChangeLedgerFiles).not.toHaveBeenCalled();
    });

    it("lets a dry run create a path the same batch deletes first, and reads nothing without a create", async () => {
      await service.changeFiles({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        operations: [
          { operation: "delete", path: "main.bean", sha: "s1" },
          { operation: "create", path: "main.bean", content: "Zm9v" },
        ],
        message: "recreate",
        dryRun: true,
      });
      expect(mockGetLedgerFilesContent).not.toHaveBeenCalled();
      expect(mockChangeLedgerFiles).not.toHaveBeenCalled();
    });

    it("lists a folder once however many new files share it (w23/206)", async () => {
      mockGetLedgerDirContent.mockResolvedValue({
        data: { success: true, data: [] },
      });
      await service.changeFiles({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        operations: Array.from({ length: 40 }, (_, i) => ({
          operation: "create" as const,
          path: `bulk/f${i}.bean`,
          content: "Zm9v",
        })),
        message: "bulk",
        dryRun: true,
      });
      // The root and `bulk` are each listed once, not once per file.
      expect(mockGetLedgerDirContent.mock.calls.length).toBeLessThanOrEqual(2);
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
      mockGetLedgerDirContent.mockResolvedValue({
        data: { success: true, data: [] },
      });
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

    // w23/m4/t001: deleting a file still `include`d breaks the load the way
    // rename refuses to — the delete refuses naming the includers, like
    // rename does, instead of committing a dangling include.
    describe("deleting an included file", () => {
      const dirWith = (entries: { path: string; type: string }[]) => {
        mockGetLedgerDirContent.mockResolvedValue({
          data: { success: true, data: entries },
        });
      };
      const contentsWith = (files: { path: string; content: string }[]) => {
        mockGetLedgerFilesContent.mockResolvedValue({
          data: {
            success: true,
            data: files.map(({ path, content }) => ({
              path,
              sha: "s1",
              content,
              encoding: null,
            })),
          },
        });
      };
      const attemptDelete = (path: string, extra: object = {}) =>
        service.changeFiles({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          operations: [{ operation: "delete", path, ...extra }],
          message: "delete file",
        });

      it("refuses naming the file and its includers, without committing", async () => {
        dirWith([
          { path: "main.bean", type: "file" },
          { path: "second.bean", type: "file" },
        ]);
        contentsWith([
          {
            path: "main.bean",
            content: '2026-01-01 open Assets:Cash\ninclude "second.bean"\n',
          },
          { path: "second.bean", content: "; doomed\n" },
        ]);
        await expect(attemptDelete("second.bean")).rejects.toThrow(
          /second\.bean is still included by main\.bean/,
        );
        expect(mockChangeLedgerFiles).not.toHaveBeenCalled();
      });

      it("refuses in a dry run exactly as the commit would", async () => {
        dirWith([
          { path: "main.bean", type: "file" },
          { path: "second.bean", type: "file" },
        ]);
        contentsWith([
          { path: "main.bean", content: 'include "second.bean"\n' },
          { path: "second.bean", content: "; doomed\n" },
        ]);
        await expect(
          service.changeFiles({
            ledgerId: LEDGER_ID,
            identity: IDENTITY,
            operations: [{ operation: "delete", path: "second.bean" }],
            message: "delete file",
            dryRun: true,
          }),
        ).rejects.toThrow(/still included by main\.bean/);
      });

      it("allows the delete when the same batch drops the include", async () => {
        dirWith([
          { path: "main.bean", type: "file" },
          { path: "second.bean", type: "file" },
        ]);
        contentsWith([
          { path: "main.bean", content: 'include "second.bean"\n' },
          { path: "second.bean", content: "; doomed\n" },
        ]);
        mockChangeLedgerFiles.mockResolvedValue({ data: { success: true } });
        await service.changeFiles({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          operations: [
            {
              operation: "update",
              path: "main.bean",
              content: "; no more include\n",
              sha: "s1",
            },
            { operation: "delete", path: "second.bean" },
          ],
          message: "delete file",
        });
        expect(mockChangeLedgerFiles).toHaveBeenCalledTimes(1);
      });

      it("allows deleting a file nothing includes", async () => {
        dirWith([
          { path: "main.bean", type: "file" },
          { path: "other.bean", type: "file" },
        ]);
        contentsWith([
          { path: "main.bean", content: 'include "other.bean"\n' },
          { path: "other.bean", content: "; kept\n" },
        ]);
        mockChangeLedgerFiles.mockResolvedValue({ data: { success: true } });
        await attemptDelete("lone.bean");
        expect(mockChangeLedgerFiles).toHaveBeenCalledTimes(1);
      });

      it("ignores glob includes — a file leaving a glob match breaks no load", async () => {
        dirWith([
          { path: "main.bean", type: "file" },
          { path: "second.bean", type: "file" },
        ]);
        contentsWith([
          { path: "main.bean", content: 'include "q-inc/*.bean"\n' },
          { path: "second.bean", content: "; doomed\n" },
        ]);
        mockChangeLedgerFiles.mockResolvedValue({ data: { success: true } });
        await attemptDelete("q-inc/second.bean");
        expect(mockChangeLedgerFiles).toHaveBeenCalledTimes(1);
      });

      it("matches includes on resolved paths, not include text", async () => {
        dirWith([
          { path: "d/inc.bean", type: "file" },
          { path: "d/second.bean", type: "file" },
        ]);
        contentsWith([
          { path: "d/inc.bean", content: 'include "second.bean"\n' },
          { path: "d/second.bean", content: "; doomed\n" },
        ]);
        await expect(attemptDelete("d/second.bean")).rejects.toThrow(
          /still included by d\/inc\.bean/,
        );
        expect(mockChangeLedgerFiles).not.toHaveBeenCalled();
      });

      // w23/m4/t006: one dangling delete vetoes the whole batch, and the
      // message reports every stranded file sorted, not just the first.
      it("refuses a batch with two dangling deletes naming both, sorted", async () => {
        dirWith([
          { path: "main.bean", type: "file" },
          { path: "second.bean", type: "file" },
          { path: "third.bean", type: "file" },
        ]);
        contentsWith([
          {
            path: "main.bean",
            content: 'include "second.bean"\ninclude "third.bean"\n',
          },
          { path: "second.bean", content: "; doomed\n" },
          { path: "third.bean", content: "; doomed\n" },
        ]);
        await expect(
          service.changeFiles({
            ledgerId: LEDGER_ID,
            identity: IDENTITY,
            operations: [
              { operation: "delete", path: "third.bean" },
              { operation: "delete", path: "second.bean" },
            ],
            message: "delete files",
          }),
        ).rejects.toThrow(
          "second.bean is still included by main.bean; " +
            "third.bean is still included by main.bean; remove the include",
        );
        expect(mockChangeLedgerFiles).not.toHaveBeenCalled();
      });

      // w23/m4/t006: the documented escape path — drop the include in one
      // commit, delete in the next — works because the guard reads the
      // current tree on every call.
      it("allows dropping the include first and deleting in a later call", async () => {
        dirWith([
          { path: "main.bean", type: "file" },
          { path: "second.bean", type: "file" },
        ]);
        contentsWith([
          { path: "main.bean", content: 'include "second.bean"\n' },
          { path: "second.bean", content: "; doomed\n" },
        ]);
        mockChangeLedgerFiles.mockResolvedValue({ data: { success: true } });
        await service.changeFiles({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          operations: [
            {
              operation: "update",
              path: "main.bean",
              content: "; no more include\n",
              sha: "s1",
            },
          ],
          message: "drop include",
        });
        // The second call sees the committed tree: the include is gone.
        contentsWith([
          { path: "main.bean", content: "; no more include\n" },
          { path: "second.bean", content: "; doomed\n" },
        ]);
        await attemptDelete("second.bean");
        expect(mockChangeLedgerFiles).toHaveBeenCalledTimes(2);
      });

      // w23/m4/t006: when the guard cannot list the tree it fails closed —
      // a delete never commits on an unread tree — with the guard's
      // operation label, not a bare Fava error.
      it("translates a guard list failure instead of deleting blind", async () => {
        mockGetLedgerDirContent.mockResolvedValue({
          data: { success: false },
        });
        await expect(attemptDelete("second.bean")).rejects.toThrow(
          OperationNotAllowedError,
        );
        await expect(attemptDelete("second.bean")).rejects.toThrow(
          /list ledger files for delete guard/,
        );
        expect(mockChangeLedgerFiles).not.toHaveBeenCalled();
      });
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
