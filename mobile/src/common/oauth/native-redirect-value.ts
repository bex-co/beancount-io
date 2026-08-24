import { OAUTH_REDIRECT_URIS } from "./discovery";

export type NativeOAuthPlatform = "ios" | "android";

export function oauthRedirectUriForPlatform(
  platform: NativeOAuthPlatform,
): (typeof OAUTH_REDIRECT_URIS)[number] {
  return platform === "ios" ? OAUTH_REDIRECT_URIS[0] : OAUTH_REDIRECT_URIS[1];
}
