import type { IGiteaClientFactory } from "@/foundation/clients/gitea-client-factory";
import { assertHostPage, HOST_PAGE_MAX } from "@/shared/host-page";
import { parseLedgerId } from "@/shared/str";
import type {
  CommitListItem,
  CommitDetails,
} from "../api/commits-resolver.types";
import { logger } from "@/shared/logger";
import type { Identity } from "@/server/api/identity";
import {
  AUTHORIZATION_ACTIONS,
  anonymousPrincipal,
  ledgerResource,
  type IAuthorizationService,
} from "@/server/api/authorization";
import {
  DomainError,
  InternalServerError,
  NotFoundError,
} from "@/shared/errors";

/**
 * Gitea's commits?sha= list endpoint may return 404/422, an empty 200, or
 * (historically) 500 for an unknown revision. Map only absence-shaped failures
 * to NotFound — leave auth, rate-limit, and genuine outages alone.
 */
export function isMissingCommitLookupError(error: unknown): boolean {
  if (!(error instanceof Response)) return false;
  if (error.status === 404 || error.status === 422) return true;
  if (error.status !== 500) return false;
  const apiError = (error as Response & { error?: { message?: string } }).error;
  const message =
    `${apiError?.message ?? ""} ${error.statusText ?? ""}`.toLowerCase();
  return (
    message.includes("not found") ||
    message.includes("does not exist") ||
    message.includes("no such") ||
    message.includes("no commit") ||
    message.includes("unknown revision")
  );
}

/**
 * Strips commit metadata from a git patch to extract only the unified diff.
 *
 * Gitea's repoDownloadCommitDiffOrPatch returns full patch format:
 * - commit SHA
 * - Author/Date metadata
 * - Commit message
 * - Actual diff content
 *
 * This function extracts only the diff content starting from "diff --git".
 *
 * @param gitPatch - Full git patch string from Gitea
 * @returns Clean unified diff starting with "diff --git"
 */
export function stripCommitMetadata(gitPatch: string): string {
  if (!gitPatch || gitPatch.trim() === "") {
    return "";
  }

  // Find the first "diff --git" line which marks the start of actual diff content
  const diffStartIndex = gitPatch.indexOf("diff --git");

  if (diffStartIndex === -1) {
    // No diff content found, return empty string
    logger.warn(
      "No 'diff --git' marker found in git patch, returning empty diff",
    );
    return "";
  }

  // Extract everything from "diff --git" onwards
  return gitPatch.substring(diffStartIndex);
}

export type CommitFileStatus = "added" | "removed" | "modified" | "renamed";

export interface CommitFileStats {
  additions: number;
  deletions: number;
  status: CommitFileStatus;
  /** The path before a rename; null otherwise. */
  previousFilename: string | null;
}

/** The path of a `diff --git a/<p> b/<p>` header whose two sides agree. */
function headerPath(line: string): string {
  const rest = line.slice("diff --git a/".length);
  const half = (rest.length - 3) / 2;
  if (Number.isInteger(half) && rest.slice(half, half + 3) === " b/") {
    const path = rest.slice(0, half);
    if (rest.slice(half + 3) === path) return path;
  }
  // A rename's sides differ; its `rename to` line names the new path.
  return line.match(/ b\/(.+)$/)?.[1] ?? "";
}

/**
 * Parses a unified diff to extract per-file statistics and what happened to
 * each file. The extended headers say so even for an empty file, whose diff
 * has no hunk at all: `new file mode`, `deleted file mode`, and a rename's
 * `rename from` / `rename to` pair (w21/132).
 *
 * @param diff - Unified diff string (output from git diff)
 * @returns Map of (new) filename to its stats, status and previous name
 */
export function parseFileStatsFromDiff(
  diff: string,
): Map<string, CommitFileStats> {
  const fileStats = new Map<string, CommitFileStats>();

  if (!diff || diff.trim() === "") {
    return fileStats;
  }

  let current: CommitFileStats | null = null;
  let currentFile = "";
  let inHunk = false;

  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) {
      currentFile = headerPath(line);
      current = {
        additions: 0,
        deletions: 0,
        status: "modified",
        previousFilename: null,
      };
      fileStats.set(currentFile, current);
      inHunk = false;
    } else if (!current) {
      continue;
    } else if (!inHunk) {
      if (line.startsWith("@@")) inHunk = true;
      else if (line.startsWith("new file mode")) current.status = "added";
      else if (line.startsWith("deleted file mode")) current.status = "removed";
      else if (line.startsWith("rename from ")) {
        current.status = "renamed";
        current.previousFilename = line.slice("rename from ".length);
      } else if (line.startsWith("rename to ")) {
        fileStats.delete(currentFile);
        currentFile = line.slice("rename to ".length);
        fileStats.set(currentFile, current);
      }
    } else if (line.startsWith("+")) {
      current.additions += 1;
    } else if (line.startsWith("-")) {
      current.deletions += 1;
    }
  }

  return fileStats;
}

