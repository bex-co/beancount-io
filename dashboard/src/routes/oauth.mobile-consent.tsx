import { createFileRoute, notFound } from "@tanstack/react-router";
import type { z } from "zod";
import { InvalidAuthorizationLinkPage } from "@/common/root-route/not-found-page";
import MobileOAuthConsentPage from "@/features/oauth/pages/mobile-consent";
import { handleConsentPost } from "@/features/oauth/funcs/handle-consent-post";
import { mobileOauthConsentLoader } from "@/features/oauth/funcs/mobile-loader";
import { mobileConsentSearchSchema } from "@/features/oauth/funcs/mobile-consent-search";
import { createNoIndexHead } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/oauth/mobile-consent")({
  // A malformed or truncated authorization link is a client error: answer
  // 404 with the sign-in-link page instead of a 500 "unexpected error"
  // (w0/018).
  validateSearch: (search: Record<string, unknown>) => {
    const parsed = mobileConsentSearchSchema.safeParse(search);
    // An empty uid marks the link invalid; `beforeLoad` turns it into the
    // 404 (a throw here would surface as a 500 search error).
    return parsed.success
      ? parsed.data
      : ({ uid: "" } as unknown as z.infer<typeof mobileConsentSearchSchema>);
  },
  beforeLoad: ({ search }) => {
    if (!search.uid) throw notFound();
  },
  notFoundComponent: InvalidAuthorizationLinkPage,
  component: MobileOAuthConsentPage,
  loaderDeps: ({ search }) => ({ screenHint: search.screen_hint }),
  loader: mobileOauthConsentLoader,
  head: createNoIndexHead,
  server: {
    handlers: {
      POST: handleConsentPost,
    },
  },
});
