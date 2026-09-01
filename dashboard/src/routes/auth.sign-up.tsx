import { createFileRoute, redirect } from "@tanstack/react-router";
import RegisterFlow from "@/features/auth/pages/register";
import { z } from "zod";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";
import { dashboardOAuthStartHref } from "@/features/oauth/dashboard-oauth";
import { isDashboardOAuthInteractionBound } from "@/features/oauth/dashboard-interaction-binding";

const signUpSearchSchema = z.object({
  withDefaultLedger: z.boolean().optional(),
  src: z.string().optional(),
  by: z.string().optional(),
  next: z.string().optional(),
  reason: z.enum(["interaction_expired"]).optional(),
  interaction: z.string().optional(),
});

export const Route = createFileRoute("/auth/sign-up")({
  component: RegisterFlow,
  validateSearch: (search) => signUpSearchSchema.parse(search),
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
        href: dashboardOAuthStartHref(deps.next, location.pathname, "signup"),
      });
    }
  },
  head: () =>
    createHeadMeta(
      getSEOMetadata("seo.signUp.title", "seo.signUp.description"),
    ),
});
