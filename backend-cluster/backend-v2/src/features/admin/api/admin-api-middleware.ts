import Router from "@koa/router";
import { config } from "@/config/config";
import { secureStringEqual } from "@/features/auth/utils/secure-string-equal";
import { UnauthenticatedError } from "@/shared/errors";

export const apiTokenRequired: Router.Middleware = async (
  ctx,
  next: () => Promise<void>,
) => {
  if (!config.adminToken) {
    throw new UnauthenticatedError("admin API not configured");
  }

  // A shared secret on a public route: compare in constant time, so response
  // timing says nothing about how much of a guess was right. Anything but a
  // single string (a missing header, a repeated one) is simply not the token.
  const supplied = ctx.headers["x-admin-token"];
  if (
    typeof supplied !== "string" ||
    !secureStringEqual(supplied, config.adminToken)
  ) {
    throw new UnauthenticatedError("invalid api token");
  }

  await next();
};
