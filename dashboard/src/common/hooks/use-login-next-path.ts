import { useRouterState } from "@tanstack/react-router";
import { getSafeRedirectPath } from "@/common/lib/auth/auth";

/**
 * The current location as a safe relative `next` for `/auth/login`.
 *
 * Guest actions (star, follow) send the visitor to login themselves rather than
 * through `requireAuth`, so they have to supply the return destination the same
 * way the route guard does — path + search + hash — or login falls back to the
 * default ledger and the visitor never gets back to the page they acted on.
 */
export function useLoginNextPath(): string | undefined {
  return useRouterState({
    select: (state) =>
      getSafeRedirectPath(
        `${state.location.pathname}${state.location.searchStr ?? ""}${state.location.hash ?? ""}`,
      ),
  });
}
