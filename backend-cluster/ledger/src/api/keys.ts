import Router from "@koa/router";
import type { PublicKey } from "@/features/gitea/client/gitea-api";
import { authMiddleware, giteaClientForRequest } from "@/server/auth";
import { successResponse } from "@/server/envelope";
import { intQuery } from "./query-params";

/** Python `KeyPublic` — required id/fingerprint/key/title/created_at. */
interface KeyPublic {
  id: number;
  fingerprint: string;
  key: string;
  last_used_at: string | null;
  title: string;
  created_at: string;
}

function toKeyPublic(key: PublicKey): KeyPublic {
  const k = key as Record<string, unknown>;
  return {
    id: k.id as number,
    fingerprint: k.fingerprint as string,
    key: k.key as string,
    last_used_at: (k.last_used_at as string) ?? null,
    title: k.title as string,
    created_at: k.created_at as string,
  };
}

export function setKeysHandler(router: Router): void {
  // operationId: createPublicKey — POST /keys (201)
  router.post("/keys", authMiddleware, async (ctx) => {
    const body = (ctx.request.body ?? {}) as {
      key: string;
      title: string;
      read_only?: boolean;
    };
    const client = giteaClientForRequest(ctx);
    const res = await client.user.userCurrentPostKey({
      key: body.key,
      title: body.title,
      read_only: body.read_only ?? false,
    });
    ctx.status = 201;
    ctx.body = successResponse(toKeyPublic(res.data as PublicKey));
  });

  // operationId: listPublicKeys — GET /keys
  router.get("/keys", authMiddleware, async (ctx) => {
    const client = giteaClientForRequest(ctx);
    const page = intQuery(ctx.query.page);
    const limit = intQuery(ctx.query.limit);
    const res = await client.user.userCurrentListKeys({ page, limit });
    ctx.body = successResponse(
      ((res.data ?? []) as PublicKey[]).map(toKeyPublic),
    );
  });

  // operationId: getPublicKey — GET /keys/{key_id}
  router.get("/keys/:key_id", authMiddleware, async (ctx) => {
    const client = giteaClientForRequest(ctx);
    const res = await client.user.userCurrentGetKey(
      parseInt(ctx.params.key_id, 10),
    );
    ctx.body = successResponse(toKeyPublic(res.data as PublicKey));
  });

  // operationId: deletePublicKey — DELETE /keys/{key_id}
  router.delete("/keys/:key_id", authMiddleware, async (ctx) => {
    const client = giteaClientForRequest(ctx);
    await client.user.userCurrentDeleteKey(parseInt(ctx.params.key_id, 10));
    ctx.body = successResponse(null);
  });
}
