import Router from "@koa/router";
import { config } from "@/config/config";
import { UnauthenticatedError } from "@/shared/errors";

export const apiTokenRequired: Router.Middleware = async (
  ctx,
  next: () => Promise<void>,
) => {
  if (!config.adminToken) {
    throw new UnauthenticatedError("admin API not configured");
  }

  if (ctx.headers["x-admin-token"] !== config.adminToken) {
    throw new UnauthenticatedError("invalid api token");
  }

  await next();
};
