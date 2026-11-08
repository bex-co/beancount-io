import type { MiddlewareFn } from "type-graphql";
import type { IContext } from "./context";
import { enforceRateLimit, isPreviewRequest } from "@/server/api/rate-limit";
import { graphqlOperationId } from "./graphql-operation-id";

/**
 * The GraphQL half of the rate limiter.
 *
 * Per root field, like the scope gate beside it, which is also the right
 * accounting unit: a batched document asking for five root fields is five
 * operations, and charging it once would make batching a way to buy a discount
 * on the budget.
 *
 * The refusal is a thrown `RateLimitedError`; `format-error.ts` renders it with
 * `extensions.code = RATE_LIMITED` and the `retryAfter` metadata, which is this
 * surface's dialect of REST's `Retry-After` header.
 */
export function graphqlRateLimitMiddleware(): MiddlewareFn<IContext> {
  return async ({ args, context, info }, next) => {
    if (info.path.prev !== undefined) return next();
    const opId = graphqlOperationId(info);
    if (!opId) return next();

    await enforceRateLimit({
      opId,
      identity: context.identity,
      ip: context.clientIp,
      preview: isPreviewRequest(args),
    });
    return next();
  };
}
