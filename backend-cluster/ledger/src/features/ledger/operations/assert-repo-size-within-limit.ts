import { ResourceLimitReachedError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { config } from "@/config";

const log = logger.child({ module: "repo-size-limit" });
const TREE_PAGE_LIMIT = 100;

/** Narrow Gitea tree API used by the friendly pre-write estimate. */
export interface GiteaTreeSizeClient {
  repos: {
    getTree(
      owner: string,
      repo: string,
      sha: string,
      query?: { recursive?: boolean; page?: number; per_page?: number },
    ): Promise<{
      data?: {
        tree?: Array<{ type?: string; size?: number }>;
        truncated?: boolean;
      } | null;
    }>;
  };
}

/** Sum every blob in the current main tree, following Gitea pagination. */
async function getMainTreeSizeBytes(
  client: GiteaTreeSizeClient,
  owner: string,
  repo: string,
): Promise<number> {
  let total = 0;
  let page = 1;
  let truncated = true;

  while (truncated && page <= TREE_PAGE_LIMIT) {
    const response = await client.repos.getTree(owner, repo, "main", {
      recursive: true,
      page,
      per_page: 1000,
    });
    for (const entry of response.data?.tree ?? []) {
      if (entry.type !== "blob") continue;
      if (
        !Number.isSafeInteger(entry.size) ||
        (entry.size as number) < 0 ||
        !Number.isSafeInteger(total + (entry.size as number))
      ) {
        throw new Error("Gitea returned an invalid tree blob size");
      }
      total += entry.size as number;
    }
    truncated = response.data?.truncated === true;
    page += 1;
  }

  if (truncated) {
    throw new Error("Gitea tree listing exceeded the pagination safety bound");
  }
  return total;
}

/**
 * Resolve the owner's `maxRepoSizeKb` from backend-v2's admin endpoint
 * (`GET /api/admin/ledger-limits/{ledgerUsername}`) — ledger-v2's replacement
 * for the donor branch's in-process Stripe/DB tier lookup. Returns undefined
 * (→ fail open) when unconfigured or on any error; `-1`/null = unlimited.
 */
async function fetchMaxRepoSizeKb(
  ledgerOwner: string,
): Promise<number | undefined> {
  const { hostName, httpPort, adminToken } = config.backendV2;
  if (!adminToken) return undefined;
  const res = await fetch(
    `http://${hostName}:${httpPort}/api/admin/ledger-limits/${encodeURIComponent(ledgerOwner)}`,
    { headers: { "x-admin-token": adminToken } },
  );
  if (!res.ok) return undefined;
  const body = (await res.json()) as {
    maxRepoSizeKb?: number | null;
    limits?: { maxRepoSizeKb?: number | null };
  };
  const max = body.maxRepoSizeKb ?? body.limits?.maxRepoSizeKb;
  return max === null || max === undefined ? -1 : max;
}

/**
 * Friendly, best-effort free-tier check for app-mediated append paths, same
 * metric as the authoritative Gitea pre-receive hook: uncompressed bytes of
 * every blob in the current/proposed `main` tree. Not authoritative; owner /
 * tier / Gitea failures FAIL OPEN. Only a known projected snapshot above the
 * cap throws {@link ResourceLimitReachedError}. Unlimited tiers use `-1`.
 */
export async function assertRepoSizeWithinLimit(params: {
  giteaClient: GiteaTreeSizeClient;
  ledgerOwner: string;
  ledgerName: string;
  /** Bytes appended/created by this write. */
  pendingBytes: number;
}): Promise<void> {
  const { giteaClient, ledgerOwner, ledgerName, pendingBytes } = params;

  let maxRepoSizeKb: number | undefined;
  try {
    maxRepoSizeKb = await fetchMaxRepoSizeKb(ledgerOwner);
  } catch (error) {
    log.warn("tier resolution failed; allowing write (fail-open)", {
      ledgerOwner,
      ledgerName,
      error,
    });
    return;
  }
  if (maxRepoSizeKb === undefined || maxRepoSizeKb < 0) return;

  let currentSizeBytes: number;
  try {
    currentSizeBytes = await getMainTreeSizeBytes(
      giteaClient,
      ledgerOwner,
      ledgerName,
    );
  } catch (error) {
    log.warn("tree-size lookup failed; allowing write (fail-open)", {
      ledgerOwner,
      ledgerName,
      error,
    });
    return;
  }

  const projectedKb = Math.ceil((currentSizeBytes + pendingBytes) / 1024);
  if (projectedKb > maxRepoSizeKb) {
    throw new ResourceLimitReachedError(
      "Ledger size (KB)",
      maxRepoSizeKb,
      projectedKb,
    );
  }
}
