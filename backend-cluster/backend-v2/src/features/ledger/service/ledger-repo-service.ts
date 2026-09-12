import { parseLedgerId } from "@/shared/str";
import { unwrapFavaResponse } from "@/foundation/fava";
import { decodeFileContent } from "@/shared/file-content";
import { operationNotAllowedFromCause } from "@/features/ledger/utils/operation-not-allowed-from-cause";
import type {
  BeancountErrorPublic,
  LedgerChangeFileOperation,
} from "@/foundation/fava/Api";
import type { Identity } from "@/server/api/identity";
import {
  authorizeLedger,
  AuthorizedLedgerService,
} from "@/features/ledger/utils/authorize-ledger";
import { AUTHORIZATION_ACTIONS } from "@/server/api/authorization/authorization-contract";
import { assertSafeRepoPath } from "@/features/ledger/utils/safe-repo-path";

type CommitUser = {
  login: string | null;
  fullName: string | null;
  email: string | null;
};

export type LatestCommitResult = {
  sha: string;
  message: string | null;
  author: CommitUser | null;
  committer: CommitUser | null;
  created: string | null;
} | null;

export type LedgerFileEntry = {
  path: string;
  name: string;
  type: "file" | "dir";
};

export type LedgerFileWithContent = {
  path: string;
  content: string;
  sha: string;
};

export interface ILedgerRepoService {
  getLatestCommit(params: {
    ledgerId: string;
    identity: Identity;
    branchName?: string;
  }): Promise<LatestCommitResult>;

  /** Files and directories at one level, sorted directories-first then by name. */
  listDirContent(params: {
    ledgerId: string;
    identity: Identity | undefined;
    dirPath?: string;
  }): Promise<LedgerFileEntry[]>;

  /** Content + sha of each requested file, decoded to plain UTF-8 text. */
  getFilesContent(params: {
    ledgerId: string;
    identity: Identity | undefined;
    paths: string[];
  }): Promise<LedgerFileWithContent[]>;

  /**
   * Commit a batch of file create/update/delete operations atomically.
   * `content` is plain UTF-8 text, the same as `getFilesContent` returns;
   * the base64 the ledger service wants is this service's business.
   * `dryRun` runs the same authorization and path validation, then stops
   * before the repository commit — so a preview refuses exactly what the
   * write would.
   */
  changeFiles(params: {
    ledgerId: string;
    identity: Identity;
    operations: LedgerChangeFileOperation[];
    message: string;
    dryRun?: boolean;
  }): Promise<void>;

  /**
   * bean-check over projected file contents without committing: `content`
   * holds the full post-change UTF-8 text, or `null` to project a deletion.
   * Powers edit dry runs (w2/m26). Gated on write authority like the commit
   * it previews — a preview refuses exactly what the write would.
   */
  checkProjectedFiles(params: {
    ledgerId: string;
    identity: Identity;
    overlays: { path: string; content: string | null }[];
  }): Promise<BeancountErrorPublic[]>;
}

