import {
  assertNoPortableTwin,
  assertNoTwinsAmong,
} from "@/features/ledger/utils/portable-twin";
import { parseLedgerId } from "@/shared/str";
import {
  FavaApiError,
  favaApiErrorToDomainError,
  unwrapFavaResponse,
} from "@/foundation/fava";
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
import {
  assertPortableRepoPath,
  assertSafeRepoPath,
} from "@/features/ledger/utils/safe-repo-path";
import { assertKeepsEntryPoint } from "@/features/ledger/utils/ledger-entry-point";
import { assertExplicitFileContentSize } from "@/features/ledger/utils/explicit-file-size";
import {
  BadUserInputError,
  ConflictError,
  InternalServerError,
  NotFoundError,
} from "@/shared/errors";
import { listDirectory } from "@/features/ledger/utils/directory-listing";
import {
  findDanglingDeleteIncluders,
  refuseDanglingDeletes,
} from "@/features/ledger/utils/include-references";

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
  /** Bytes, as the ledger service lists them (GraphQL returns it too). */
  size: number;
  /** Blob SHA: the optimistic lock a delete or update sends back. */
  sha: string;
  /** The commit that last touched the entry, when the listing knows it. */
  lastCommitSha: string | null;
};

export type LedgerFileWithContent = {
  path: string;
  content: string;
  sha: string;
  /** Present when the file is not valid UTF-8: `content` holds U+FFFD. */
  lossy?: true;
};

type FileChangesParams = {
  ledgerId: string;
  identity: Identity;
  operations: LedgerChangeFileOperation[];
  message: string;
  dryRun?: boolean;
};

/** Internal commits of generated/merged ledger text, not explicit file uploads. */
export interface ILedgerGeneratedFileWriter {
  changeGeneratedFiles(params: FileChangesParams): Promise<void>;
}

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
   * Each supplied file content is limited to 1 MiB of UTF-8 bytes.
   * `dryRun` runs the same authorization, path and size validation, then stops
   * before the repository commit — so a preview refuses exactly what the
   * write would.
   */
  changeFiles(params: FileChangesParams): Promise<void>;

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

  /**
   * The files the projected ledger loads — its include closure, globs and
   * all — so a write can tell whether a file it routes to would be read
   * (w23/062). Gated like `checkProjectedFiles`.
   */
  projectedSourceFiles(params: {
    ledgerId: string;
    identity: Identity;
    overlays: { path: string; content: string }[];
  }): Promise<string[]>;

  /**
   * The entry hash of the directive starting on each 1-based `line` of the
   * projected files, `null` where none does: how a write that committed them
   * reports what it created (w23/060). Gated like `checkProjectedFiles`.
   */
  projectedEntryHashes(params: {
    ledgerId: string;
    identity: Identity;
    overlays: { path: string; content: string }[];
    locations: { path: string; line: number }[];
  }): Promise<(string | null)[]>;
}

