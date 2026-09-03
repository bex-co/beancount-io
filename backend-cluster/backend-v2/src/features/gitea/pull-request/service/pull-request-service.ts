import { logger } from "@/shared/logger";
import type { DbExecutor } from "@/drizzle/drizzle";
import type { IModels } from "@/foundation/models";
import type { IGiteaClientFactory } from "@/foundation/clients/gitea-client-factory";
import type {
  ContentsResponse,
  ChangedFile,
} from "@/features/gitea/client/gitea-api";
import axios from "axios";
import type {
  PullRequestDetails,
  PRFileChange,
} from "../api/pull-request-resolver.types";
import type { Identity } from "@/server/api/identity";
import {
  AUTHORIZATION_ACTIONS,
  ledgerResource,
  type IAuthorizationService,
} from "@/server/api/authorization";
import { createLedgerId } from "@/shared/str";

export interface IPullRequestService {
  createPRFromPatch(
    identity: Identity,
    owner: string,
    repo: string,
    title: string,
    description: string,
    baseBranch: string,
    changes: Array<{ path: string; content: string }>,
  ): Promise<{ prNumber: number; prUrl: string }>;
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
    private readonly models: Pick<IModels, "user">,
    private readonly db: DbExecutor,
    private readonly authorization: IAuthorizationService,
  ) {}

  async createPRFromPatch(
    identity: Identity,
    owner: string,
    repo: string,
    title: string,
    description: string,
    baseBranch: string,
    changes: Array<{ path: string; content: string }>,
  ): Promise<{ prNumber: number; prUrl: string }> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.LEDGER_PULL_REQUEST_CREATE,
      resource: ledgerResource(createLedgerId(owner, repo)),
    });
    const userId = identity.userId;
    const client = await this.giteaClientFactory.getUserApiClient(userId);

    // 1. Create unique branch name
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const headBranch = `pr-patch-${timestamp}-${random}`;

    try {
      // 2. Get base branch reference
      const baseBranchRef = await client.repos.repoGetBranch(
        owner,
        repo,
        baseBranch,
      );
      if (!baseBranchRef.data) {
        throw new Error(
          `Base branch '${baseBranch}' not found in repository ${owner}/${repo}`,
        );
      }

      // 3. Create new branch from base
      const createBranchResult = await client.repos.repoCreateBranch(
        owner,
        repo,
        {
          new_branch_name: headBranch,
          old_ref_name: baseBranch,
        },
      );

      if (!createBranchResult.data) {
        throw new Error(`Failed to create branch ${headBranch}`);
      }

      // 4. Apply file changes to new branch
      for (const change of changes) {
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
          await client.repos.repoUpdateFile(owner, repo, change.path, {
            content,
            sha: fileSha,
            branch: headBranch,
            message: `Update ${change.path}`,
          });
        } else {
          await client.repos.repoCreateFile(owner, repo, change.path, {
            content,
            branch: headBranch,
            message: `Create ${change.path}`,
          });
        }
      }

      // 5. Create pull request
      const prResult = await client.repos.repoCreatePullRequest(owner, repo, {
        title,
        body: description,
        head: headBranch,
        base: baseBranch,
      });

      if (!prResult.data) {
        throw new Error("Failed to create pull request");
      }

      return {
        prNumber: prResult.data.number || 0,
        prUrl: prResult.data.html_url || "",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to create PR from patch: ${errorMessage}`);
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
    const user = await this.models.user.getById(this.db, userId);
    if (!user) {
      throw new Error("User not found");
    }
    const baseUrl = "http://gitea:3000/api/v1";
    const authHeader = `Basic ${Buffer.from(`${user.ledger_username}:${user.ledger_password}`).toString("base64")}`;

    try {
      // Get PR metadata
      const [prResponse, filesResponse, diffResponse] = await Promise.all([
        axios.get(`${baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}`, {
          headers: { Authorization: authHeader },
        }),
        axios.get(`${baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}/files`, {
          headers: { Authorization: authHeader },
        }),
        axios.get(`${baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}.diff`, {
          headers: { Authorization: authHeader },
        }),
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
