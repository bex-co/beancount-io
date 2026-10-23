import {
  assertPortableRepoPath,
  assertSafeRepoPath,
} from "@/features/ledger/utils/safe-repo-path";
import { assertNoPortableTwin } from "@/features/ledger/utils/portable-twin";
import { logger } from "@/shared/logger";
import {
  BadUserInputError,
  DomainError,
  ErrorCategory,
  InternalServerError,
  NotFoundError,
  ResourceLimitReachedError,
} from "@/shared/errors";
import type { IGiteaClientFactory } from "@/foundation/clients/gitea-client-factory";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import type { DirectiveLimitLookupDeps } from "@/features/ledger/operations/directive-limit-lookup";
import {
  directiveLimitMergeRefusal,
  evaluateMergeDirectiveLimit,
  type DirectiveLimitVerdict,
} from "@/features/gitea/policy/directive-limit-gate";
import type {
  Api as GiteaApi,
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

/**
 * The HTTP status of a refusal the generated Gitea client threw. It throws the
 * response itself rather than an Error, so the status is the one reliable
 * thing a catch can read off it.
 */
function clientFailureStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

/**
 * Gitea's own words for a failed call. The generated client parses the body
 * as JSON from a clone, so a text body (a proxy's error page, a panic) is
 * still readable from the thrown response when that parse failed.
 */
async function clientFailureDetail(
  error: unknown,
): Promise<string | undefined> {
  if (error instanceof Error) return error.message;
  if (typeof error !== "object" || error === null) return undefined;
  const body = (error as { error?: unknown }).error;
  if (typeof body === "string") return body.trim() || undefined;
  if (body instanceof Error) {
    const text = (error as { text?: unknown }).text;
    if (typeof text !== "function") return undefined;
    try {
      const raw = String(await (text as () => Promise<string>).call(error));
      return raw.trim().slice(0, 500) || undefined;
    } catch {
      return undefined;
    }
  }
  const message = (body as { message?: unknown } | null)?.message;
  return typeof message === "string" ? message.trim() || undefined : undefined;
}

/** A Gitea call that failed at a named step of creating a pull request. */
class PullRequestStepFailure extends Error {
  constructor(
    readonly step: string,
    readonly status: number | undefined,
    detail: string | undefined,
  ) {
    super(
      `${status === undefined ? "Gitea request failed" : `Gitea ${status}`} while ${step}${
        detail
          ? `: ${detail}`
          : // Gitea in production mode tells a non-admin caller nothing about
            // an internal error; the cause is only in its own log.
            status !== undefined && status >= 500
            ? " (Gitea gave no reason; its server log has the cause)"
            : ""
      }`,
    );
    this.name = "PullRequestStepFailure";
  }

  /** The repository server failed or could not be reached, not the request. */
  get serverSide(): boolean {
    return this.status === undefined || this.status >= 500;
  }
}

/**
 * A pull request create the repository server failed. SERVICE_UNAVAILABLE
 * rather than an internal error: the request was sound, every surface keeps
 * the step-named message, and the hint says whether a retry can help.
 */
class RepositoryStepUnavailableError extends DomainError {
  constructor(failure: PullRequestStepFailure) {
    const transient =
      failure.status === undefined ||
      failure.status === 502 ||
      failure.status === 503 ||
      failure.status === 504;
    super(
      ErrorCategory.SERVICE_UNAVAILABLE,
      `Could not create the pull request: ${failure.message}. No pull request was opened.`,
      {
        step: failure.step,
        ...(failure.status !== undefined && { upstreamStatus: failure.status }),
        hint: transient
          ? "The repository server is unreachable or overloaded. Retry with backoff; the request itself is fine."
          : "The repository server failed at this step. A retry later may succeed; changing the request will not help.",
      },
    );
  }
}

/**
 * What a failed merge or close reports.
 *
 * A number Gitea does not know is thrown as NOT_FOUND: there is no pull
 * request to return a review result about. Any other refusal — already
 * merged, conflicts, a closed pull request — stays a `success: false` result,
 * described from the response the client threw rather than as "Unknown
 * error", which is all its missing `Error.message` used to leave.
 */
function reviewFailure(
  error: unknown,
  prNumber: number,
): { success: false; message: string } {
  if (clientFailureStatus(error) === 404) {
    throw new NotFoundError("Pull request", String(prNumber));
  }
  return { success: false, message: describeClientFailure(error) };
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

/** What merge needs to hold a pull request to the ledger's directive limit. */
export interface MergeDirectiveLimitDeps extends DirectiveLimitLookupDeps {
  favaClientFactory: IFavaClientFactory;
}

export class PullRequestService implements IPullRequestService {
  constructor(
    private readonly giteaClientFactory: IGiteaClientFactory,
    private readonly authorization: IAuthorizationService,
    private readonly directiveLimit: MergeDirectiveLimitDeps,
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
    // Refused before any branch exists: with nothing to apply there is nothing
    // a pull request could hold, and discovering that only after step 3 left
    // a `pr-patch-*` branch behind on every such call (w5/053).
    if (input.changes.length === 0) {
      throw new BadUserInputError(
        "changes must not be empty — a pull request needs at least one file to change",
        "changes",
      );
    }
    // Every path has to be safe up front. Portability (w23/054) is held only to
    // a path the change creates, once it is known to be new: a file committed
    // before the rule, such as `aux.bean`, stays editable (w21/567).
    for (const change of input.changes) assertSafeRepoPath(change.path);
    const userId = identity.userId;
    const client = await this.giteaClientFactory.getUserApiClient(userId);

    // 1. Create unique branch name
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const headBranch = `pr-patch-${timestamp}-${random}`;
    let branchCreated = false;

    // Every Gitea call below is one named step, so a failure says which one
    // failed and Gitea's own words for it, and is logged with both.
    const step = async <T>(
      name: string,
      call: () => Promise<T>,
    ): Promise<T> => {
      try {
        return await call();
      } catch (error) {
        if (error instanceof DomainError) throw error;
        const status = clientFailureStatus(error);
        const detail = await clientFailureDetail(error);
        logger.error("Gitea call failed while creating a pull request", {
          owner,
          repo,
          step: name,
          status,
          detail,
        });
        throw new PullRequestStepFailure(name, status, detail);
      }
    };

    try {
      // 2. Get base branch reference (`format` is load-bearing: without it
      // the generated client resolves `data` to null and every check below
      // misfires against a live Gitea.)
      const baseBranchRef = await step(`reading branch ${baseBranch}`, () =>
        client.repos
          .repoGetBranch(owner, repo, baseBranch, { format: "json" })
          .catch((error: unknown) => {
            // The client throws on a 404 rather than resolving empty data, so
            // the guard below never saw an unknown branch: it fell through to
            // the catch-all and read as a server fault to retry.
            if (clientFailureStatus(error) === 404) return { data: null };
            throw error;
          }),
      );
      if (!baseBranchRef.data) {
        throw new NotFoundError(
          "Branch",
          baseBranch,
          `No branch named '${baseBranch}' in ${owner}/${repo}. Pass an existing branch as baseBranch.`,
        );
      }
      const baseSha = baseBranchRef.data.commit?.id ?? "";

      // 3. Create new branch from base
      const createBranchResult = await step(
        `creating branch ${headBranch}`,
        () =>
          client.repos.repoCreateBranch(
            owner,
            repo,
            {
              new_branch_name: headBranch,
              old_ref_name: baseBranch,
            },
            { format: "json" },
          ),
      );

      if (!createBranchResult.data) {
        throw new Error(`Failed to create branch ${headBranch}`);
      }
      branchCreated = true;

      // 4. Apply file changes to new branch
      for (const change of input.changes) {
        // Only Gitea's 404 means the file is new; any other failure reading
        // it is this step's, not a reason to try creating a file that exists.
        const fileContents = await step(`reading ${change.path}`, () =>
          client.repos
            .repoGetContents(
              owner,
              repo,
              change.path,
              {
                ref: headBranch,
              },
              { format: "json" },
            )
            .catch((error: unknown) => {
              if (clientFailureStatus(error) === 404) return null;
              throw error;
            }),
        );
        // Type assertion: repoGetContents returns ContentsResponse
        const fileSha = (fileContents?.data as ContentsResponse | undefined)
          ?.sha;

        // Update or create file
        const content = Buffer.from(change.content).toString("base64");
        // A new file's name has to be portable, and not be one the branch
        // has already on macOS and Windows (w23/068), a file this request
        // created included; the branch is deleted if not.
        if (!fileSha) {
          assertPortableRepoPath(change.path);
          await assertNoPortableTwin(change.path, async (dir) => {
            const listing = await step<{ data: unknown }>(
              `listing ${dir ?? "/"}`,
              () =>
                dir === undefined
                  ? client.repos.repoGetContentsList(
                      owner,
                      repo,
                      { ref: headBranch },
                      { format: "json" },
                    )
                  : client.repos.repoGetContents(
                      owner,
                      repo,
                      dir,
                      { ref: headBranch },
                      { format: "json" },
                    ),
            );
            return Array.isArray(listing.data)
              ? (listing.data as ContentsResponse[]).flatMap((entry) =>
                  entry.path ? [{ path: entry.path }] : [],
                )
              : [];
          });
        }

        await step(`writing ${change.path}`, () =>
          fileSha
            ? client.repos.repoUpdateFile(
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
              )
            : client.repos.repoCreateFile(
                owner,
                repo,
                change.path,
                {
                  content,
                  branch: headBranch,
                  message: clearCommitMessage,
                },
                { format: "json" },
              ),
        );
      }

      // 5. Verify the branch actually differs from base, unless the caller
      // takes responsibility with fastForward. The revisions travel in the
      // refusal so the agent can re-verify them instead of guessing.
      if (!input.fastForward) {
        const headRef = await step(`reading branch ${headBranch}`, () =>
          client.repos.repoGetBranch(owner, repo, headBranch, {
            format: "json",
          }),
        );
        const headSha = headRef.data?.commit?.id ?? "";
        const comparison = await step(
          `comparing ${headBranch} with ${baseBranch}`,
          () =>
            client.repos.repoCompareDiff(
              owner,
              repo,
              `${baseBranch}...${headBranch}`,
              { format: "json" },
            ),
        );
        if ((comparison.data?.total_commits ?? 0) === 0) {
          throw new BadUserInputError(
            `No differences between ${baseBranch} (${baseSha || "unknown"}) and ${headBranch} (${headSha || "unknown"}): re-verify the revisions, change the files, or pass fastForward: true to open the pull request anyway`,
          );
        }
      }

      // 6. Create pull request
      const prResult = await step("opening the pull request", () =>
        client.repos.repoCreatePullRequest(
          owner,
          repo,
          {
            title,
            body: description,
            head: headBranch,
            base: baseBranch,
          },
          { format: "json" },
        ),
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
      // No pull request was opened, so the branch minted for it has no
      // purpose: a refusal that leaves it behind litters one branch per
      // failed call. Best effort — the original failure is what the caller
      // needs, and a cleanup that fails must not replace it.
      if (branchCreated) {
        await client.repos
          .repoDeleteBranch(owner, repo, headBranch)
          .catch((cleanupError: unknown) => {
            logger.warn("Failed to delete an unused pull request branch", {
              owner,
              repo,
              headBranch,
              error: describeClientFailure(cleanupError),
            });
          });
      }
      if (error instanceof DomainError) throw error;
      if (error instanceof PullRequestStepFailure && error.serverSide) {
        throw new RepositoryStepUnavailableError(error);
      }
      // A refusal by the repository keeps the success:false result.
      throw new Error(
        error instanceof PullRequestStepFailure
          ? error.message
          : `Failed to create PR from patch: ${describeClientFailure(error)}`,
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

      if (!pr) throw new NotFoundError("Pull request", String(prNumber));

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
      if (error instanceof DomainError) throw error;
      // A pull request number Gitea does not know is the caller's to fix, not
      // a server fault to retry.
      if (clientFailureStatus(error) === 404) {
        throw new NotFoundError("Pull request", String(prNumber));
      }
      logger.error("Gitea API error fetching PR", {
        error: describeClientFailure(error),
      });
      throw new InternalServerError(
        "Failed to fetch PR details",
        error instanceof Error ? error : undefined,
      );
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
    await this.assertMergeWithinDirectiveLimit(
      client,
      userId,
      owner,
      repo,
      prNumber,
    );

    try {
      await client.repos.repoMergePullRequest(owner, repo, prNumber, {
        Do: "merge", // or "squash", "rebase"
      });

      return { success: true, message: "PR merged successfully" };
    } catch (error) {
      return reviewFailure(error, prNumber);
    }
  }

  /**
   * Refuse a merge that would take a free ledger past its directive limit, the
   * same rule every other app write path enforces (w0/m6). Anything that stops
   * the check (an unreadable pull request, the limit or a count failing) lets
   * the merge proceed, and the merge reports its own failure as before.
   */
  private async assertMergeWithinDirectiveLimit(
    client: GiteaApi<unknown>,
    userId: string,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<void> {
    let verdict: DirectiveLimitVerdict;
    try {
      const { data: pr } = await client.repos.repoGetPullRequest(
        owner,
        repo,
        prNumber,
      );
      verdict =
        pr.head?.sha && pr.merge_base
          ? await evaluateMergeDirectiveLimit(
              {
                ...this.directiveLimit,
                ledgerClient:
                  await this.directiveLimit.favaClientFactory.getPublicApiClient(
                    createLedgerId(owner, repo),
                    userId,
                  ),
              },
              owner,
              repo,
              { head: pr.head.sha, mergeBase: pr.merge_base },
            )
          : {
              decision: "unknown",
              reason: "pull request has no head or merge base",
            };
    } catch (error) {
      verdict = { decision: "unknown", reason: describeClientFailure(error) };
    }
    if (verdict.decision === "unknown") {
      logger.warn("merge directive-limit check failed open", {
        owner,
        repo,
        prNumber,
        reason: verdict.reason,
      });
    }
    if (verdict.decision === "over") {
      throw new ResourceLimitReachedError(
        "directives",
        verdict.limit,
        verdict.count,
        directiveLimitMergeRefusal(verdict.count, verdict.limit),
      );
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
      return reviewFailure(error, prNumber);
    }
  }
}