export class LedgerRepoService
  extends AuthorizedLedgerService
  implements ILedgerRepoService, ILedgerGeneratedFileWriter
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
        // Only the commit's own fields are read, not its stats or files.
        stat: false,
        verification: false,
        files: false,
      }),
      "get latest commit",
      // The ledger was authorized just above, so a 404 here is the branch
      // the caller named, not its ledger (w23/047).
      (cause) =>
        cause instanceof FavaApiError
          ? cause.status === 404
            ? new NotFoundError("Branch", branchName)
            : favaApiErrorToDomainError(cause, "get latest commit")
          : new InternalServerError("Failed to get latest commit"),
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

    const entries = await listDirectory(dirPath, () =>
      unwrapFavaResponse(
        favaApiClient.ledgers.getLedgerDirContent(ledgerOwner, ledgerName, {
          dir_path: dirPath,
        }),
        "list ledger files",
      ),
    );

    return [...entries]
      .sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === "dir" ? -1 : 1;
      })
      .map((e) => ({
        path: e.path,
        name: e.name,
        type: e.type,
        size: e.size,
        sha: e.sha,
        lastCommitSha: e.last_commit_sha ?? null,
      }));
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

    // A directory comes back with no content, which decodes to "" — so it
    // read as an empty file on every surface. Refuse it instead: nothing a
    // caller does with the "content" of a directory is what it meant.
    const directory = files.find((file) => file.type === "dir");
    if (directory) {
      throw new BadUserInputError(
        `${directory.path} is a directory, not a file`,
        "path",
        "List a directory instead of reading it: `listLedgerFiles` with `dir_path`, or `GET …/files?dir=`.",
      );
    }

    return files.map((file) => {
      const { content, lossy } = decodeFileContent(file);
      return {
        path: file.path,
        content,
        sha: file.sha,
        ...(lossy && { lossy: true as const }),
      };
    });
  }

  async changeFiles(params: FileChangesParams): Promise<void> {
    await this.authorizeFileChanges(params);
    params.operations.forEach((operation, index) => {
      if (operation.content !== null && operation.content !== undefined) {
        assertExplicitFileContentSize(
          operation.content,
          "utf8",
          `operations[${index}].content`,
        );
      }
    });
    await this.assertNewPathsPortable(params);
    await this.commitFileChanges(params);
  }

  /**
   * A path a caller creates must not be an existing one's on macOS and
   * Windows, nor two new ones each other's (w21/770). One the batch deletes is
   * free. Generated files are named by the ledger's own options, not typed.
   */
  private async assertNewPathsPortable(
    params: FileChangesParams,
  ): Promise<void> {
    const { ledgerId, identity, operations } = params;
    const deleted = new Set(
      operations
        .filter((operation) => operation.operation === "delete")
        .map((operation) => operation.path),
    );
    const creates = operations
      .filter(
        (operation) =>
          operation.operation === "create" && !deleted.has(operation.path),
      )
      .map((operation) => operation.path);
    if (creates.length === 0) return;
    assertNoTwinsAmong(creates);
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      identity.userId,
    );
    for (const path of creates) {
      await assertNoPortableTwin(path, (dir) =>
        unwrapFavaResponse(
          favaApiClient.ledgers.getLedgerDirContent(ledgerOwner, ledgerName, {
            ...(dir === undefined ? {} : { dir_path: dir }),
          }),
          "check new file path",
        ),
      );
    }
  }

  /**
   * Refuse to delete a file still `include`d by a surviving file, naming the
   * includers — the delete half of the rename guard (w23/m4/t001). Includes
   * match on resolved paths like rename's (w23/029); the check runs over the
   * projected tree, so a batch that drops the include lines and deletes the
   * file in one commit passes. Glob includes are ignored: a file leaving a
   * glob's match breaks no load. Batches with no surviving delete skip the
   * tree walk entirely.
   */
  private async assertDeletesKeepIncludes(
    favaApiClient: Awaited<
      ReturnType<
        LedgerRepoService["favaClientFactory"]["getPublicApiClient"]
      >
    >,
    ledgerOwner: string,
    ledgerName: string,
    operations: LedgerChangeFileOperation[],
  ): Promise<void> {
    // Net effect in batch order: a path the batch deletes and recreates
    // survives, while create-then-delete ends gone.
    const deleted = new Set<string>();
    // Projected contents: batch text wins, so a batch that rewrites the
    // includer alongside the delete passes.
    const projected = new Map<string, string | null>();
    for (const operation of operations) {
      if (operation.operation === "delete") {
        deleted.add(operation.path);
        projected.set(operation.path, null);
      } else {
        deleted.delete(operation.path);
        if (operation.content !== undefined && operation.content !== null)
          projected.set(operation.path, operation.content);
      }
    }
    if (deleted.size === 0) return;
    const dangling = await findDanglingDeleteIncluders({
      listDir: (dir) =>
        unwrapFavaResponse(
          favaApiClient.ledgers.getLedgerDirContent(ledgerOwner, ledgerName, {
            ...(dir === undefined ? {} : { dir_path: dir }),
          }),
          "list ledger files for delete guard",
          (cause) =>
            operationNotAllowedFromCause(
              "list ledger files for delete guard",
              cause,
            ),
        ),
      readFiles: (paths) =>
        unwrapFavaResponse(
          favaApiClient.ledgers.getLedgerFilesContent(ledgerOwner, ledgerName, {
            files: paths,
          }),
          "read ledger files for delete guard",
          (cause) =>
            operationNotAllowedFromCause(
              "read ledger files for delete guard",
              cause,
            ),
        ),
      deletedPaths: deleted,
      overlays: projected,
    });
    refuseDanglingDeletes(dangling);
  }

  // Excluded from ILedgerRepoService: only composition injects this capability
  // into the append workflow. Generated merges retain all other write guards.
  async changeGeneratedFiles(params: FileChangesParams): Promise<void> {
    await this.authorizeFileChanges(params);
    await this.commitFileChanges(params);
  }

  private async authorizeFileChanges(params: FileChangesParams): Promise<void> {
    const { ledgerId, identity, operations } = params;
    await authorizeLedger(
      identity,
      ledgerId,
      AUTHORIZATION_ACTIONS.LEDGER_FILES_WRITE,
      this.authDeps,
    );
    operations.forEach((operation, index) => {
      assertSafeRepoPath(operation.path, `operations[${index}].path`);
      // A new file's name has to work on every checkout; an existing one
      // keeps whatever name it has (w23/054).
      if (operation.operation === "create")
        assertPortableRepoPath(operation.path, `operations[${index}].path`);
      // A batch that creates the path again keeps the entry point.
      if (
        operation.operation === "delete" &&
        !operations.some(
          (other) =>
            other.operation === "create" && other.path === operation.path,
        )
      )
        assertKeepsEntryPoint(
          operation.path,
          "deleted",
          `operations[${index}].path`,
        );
      if (operation.from_path !== null && operation.from_path !== undefined) {
        assertSafeRepoPath(
          operation.from_path,
          `operations[${index}].from_path`,
        );
      }
    });
  }

  private async commitFileChanges(params: FileChangesParams): Promise<void> {
    const { ledgerId, identity, operations, message, dryRun = false } = params;
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
    const favaApiClient = await this.favaClientFactory.getPublicApiClient(
      ledgerId,
      identity.userId,
    );
    // Before the dry-run branch, so a preview refuses exactly what the
    // commit would (w23/m4/t001).
    await this.assertDeletesKeepIncludes(
      favaApiClient,
      ledgerOwner,
      ledgerName,
      operations,
    );
    if (dryRun) {
      // The commit refuses a `create` over a file that is already there, so
      // the preview has to as well — otherwise it approves a write that will
      // then fail, or tempts the caller to believe it overwrote something.
      const created = new Set<string>();
      const freed = new Set<string>();
      for (const operation of operations) {
        if (operation.operation === "delete") freed.add(operation.path);
        // A file this same batch deletes first is free to create again.
        else if (operation.operation === "create" && !freed.has(operation.path))
          created.add(operation.path);
      }
      if (created.size > 0) {
        const existing = await unwrapFavaResponse(
          favaApiClient.ledgers.getLedgerFilesContent(ledgerOwner, ledgerName, {
            files: [...created],
          }),
          "check new file paths",
        );
        const taken = existing.find((file) => created.has(file.path));
        if (taken) {
          throw new ConflictError("File", `${taken.path} already exists`, {
            hint: "`create` is for a new file. Overwrite this one deliberately with `replace` (REST: `PUT` with its `sha`), or choose another path.",
          });
        }
      }
      return;
    }

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

  async projectedSourceFiles(params: {
    ledgerId: string;
    identity: Identity;
    overlays: { path: string; content: string }[];
  }): Promise<string[]> {
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
      favaApiClient.reports.getProjectedSourceFiles(ledgerOwner, ledgerName, {
        files: overlays.map((overlay) => ({
          path: overlay.path,
          content: Buffer.from(overlay.content, "utf8").toString("base64"),
        })),
      }),
      "list projected source files",
    );
  }

  async projectedEntryHashes(params: {
    ledgerId: string;
    identity: Identity;
    overlays: { path: string; content: string }[];
    locations: { path: string; line: number }[];
  }): Promise<(string | null)[]> {
    const { ledgerId, identity, overlays, locations } = params;
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
    const { entry_hashes } = await unwrapFavaResponse(
      favaApiClient.reports.getProjectedEntryIds(ledgerOwner, ledgerName, {
        files: overlays.map((overlay) => ({
          path: overlay.path,
          content: Buffer.from(overlay.content, "utf8").toString("base64"),
        })),
        locations,
      }),
      "resolve projected entry hashes",
    );
    return entry_hashes;
  }
}
