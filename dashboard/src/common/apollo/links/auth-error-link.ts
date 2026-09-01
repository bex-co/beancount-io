import { ErrorLink } from "@apollo/client/link/error";
import { CombinedGraphQLErrors } from "@apollo/client/errors";

/**
 * These mutations return UNAUTHENTICATED as an expected outcome (e.g. an
 * already-expired token being refreshed/revoked), not as a signal that the
 * *current* session just died — redirecting on them would loop back into
 * the page we're trying to leave.
 */
const AUTH_FLOW_OPERATIONS = new Set([
  "SignIn",
  "SignInWithOneTimeToken",
  "RefreshToken",
  "Logout",
  "VerifySignUpOtp",
]);

/**
 * These nullable queries ask whether there is a current viewer. They also run
 * on public pages, where "no session" is a valid result rather than a reason
 * to turn the page into a login-only route. Protected route loaders and
 * operations still redirect through the general UNAUTHENTICATED path below.
 */
const OPTIONAL_IDENTITY_OPERATIONS = new Set([
  "GetCurrentUser",
  "IsAuthenticated",
]);

let redirecting = false;

export function isUnauthenticatedError(
  error: unknown,
): error is CombinedGraphQLErrors {
  return (
    CombinedGraphQLErrors.is(error) &&
    error.errors.some(
      (gqlError) => gqlError.extensions?.code === "UNAUTHENTICATED",
    )
  );
}

export function shouldRedirectForUnauthenticatedError(
  error: unknown,
  operationName?: string,
): boolean {
  if (!isUnauthenticatedError(error)) return false;
  if (!operationName) return true;
  return (
    !AUTH_FLOW_OPERATIONS.has(operationName) &&
    !OPTIONAL_IDENTITY_OPERATIONS.has(operationName)
  );
}

/**
 * Catches UNAUTHENTICATED GraphQL errors (expired/revoked JWT cookie) from
 * authenticated queries and mutations *mounted on the client* and bounces the
 * user to the login page instead of letting the error surface as a generic
 * "something went wrong" screen. Nullable identity probes are intentionally
 * excluded because they also run on public pages.
 *
 * CSR-only: on the server there's no `window` to redirect from, and — as
 * important — no live router-invoked callback to safely construct a
 * `redirect()` from (constructing one from inside a Link crashes TanStack
 * Start's SSR render with "The target couldn't be found"). The SSR/loader
 * case (a route's `loader` throwing this error before any component mounts)
 * is instead handled centrally in the root `ErrorPage` component, which
 * every route without its own `errorComponent` already falls back to.
 *
 * A full-page navigation (not router.navigate) is used deliberately: it
 * resets all in-memory state (Apollo cache, React state) in one step without
 * needing a reference to the client or router instance from this link.
 */
export const authErrorLink = new ErrorLink(({ error, operation }) => {
  if (typeof window === "undefined") return;
  if (redirecting) return;
  if (!shouldRedirectForUnauthenticatedError(error, operation.operationName))
    return;

  redirecting = true;
  const next = window.location.pathname + window.location.search;
  window.location.assign(
    `/auth/login?next=${encodeURIComponent(next)}&reason=expired`,
  );
});
