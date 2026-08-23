import type { MiddlewareFn } from "type-graphql";
import type { IContext } from "./context";
import {
  requireScopeClass,
  gqlOpId,
  type ScopeEnforcementMode,
} from "@/server/api/op-class";

/**
 * The GraphQL half of the op-class gate (ADR 0006 D3).
 *
 * A TypeGraphQL global middleware rather than the auth checker, because the
 * checker only runs on fields carrying `@Authorized()` — an op that forgot the
 * decorator would also skip the scope matrix, which is the opposite of failing
 * closed. This runs on every field resolution and narrows to root fields
 * itself: `Query.x` and `Mutation.y` are ops, `Ledger.name` is not.
 *
 * The refusal is a thrown `ForbiddenError`, which `format-error.ts` already
 * turns into the GraphQL errors array with `extensions.code = FORBIDDEN` —
 * same decision as REST and MCP, dressed in this surface's dialect.
 */
export function graphqlScopeMiddleware(
  mode: ScopeEnforcementMode,
): MiddlewareFn<IContext> {
  return ({ context, info }, next) => {
    // Root fields only: `info.path.prev` is undefined exactly at the top of the
    // selection set, so nested field resolution never re-runs the check.
    if (info.path.prev !== undefined) {
      return next();
    }
    const parent = info.parentType.name;
    if (parent !== "Query" && parent !== "Mutation") {
      return next();
    }
    requireScopeClass(
      context.identity,
      gqlOpId(`${parent}.${info.fieldName}`),
      mode,
    );
    return next();
  };
}
