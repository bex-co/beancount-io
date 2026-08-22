import Router from "@koa/router";
import { authMiddleware, giteaClientForRequest } from "@/server/auth";
import { successResponse } from "@/server/envelope";

/** Python `TokenCreateResponse` — all fields, unset as null. */
interface TokenCreateResponse {
  id: number | null;
  name: string | null;
  scopes: string[] | null;
  sha1: string | null;
  token_last_eight: string | null;
  created_at: string | null;
  last_used_at: string | null;
}

export function setTokensHandler(router: Router): void {
  // operationId: createUserToken — POST /tokens/{username} (201)
  router.post("/tokens/:username", authMiddleware, async (ctx) => {
    const body = (ctx.request.body ?? {}) as {
      name: string;
      scopes?: string[] | null;
    };
    const client = giteaClientForRequest(ctx);
    const res = await client.users.userCreateToken(ctx.params.username, {
      name: body.name,
      scopes: body.scopes ?? undefined,
    });
    const t = res.data as Record<string, unknown>;
    const projected: TokenCreateResponse = {
      id: (t.id as number) ?? null,
      name: (t.name as string) ?? null,
      scopes: (t.scopes as string[]) ?? null,
      sha1: (t.sha1 as string) ?? null,
      token_last_eight: (t.token_last_eight as string) ?? null,
      created_at: (t.created_at as string) ?? null,
      last_used_at: (t.last_used_at as string) ?? null,
    };
    ctx.status = 201;
    ctx.body = successResponse(projected);
  });
}
