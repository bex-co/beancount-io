import Router from "@koa/router";
import type { ContentsResponse } from "@/features/gitea/client/gitea-api";
import {
  authMiddleware,
  giteaClientForRequest,
  directiveLimitExempt,
} from "@/server/auth";
import { successResponse } from "@/server/envelope";
import { checkDirectiveLimitForFileChanges } from "@/core/directive-limit";
import { NotFoundDetailError } from "@/server/py-errors";
import { commitShaOf } from "@/features/gitea/utils/commit-sha";
import { readGiteaRawBuffer } from "@/features/gitea/utils/gitea-file-content";
import {
  giteaErrorStatus,
  isGiteaWriteConflict,
} from "@/features/gitea/utils/gitea-error";
import {
  logUnclassifiedWriteFailure,
  probeFailedWrite,
  type ProbedOperation,
} from "@/features/gitea/utils/failed-write-probe";
import { ConflictError } from "@/shared/errors";
import {
  assertPortableRepoPath,
  assertSafeRepoPath,
  toSafeRepoUrlPath,
} from "@/shared/safe-repo-path";

/** Python `LedgerFileContentPublic` — fixed projection, nulls included. */
interface LedgerFileContentPublic {
  name: string;
  path: string;
  type: string;
  sha: string;
  size: number;
  content: string | null;
  encoding: string | null;
  last_commit_sha: string | null;
  last_committer_date: string | null;
  last_author_date: string | null;
}

export function toFileContentPublic(
  item: ContentsResponse,
): LedgerFileContentPublic {
  return {
    name: item.name as string,
    path: item.path as string,
    type: item.type as string,
    sha: item.sha as string,
    size: item.size as number,
    content: item.content ?? null,
    encoding: item.encoding ?? null,
    last_commit_sha: item.last_commit_sha ?? null,
    last_committer_date:
      (item as { last_committer_date?: string }).last_committer_date ?? null,
    last_author_date:
      (item as { last_author_date?: string }).last_author_date ?? null,
  };
}

/** Largest blob served inline once Gitea's own contents limit is passed. */
/**
 * The most paths the repository host answers in one batched file-contents
 * request. It returns at most this many entries and says nothing about the
 * rest, which read as missing files (w23/205), so a longer list goes out in
 * chunks.
 */
const FILE_CONTENTS_BATCH = 30;

/** The files of a batched lookup that exist, in the order they were named. */
export async function getFileContentsChunked(
  client: Pick<GiteaClient, "repos">,
  owner: string,
  repo: string,
  files: readonly string[],
): Promise<ContentsResponse[]> {
  const present: ContentsResponse[] = [];
  for (let at = 0; at < files.length; at += FILE_CONTENTS_BATCH) {
    const res = await client.repos.repoGetFileContentsPost(owner, repo, {
      files: files.slice(at, at + FILE_CONTENTS_BATCH),
    });
    for (const item of (res.data ?? []) as Array<ContentsResponse | null>) {
      if (item !== null) present.push(item);
    }
  }
  return present;
}

export const MAX_LARGE_FILE_BYTES = 32 * 1024 * 1024;

type GiteaClient = ReturnType<typeof giteaClientForRequest>;

/**
 * Gitea answers a file past its inline limit (~10 MiB) with `content: null`
 * and a valid sha. Served as is, a client reads it as an empty document and a
 * save on that sha replaces the whole file (w21/343). Fetch the blob through
 * the raw endpoint and return it in the usual base64 form; past
 * `MAX_LARGE_FILE_BYTES` the read fails with a size error rather than null.
 */
export async function withLargeContent(
  client: GiteaClient,
  owner: string,
  repo: string,
  item: ContentsResponse,
): Promise<ContentsResponse> {
  if (
    item.type !== "file" ||
    (item.content !== null && item.content !== undefined) ||
    !(typeof item.size === "number" && item.size > 0)
  ) {
    return item;
  }
  const bytes = await readGiteaRawBuffer(
    client.repos,
    owner,
    repo,
    item.path as string,
    item,
    undefined,
    MAX_LARGE_FILE_BYTES,
  );
  return { ...item, content: bytes.toString("base64"), encoding: "base64" };
}

interface CreateFileBody {
  path: string;
  content: string;
  message?: string | null;
}
interface UpdateFileBody extends CreateFileBody {
  sha: string;
}
interface DeleteFileBody {
  path: string;
  sha: string;
  message?: string | null;
}
interface ChangeFilesBody {
  files: Array<{
    operation: "create" | "update" | "delete";
    path: string;
    content?: string | null;
    from_path?: string | null;
    sha?: string | null;
  }>;
  message?: string | null;
  branch?: string | null;
  new_branch?: string | null;
}

