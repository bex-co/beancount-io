import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import IdentityOAuthConsentPage from "@/features/oauth/pages/identity-consent";
import { handleIdentityConsentPost } from "@/features/oauth/funcs/handle-identity-consent-post";
import { identityOauthConsentLoader } from "@/features/oauth/funcs/identity-loader";
import { createNoIndexHead } from "@/common/lib/seo/seo-helpers";

const searchSchema = z.object({ uid: z.string() });

export const Route = createFileRoute("/oauth/identity-consent")({
  validateSearch: searchSchema,
  component: IdentityOAuthConsentPage,
  loader: identityOauthConsentLoader,
  head: createNoIndexHead,
  server: {
    handlers: {
      POST: handleIdentityConsentPost,
    },
  },
});
