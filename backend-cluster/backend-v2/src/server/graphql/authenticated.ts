import { UseMiddleware, type MiddlewareFn } from "type-graphql";
import { UnauthenticatedError } from "@/shared/errors";
import type { IContext } from "./context";

/**
 * GraphQL authentication only.
 *
 * This deliberately does not inspect scopes, credential methods, resources,
 * or relationships and does not emit an authorization audit. PDP-routed
 * application services own those decisions; this decorator only prevents an
 * anonymous request from entering a resolver that requires an Identity.
 */
export const authenticatedMiddleware: MiddlewareFn<IContext> = (
  { context },
  next,
) => {
  if (!context.identity) {
    throw new UnauthenticatedError("Access denied! Please login to continue!");
  }
  return next();
};

/** Apply the authentication-only middleware to a resolver class or method. */
export function Authenticated(): ReturnType<typeof UseMiddleware> {
  return UseMiddleware(authenticatedMiddleware);
}