const is404 = (err: unknown): boolean =>
  (err as { status?: number }).status === 404;

/**
 * Whether a thrown Gitea error is a 5xx that is not a lost write race. Gitea has
 * no 404 for an update of a path that no longer exists: it answers 500, which
 * backend-v2 reports as SERVICE_UNAVAILABLE ("try again in a moment") for a save
 * that can never succeed (w21/468).
 */
function isUnexplainedServerError(err: unknown): boolean {
  const status = giteaErrorStatus(err);
  return status !== undefined && status >= 500 && !isGiteaWriteConflict(err);
}

/**
 * After a failed write that is not a recognized lost race: read the files it
 * touched. One that is gone is the answer (NOT_FOUND, w21/468). Otherwise the
 * content decides (w23/072): the intended bytes mean the write landed and only
 * its answer was lost (`"landed"`, never rewritten); a file that moved on
 * without them means another commit won, which is the 409 a caller re-reads
 * and retries; anything else leaves the original error standing.
 */
async function settleUnexplainedFailure(
  client: ReturnType<typeof giteaClientForRequest>,
  owner: string,
  repoName: string,
  operations: readonly ProbedOperation[],
  original: unknown,
): Promise<"landed"> {
  for (const { operation, path } of operations) {
    if (operation === "create") continue;
    try {
      await client.repos.repoGetContents(
        owner,
        repoName,
        toSafeRepoUrlPath(path),
      );
    } catch (probe) {
      if (is404(probe)) {
        throw new NotFoundDetailError(`File ${path} does not exist`);
      }
    }
  }
  const outcome = await probeFailedWrite(operations, async (path) => {
    try {
      const res = await client.repos.repoGetContents(
        owner,
        repoName,
        toSafeRepoUrlPath(path),
      );
      const data = res.data as ContentsResponse | ContentsResponse[] | null;
      if (data === null || Array.isArray(data)) return null;
      return {
        sha: data.sha,
        contentBase64:
          typeof data.content === "string" && data.encoding === "base64"
            ? data.content
            : null,
      };
    } catch (probe) {
      // A probe that cannot read decides nothing.
      return is404(probe) ? null : { sha: undefined, contentBase64: null };
    }
  });
  logUnclassifiedWriteFailure(original, {
    owner,
    repo: repoName,
    outcome,
    files: operations.map((operation) => operation.path),
  });
  if (outcome === "landed") return "landed";
  if (outcome === "lost-race") {
    throw new ConflictError(
      "Ledger file",
      "the ledger changed under a concurrent write; re-read it and retry",
    );
  }
  throw original;
}

/** Update a file, answering NOT_FOUND when the file is gone (w21/468). */
export async function updateExistingFile(
  client: ReturnType<typeof giteaClientForRequest>,
  owner: string,
  repoName: string,
  safeUrlPath: string,
  path: string,
  options: { content: string; sha: string; message: string },
) {
  try {
    return await client.repos.repoUpdateFile(
      owner,
      repoName,
      safeUrlPath,
      options,
    );
  } catch (err) {
    if (!isUnexplainedServerError(err)) throw err;
    await settleUnexplainedFailure(
      client,
      owner,
      repoName,
      [
        {
          operation: "update",
          path,
          sha: options.sha,
          contentBase64: options.content,
        },
      ],
      err,
    );
    // The update landed and only its answer was lost: report what is there.
    const landed = await client.repos.repoGetContents(
      owner,
      repoName,
      safeUrlPath,
    );
    return {
      ...landed,
      data: { content: landed.data },
    } as unknown as Awaited<ReturnType<typeof client.repos.repoUpdateFile>>;
  }
}

