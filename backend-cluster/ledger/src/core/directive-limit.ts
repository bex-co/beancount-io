import type { Api as GiteaApi } from "@/features/gitea/client/gitea-api";
import {
  loadCachedFileMapForRepo,
  resolveHeadShaCoalesced,
  type GiteaCommitClient,
} from "@/foundation/clients/load-cached-ledger-file-map";
import { getCacheHelper } from "@/foundation/clients/build-cache";
import { withLedger } from "@/foundation/rustledger";
import { getMaxDirectives } from "@/core/backend-v2-limits";
import { DomainError, ErrorCategory } from "@/shared/errors";
import { logger } from "@/shared/logger";

const log = logger.child({ module: "directive-limit" });
const BEAN_FILE_RE = /\.(bean|beancount)$/;

/**
 * Python `DirectiveLimitExceededError` → 403 `directive_limit_exceeded`.
 */
class DirectiveLimitExceededError extends DomainError {
  constructor(limit: number, currentEstimate: number) {
    super(
      ErrorCategory.RESOURCE_LIMIT_REACHED,
      `This ledger has reached its free-tier limit of ${limit} directives ` +
        `(this change would bring it to approximately ${currentEstimate}). ` +
        "Deleting entries still works and is how to get back under the limit; " +
        "upgrading removes it entirely.",
      {
        code: "directive_limit_exceeded",
        details: { limit, current: currentEstimate },
      },
      403,
    );
  }
}

async function countMap(files: Record<string, string>): Promise<number> {
  if (!files["main.bean"]) return 0;
  return withLedger(files, "main.bean", (ledger) => ledger.directiveCount());
}

export interface DirectiveCount {
  count: number;
  /** The commit the count was computed from; null if the repo has no commits. */
  sha: string | null;
}

/**
 * How many directives a ledger currently holds.
 *
 * Deliberately the same counter the app write path and the dashboard use —
 * `loadCachedFileMapForRepo` follows `include` into multi-file ledgers, which a
 * cheaper scan of the root file would miss, and a second implementation would
 * eventually disagree with this one about what counts as a directive.
 *
 * Reads through the caller's own Gitea client, so repository access is checked
 * by Gitea rather than reimplemented here.
 */
export async function countDirectivesForRepo(
  client: GiteaApi<unknown>,
  owner: string,
  repoName: string,
): Promise<DirectiveCount> {
  const commitClient = client as unknown as GiteaCommitClient;
  const [sha, { files }] = await Promise.all([
    resolveHeadShaCoalesced(commitClient, owner, repoName),
    loadCachedFileMapForRepo(commitClient, getCacheHelper(), owner, repoName),
  ]);
  return { count: await countMap(files), sha: sha ?? null };
}

/**
 * The directive-limit check for the app-mediated write paths (Python
 * `check_directive_limit_for_file_changes_or_raise`).
 *
 * Throws when the change would leave the ledger over the limit **and** makes it
 * bigger — so it refuses a write that crosses the threshold as well as one that
 * grows an already-over ledger, and never refuses a shrinking write.
 *
 * **FAIL OPEN on every error path.** Failing closed would lock the write and
 * the push at the same moment — and because a parse failure is itself one of the
 * error paths, a user whose ledger has a syntax error could not even fix it.
 * The cost of failing open is a few extra directives during an outage, which the
 * next write catches.
 *
 * `fileChanges` maps repo-relative path → proposed new BASE64 content, or
 * null for a deletion. Non-.bean paths are skipped.
 */
export interface DirectiveLimitOptions {
  /**
   * Skip the check entirely for this write. Intended for callers that are
   * exempt from the per-ledger limit by product policy.
   */
  exempt?: boolean;
}

export async function checkDirectiveLimitForFileChanges(
  client: GiteaApi<unknown>,
  owner: string,
  repoName: string,
  fileChanges: Record<string, string | null>,
  options: DirectiveLimitOptions = {},
): Promise<void> {
  if (options.exempt) return;

  const beanChanges = Object.entries(fileChanges).filter(([path]) =>
    BEAN_FILE_RE.test(path),
  );
  if (beanChanges.length === 0) return;

  let limit: number | null;
  let currentTotal: number;
  let projectedTotal: number;
  try {
    limit = await getMaxDirectives(owner);
    if (limit === null || limit < 0) return;

    const { files } = await loadCachedFileMapForRepo(
      client as unknown as GiteaCommitClient,
      getCacheHelper(),
      owner,
      repoName,
    );
    currentTotal = await countMap(files);

    const projected: Record<string, string> = { ...files };
    for (const [path, newBase64] of beanChanges) {
      if (newBase64 === null) {
        delete projected[path];
      } else {
        projected[path] = Buffer.from(newBase64, "base64").toString("utf8");
      }
    }
    projectedTotal = await countMap(projected);
  } catch (err) {
    log.warn("directive-limit pre-check failed open", { owner, repoName, err });
    return;
  }

  if (projectedTotal > limit && projectedTotal > currentTotal) {
    throw new DirectiveLimitExceededError(limit, projectedTotal);
  }
}
