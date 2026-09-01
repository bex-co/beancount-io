import { Platform } from "react-native";
import { OAUTH_REDIRECT_URIS } from "./discovery";
import { oauthRedirectUriForPlatform } from "./native-redirect-value";

export function currentOAuthRedirectUri(): (typeof OAUTH_REDIRECT_URIS)[number] {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    throw new Error("Native OAuth is available only on iOS and Android");
  }
  return oauthRedirectUriForPlatform(Platform.OS);
}