/** Commit a set of file operations, answering NOT_FOUND for an update or delete of a path that is gone (w21/468, w21/551). */
export async function changeExistingFiles(
  client: ReturnType<typeof giteaClientForRequest>,
  owner: string,
  repoName: string,
  body: ChangeFilesBody,
  operations: ChangeFilesBody["files"] = [],
): Promise<{ commit?: string }> {
  try {
    const response = await client.repos.repoChangeFiles(owner, repoName, {
      files: operations.map((op) => ({
        operation: op.operation,
        path: op.path,
        content: op.content ?? undefined,
        from_path: op.from_path ?? undefined,
        sha: op.sha ?? undefined,
      })),
      message: body.message ?? undefined,
      branch: body.branch ?? undefined,
      new_branch: body.new_branch ?? undefined,
    });
    // The sha of the commit this made (w23/m42). A write that landed and lost
    // its answer, settled below, has none to report.
    return { commit: commitShaOf(response) };
  } catch (err) {
    if (!isUnexplainedServerError(err)) throw err;
    // A delete of a path that is gone fails the same way (w21/551): Gitea has no
    // 404 for it either.
    await settleUnexplainedFailure(
      client,
      owner,
      repoName,
      operations.flatMap((op) =>
        op.operation === "create" ||
        op.operation === "update" ||
        op.operation === "delete"
          ? [
              {
                operation: op.operation,
                path: op.path,
                sha: op.sha ?? undefined,
                contentBase64: op.content ?? undefined,
              },
            ]
          : [],
      ),
      err,
    );
    return {};
  }
}

