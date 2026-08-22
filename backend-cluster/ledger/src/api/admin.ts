import Router from "@koa/router";
import type { User } from "@/features/gitea/client/gitea-api";
import { authMiddleware, giteaClientForRequest } from "@/server/auth";
import { successResponse } from "@/server/envelope";
import { toLedgerPublic } from "./ledgers";
import { EMPTY_USER_PUBLIC, type UserPublic } from "./serializers";

/** Python createUser builds UserPublic with only THESE fields set. */
function createUserProjection(user: User): UserPublic {
  const u = user as Record<string, unknown>;
  return {
    ...EMPTY_USER_PUBLIC,
    id: (u.id as number) ?? null,
    is_admin: (u.is_admin as boolean) ?? null,
    email: (u.email as string) ?? null,
    login: (u.login as string) ?? null,
    source_id: (u.source_id as number) ?? null,
    visibility: (u.visibility as string) ?? null,
    restricted: (u.restricted as boolean) ?? null,
    prohibit_login: (u.prohibit_login as boolean) ?? null,
    description: (u.description as string) ?? null,
  };
}

/** Python editUser builds UserPublic with a DIFFERENT subset. */
function editUserProjection(user: User): UserPublic {
  const u = user as Record<string, unknown>;
  return {
    ...EMPTY_USER_PUBLIC,
    id: (u.id as number) ?? null,
    is_admin: (u.is_admin as boolean) ?? null,
    email: (u.email as string) ?? null,
    login: (u.login as string) ?? null,
    full_name: (u.full_name as string) ?? null,
    active: (u.active as boolean) ?? null,
    created: (u.created as string) ?? null,
    last_login: (u.last_login as string) ?? null,
  };
}

export function setAdminHandler(router: Router): void {
  // operationId: createUser — POST /admin/users
  router.post("/admin/users", authMiddleware, async (ctx) => {
    const body = (ctx.request.body ?? {}) as {
      username: string;
      password: string;
      email: string;
    };
    const client = giteaClientForRequest(ctx);
    const res = await client.admin.adminCreateUser({
      username: body.username,
      password: body.password,
      email: body.email,
      must_change_password: false,
    });
    ctx.body = successResponse(createUserProjection(res.data as User));
  });

  // operationId: deleteUser — DELETE /admin/users/{username} (purge)
  router.delete("/admin/users/:username", authMiddleware, async (ctx) => {
    const client = giteaClientForRequest(ctx);
    await client.admin.adminDeleteUser(ctx.params.username, { purge: true });
    ctx.body = successResponse(null);
  });

  // operationId: editUser — PATCH /admin/users/{username}
  router.patch("/admin/users/:username", authMiddleware, async (ctx) => {
    const body = (ctx.request.body ?? {}) as Record<string, unknown>;
    // Python: model_dump(exclude_none=True) → drop nulls before forwarding
    const editOption = Object.fromEntries(
      Object.entries(body).filter(([, v]) => v !== null && v !== undefined),
    );
    const client = giteaClientForRequest(ctx);
    const res = await client.admin.adminEditUser(
      ctx.params.username,
      editOption as { login_name: string; source_id: number },
    );
    ctx.body = successResponse(editUserProjection(res.data as User));
  });

  // operationId: renameUser — POST /admin/users/{username}/rename
  router.post("/admin/users/:username/rename", authMiddleware, async (ctx) => {
    const body = (ctx.request.body ?? {}) as { new_username: string };
    const client = giteaClientForRequest(ctx);
    await client.admin.adminRenameUser(ctx.params.username, {
      new_username: body.new_username,
    });
    ctx.body = successResponse(null);
  });

  // operationId: getLedgerByRepoId — GET /admin/ledgers/{id}
  router.get("/admin/ledgers/:id", authMiddleware, async (ctx) => {
    const client = giteaClientForRequest(ctx);
    const res = await client.repositories.repoGetById(
      parseInt(ctx.params.id, 10),
    );
    ctx.body = successResponse(
      toLedgerPublic(res.data as Parameters<typeof toLedgerPublic>[0]),
    );
  });
}
