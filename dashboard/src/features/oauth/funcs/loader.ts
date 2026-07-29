import type { RouteLoader } from "@/common/types/route-loader";

export type OAuthConsentLoaderData = {
  initialStep: "login" | "ledger";
};

export const oauthConsentLoader: RouteLoader<
  "/oauth/consent",
  OAuthConsentLoaderData
> = async ({ context }) => {
  return {
    initialStep: context.userProfile ? "ledger" : "login",
  };
};