/**
 * A commit's files as one row per file. Gitea lists a rename as the removed
 * old path plus the added new one, each with no line counts; the diff names
 * the rename, so the two collapse into a single "renamed" row (w21/132).
 */
export function commitFileChanges(
  files: readonly { filename?: string; status?: string }[],
  diffStats: Map<string, CommitFileStats>,
) {
  const renamedFrom = new Set(
    [...diffStats.values()].flatMap((stats) =>
      stats.previousFilename ? [stats.previousFilename] : [],
    ),
  );
  return files.flatMap((f) => {
    const filename = f.filename || "";
    const stats = diffStats.get(filename);
    if (!stats && renamedFrom.has(filename)) return [];
    return [
      {
        filename,
        additions: stats?.additions ?? 0,
        deletions: stats?.deletions ?? 0,
        status: stats?.status ?? giteaFileStatus(f.status),
        previousFilename: stats?.previousFilename ?? null,
      },
    ];
  });
}

function giteaFileStatus(status: string | undefined): CommitFileStatus {
  switch (status) {
    case "added":
    case "removed":
    case "renamed":
      return status;
    case "deleted":
      return "removed";
    default:
      return "modified";
  }
}

export interface ListCommitsInput {
  identity?: Identity;
  ledgerId: string;
  branch?: string;
  page?: number;
  limit?: number;
}

export interface GetCommitDetailsInput {
  identity?: Identity;
  ledgerId: string;
  sha: string;
}

export interface ICommitsService {
  listCommits(input: ListCommitsInput): Promise<CommitListItem[]>;
  getCommitDetails(input: GetCommitDetailsInput): Promise<CommitDetails>;
}

/**
 * The most commits one page may hold. Gitea caps its commit pages at 50 without
 * saying so, so a larger `limit` was answered with 50 and a client treating a
 * short page as the end stopped early (w21/314). It is refused here instead, on
 * REST, GraphQL and MCP alike, and published in each surface's schema.
 */
export const MAX_COMMITS_PAGE_SIZE = HOST_PAGE_MAX;

export class CommitsService implements ICommitsService {
  constructor(
    private readonly giteaClientFactory: IGiteaClientFactory,
    private readonly authorization: IAuthorizationService,
  ) {}

  async listCommits({
    identity,
    ledgerId,
    branch = "main",
    page = 1,
    limit = 30,
  }: ListCommitsInput): Promise<CommitListItem[]> {
    // Gitea answers an out-of-range page or limit with its own defaults, so
    // `limit=-1` and `page=0` returned a full first page as if they had been
    // honoured. Checked here because GraphQL's Int arguments arrive unchecked.
    assertHostPage(page, limit);
    await this.authorization.authorizeOrThrow({
      principal: identity ?? anonymousPrincipal(),
      action: AUTHORIZATION_ACTIONS.LEDGER_REPOSITORY_READ,
      resource: ledgerResource(ledgerId),
    });
    // Gitea computes the offset as (page - 1) * limit in int32: one past
    // 2,147,483,647 overflows and the hop answers 500 (w23/102). No
    // repository holds that many commits, so the request is past the end —
    // answer the empty page the sibling paginations return instead of
    // hopping. Positioned after authorization so an absurd page from a
    // caller without read access is still refused as forbidden.
    if ((page - 1) * limit > 2147483647) {
      return [];
    }
    const userId = identity?.userId;
    const { ledgerOwner: owner, ledgerName: repo } = parseLedgerId(ledgerId);
    try {
      const client = userId
        ? await this.giteaClientFactory.getUserApiClient(userId)
        : this.giteaClientFactory.getAnonymousApiClient();

      const response = await client.repos.repoGetAllCommits(
        owner,
        repo,
        {
          sha: branch,
          page,
          limit,
          // Only sha, message, author and committer are read: Gitea's stat,
          // verification and file lists are extra work per commit.
          stat: false,
          verification: false,
          files: false,
        },
        { format: "json" },
      );

      if (!response.data || response.data.length === 0) {
        logger.warn("No commits returned from Gitea API", {
          owner,
          repo,
          branch,
        });
        return [];
      }

      return response.data.map((commit) => ({
        sha: commit.sha || "",
        message: commit.commit?.message || "",
        author: {
          name: commit.commit?.author?.name || "",
          email: commit.commit?.author?.email || "",
          date: commit.commit?.author?.date || "",
        },
        committer: commit.commit?.committer
          ? {
              name: commit.commit.committer.name || "",
              email: commit.commit.committer.email || "",
              date: commit.commit.committer.date || "",
            }
          : undefined,
        shortSha: commit.sha?.substring(0, 7),
      }));
    } catch (error) {
      if (error instanceof DomainError) throw error;
      // The generated client throws the `Response` itself, so stringifying it
      // told the caller "[object Response]". A revision Gitea does not know is
      // the caller's branch name, not a server fault.
      if (isMissingCommitLookupError(error)) {
        throw new NotFoundError("Branch", branch);
      }
      logger.error("Error fetching commits from Gitea", {
        owner,
        repo,
        branch,
        error: error instanceof Error ? error.message : String(error),
        status: error instanceof Response ? error.status : undefined,
      });
      throw new InternalServerError(
        "Failed to fetch commits from Gitea",
        error instanceof Error ? error : undefined,
      );
    }
  }

