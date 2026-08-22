import { ConflictError, DomainError } from "@/shared/errors";
import { toSafeRepoUrlPath } from "@/shared/safe-repo-path";
import { logger } from "@/shared/logger";
import {
  isGiteaNotFound,
  isGiteaWriteConflict,
} from "@/features/gitea/utils/gitea-error";
import { readGiteaFileText } from "@/features/gitea/utils/gitea-file-content";
import { giteaWriteErrorFromCause } from "@/features/ledger/utils/operation-not-allowed-from-cause";

const log = logger.child({ module: "commit-ledger-files" });

/**
 * Transform a file's CURRENT content (or `null` when the file does not yet
 * exist) into its new content. Called with the FRESH content read immediately
 * before the commit, so a read-modify-write is computed against the same
 * snapshot whose blob SHA guards the write — and re-runs on each retry.
 */
export type LedgerFileTransform = (
  currentContent: string | null,
) => string | Promise<string>;

/**
 * A file to CREATE whose content is already base64-encoded (e.g. a binary
 * receipt). Included in the SAME commit as the text transforms so the write is
 * atomic — the binary and the ledger entries that reference it land together or
 * not at all (no orphaned attachment).
 */
export interface RawFileCreate {
  path: string;
  /** Already-base64-encoded content (passed through to Gitea verbatim). */
  contentBase64: string;
}

/** A single Gitea change-files operation. */
interface CommitOperation {
  operation: "create" | "update";
  path: string;
  content: string;
  sha?: string;
}

/** The narrow slice of the Gitea client this helper needs. */
export interface GiteaFileCommitClient {
  repos: {
    repoGetContents(
      owner: string,
      repo: string,
      filepath: string,
      query?: { ref?: string },
    ): Promise<{
      data: {
        content?: string | null;
        encoding?: string | null;
        sha?: string | null;
      };
    }>;
    repoGetRawFileOrLfs?(
      owner: string,
      repo: string,
      filepath: string,
      query?: { ref?: string },
      params?: { format?: "blob" },
    ): Promise<{ data: unknown }>;
    repoChangeFiles(
      owner: string,
      repo: string,
      body: { files: CommitOperation[]; message: string },
    ): Promise<unknown>;
  };
}

/** How many times to re-read + re-apply + re-commit on a CAS conflict. */
const MAX_ATTEMPTS = 5;

// Status/message extraction for the client's Response-shaped rejections and
// the conflict taxonomy (`isGiteaWriteConflict`) are shared with the other
// Gitea-write paths — see `@/features/ledger/utils/gitea-error`.

/**
 * Read a file's current content + blob SHA, or `null` when it does not exist
 * (Gitea `404`). Content and SHA come from the SAME response, so the SHA the
 * commit sends is the SHA of the content the transform actually saw.
 */
async function readFileOrNull(
  client: GiteaFileCommitClient,
  owner: string,
  repo: string,
  path: string,
): Promise<{ content: string; sha: string } | null> {
  try {
    // Transform keys can carry user-authored routing (bcio options) — guard
    // the URL splice like every other repoGetContents call.
    const res = await client.repos.repoGetContents(
      owner,
      repo,
      toSafeRepoUrlPath(path),
    );
    const sha = res.data.sha;
    return sha
      ? {
          content: await readGiteaFileText(
            client.repos,
            owner,
            repo,
            toSafeRepoUrlPath(path),
            res.data,
          ),
          sha,
        }
      : null;
  } catch (error) {
    if (isGiteaNotFound(error)) return null;
    if (error instanceof DomainError) throw error;
    throw giteaWriteErrorFromCause("read ledger file for commit", error);
  }
}

/**
 * Atomically commit a read-modify-write to one or more ledger files, with real
 * optimistic-concurrency safety.
 *
 * ## Why this exists
 *
 * The naive pattern — read content from one snapshot, then fetch a FRESH blob
 * SHA right before committing — silently loses concurrent writes: the fresh SHA
 * always matches Gitea's current blob, so Gitea's compare-and-swap never fires
 * and the commit overwrites whatever landed in between (see the review of the
 * old `addBulkEntries` / Plaid / source-slice paths).
 *
 * This helper instead reads each file's content AND SHA from the same response,
 * applies the caller's {@link LedgerFileTransform} to that fresh content, and
 * commits with the matching SHA. If another writer commits in the window between
 * the read and the commit, Gitea rejects with `409`/`422`; we then re-read,
 * re-apply the transform to the new content, and retry (bounded), so concurrent
 * appends/edits compose instead of clobbering. A transform that itself throws
 * (e.g. a source-slice entry that genuinely changed) is NOT retried — it
 * surfaces as-is.
 *
 * `rawCreates` are pre-encoded binary files created in the SAME `repoChangeFiles`
 * commit as the text transforms — so an attachment (e.g. a receipt image) and
 * the ledger entries that reference it are atomic: both land or neither.
 */
export async function commitLedgerFiles(
  client: GiteaFileCommitClient,
  owner: string,
  repo: string,
  transforms: Map<string, LedgerFileTransform>,
  message: string,
  rawCreates: RawFileCreate[] = [],
): Promise<void> {
  const rawOperations: CommitOperation[] = rawCreates.map(
    ({ path, contentBase64 }) => ({
      operation: "create",
      path,
      content: contentBase64,
    }),
  );

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidateTextOperations = await Promise.all(
      [...transforms.entries()].map(
        async ([path, transform]): Promise<CommitOperation | null> => {
          const read = await readFileOrNull(client, owner, repo, path);
          const transformed = await transform(read?.content ?? null);
          // Idempotent retry paths (notably Plaid recovery after its DB mark
          // failed) can discover the desired block already exists. Do not send
          // a byte-identical update: Gitea may reject an empty commit as 422.
          if (read && transformed === read.content) return null;
          const content = Buffer.from(transformed, "utf-8").toString("base64");
          return read
            ? { operation: "update", path, content, sha: read.sha }
            : { operation: "create", path, content };
        },
      ),
    );
    const textOperations = candidateTextOperations.filter(
      (operation): operation is CommitOperation => operation !== null,
    );
    const operations = [...textOperations, ...rawOperations];
    if (operations.length === 0) return;

    try {
      await client.repos.repoChangeFiles(owner, repo, {
        files: operations,
        message,
      });
      return;
    } catch (error) {
      if (!isGiteaWriteConflict(error)) {
        throw giteaWriteErrorFromCause("commit ledger files", error);
      }
      log.warn("gitea write conflict; retrying with fresh content", {
        owner,
        repo,
        attempt: attempt + 1,
        files: operations.map((operation) => operation.path),
      });
    }
  }

  throw new ConflictError(
    "Ledger",
    "the ledger changed under a concurrent write; please retry",
  );
}