export class LedgerRepoService
  extends AuthorizedLedgerService
  implements ILedgerRepoService
{
  async getLatestCommit(params: {
    ledgerId: string;
    identity: Identity;
    branchName?: string;
  }): Promise<LatestCommitResult> {
    const { ledgerId, identity, branchName = "main" } = params;
    await authorizeLedger(
      identity,
      ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_REPOSITORY_READ,
      this.authDeps,
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      identity.userId,
    );

    const data = await unwrapFavaResponse(
      favaApiClient.repo.repoGetAllCommits(ledgerOwner, ledgerName, {
        sha: branchName,
        limit: 1,
      }),
      "get latest commit",
    );

    const commit = data[0];
    if (!commit) return null;

    const mapUser = (
      user?: {
        login?: string | null;
        full_name?: string | null;
        email?: string | null;
      } | null,
    ): CommitUser | null => {
      if (!user) return null;
      return {
        login: user.login ?? null,
        fullName: user.full_name ?? null,
        email: user.email ?? null,
      };
    };

    return {
      sha: commit.sha,
      message: commit.commit?.message ?? null,
      author: mapUser(commit.author),
      committer: mapUser(commit.committer),
      created: commit.created ?? null,
    };
  }

  async listDirContent(params: {
    ledgerId: string;
    identity: Identity | undefined;
    dirPath?: string;
  }): Promise<LedgerFileEntry[]> {
    const { ledgerId, identity, dirPath } = params;
    await authorizeLedger(
      identity,
      ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_FILES_READ,
      this.authDeps,
    );
    if (dirPath !== undefined) {
      assertSafeRepoPath(dirPath, "dirPath");
    }
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      identity?.userId,
    );

    const entries = await unwrapFavaResponse(
      favaApiClient.ledgers.getLedgerDirContent(ledgerOwner, ledgerName, {
        dir_path: dirPath,
      }),
      "list ledger files",
    );

    return [...entries]
      .sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === "dir" ? -1 : 1;
      })
      .map((e) => ({ path: e.path, name: e.name, type: e.type }));
  }

  async getFilesContent(params: {
    ledgerId: string;
    identity: Identity | undefined;
    paths: string[];
  }): Promise<LedgerFileWithContent[]> {
    const { ledgerId, identity, paths } = params;
    await authorizeLedger(
      identity,
      ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_FILES_READ,
      this.authDeps,
    );
    paths.forEach((path, index) => assertSafeRepoPath(path, `paths[${index}]`));
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      identity?.userId,
    );

    const files = await unwrapFavaResponse(
      favaApiClient.ledgers.getLedgerFilesContent(ledgerOwner, ledgerName, {
        files: [...new Set(paths)],
      }),
      "read ledger files",
    );

    return files.map((file) => ({
      path: file.path,
      content: decodeFileContent(file),
      sha: file.sha,
    }));
  }

  async changeFiles(params: {
    ledgerId: string;
    identity: Identity;
    operations: LedgerChangeFileOperation[];
    message: string;
    dryRun?: boolean;
  }): Promise<void> {
    const { ledgerId, identity, operations, message, dryRun = false } = params;
    await authorizeLedger(
      identity,
      ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_FILES_WRITE,
      this.authDeps,
    );
    operations.forEach((operation, index) => {
      assertSafeRepoPath(operation.path, `operations[${index}].path`);
      if (operation.from_path !== null && operation.from_path !== undefined) {
        assertSafeRepoPath(
          operation.from_path,
          `operations[${index}].from_path`,
        );
      }
    });
    if (dryRun) return;
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      identity.userId,
    );

    await unwrapFavaResponse(
      favaApiClient.ledgers.changeLedgerFiles(ledgerOwner, ledgerName, {
        // Base64 is the ledger service's wire encoding (it forwards straight to
        // Gitea), not this service's contract. Encoding here rather than at
        // each caller is what makes `content` mean the same thing in both
        // directions: `getFilesContent` decodes, `checkProjectedFiles` encodes,
        // and now so does this — so a caller that reads a file, edits the text,
        // and writes it back never has to know. It was the one caller that
        // *didn't* know that broke: REST `PUT …/files/{path}` forwarded the
        // request body verbatim and Gitea refused it as illegal base64, while
        // the MCP edit tool encoded first and worked (w2/011).
        files: operations.map((operation) =>
          operation.content === null || operation.content === undefined
            ? operation
            : {
                ...operation,
                content: Buffer.from(operation.content, "utf8").toString(
                  "base64",
                ),
              },
        ),
        message,
      }),
      "commit file operations",
      // A pre-receive hook refusal — the directive limit, a push policy — has
      // no HTTP response to classify, so without this it surfaced as a generic
      // internal error. The entry service's own commit path always translated
      // it; routing appends through here (w2/012) would have lost that, and
      // every other caller of this method wanted it too.
      (cause) => operationNotAllowedFromCause("commit file operations", cause),
    );
  }

  async checkProjectedFiles(params: {
    ledgerId: string;
    identity: Identity;
    overlays: { path: string; content: string | null }[];
  }): Promise<BeancountErrorPublic[]> {
    const { ledgerId, identity, overlays } = params;
    await authorizeLedger(
      identity,
      ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_FILES_WRITE,
      this.authDeps,
    );
    overlays.forEach((overlay, index) =>
      assertSafeRepoPath(overlay.path, `overlays[${index}].path`),
    );
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      identity.userId,
    );

    return unwrapFavaResponse(
      favaApiClient.reports.checkProjectedErrors(ledgerOwner, ledgerName, {
        files: overlays.map((overlay) => ({
          path: overlay.path,
          content:
            overlay.content === null
              ? null
              : Buffer.from(overlay.content, "utf8").toString("base64"),
        })),
      }),
      "check projected files",
    );
  }
}
