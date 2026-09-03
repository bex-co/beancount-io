import { redirect } from "@tanstack/react-router";
import type { RouteBeforeLoader } from "@/common/types/route-loader";
import { getSafeRedirectPath } from "@/common/lib/auth/auth";

/**
 * Already-signed-in visitors skip the form. A `?next=` destination is honored
 * with a document reload because it may target a cross-app page (the marketing
 * site's /pricing) this router has no route for.
 */
export const loginBeforeLoad: RouteBeforeLoader<
  "/auth/login",
  { next?: string }
> = ({ context, search }) => {
  if (context.userProfile) {
    const next = getSafeRedirectPath(search.next);
    if (next) {
      throw redirect({ href: next, reloadDocument: true });
    }
    throw redirect({ to: "/auth/welcome" });
  }
};
