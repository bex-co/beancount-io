import { createFileRoute } from "@tanstack/react-router";
import MobileOAuthConsentPage from "@/features/oauth/pages/mobile-consent";
import { handleMobileConsentPost } from "@/features/oauth/funcs/handle-mobile-consent-post";
import { mobileOauthConsentLoader } from "@/features/oauth/funcs/mobile-loader";
import { mobileConsentSearchSchema } from "@/features/oauth/funcs/mobile-consent-search";
import { createNoIndexHead } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/oauth/mobile-consent")({
  validateSearch: mobileConsentSearchSchema,
  component: MobileOAuthConsentPage,
  loaderDeps: ({ search }) => ({ screenHint: search.screen_hint }),
  loader: mobileOauthConsentLoader,
  head: createNoIndexHead,
  server: {
    handlers: {
      POST: handleMobileConsentPost,
    },
  },
});
