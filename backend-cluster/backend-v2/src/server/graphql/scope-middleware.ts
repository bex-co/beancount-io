import type { MiddlewareFn } from "type-graphql";
import type { IContext } from "./context";
import {
  requireScopeClass,
  type ScopeEnforcementMode,
} from "@/server/api/op-class";
import { runWithOperationId } from "@/shared/async-context";
import { graphqlOperationId } from "./graphql-operation-id";

/**
 * The GraphQL half of the op-class gate (ADR 0006 D3).
 *
 * A TypeGraphQL global middleware because access decorators answer only
 * whether identity is required; they intentionally carry no scope policy.
 * This runs on every field resolution and narrows to root fields itself:
 * `Query.x` and `Mutation.y` are ops, `Ledger.name` is not.
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
    const opId = graphqlOperationId(info);
    if (!opId) return next();
    requireScopeClass(context.identity, opId, mode);
    return runWithOperationId(opId, next);
  };
}
