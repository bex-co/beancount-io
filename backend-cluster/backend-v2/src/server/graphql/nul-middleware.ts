import type { MiddlewareFn } from "type-graphql";
import type { IContext } from "./context";
import { assertNoNulDeep } from "@/shared/assert-no-nul";
import { NUL_EXEMPT_PATHS } from "@/shared/nul-exempt-paths";

/**
 * U+0000 in any root-field argument is the caller's mistake: refused as
 * BAD_USER_INPUT before authorization or any resolver work, the GraphQL half
 * of the MCP and REST boundary guard (w23/m22). File-content arguments are
 * exempt (`NUL_EXEMPT_PATHS`).
 */
export function graphqlNulMiddleware(): MiddlewareFn<IContext> {
  return ({ args, info }, next) => {
    // Root fields only: nested field resolution has no caller-supplied bytes.
    if (info.path.prev === undefined) assertNoNulDeep(args, NUL_EXEMPT_PATHS);
    return next();
  };
}
