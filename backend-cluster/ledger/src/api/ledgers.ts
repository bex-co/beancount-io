import Router from "@koa/router";
import type { Repository } from "@/features/gitea/client/gitea-api";
import { applyMainOnlyPolicy } from "@/features/gitea/service/repo-branch-policy";
import {
  authMiddleware,
  giteaClientForRequest,
  type RequestAuth,
} from "@/server/auth";
import { successResponse } from "@/server/envelope";
import { countDirectivesForRepo } from "@/core/directive-limit";
import { slugify, validateLedgerName } from "@/shared/ledger-name";
import { boolQuery, intQuery, strQuery } from "./query-params";
import {
  BadUserInputError,
  ForbiddenError,
  InternalServerError,
  UnauthenticatedError,
} from "@/shared/errors";

/**
 * Wire shape of `LedgerPublic` (Python `app/schemas/ledger.py`): a fixed
 * projection of Gitea's Repository — extra Gitea fields are dropped, null
 * fields are INCLUDED (pydantic `model_dump()` keeps defaulted Nones).
 */
interface PermissionPublic {
  admin: boolean | null;
  pull: boolean | null;
  push: boolean | null;
}

interface LedgerPublic {
  id: number;
  name: string;
  description: string | null;
  full_name: string;
  empty: boolean;
  private: boolean;
  size: number;
  created_at: string;
  updated_at: string;
  permissions: PermissionPublic | null;
}

export function toLedgerPublic(repo: Repository): LedgerPublic {
  return {
    id: repo.id as number,
    name: repo.name as string,
    description: repo.description ?? null,
    full_name: repo.full_name as string,
    empty: repo.empty as boolean,
    private: repo.private as boolean,
    size: repo.size as number,
    // pydantic v2 re-emits Gitea's RFC3339 timestamps in the same `Z` form —
    // pass through verbatim (live-verified against the oracle)
    created_at: (repo.created_at as string | undefined) ?? "",
    updated_at: (repo.updated_at as string | undefined) ?? "",
    permissions: repo.permissions
      ? {
          admin: repo.permissions.admin ?? null,
          pull: repo.permissions.pull ?? null,
          push: repo.permissions.push ?? null,
        }
      : null,
  };
}

const b64 = (content: string): string =>
  Buffer.from(content, "utf8").toString("base64");

interface LedgerCreateBody {
  name?: string;
  description?: string | null;
  private?: boolean | null;
  files?: Record<string, string>;
}

interface LedgerUpdateBody {
  name?: string | null;
  description?: string | null;
  private?: boolean | null;
}

/** Duplicate-name probe shared by create/update (Python's repo_get try/except). */
async function repoExists(
  client: ReturnType<typeof giteaClientForRequest>,
  owner: string,
  name: string,
  onCheckError: "create" | "update",
): Promise<boolean> {
  try {
    await client.repos.repoGet(owner, name);
    return true;
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) {
      return false;
    }
    if (onCheckError === "create") {
      if (status === 403) {
        throw new ForbiddenError(
          "Permission denied while checking for duplicate ledger",
        );
      }
      throw new InternalServerError(
        `Failed to check for duplicate ledger: (${status})`,
      );
    }
    throw err; // update path re-raises the Gitea error as-is
  }
}

