import { redirect } from "@tanstack/react-router";
import type { RouteBeforeLoader } from "@/common/types/route-loader";
import { getSafeRedirectPath } from "@/common/lib/auth/auth";
import { fetchDeploymentInfo } from "@/common/lib/deployment-info";

/**
 * Already-signed-in visitors skip the form. When the caller asked to come back
 * somewhere (`?next=`), honor it — the marketing site's pricing CTAs send
 * `next=/pricing`, which is a cross-app CMS page, so the redirect must reload
 * the document rather than resolve inside this router (which has no such
 * route and would 404).
 *
 * A self-hosted deployment that already has an account takes no more sign-ups,
 * so there is nothing to fill in: send the visitor to sign in. The same answer
 * is left in the Apollo cache for the form, which hides what a self-host has no
 * use for.
 */
export const registerBeforeLoad: RouteBeforeLoader<
  "/auth/sign-up",
  { next?: string }
> = async ({ context, search }) => {
  if (context.userProfile) {
    const next = getSafeRedirectPath(search.next);
    if (next) {
      throw redirect({ href: next, reloadDocument: true });
    }
    throw redirect({ to: "/auth/welcome" });
  }
  const deployment = await fetchDeploymentInfo(context.client);
  if (!deployment.signUpOpen) {
    throw redirect({ to: "/auth/login", search: { next: search.next } });
  }
};
