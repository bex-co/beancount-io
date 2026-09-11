import { ApolloClient } from "@apollo/client";
import { router, type Href } from "expo-router";
import { InteractionManager, Linking } from "react-native";
import {
  GetLedgerDocument,
  type GetLedgerQuery,
} from "@/generated-graphql/graphql";
import { ledgerVar } from "@/common/vars";
import type { AppLinkTarget } from "./resolve-app-link";
export { isOAuthCallbackUrl } from "./oauth-callback-url";

export type OpenAppLinkResult =
  | { ok: true }
  | { ok: false; reason: "unreadable" | "aborted" };

/**
 * Wait until the root navigators (esp. iOS NativeTabs) have finished their
 * cold-start mount. An immediate replace from a Universal Link races the
 * Stack/Tabs initialRoute and loses — landing on Home instead of Reports.
 */
function afterNavigatorReady(): Promise<void> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      // NativeTabs needs a beat after cold start before replace sticks.
      setTimeout(resolve, 100);
    });
  });
}

/**
 * Select the target ledger via the same readability probe as ledger discovery,
 * then navigate. On failure leave the current selection intact and open the
 * original URL in the browser.
 */
export async function openAppLinkTarget(args: {
  client: ApolloClient<object>;
  target: AppLinkTarget;
  sourceUrl: string;
  isCurrentSession: () => boolean;
}): Promise<OpenAppLinkResult> {
  const { client, target, sourceUrl, isCurrentSession } = args;
  try {
    await client.query<GetLedgerQuery>({
      query: GetLedgerDocument,
      variables: { ledgerId: target.ledgerFullName },
      fetchPolicy: "network-only",
    });
  } catch {
    if (isCurrentSession()) {
      await Linking.openURL(sourceUrl);
    }
    return { ok: false, reason: "unreadable" };
  }

  if (!isCurrentSession()) {
    return { ok: false, reason: "aborted" };
  }

  ledgerVar(target.ledgerFullName);
  await afterNavigatorReady();
  if (!isCurrentSession()) {
    return { ok: false, reason: "aborted" };
  }

  // Expo Router's +native-intent rewrite already navigates to `target.href`.
  // Always replace: a second push stacked an identical screen so commit/entry
  // deep links needed two Back taps. Tab links also replace so we do not stack
  // a duplicate tabs frame on Home.
  router.replace(target.href as Href);
  return { ok: true };
}
