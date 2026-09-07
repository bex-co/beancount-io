import type { IPullRequestService } from "../service/pull-request-service";
import type { Identity } from "@/server/api/identity";
import type { IModels } from "@/foundation/models";
import type { DbExecutor } from "@/drizzle/drizzle";
import { DomainError, UnauthenticatedError } from "@/shared/errors";
import type { PullRequestDetails } from "../service/pull-request.types";
export interface CreatePullRequestInput {
  ledgerOwner: string;
  ledgerName: string;
  title: string;
  description?: string | null;
  baseBranch: string;
  changes: Array<{ path: string; content: string }>;
}
export interface PullRequestResult {
  success: boolean;
  message?: string;
  prNumber?: number;
  prUrl?: string;
}
export interface IPullRequestWorkflow {
  createPullRequestFromPatch(
    input: CreatePullRequestInput,
    identity: Identity,
  ): Promise<PullRequestResult>;
  getPullRequestDetails(
    owner: string,
    name: string,
    number: number,
    identity: Identity,
  ): Promise<PullRequestDetails>;
  approvePullRequest(
    owner: string,
    name: string,
    number: number,
    identity: Identity,
  ): Promise<PullRequestResult>;
  rejectPullRequest(
    owner: string,
    name: string,
    number: number,
    identity: Identity,
  ): Promise<PullRequestResult>;
}
export class PullRequestWorkflow implements IPullRequestWorkflow {
  constructor(
    private readonly pullRequestService: IPullRequestService,
    private readonly models: Pick<IModels, "user">,
    private readonly db: DbExecutor,
  ) {}
  private async getCurrentUser(identity: Identity) {
    const user = await this.models.user.getById(this.db, identity.userId);
    if (!user) throw new UnauthenticatedError("User not found");
    return user;
  }
  /** Whether the caller holds repository credentials; the shared preamble. */
  private async hasLedgerCredentials(identity: Identity): Promise<boolean> {
    const user = await this.getCurrentUser(identity);
    return Boolean(user.ledger_username && user.ledger_password);
  }
  private static readonly MISSING_CREDENTIALS: PullRequestResult = {
    success: false,
    message: "Ledger credentials not configured",
  };
  async createPullRequestFromPatch(
    input: CreatePullRequestInput,
    identity: Identity,
  ): Promise<PullRequestResult> {
    try {
      if (!(await this.hasLedgerCredentials(identity))) {
        return PullRequestWorkflow.MISSING_CREDENTIALS;
      }

      const result = await this.pullRequestService.createPRFromPatch(
        identity,
        input.ledgerOwner,
        input.ledgerName,
        input.title,
        input.description || "",
        input.baseBranch,
        input.changes,
      );

      return {
        success: true,
        prNumber: result.prNumber,
        prUrl: result.prUrl,
        message: "Pull request created successfully",
      };
    } catch (error) {
      if (error instanceof DomainError) throw error;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        message: `Failed to create PR: ${errorMessage}`,
      };
    }
  }

  async getPullRequestDetails(
    ledgerOwner: string,
    ledgerName: string,
    prNumber: number,
    identity: Identity,
  ): Promise<PullRequestDetails> {
    if (!(await this.hasLedgerCredentials(identity))) {
      throw new Error("Ledger credentials not configured");
    }

    return await this.pullRequestService.getPRDetails(
      identity,
      ledgerOwner,
      ledgerName,
      prNumber,
    );
  }

  approvePullRequest(
    ledgerOwner: string,
    ledgerName: string,
    prNumber: number,
    identity: Identity,
  ): Promise<PullRequestResult> {
    return this.review("mergePR", ledgerOwner, ledgerName, prNumber, identity);
  }

  rejectPullRequest(
    ledgerOwner: string,
    ledgerName: string,
    prNumber: number,
    identity: Identity,
  ): Promise<PullRequestResult> {
    return this.review("closePR", ledgerOwner, ledgerName, prNumber, identity);
  }

  private async review(
    operation: "mergePR" | "closePR",
    ledgerOwner: string,
    ledgerName: string,
    prNumber: number,
    identity: Identity,
  ): Promise<PullRequestResult> {
    if (!(await this.hasLedgerCredentials(identity))) {
      return PullRequestWorkflow.MISSING_CREDENTIALS;
    }

    const result = await this.pullRequestService[operation](
      identity,
      ledgerOwner,
      ledgerName,
      prNumber,
    );

    return {
      success: result.success,
      message: result.message,
    };
  }
}