  async getCommitDetails({
    identity,
    ledgerId,
    sha,
  }: GetCommitDetailsInput): Promise<CommitDetails> {
    await this.authorization.authorizeOrThrow({
      principal: identity ?? anonymousPrincipal(),
      action: AUTHORIZATION_ACTIONS.LEDGER_REPOSITORY_READ,
      resource: ledgerResource(ledgerId),
    });
    const userId = identity?.userId;
    const { ledgerOwner: owner, ledgerName: repo } = parseLedgerId(ledgerId);
    try {
      const client = userId
        ? await this.giteaClientFactory.getUserApiClient(userId)
        : this.giteaClientFactory.getAnonymousApiClient();

      // Get commit metadata with files
      const commitResponse = await client.repos.repoGetAllCommits(
        owner,
        repo,
        {
          sha,
          limit: 1,
          files: true,
          stat: true,
        },
        { format: "json" },
      );

      const commit = commitResponse.data[0];
      if (!commit) {
        throw new NotFoundError("Commit", sha);
      }

      // Get unified diff using the git commits diff endpoint
      let diff = "";
      try {
        const diffResponse = await client.repos.repoDownloadCommitDiffOrPatch(
          owner,
          repo,
          sha,
          "diff",
          { format: "text" },
        );

        // Strip commit metadata to get clean unified diff
        const rawDiff = diffResponse.data as string;
        diff = stripCommitMetadata(rawDiff);

        logger.debug("Fetched and cleaned commit diff", {
          owner,
          repo,
          sha,
          rawLength: rawDiff.length,
          cleanedLength: diff.length,
        });
      } catch (error) {
        logger.error("Failed to fetch commit diff", {
          owner,
          repo,
          sha,
          error: error instanceof Error ? error.message : String(error),
        });
        // Keep diff as empty string, don't throw - diff is optional
      }

      const parents = commit.parents || [];

      // Parse diff to extract per-file statistics
      const diffStats = parseFileStatsFromDiff(diff);

      return {
        sha: commit.sha || "",
        message: commit.commit?.message || "",
        author: {
          name: commit.commit?.author?.name || "",
          email: commit.commit?.author?.email || "",
          date: commit.commit?.author?.date || "",
        },
        committer: commit.commit?.committer
          ? {
              name: commit.commit.committer.name || "",
              email: commit.commit.committer.email || "",
              date: commit.commit.committer.date || "",
            }
          : undefined,
        files: commitFileChanges(commit.files || [], diffStats),
        stats: {
          additions: commit.stats?.additions || 0,
          deletions: commit.stats?.deletions || 0,
          total: commit.stats?.total || 0,
        },
        diff,
        parents: parents.map((p) => p.sha || ""),
      };
    } catch (error) {
      if (error instanceof DomainError) throw error;
      if (isMissingCommitLookupError(error)) {
        throw new NotFoundError("Commit", sha);
      }
      logger.error("Error fetching commit details from Gitea", {
        owner,
        repo,
        sha,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new InternalServerError(
        "Failed to fetch commit details from Gitea",
        error instanceof Error ? error : undefined,
      );
    }
  }
}
