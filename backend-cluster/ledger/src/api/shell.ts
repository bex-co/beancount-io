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

  // operationId: queryShellText — wire {text}
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
}
