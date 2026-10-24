import { ApolloClient } from "@apollo/client";
import { router, type Href } from "expo-router";
import { InteractionManager, Linking } from "react-native";
import {
  GetLedgerDocument,
  type GetLedgerQuery,
} from "@/generated-graphql/graphql";
import { ledgerVar } from "@/common/vars";
import { setTransactionFiltersForLedger } from "@/screens/transactions-screen/filters/var";
import { confirmDiscardUnsavedEdits } from "@/common/unsaved-edits-guard";
import type { AppLinkTarget } from "./resolve-app-link";
export { isOAuthCallbackUrl } from "./oauth-callback-url";

export type OpenAppLinkResult =
  { ok: true } | { ok: false; reason: "unreadable" | "aborted" };

/**
 * Wait until the root navigators (esp. iOS NativeTabs) have finished their
 * cold-start mount. An immediate replace from a Universal Link races the
 * Stack/Tabs initialRoute and loses — landing on Home instead of Reports.
 */
export function afterNavigatorReady(): Promise<void> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      // NativeTabs needs a beat after cold start before replace sticks.
      setTimeout(resolve, 100);
    });
  });
}

/**
 * The link's target under the ledger id the server returned. The owner part of
 * a link is matched case-insensitively, so `Alice/books` opens `alice/books`;
 * kept as typed, the selection matched no ledger the app knows, which read as
 * no write access and no "Current" in Browse ledgers (w21/131).
 */
function canonicalAppLinkTarget(
  target: AppLinkTarget,
  ledgerId: string | null | undefined,
): AppLinkTarget {
  if (!ledgerId || ledgerId === target.ledgerFullName) return target;
  const { href } = target;
  return {
    ...target,
    ledgerFullName: ledgerId,
    href:
      typeof href === "object" && href.params?.ledger === target.ledgerFullName
        ? { ...href, params: { ...href.params, ledger: ledgerId } }
        : href,
  };
}

/**
 * Links just handed to the browser. On Android an `https` link the app claims
 * (`app.json` verifies `/ledger/…`) opens the app again, which handled it,
 * failed the same probe and handed it to the browser again, so a ledger the
 * user cannot read looped without reaching one (w21/980). A URL handed over
 * recently is not probed or handed over a second time.
 */
const HANDED_TO_BROWSER_MS = 15_000;
const handedToBrowser = new Map<string, number>();

const recentlyHandedToBrowser = (url: string): boolean => {
  const at = handedToBrowser.get(url);
  return at !== undefined && Date.now() - at < HANDED_TO_BROWSER_MS;
};

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
  /**
   * `push` for a link tapped inside the app, so Back returns to where it was;
   * the ledger's own home is then the screen already showing. Incoming links
   * replace.
   */
  navigation?: "replace" | "push";
}): Promise<OpenAppLinkResult> {
  const { client, sourceUrl, isCurrentSession } = args;
  let target = args.target;
  if (recentlyHandedToBrowser(sourceUrl)) {
    return { ok: false, reason: "unreadable" };
  }
  try {
    const { data } = await client.query<GetLedgerQuery>({
      query: GetLedgerDocument,
      variables: { ledgerId: target.ledgerFullName },
      fetchPolicy: "network-only",
    });
    target = canonicalAppLinkTarget(target, data?.getLedger?.id);
  } catch {
    if (isCurrentSession()) {
      if (handedToBrowser.size > 50) handedToBrowser.clear();
      handedToBrowser.set(sourceUrl, Date.now());
      await Linking.openURL(sourceUrl);
    }
    return { ok: false, reason: "unreadable" };
  }

  if (!isCurrentSession()) {
    return { ok: false, reason: "aborted" };
  }

  // Switching ledgers remounts the file editor clean before any navigation
  // could ask about its draft, so ask first; Cancel keeps the editor, its
  // draft and the ledger (w21/090). A same-ledger link reaches the editor's
  // own beforeRemove guard.
  if (
    ledgerVar() !== target.ledgerFullName &&
    !(await confirmDiscardUnsavedEdits())
  ) {
    return { ok: false, reason: "aborted" };
  }
  if (!isCurrentSession()) {
    return { ok: false, reason: "aborted" };
  }

  ledgerVar(target.ledgerFullName);
  // A journal link replaces the filter left in the app with its own (w21/344).
  if (target.filters) {
    setTransactionFiltersForLedger(target.ledgerFullName, target.filters);
  }
  if (args.navigation === "push") {
    if (target.href !== "/") router.push(target.href as Href);
    return { ok: true };
  }
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
