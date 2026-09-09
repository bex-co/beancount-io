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
  { ok: true } | { ok: false; reason: "unreadable" | "aborted" };

const TAB_PATHS = new Set([
  "/",
  "/transactions",
  "/reports",
  "/accounts",
  "/ledger",
  "/(app)/(tabs)",
  "/(app)/(tabs)/transactions",
  "/(app)/(tabs)/reports",
  "/(app)/(tabs)/accounts",
  "/(app)/(tabs)/ledger",
]);

function isTabsHref(href: Href): href is string {
  return typeof href === "string" && TAB_PATHS.has(href);
}

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

  // Tab routes replace so a link doesn't stack a duplicate tabs frame on Home.
  const href = target.href;
  if (isTabsHref(href)) {
    router.replace(href);
  } else {
    router.push(href as Href);
  }
  return { ok: true };
}
