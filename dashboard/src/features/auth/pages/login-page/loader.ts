import { redirect } from "@tanstack/react-router";
import type { RouteBeforeLoader } from "@/common/types/route-loader";
import { getSafeRedirectPath } from "@/common/lib/auth/auth";
import { fetchDeploymentInfo } from "@/features/auth/lib/deployment-info";

/**
 * Already-signed-in visitors skip the form. A `?next=` destination is honored
 * with a document reload because it may target a cross-app page (the marketing
 * site's /pricing) this router has no route for.
 *
 * Everyone else gets the deployment's answer into the Apollo cache before the
 * page renders: a self-hosted deployment that already has an account offers no
 * "Sign up" link.
 */
export const loginBeforeLoad: RouteBeforeLoader<
  "/auth/login",
  { next?: string }
> = async ({ context, search }) => {
  if (context.userProfile) {
    const next = getSafeRedirectPath(search.next);
    if (next) {
      throw redirect({ href: next, reloadDocument: true });
    }
    throw redirect({ to: "/auth/welcome" });
  }
  await fetchDeploymentInfo(context.client);
};