export function setFilesHandler(router: Router): void {
  // operationId: getLedgerFile — GET /ledgers/{o}/{r}/files?path=
  // Python returns null (not 404) when the file does not exist.
  router.get(
    "/ledgers/:owner/:repo_name/files",
    authMiddleware,
    async (ctx) => {
      const client = giteaClientForRequest(ctx);
      const path = String(ctx.query.path ?? "");
      const safeUrlPath = toSafeRepoUrlPath(path);
      try {
        const res = await client.repos.repoGetContents(
          ctx.params.owner,
          ctx.params.repo_name,
          safeUrlPath,
        );
        const data = res.data as ContentsResponse | ContentsResponse[] | null;
        if (data === null || Array.isArray(data)) {
          ctx.body = successResponse(null);
          return;
        }
        ctx.body = successResponse(
          toFileContentPublic(
            await withLargeContent(
              client,
              ctx.params.owner,
              ctx.params.repo_name,
              data,
            ),
          ),
        );
      } catch (err) {
        if (is404(err)) {
          ctx.body = successResponse(null);
          return;
        }
        throw err;
      }
    },
  );

  // operationId: getLedgerFilesContent — POST /ledgers/{o}/{r}/files-content
  router.post(
    "/ledgers/:owner/:repo_name/files-content",
    authMiddleware,
    async (ctx) => {
      const client = giteaClientForRequest(ctx);
      const body = (ctx.request.body ?? {}) as { files?: string[] };
      const files = body.files ?? [];
      files.forEach((path, index) =>
        assertSafeRepoPath(path, `files[${index}]`),
      );
      const present = await getFileContentsChunked(
        client,
        ctx.params.owner,
        ctx.params.repo_name,
        files,
      );
      const filled: ContentsResponse[] = [];
      for (const item of present) {
        filled.push(
          await withLargeContent(
            client,
            ctx.params.owner,
            ctx.params.repo_name,
            item,
          ),
        );
      }
      ctx.body = successResponse(filled.map(toFileContentPublic));
    },
  );

  // operationId: createLedgerFile — POST /ledgers/{o}/{r}/files (201)
  router.post(
    "/ledgers/:owner/:repo_name/files",
    authMiddleware,
    async (ctx) => {
      const { owner, repo_name: repoName } = ctx.params;
      const body = (ctx.request.body ?? {}) as CreateFileBody;
      // A new file's name has to work on every checkout (w23/054).
      assertPortableRepoPath(body.path);
      const safeUrlPath = toSafeRepoUrlPath(body.path);
      const client = giteaClientForRequest(ctx);
      await checkDirectiveLimitForFileChanges(
        client,
        owner,
        repoName,
        { [body.path]: body.content },
        { exempt: directiveLimitExempt(ctx) },
      );
      const res = await client.repos.repoCreateFile(
        owner,
        repoName,
        safeUrlPath,
        {
          content: body.content,
          message: body.message || `Create ${body.path}`,
        },
      );
      const fileResponse = res.data as { content?: ContentsResponse };
      const commit = commitShaOf(res);
      ctx.status = 201;
      ctx.body = successResponse({
        ...toFileContentPublic(fileResponse.content as ContentsResponse),
        ...(commit && { commit }),
      });
    },
  );

  // operationId: updateLedgerFile — PUT /ledgers/{o}/{r}/files
  router.put(
    "/ledgers/:owner/:repo_name/files",
    authMiddleware,
    async (ctx) => {
      const { owner, repo_name: repoName } = ctx.params;
      const body = (ctx.request.body ?? {}) as UpdateFileBody;
      const safeUrlPath = toSafeRepoUrlPath(body.path);
      const client = giteaClientForRequest(ctx);
      await checkDirectiveLimitForFileChanges(
        client,
        owner,
        repoName,
        { [body.path]: body.content },
        { exempt: directiveLimitExempt(ctx) },
      );
      const res = await updateExistingFile(
        client,
        owner,
        repoName,
        safeUrlPath,
        body.path,
        {
          content: body.content,
          sha: body.sha,
          message: body.message || `Update ${body.path}`,
        },
      );
      const fileResponse = res.data as { content?: ContentsResponse };
      const commit = commitShaOf(res);
      ctx.body = successResponse({
        ...toFileContentPublic(fileResponse.content as ContentsResponse),
        ...(commit && { commit }),
      });
    },
  );

  // operationId: deleteLedgerFile — DELETE /ledgers/{o}/{r}/files
  router.delete(
    "/ledgers/:owner/:repo_name/files",
    authMiddleware,
    async (ctx) => {
      const { owner, repo_name: repoName } = ctx.params;
      const body = (ctx.request.body ?? {}) as DeleteFileBody;
      const safeUrlPath = toSafeRepoUrlPath(body.path);
      const client = giteaClientForRequest(ctx);
      const res = await client.repos.repoDeleteFile(
        owner,
        repoName,
        safeUrlPath,
        {
          sha: body.sha,
          message: body.message || `Delete ${body.path}`,
        },
      );
      ctx.body = successResponse({ commit: commitShaOf(res) ?? null });
    },
  );

  // operationId: changeLedgerFiles — POST /ledgers/{o}/{r}/change-files
  router.post(
    "/ledgers/:owner/:repo_name/change-files",
    authMiddleware,
    async (ctx) => {
      const { owner, repo_name: repoName } = ctx.params;
      const body = (ctx.request.body ?? {}) as ChangeFilesBody;
      const operations = body.files ?? [];
      const fileChanges: Record<string, string | null> = {};
      operations.forEach((op, index) => {
        assertSafeRepoPath(op.path, `files[${index}].path`);
        if (op.operation === "create")
          assertPortableRepoPath(op.path, `files[${index}].path`);
        if (op.from_path !== null && op.from_path !== undefined) {
          assertSafeRepoPath(op.from_path, `files[${index}].from_path`);
        }
      });
      for (const op of operations) {
        if (op.operation === "delete") {
          fileChanges[op.path] = null;
        } else if (op.content !== null && op.content !== undefined) {
          fileChanges[op.path] = op.content;
        }
      }
      const client = giteaClientForRequest(ctx);
      await checkDirectiveLimitForFileChanges(
        client,
        owner,
        repoName,
        fileChanges,
        { exempt: directiveLimitExempt(ctx) },
      );
      const { commit } = await changeExistingFiles(
        client,
        owner,
        repoName,
        body,
        operations,
      );
      ctx.body = successResponse({ commit: commit ?? null });
    },
  );

  // operationId: getLedgerDirContent — GET /ledgers/{o}/{r}/dirs?dir_path=
  router.get("/ledgers/:owner/:repo_name/dirs", authMiddleware, async (ctx) => {
    const client = giteaClientForRequest(ctx);
    const { owner, repo_name: repoName } = ctx.params;
    const dirPath = ctx.query.dir_path as string | undefined;
    let content: ContentsResponse[];
    if (dirPath === undefined) {
      const res = await client.repos.repoGetContentsList(owner, repoName);
      content = (res.data ?? []) as ContentsResponse[];
    } else {
      const safeUrlPath = toSafeRepoUrlPath(dirPath, "dir_path");
      let data: ContentsResponse | ContentsResponse[] | null;
      try {
        const res = await client.repos.repoGetContents(
          owner,
          repoName,
          safeUrlPath,
        );
        data = res.data as ContentsResponse | ContentsResponse[] | null;
      } catch (err) {
        if (is404(err)) {
          data = null;
        } else {
          throw err;
        }
      }
      if (data === null) {
        ctx.body = successResponse([]);
        return;
      }
      if (!Array.isArray(data)) {
        throw new NotFoundDetailError(
          `${dirPath} is a file, expected a directory`,
        );
      }
      content = data;
    }
    ctx.body = successResponse(content.map(toFileContentPublic));
  });
}
