import { assertSafeRepoPath } from "@/features/ledger/utils/safe-repo-path";
import { logger } from "@/shared/logger";
import { BadUserInputError, DomainError } from "@/shared/errors";
import type { IGiteaClientFactory } from "@/foundation/clients/gitea-client-factory";
import type {
  ContentsResponse,
  ChangedFile,
} from "@/features/gitea/client/gitea-api";
import type { PullRequestDetails, PRFileChange } from "./pull-request.types";
import type { Identity } from "@/server/api/identity";
import {
  AUTHORIZATION_ACTIONS,
  ledgerResource,
  type IAuthorizationService,
} from "@/server/api/authorization";
import { createLedgerId } from "@/shared/str";

export interface CreatePullRequestInput {
  title: string;
  description: string;
  baseBranch: string;
  /** Commit message for the pull request branch's file changes. */
  clearCommitMessage: string;
  /** Skip the diff-less verification below. */
  fastForward?: boolean;
  changes: Array<{ path: string; content: string }>;
}

/**
 * Render a failure from the generated Gitea client. Non-2xx responses arrive
 * as the thrown response envelope (not an Error), so reading only `.message`
 * reports "Unknown error" for every upstream refusal.
 */
function describeClientFailure(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const status = (error as { status?: unknown }).status;
    const body = (error as { error?: unknown }).error as
      | { message?: unknown }
      | string
      | undefined;
    const detail =
      typeof body === "string"
        ? body
        : typeof body?.message === "string"
          ? body.message
          : undefined;
    if (status !== undefined || detail !== undefined) {
      return `Gitea ${String(status ?? "?")}${detail ? `: ${detail}` : ""}`;
    }
  }
  try {
    return typeof error === "string" ? error : JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

export interface CreatedPullRequest {
  prNumber: number;
  prUrl: string;
  /** The PR's actual base/head refs, read back from the created PR. */
  baseBranch: string;
  headBranch: string;
}

export interface IPullRequestService {
  createPRFromPatch(
    identity: Identity,
    owner: string,
    repo: string,
    input: CreatePullRequestInput,
  ): Promise<CreatedPullRequest>;
  getPRDetails(
    identity: Identity,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<PullRequestDetails>;
  mergePR(
    identity: Identity,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<{ success: boolean; message: string }>;
  closePR(
    identity: Identity,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<{ success: boolean; message: string }>;
}

export class PullRequestService implements IPullRequestService {
  constructor(
    private readonly giteaClientFactory: IGiteaClientFactory,
    private readonly authorization: IAuthorizationService,
  ) {}

  async createPRFromPatch(
    identity: Identity,
    owner: string,
    repo: string,
    input: CreatePullRequestInput,
  ): Promise<CreatedPullRequest> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_PULL_REQUEST_CREATE,
      resource: ledgerResource(createLedgerId(owner, repo)),
    });
    const title = input.title?.trim() ?? "";
    const description = input.description?.trim() ?? "";
    const baseBranch = input.baseBranch?.trim() ?? "";
    const clearCommitMessage = input.clearCommitMessage?.trim() ?? "";
    if (!title) {
      throw new BadUserInputError("title must not be empty");
    }
    if (!description) {
      throw new BadUserInputError(
        "description must not be empty — describe what the pull request changes and why",
      );
    }
    if (!baseBranch) {
      throw new BadUserInputError("baseBranch must not be empty");
    }
    if (!clearCommitMessage) {
      throw new BadUserInputError(
        "clearCommitMessage must not be empty — it becomes the commit message for the pull request branch",
      );
    }
    for (const change of input.changes) assertSafeRepoPath(change.path);
    const userId = identity.userId;
    const client = await this.giteaClientFactory.getUserApiClient(userId);

    // 1. Create unique branch name
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const headBranch = `pr-patch-${timestamp}-${random}`;

    try {
      // 2. Get base branch reference (`format` is load-bearing: without it
      // the generated client resolves `data` to null and every check below
      // misfires against a live Gitea.)
      const baseBranchRef = await client.repos.repoGetBranch(
        owner,
        repo,
        baseBranch,
        { format: "json" },
      );
      if (!baseBranchRef.data) {
        throw new Error(
          `Base branch '${baseBranch}' not found in repository ${owner}/${repo}`,
        );
      }
      const baseSha = baseBranchRef.data.commit?.id ?? "";

      // 3. Create new branch from base
      const createBranchResult = await client.repos.repoCreateBranch(
        owner,
        repo,
        {
          new_branch_name: headBranch,
          old_ref_name: baseBranch,
        },
        { format: "json" },
      );

      if (!createBranchResult.data) {
        throw new Error(`Failed to create branch ${headBranch}`);
      }

      // 4. Apply file changes to new branch
      for (const change of input.changes) {
        // Check if file exists
        let fileSha: string | undefined;
        try {
          const fileContents = await client.repos.repoGetContents(
            owner,
            repo,
            change.path,
            {
              ref: headBranch,
            },
            { format: "json" },
          );
          // Type assertion: repoGetContents returns ContentsResponse
          const contents = fileContents.data as ContentsResponse;
          fileSha = contents.sha;
        } catch {
          // File doesn't exist, will create it
          fileSha = undefined;
        }

        // Update or create file
        const content = Buffer.from(change.content).toString("base64");

        if (fileSha) {
          await client.repos.repoUpdateFile(
            owner,
            repo,
            change.path,
            {
              content,
              sha: fileSha,
              branch: headBranch,
              message: clearCommitMessage,
            },
            { format: "json" },
          );
        } else {
          await client.repos.repoCreateFile(
            owner,
            repo,
            change.path,
            {
              content,
              branch: headBranch,
              message: clearCommitMessage,
            },
            { format: "json" },
          );
        }
      }

      // 5. Verify the branch actually differs from base, unless the caller
      // takes responsibility with fastForward. The revisions travel in the
      // refusal so the agent can re-verify them instead of guessing.
      if (!input.fastForward) {
        const headRef = await client.repos.repoGetBranch(
          owner,
          repo,
          headBranch,
          { format: "json" },
        );
        const headSha = headRef.data?.commit?.id ?? "";
        const comparison = await client.repos.repoCompareDiff(
          owner,
          repo,
          `${baseBranch}...${headBranch}`,
          { format: "json" },
        );
        if ((comparison.data?.total_commits ?? 0) === 0) {
          throw new BadUserInputError(
            `No differences between ${baseBranch} (${baseSha || "unknown"}) and ${headBranch} (${headSha || "unknown"}): re-verify the revisions, change the files, or pass fastForward: true to open the pull request anyway`,
          );
        }
      }

      // 6. Create pull request
      const prResult = await client.repos.repoCreatePullRequest(
        owner,
        repo,
        {
          title,
          body: description,
          head: headBranch,
          base: baseBranch,
        },
        { format: "json" },
      );

      if (!prResult.data) {
        throw new Error("Failed to create pull request");
      }

      // Route the created PR's actual refs through — never a default.
      return {
        prNumber: prResult.data.number || 0,
        prUrl: prResult.data.html_url || "",
        baseBranch: prResult.data.base?.ref || baseBranch,
        headBranch: prResult.data.head?.ref || headBranch,
      };
    } catch (error) {
      if (error instanceof DomainError) throw error;
      throw new Error(
        `Failed to create PR from patch: ${describeClientFailure(error)}`,
      );
    }
  }

  async getPRDetails(
    identity: Identity,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<PullRequestDetails> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_PULL_REQUEST_READ,
      resource: ledgerResource(createLedgerId(owner, repo)),
    });
    const userId = identity.userId;
    const client = await this.giteaClientFactory.getUserApiClient(userId);

    try {
      // Get PR metadata
      const [prResponse, filesResponse, diffResponse] = await Promise.all([
        client.repos.repoGetPullRequest(owner, repo, prNumber, {
          format: "json",
        }),
        client.repos.repoGetPullRequestFiles(owner, repo, prNumber, undefined, {
          format: "json",
        }),
        client.repos.repoDownloadPullDiffOrPatch(
          owner,
          repo,
          prNumber,
          "diff",
          undefined,
          { format: "text" },
        ),
      ]);

      const pr = prResponse.data;

      if (!pr) {
        throw new Error(
          `Pull request #${prNumber} not found in ${owner}/${repo}`,
        );
      }

      // Process files data
      const filesData = filesResponse.data;
      const prFiles: PRFileChange[] = Array.isArray(filesData)
        ? filesData.map((f: ChangedFile) => ({
            filename: f.filename || "",
            additions: f.additions || 0,
            deletions: f.deletions || 0,
            changes: f.changes || 0,
          }))
        : [];

      return {
        number: pr.number || prNumber,
        title: pr.title || "Untitled",
        description: pr.body || "",
        state: pr.state || "unknown",
        author: pr.user?.login || "unknown",
        headBranch: pr.head?.ref || "",
        baseBranch: pr.base?.ref || "",
        files: prFiles,
        diff: diffResponse.data || "",
      };
    } catch (error) {
      logger.error("Gitea API error fetching PR", {
        error: error instanceof Error ? error.message : String(error),
      });
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to fetch PR details: ${errorMessage}`);
    }
  }

  async mergePR(
    identity: Identity,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<{ success: boolean; message: string }> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_PULL_REQUEST_APPROVE,
      resource: ledgerResource(createLedgerId(owner, repo)),
    });
    const userId = identity.userId;
    const client = await this.giteaClientFactory.getUserApiClient(userId);

    try {
      await client.repos.repoMergePullRequest(owner, repo, prNumber, {
        Do: "merge", // or "squash", "rebase"
      });

      return { success: true, message: "PR merged successfully" };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return { success: false, message: errorMessage };
    }
  }

  async closePR(
    identity: Identity,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<{ success: boolean; message: string }> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_PULL_REQUEST_REJECT,
      resource: ledgerResource(createLedgerId(owner, repo)),
    });
    const userId = identity.userId;
    const client = await this.giteaClientFactory.getUserApiClient(userId);

    try {
      await client.repos.repoEditPullRequest(owner, repo, prNumber, {
        state: "closed",
      });

      return { success: true, message: "PR closed successfully" };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return { success: false, message: errorMessage };
    }
  }
}
