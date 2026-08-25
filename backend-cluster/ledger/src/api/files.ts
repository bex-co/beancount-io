import Router from "@koa/router";
import type { ContentsResponse } from "@/features/gitea/client/gitea-api";
import {
  authMiddleware,
  giteaClientForRequest,
  type RequestAuth,
  directiveLimitExempt,
} from "@/server/auth";
import { successResponse } from "@/server/envelope";
import { checkDirectiveLimitForFileChanges } from "@/core/directive-limit";
import { config } from "@/config";
import { DomainError, ErrorCategory, NotFoundError } from "@/shared/errors";
import { NotFoundDetailError } from "@/server/py-errors";
import { assertSafeRepoPath, toSafeRepoUrlPath } from "@/shared/safe-repo-path";
import { assertSafeArchiveName } from "@/shared/safe-archive-name";

/** Gitea archive failure forwarded with its upstream status (Python parity). */
class ArchiveDownloadError extends DomainError {
  constructor(message: string, status: number) {
    super(ErrorCategory.INTERNAL_SERVER_ERROR, message, undefined, status);
  }
}

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
        ctx.body = successResponse(toFileContentPublic(data));
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
      const res = await client.repos.repoGetFileContentsPost(
        ctx.params.owner,
        ctx.params.repo_name,
        { files },
      );
      const items = (res.data ?? []) as Array<ContentsResponse | null>;
      ctx.body = successResponse(
        items
          .filter((item): item is ContentsResponse => item !== null)
          .map(toFileContentPublic),
      );
    },
  );

  // operationId: createLedgerFile — POST /ledgers/{o}/{r}/files (201)
  router.post(
    "/ledgers/:owner/:repo_name/files",
    authMiddleware,
    async (ctx) => {
      const { owner, repo_name: repoName } = ctx.params;
      const body = (ctx.request.body ?? {}) as CreateFileBody;
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
      const res = await client.repos.repoUpdateFile(
        owner,
        repoName,
        safeUrlPath,
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

  // operationId: getLedgerArchive — GET /ledgers/{o}/{r}/archive/{archive}
  // Streams raw bytes with the caller's credentials, or no credential for a
  // public-ledger request carrying backend-v2's private Anonymous marker.
  router.get(
    "/ledgers/:owner/:repo_name/archive/:archive",
    authMiddleware,
    async (ctx) => {
      const auth = ctx.state.auth as RequestAuth;
      assertSafeArchiveName(ctx.params.archive);
      const url = `${config.gitea.baseUrl}/api/v1/repos/${encodeURIComponent(ctx.params.owner)}/${encodeURIComponent(ctx.params.repo_name)}/archive/${encodeURIComponent(ctx.params.archive)}`;
      const upstream = await fetch(url, {
        ...(auth.authType === "anonymous"
          ? {}
          : { headers: { Authorization: auth.header } }),
      });
      if (upstream.status !== 200) {
        if (upstream.status === 404) {
          throw new NotFoundError("Archive");
        }
        throw new ArchiveDownloadError(
          `Failed to download archive: ${upstream.statusText}`,
          upstream.status,
        );
      }
      ctx.status = 200;
      ctx.set(
        "content-type",
        upstream.headers.get("content-type") ?? "application/octet-stream",
      );
      const disposition = upstream.headers.get("content-disposition");
      if (disposition) {
        ctx.set("content-disposition", disposition);
      }
      const buffer = Buffer.from(await upstream.arrayBuffer());
      ctx.body = buffer;
    },
  );
}
