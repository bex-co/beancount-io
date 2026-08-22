import Router from "@koa/router";
import type { User } from "@/features/gitea/client/gitea-api";
import { authMiddleware, giteaClientForRequest } from "@/server/auth";
import { successResponse } from "@/server/envelope";
import { toUserPublic, type UserPublic } from "./serializers";
import { intQuery } from "./query-params";

/** Python `LedgerCollaboratorPermission`. */
interface LedgerCollaboratorPermission {
  permission: string | null;
  role_name: string | null;
  user: UserPublic | null;
}

export function setCollaboratorsHandler(router: Router): void {
  // operationId: listLedgerCollaborators — GET /collaborators/{o}/{r}
  router.get(
    "/collaborators/:owner/:repo_name",
    authMiddleware,
    async (ctx) => {
      const client = giteaClientForRequest(ctx);
      const page = intQuery(ctx.query.page);
      const limit = intQuery(ctx.query.limit);
      const res = await client.repos.repoListCollaborators(
        ctx.params.owner,
        ctx.params.repo_name,
        { page, limit },
      );
      ctx.body = successResponse(
        ((res.data ?? []) as User[]).map(toUserPublic),
      );
    },
  );

  // operationId: getLedgerCollaboratorPermission — GET /collaborators/{o}/{r}/{collaborator}
  router.get(
    "/collaborators/:owner/:repo_name/:collaborator",
    authMiddleware,
    async (ctx) => {
      const client = giteaClientForRequest(ctx);
      const res = await client.repos.repoGetRepoPermissions(
        ctx.params.owner,
        ctx.params.repo_name,
        ctx.params.collaborator,
      );
      const p = res.data as {
        permission?: string;
        role_name?: string;
        user?: User;
      };
      const projected: LedgerCollaboratorPermission = {
        permission: p.permission ?? null,
        role_name: p.role_name ?? null,
        user: p.user ? toUserPublic(p.user) : null,
      };
      ctx.body = successResponse(projected);
    },
  );

  // operationId: addOrUpdateLedgerCollaborator — PUT /collaborators/{o}/{r}/{collaborator}
  router.put(
    "/collaborators/:owner/:repo_name/:collaborator",
    authMiddleware,
    async (ctx) => {
      const body = (ctx.request.body ?? {}) as {
        permission?: "read" | "write" | "admin" | null;
      };
      const client = giteaClientForRequest(ctx);
      await client.repos.repoAddCollaborator(
        ctx.params.owner,
        ctx.params.repo_name,
        ctx.params.collaborator,
        { permission: body.permission ?? undefined },
      );
      ctx.body = successResponse(null);
    },
  );

  // operationId: deleteLedgerCollaborator — DELETE /collaborators/{o}/{r}/{collaborator}
  router.delete(
    "/collaborators/:owner/:repo_name/:collaborator",
    authMiddleware,
    async (ctx) => {
      const client = giteaClientForRequest(ctx);
      await client.repos.repoDeleteCollaborator(
        ctx.params.owner,
        ctx.params.repo_name,
        ctx.params.collaborator,
      );
      ctx.body = successResponse(null);
    },
  );
}
