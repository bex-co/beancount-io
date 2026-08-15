import type { RouteLoader } from "@/common/types/route-loader";

export type IdentityOAuthConsentLoaderData = {
  initialStep: "login" | "approve";
  email?: string;
};

export const identityOauthConsentLoader: RouteLoader<
  "/oauth/identity-consent",
  IdentityOAuthConsentLoaderData
> = async ({ context }) => {
  return context.userProfile
    ? { initialStep: "approve", email: context.userProfile.email }
    : { initialStep: "login" };
};
