import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import MobileOAuthConsentPage from "@/features/oauth/pages/mobile-consent";
import { handleMobileConsentPost } from "@/features/oauth/funcs/handle-mobile-consent-post";
import { mobileOauthConsentLoader } from "@/features/oauth/funcs/mobile-loader";
import { createNoIndexHead } from "@/common/lib/seo/seo-helpers";

const searchSchema = z.object({
  uid: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9_-]+$/),
  scope: z.string().min(1).max(512),
});

export const Route = createFileRoute("/oauth/mobile-consent")({
  validateSearch: searchSchema,
  component: MobileOAuthConsentPage,
  loader: mobileOauthConsentLoader,
  head: createNoIndexHead,
  server: {
    handlers: {
      POST: handleMobileConsentPost,
    },
  },
});
