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

/**
 * Catches UNAUTHENTICATED GraphQL errors (expired/revoked JWT cookie) from
 * any query or mutation *mounted on the client* and bounces the user to the
 * login page instead of letting the error surface as a generic "something
 * went wrong" screen.
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
  if (!isUnauthenticatedError(error)) return;
  if (
    operation.operationName &&
    AUTH_FLOW_OPERATIONS.has(operation.operationName)
  ) {
    return;
  }

  redirecting = true;
  const next = window.location.pathname + window.location.search;
  window.location.assign(
    `/auth/login?next=${encodeURIComponent(next)}&reason=expired`,
  );
});
