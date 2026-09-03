import { redirect } from "@tanstack/react-router";
import type { RouteBeforeLoader } from "@/common/types/route-loader";
import { getSafeRedirectPath } from "@/common/lib/auth/auth";

/**
 * Already-signed-in visitors skip the form. When the caller asked to come back
 * somewhere (`?next=`), honor it — the marketing site's pricing CTAs send
 * `next=/pricing`, which is a cross-app CMS page, so the redirect must reload
 * the document rather than resolve inside this router (which has no such
 * route and would 404).
 */
export const registerBeforeLoad: RouteBeforeLoader<
  "/auth/sign-up",
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
