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
import { readGiteaRawBuffer } from "@/features/gitea/utils/gitea-file-content";
import {
  giteaErrorStatus,
  isGiteaWriteConflict,
} from "@/features/gitea/utils/gitea-error";
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
 * After a failed update: read each path. One that is gone is the answer
 * (NOT_FOUND); if every one exists, the original error stands.
 */
async function rethrowAsMissing(
  client: ReturnType<typeof giteaClientForRequest>,
  owner: string,
  repoName: string,
  paths: readonly string[],
  original: unknown,
): Promise<never> {
  for (const path of paths) {
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
    return rethrowAsMissing(client, owner, repoName, [path], err);
  }
}

/** Commit a set of file operations, answering NOT_FOUND for an update or delete of a path that is gone (w21/468, w21/551). */
export async function changeExistingFiles(
  client: ReturnType<typeof giteaClientForRequest>,
  owner: string,
  repoName: string,
  body: ChangeFilesBody,
  operations: ChangeFilesBody["files"] = [],
): Promise<void> {
  try {
    await client.repos.repoChangeFiles(owner, repoName, {
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
  } catch (err) {
    if (!isUnexplainedServerError(err)) throw err;
    // A delete of a path that is gone fails the same way (w21/551): Gitea has no
    // 404 for it either.
    const existing = operations
      .filter((op) => op.operation === "update" || op.operation === "delete")
      .map((op) => op.path);
    await rethrowAsMissing(client, owner, repoName, existing, err);
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
      ctx.status = 201;
      ctx.body = successResponse(
        toFileContentPublic(fileResponse.content as ContentsResponse),
      );
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
      ctx.body = successResponse(
        toFileContentPublic(fileResponse.content as ContentsResponse),
      );
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
      await client.repos.repoDeleteFile(owner, repoName, safeUrlPath, {
        sha: body.sha,
        message: body.message || `Delete ${body.path}`,
      });
      ctx.body = successResponse(null);
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
      await changeExistingFiles(client, owner, repoName, body, operations);
      ctx.body = successResponse(null);
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
