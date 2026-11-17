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
  mightBeOwnerName,
  readMatches,
  repoMatchesTerm,
  searchTerms,
} from "./ledger-search";
import {
  BadUserInputError,
  ForbiddenError,
  InternalServerError,
  LedgerNameReservedError,
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

const COMMIT_SHA_RE = /^[0-9a-f]{7,64}$/i;

/** Gitea's largest page, and the most of them a word search reads (w21/245). */
const SEARCH_FETCH_LIMIT = 50;
const SEARCH_FETCH_PAGES = 6;
/** Page size when the caller sends none, as Gitea's own default. */
const SEARCH_DEFAULT_LIMIT = 20;

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
async function findExistingRepo(
  client: ReturnType<typeof giteaClientForRequest>,
  owner: string,
  name: string,
  onCheckError: "create" | "update",
): Promise<Repository | undefined> {
  try {
    const response = await client.repos.repoGet(owner, name);
    // A successful response without an identity still occupies the name.
    return typeof response.data === "object" && response.data !== null
      ? response.data
      : {};
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) {
      return undefined;
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

/**
 * Why a name `findExistingRepo` resolved is not free. The host answers a
 * renamed repository's former name with the repository it now names, so a
 * different `full_name` means the name is reserved, not a ledger (w23/061).
 */
function nameTakenError(
  owner: string,
  name: string,
  found: Repository,
): BadUserInputError | LedgerNameReservedError {
  const fullName = found.full_name;
  if (
    typeof fullName === "string" &&
    fullName.toLowerCase() !== `${owner}/${name}`.toLowerCase()
  ) {
    return new LedgerNameReservedError(name, fullName);
  }
  return new BadUserInputError(
    `A ledger with the name '${name}' already exists. Please choose a different name.`,
  );
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

    const existing = await findExistingRepo(
      client,
      auth.username,
      repoName,
      "create",
    );
    if (existing) throw nameTakenError(auth.username, repoName, existing);

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
    const filters = {
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
    };
    const page = intQuery(q.page);
    const limit = intQuery(q.limit);
    const terms = searchTerms(strQuery(q.q));

    // Owners among the words: a word naming a user or organization lists that
    // owner's ledgers, which a substring search of names never did. Not when
    // the caller already pinned an owner with `uid`.
    const owners = new Map<string, number>();
    if (terms.length > 0 && filters.uid === undefined) {
      await Promise.all(
        [...new Set(terms.filter(mightBeOwnerName))]
          .slice(0, 5)
          .map(async (term) => {
            try {
              const res = await client.users.userGet(term);
              const id = (res.data as { id?: number }).id;
              if (typeof id === "number") owners.set(term, id);
            } catch {
              // Not an owner: an ordinary word.
            }
          }),
      );
    }

    // One word that names no owner: Gitea's own search, as before.
    if (terms.length <= 1 && owners.size === 0) {
      const res = await client.repos.repoSearch({
        // Blank text is no search at all.
        q: terms.length === 0 ? undefined : strQuery(q.q),
        ...filters,
        page,
        limit,
      });
      const body = res.data as { ok?: boolean; data?: Repository[] };
      ctx.body = successResponse({
        data: (body.data ?? []).map(toLedgerPublic),
        ok: body.ok ?? null,
      });
      return;
    }

    // Several words, or an owner: every word must be found in `owner/name` or
    // the description. Gitea is asked about the longest word (any ledger that
    // matches all of them matches that one), then for the owner's ledgers when
    // that word names an owner; the rest is filtered here and then paged.
    const primary = terms.reduce((best, term) =>
      term.length > best.length ? term : best,
    );
    const ownerId = owners.get(primary);
    const searches = [
      { ...filters, q: primary },
      ...(ownerId === undefined ? [] : [{ ...filters, uid: ownerId }]),
    ];
    const size = limit ?? SEARCH_DEFAULT_LIMIT;
    const start = ((page ?? 1) - 1) * size;
    const { matches, ok } = await readMatches(
      searches.length,
      async (search, upstreamPage) => {
        const res = await client.repos.repoSearch({
          ...searches[search],
          page: upstreamPage,
          limit: SEARCH_FETCH_LIMIT,
        });
        const body = res.data as { ok?: boolean; data?: Repository[] };
        return { ok: body.ok ?? null, data: body.data ?? [] };
      },
      {
        keep: (repo) =>
          terms.every(
            (term) =>
              term === primary ||
              repoMatchesTerm(
                { full_name: repo.full_name, description: repo.description },
                term,
              ),
          ),
        // A window counted back from the end (a page or limit below 1) needs
        // every match.
        wanted: start >= 0 && size >= 0 ? start + size : Infinity,
        pageSize: SEARCH_FETCH_LIMIT,
        maxPages: SEARCH_FETCH_PAGES,
      },
    );
    ctx.body = successResponse({
      data: matches.slice(start, start + size).map(toLedgerPublic),
      ok,
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
  // disagree about what a directive is. `?ref=<commit sha>` counts that commit
  // instead of HEAD (a pull request's head, for merge).
  router.get(
    "/ledgers/:owner/:repo_name/directive-count",
    authMiddleware,
    async (ctx) => {
      const ref = strQuery(ctx.query.ref);
      if (ref !== undefined && !COMMIT_SHA_RE.test(ref)) {
        throw new BadUserInputError("ref must be a commit SHA");
      }
      const client = giteaClientForRequest(ctx);
      ctx.body = successResponse(
        await countDirectivesForRepo(
          client,
          ctx.params.owner,
          ctx.params.repo_name,
          ref,
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
        const target = await findExistingRepo(
          client,
          owner,
          slugifiedName,
          "update",
        );
        if (target) {
          const targetId = target.id;
          // Gitea follows old-name redirects. A valid stable ID, rather than
          // the requested name or returned metadata, identifies a self-redirect.
          const validTargetId =
            typeof targetId === "number" &&
            Number.isSafeInteger(targetId) &&
            targetId > 0;
          const source = validTargetId
            ? await client.repos.repoGet(owner, repoName)
            : undefined;
          if (!validTargetId || source?.data?.id !== targetId) {
            throw nameTakenError(owner, slugifiedName, target);
          }
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
