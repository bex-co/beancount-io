import { createFileRoute, notFound } from "@tanstack/react-router";
import { InvalidAuthorizationLinkPage } from "@/common/root-route/not-found-page";
import { z } from "zod";
import OAuthConsentPage from "@/features/oauth/pages/consent";
import { handleConsentPost } from "@/features/oauth/funcs/handle-consent-post";
import { oauthConsentLoader } from "@/features/oauth/funcs/loader";
import { createNoIndexHead } from "@/common/lib/seo/seo-helpers";
import { fetchDeploymentInfo } from "@/common/lib/deployment-info";

const searchSchema = z.object({
  uid: z.string(),
  scope: z.string().optional(),
});

export const Route = createFileRoute("/oauth/consent")({
  // A malformed or truncated authorization link is a client error: answer
  // 404 with the sign-in-link page instead of a 500 "unexpected error"
  // (w0/018).
  validateSearch: (search: Record<string, unknown>) => {
    const parsed = searchSchema.safeParse(search);
    // An empty uid marks the link invalid; `beforeLoad` turns it into the
    // 404 (a throw here would surface as a 500 search error).
    return parsed.success
      ? parsed.data
      : ({ uid: "" } as unknown as z.infer<typeof searchSchema>);
  },
  beforeLoad: async ({ search, context }) => {
    if (!search.uid) throw notFound();
    // The sign-in step offers "Sign up" and the register step shows the legal
    // links only where the deployment says they apply.
    await fetchDeploymentInfo(context.client);
  },
  notFoundComponent: InvalidAuthorizationLinkPage,
  component: OAuthConsentPage,
  loader: oauthConsentLoader,
  head: createNoIndexHead,
  server: {
    handlers: {
      POST: handleConsentPost,
    },
  },
});
