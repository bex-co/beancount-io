import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import OAuthConsentPage from "@/features/oauth/pages/consent";
import { handleConsentPost } from "@/features/oauth/funcs/handle-consent-post";
import { oauthConsentLoader } from "@/features/oauth/funcs/loader";

const searchSchema = z.object({ uid: z.string() });

export const Route = createFileRoute("/oauth/consent")({
  validateSearch: searchSchema,
  component: OAuthConsentPage,
  loader: oauthConsentLoader,
  server: {
    handlers: {
      POST: handleConsentPost,
    },
  },
});
