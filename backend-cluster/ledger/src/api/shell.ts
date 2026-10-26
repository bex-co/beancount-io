import Router from "@koa/router";
import { authMiddleware } from "@/server/auth";
import { successResponse } from "@/server/envelope";
import { strQuery } from "./query-params";
import { ledgerIdOf, servicesForRequest } from "./service-context";

export function setShellHandler(router: Router): void {
  const base = "/shell/:owner/:repo_name";

  // operationId: queryShell — wire {result: QueryResultTable | QueryResultText}
  router.get(`${base}/query`, authMiddleware, async (ctx) => {
    const { shell } = servicesForRequest(ctx);
    const res = await shell.queryShell({
      ledgerId: ledgerIdOf(ctx),
      userId: undefined,
      query: strQuery(ctx.query.query) ?? "",
    });
    ctx.body = successResponse({
      result: res.resultType === "table" ? res.table : res.text,
    });
  });

  // operationId: queryShellPost — the POST twin of queryShell (w23/m5/t002).
  // A query in a GET query parameter dies as a bare 431 once the encoded URL
  // passes the HTTP parser's 16 KiB header cap; the same text in a JSON body
  // has no such ceiling, so long queries come this way.
  router.post(`${base}/query`, authMiddleware, async (ctx) => {
    const { shell } = servicesForRequest(ctx);
    const res = await shell.queryShell({
      ledgerId: ledgerIdOf(ctx),
      userId: undefined,
      query: bodyQuery(ctx),
    });
    ctx.body = successResponse({
      result: res.resultType === "table" ? res.table : res.text,
    });
  });

  // operationId: queryShellText — wire {text, rowCount}
  router.get(`${base}/query-text`, authMiddleware, async (ctx) => {
    const { shell } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await shell.queryShellText({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        query: strQuery(ctx.query.query) ?? "",
      }),
    );
  });

  // operationId: queryShellTextPost — the POST twin of queryShellText.
  router.post(`${base}/query-text`, authMiddleware, async (ctx) => {
    const { shell } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await shell.queryShellText({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        query: bodyQuery(ctx),
      }),
    );
  });
}

/**
 * The POST twin of `strQuery(ctx.query.query) ?? ""`: a missing or
 * non-string body query reads as the empty query, exactly like the GET
 * twin, so the two spellings never disagree on what they run.
 */
function bodyQuery(ctx: { request: { body?: unknown } }): string {
  const body = (ctx.request.body ?? {}) as { query?: unknown };
  return typeof body.query === "string" ? body.query : "";
}
