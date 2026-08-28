import type { RouterContext } from "@/common/types/router-context";
import {
  initialMobileOAuthConsentState,
  type MobileOAuthConsentState,
  type MobileOAuthScreenHint,
} from "./mobile-consent-state";

export type MobileOAuthConsentLoaderDeps = {
  screenHint: MobileOAuthScreenHint;
};

export type MobileOAuthConsentLoaderData = {
  initialState: MobileOAuthConsentState;
};

/** Decides where the interaction opens from the session and the app's hint. */
export const mobileOauthConsentLoader = async ({
  context,
  deps,
}: {
  context: RouterContext;
  deps: MobileOAuthConsentLoaderDeps;
}): Promise<MobileOAuthConsentLoaderData> => ({
  initialState: initialMobileOAuthConsentState({
    userProfile: context.userProfile,
    screenHint: deps.screenHint,
  }),
});
