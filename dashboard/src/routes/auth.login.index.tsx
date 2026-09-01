import { createFileRoute, redirect } from "@tanstack/react-router";
import LoginPage from "@/features/auth/pages/login-page";
import { z } from "zod";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import { dashboardOAuthStartHref } from "@/features/oauth/dashboard-oauth";
import { isDashboardOAuthInteractionBound } from "@/features/oauth/dashboard-interaction-binding";

const loginSearchSchema = z.object({
  next: z.string().optional(),
  reason: z.enum(["expired", "interaction_expired"]).optional(),
  interaction: z.string().optional(),
});

export const Route = createFileRoute("/auth/login/")({
  component: LoginPage,
  validateSearch: (search) => loginSearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps, location }) => {
    if (context.userProfile) throw redirect({ to: "/auth/welcome" });
    const bound =
      deps.interaction &&
      (await isDashboardOAuthInteractionBound({
        data: { uid: deps.interaction },
      }));
    if (!bound) {
      throw redirect({
        href: dashboardOAuthStartHref(deps.next, location.pathname),
      });
    }
  },
  head: () =>
    createHeadMeta(getSEOMetadata("seo.login.title", "seo.login.description")),
  // ssr: false,
});
