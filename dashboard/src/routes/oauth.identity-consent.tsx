import { createFileRoute, notFound } from "@tanstack/react-router";
import { InvalidAuthorizationLinkPage } from "@/common/root-route/not-found-page";
import { z } from "zod";
import IdentityOAuthConsentPage from "@/features/oauth/pages/identity-consent";
import { handleConsentPost } from "@/features/oauth/funcs/handle-consent-post";
import { identityOauthConsentLoader } from "@/features/oauth/funcs/identity-loader";
import { createNoIndexHead } from "@/common/lib/seo/seo-helpers";

const searchSchema = z.object({ uid: z.string() });

export const Route = createFileRoute("/oauth/identity-consent")({
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
  beforeLoad: ({ search }) => {
    if (!search.uid) throw notFound();
  },
  notFoundComponent: InvalidAuthorizationLinkPage,
  component: IdentityOAuthConsentPage,
  loader: identityOauthConsentLoader,
  head: createNoIndexHead,
  server: {
    handlers: {
      POST: handleConsentPost,
    },
  },
});
