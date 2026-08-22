import Router from "@koa/router";
import type { Commit, User } from "@/features/gitea/client/gitea-api";
import { authMiddleware, giteaClientForRequest } from "@/server/auth";
import { successResponse } from "@/server/envelope";
import { toUserPublic, type UserPublic } from "./serializers";
import { boolQuery, intQuery, strQuery } from "./query-params";

/** Python `CommitPublic` — sha + author/committer/commit.message/created. */
interface CommitPublic {
  sha: string;
  author: UserPublic | null;
  committer: UserPublic | null;
  commit: { message: string } | null;
  created: string | null;
}

function toCommitPublic(commit: Commit): CommitPublic {
  const c = commit as Record<string, unknown>;
  const repoCommit = c.commit as { message?: string } | undefined;
  return {
    sha: c.sha as string,
    author: c.author ? toUserPublic(c.author as User) : null,
    committer: c.committer ? toUserPublic(c.committer as User) : null,
    commit: repoCommit ? { message: repoCommit.message as string } : null,
    created: (c.created as string) ?? null,
  };
}

export function setRepoHandler(router: Router): void {
  // operationId: repoGetAllCommits — GET /repo/{o}/{r}/commits
  router.get("/repo/:owner/:repo_name/commits", authMiddleware, async (ctx) => {
    const q = ctx.query;
    const client = giteaClientForRequest(ctx);
    const res = await client.repos.repoGetAllCommits(
      ctx.params.owner,
      ctx.params.repo_name,
      {
        sha: strQuery(q.sha),
        path: strQuery(q.path),
        stat: boolQuery(q.stat),
        verification: boolQuery(q.verification),
        files: boolQuery(q.files),
        page: intQuery(q.page),
        limit: intQuery(q.limit),
        not: strQuery(q.not),
      },
    );
    ctx.body = successResponse(
      ((res.data ?? []) as Commit[]).map(toCommitPublic),
    );
  });
}
