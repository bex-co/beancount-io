import type { RouteLoader } from "@/common/types/route-loader";

export type MobileOAuthConsentLoaderData = {
  initialStep: "login" | "approve";
  email?: string;
};

export const mobileOauthConsentLoader: RouteLoader<
  "/oauth/mobile-consent",
  MobileOAuthConsentLoaderData
> = async ({ context }) =>
  context.userProfile
    ? { initialStep: "approve", email: context.userProfile.email }
    : { initialStep: "login" };
