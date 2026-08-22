import type { IGiteaClientFactory } from "@/foundation/clients/gitea-client-factory";
import { parseLedgerId } from "@/shared/str";
import type {
  CommitListItem,
  CommitDetails,
} from "../api/commits-resolver.types";
import { logger } from "@/shared/logger";

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

/**
 * Parses a unified diff to extract per-file statistics (additions/deletions).
 *
 * @param diff - Unified diff string (output from git diff)
 * @returns Map of filename to {additions, deletions} stats
 */
export function parseFileStatsFromDiff(
  diff: string,
): Map<string, { additions: number; deletions: number }> {
  const fileStats = new Map<string, { additions: number; deletions: number }>();

  if (!diff || diff.trim() === "") {
    return fileStats;
  }

  let currentFile = "";
  const lines = diff.split("\n");

  for (const line of lines) {
    // Match file header: diff --git a/file.txt b/file.txt
    if (line.startsWith("diff --git")) {
      const match = line.match(/b\/(.+)$/);
      if (match) {
        currentFile = match[1];
        fileStats.set(currentFile, { additions: 0, deletions: 0 });
      }
    }
    // Count additions (lines starting with + but not +++)
    else if (currentFile && line.startsWith("+") && !line.startsWith("+++")) {
      const stats = fileStats.get(currentFile);
      if (stats) {
        stats.additions += 1;
      }
    }
    // Count deletions (lines starting with - but not ---)
    else if (currentFile && line.startsWith("-") && !line.startsWith("---")) {
      const stats = fileStats.get(currentFile);
      if (stats) {
        stats.deletions += 1;
      }
    }
  }

  return fileStats;
}

export interface ListCommitsInput {
  userId?: string;
  ledgerId: string;
  branch?: string;
  page?: number;
  limit?: number;
}

export interface GetCommitDetailsInput {
  userId?: string;
  ledgerId: string;
  sha: string;
}

export interface ICommitsService {
  listCommits(input: ListCommitsInput): Promise<CommitListItem[]>;
  getCommitDetails(input: GetCommitDetailsInput): Promise<CommitDetails>;
}

export class CommitsService implements ICommitsService {
  constructor(private readonly giteaClientFactory: IGiteaClientFactory) {}

  async listCommits({
    userId,
    ledgerId,
    branch = "main",
    page = 1,
    limit = 30,
  }: ListCommitsInput): Promise<CommitListItem[]> {
    const { ledgerOwner: owner, ledgerName: repo } = parseLedgerId(ledgerId);
    try {
      const client = await this.giteaClientFactory.getPublicApiClient(
        ledgerId,
        userId,
      );

      const response = await client.repos.repoGetAllCommits(
        owner,
        repo,
        {
          sha: branch,
          page,
          limit,
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
      logger.error("Error fetching commits from Gitea", {
        owner,
        repo,
        branch,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `Failed to fetch commits from Gitea: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getCommitDetails({
    userId,
    ledgerId,
    sha,
  }: GetCommitDetailsInput): Promise<CommitDetails> {
    const { ledgerOwner: owner, ledgerName: repo } = parseLedgerId(ledgerId);
    try {
      const client = await this.giteaClientFactory.getPublicApiClient(
        ledgerId,
        userId,
      );

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
        logger.error("Commit not found in repository", {
          owner,
          repo,
          sha,
        });
        throw new Error(`Commit ${sha} not found`);
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
        files: (commit.files || []).map((f) => {
          const filename = f.filename || "";
          const stats = diffStats.get(filename) || {
            additions: 0,
            deletions: 0,
          };

          return {
            filename,
            additions: stats.additions,
            deletions: stats.deletions,
          };
        }),
        stats: {
          additions: commit.stats?.additions || 0,
          deletions: commit.stats?.deletions || 0,
          total: commit.stats?.total || 0,
        },
        diff,
        parents: parents.map((p) => p.sha || ""),
      };
    } catch (error) {
      logger.error("Error fetching commit details from Gitea", {
        owner,
        repo,
        sha,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `Failed to fetch commit details from Gitea: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