export function setLedgersHandler(router: Router): void {
  // operationId: listLedgers — GET /ledgers
  router.get("/ledgers", authMiddleware, async (ctx) => {
    const client = giteaClientForRequest(ctx);
    const res = await client.user.userCurrentListRepos({
      page: intQuery(ctx.query.page),
      limit: intQuery(ctx.query.limit),
    });
    const repos = (res.data ?? []) as Repository[];
    ctx.body = successResponse(repos.map(toLedgerPublic));
  });

  // operationId: createLedger — POST /ledgers (201)
  router.post("/ledgers", authMiddleware, async (ctx) => {
    const body = (ctx.request.body ?? {}) as LedgerCreateBody;
    if (!body.files || Object.keys(body.files).length === 0) {
      throw new BadUserInputError("Files are required");
    }
    if (!body.files["main.bean"]) {
      throw new BadUserInputError("main.bean is required");
    }
    const repoName = slugify(body.name ?? "");
    validateLedgerName(repoName);

    const auth = ctx.state.auth as RequestAuth;
    if (!auth.username) {
      throw new UnauthenticatedError("Unauthorized");
    }
    const client = giteaClientForRequest(ctx);

    if (await repoExists(client, auth.username, repoName, "create")) {
      throw new BadUserInputError(
        `A ledger with the name '${repoName}' already exists. Please choose a different name.`,
      );
    }

    const created = await client.user.createCurrentUserRepo({
      name: repoName,
      private: body.private ?? undefined,
      description: body.description ?? undefined,
    });
    try {
      // Before the first commit: nothing installs restrict-to-main-branch.sh
      // any more, so the main-only policy has to be repository state. Applying
      // it here rather than after the file write leaves no window in which the
      // ledger exists unprotected; the rules do not block the initial commit
      // that creates `main`. A failure lands in the catch below and deletes the
      // half-created ledger, same as a failed file write.
      await applyMainOnlyPolicy(client, auth.username, repoName);

      await client.repos.repoChangeFiles(auth.username, repoName, {
        files: Object.entries(body.files).map(([path, content]) => ({
          path,
          content: b64(content),
          operation: "create" as const,
        })),
      });
      ctx.status = 201;
      ctx.body = successResponse(toLedgerPublic(created.data as Repository));
    } catch (err) {
      await client.repos.repoDelete(auth.username, repoName).catch(() => {});
      throw err;
    }
  });

  // operationId: listUserLedgers — GET /ledgers/users/{username}
  router.get("/ledgers/users/:username", authMiddleware, async (ctx) => {
    const client = giteaClientForRequest(ctx);
    const res = await client.users.userListRepos(ctx.params.username, {
      page: intQuery(ctx.query.page),
      limit: intQuery(ctx.query.limit),
    });
    const repos = (res.data ?? []) as Repository[];
    ctx.body = successResponse(repos.map(toLedgerPublic));
  });

  // operationId: searchLedgers — GET /ledgers/search
  router.get("/ledgers/search", authMiddleware, async (ctx) => {
    const client = giteaClientForRequest(ctx);
    const q = ctx.query;
    const res = await client.repos.repoSearch({
      q: strQuery(q.q),
      topic: boolQuery(q.topic),
      includeDesc: boolQuery(q.include_desc),
      uid: intQuery(q.uid),
      priority_owner_id: intQuery(q.priority_owner_id),
      team_id: intQuery(q.team_id),
      starredBy: intQuery(q.starred_by),
      private: boolQuery(q.private),
      is_private: boolQuery(q.is_private),
      template: boolQuery(q.template),
      archived: boolQuery(q.archived),
      mode: strQuery(q.mode),
      exclusive: boolQuery(q.exclusive),
      sort: strQuery(q.sort),
      order: strQuery(q.order),
      page: intQuery(q.page),
      limit: intQuery(q.limit),
    });
    const body = res.data as { ok?: boolean; data?: Repository[] };
    ctx.body = successResponse({
      data: (body.data ?? []).map(toLedgerPublic),
      ok: body.ok ?? null,
    });
  });

  // operationId: getLedger — GET /ledgers/{owner}/{repo_name}
  router.get("/ledgers/:owner/:repo_name", authMiddleware, async (ctx) => {
    const client = giteaClientForRequest(ctx);
    const res = await client.repos.repoGet(
      ctx.params.owner,
      ctx.params.repo_name,
    );
    ctx.body = successResponse(toLedgerPublic(res.data as Repository));
  });

  // operationId: getLedgerDirectiveCount
  // GET /ledgers/{owner}/{repo_name}/directive-count
  //
  // Exists for enforcement points that cannot count for themselves.
  // Same counter the app write path and the dashboard use, so counts cannot
  // disagree about what a directive is.
  router.get(
    "/ledgers/:owner/:repo_name/directive-count",
    authMiddleware,
    async (ctx) => {
      const client = giteaClientForRequest(ctx);
      ctx.body = successResponse(
        await countDirectivesForRepo(
          client,
          ctx.params.owner,
          ctx.params.repo_name,
        ),
      );
    },
  );

  // operationId: updateLedger — PUT /ledgers/{owner}/{repo_name}
  router.put("/ledgers/:owner/:repo_name", authMiddleware, async (ctx) => {
    const { owner, repo_name: repoName } = ctx.params;
    const body = (ctx.request.body ?? {}) as LedgerUpdateBody;
    const client = giteaClientForRequest(ctx);

    let slugifiedName: string | undefined;
    if (body.name !== undefined && body.name !== null) {
      slugifiedName = slugify(body.name);
      validateLedgerName(slugifiedName);
      if (slugifiedName !== repoName) {
        if (await repoExists(client, owner, slugifiedName, "update")) {
          throw new BadUserInputError(
            `A ledger with the name '${slugifiedName}' already exists. Please choose a different name.`,
          );
        }
      }
    }

    const res = await client.repos.repoEdit(owner, repoName, {
      description: body.description ?? undefined,
      private: body.private ?? undefined,
      name: slugifiedName,
    });
    ctx.body = successResponse(toLedgerPublic(res.data as Repository));
  });

  // operationId: deleteLedger — DELETE /ledgers/{owner}/{repo_name}
  router.delete("/ledgers/:owner/:repo_name", authMiddleware, async (ctx) => {
    const client = giteaClientForRequest(ctx);
    await client.repos.repoDelete(ctx.params.owner, ctx.params.repo_name);
    ctx.body = successResponse(null);
  });
}
