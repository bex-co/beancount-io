import { apolloClient } from "@/common/apollo/client";
import { sweepReceiptCaches } from "@/common/receipt-files";
import { purgeApolloCache } from "@/common/apollo/cache-persist";
import { teardownSessionCaches } from "@/common/apollo/session-teardown";
import { defaultRuntimeServerUrl } from "@/common/server-url";
import { oauthTokenManager } from "@/common/oauth/oauth-token-manager";
import { clearPendingAuthorization } from "@/common/oauth/pending-authorization-storage";
import { clearGuestVisit } from "@/common/guest/guest-state";
import { clearPendingAppLink } from "@/common/app-links/pending-app-link";
import { clearCreateLedgerDraft } from "@/common/create-ledger-draft";
import { resetTransactionFilters } from "@/screens/transactions-screen/filters/var";
import { invalidateAuthorization } from "@/common/oauth/authorization-context";
import {
  accountUsageVar,
  flushAccountUsage,
  flushLedger,
  flushMerchantRecurringOverrides,
  flushSession,
  ledgerVar,
  merchantRecurringOverridesVar,
  sessionVar,
} from "@/common/vars";
import {
  flushServerUrl,
  getServerUrl,
  resetServerUrl,
  setServerUrl,
  serverUrlOverrideVar,
} from "@/common/vars/server-url";

/** Clear every local value that can be derived from a server-backed ledger. */
export async function clearServerScopedState(
  options: { refreshAlreadyTerminal?: boolean } = {},
): Promise<void> {
  clearGuestVisit();
  invalidateAuthorization();
  // A link stashed for this account must not open for the next one (w21/083).
  clearPendingAppLink();
  if (options.refreshAlreadyTerminal) {
    oauthTokenManager.invalidatePendingRefreshes();
  } else {
    await oauthTokenManager.cancelPendingRefreshes();
  }
  // Best effort: a Keychain that will not delete this must not leave the
  // session in place after the server has revoked it (w21/967).
  await clearPendingAuthorization().catch(() => undefined);
  ledgerVar(null);
  accountUsageVar({});
  merchantRecurringOverridesVar({});
  resetTransactionFilters();
  await teardownSessionCaches({
    clearSession: () => sessionVar(null),
    flushSession,
    purgePersistedCache: purgeApolloCache,
    clearInMemoryStore: () => apolloClient.clearStore(),
  });
  await Promise.all([
    flushLedger(),
    flushAccountUsage(),
    flushMerchantRecurringOverrides(),
    // The next account on this device must not resume this one's setup
    // (w21/053).
    clearCreateLedgerDraft(),
    // Receipt photos the camera and the picker left in the cache (w21/585).
    sweepReceiptCaches(),
  ]);
}

/**
 * Only called from the signed-out server form. Clear credentials and cache
 * first, then publish the new origin; this ordering prevents token reuse on a
 * different host even if a component renders during the transition.
 */
export async function selectServerUrl(url: string): Promise<void> {
  if (url === getServerUrl()) {
    return;
  }
  await clearServerScopedState();
  setServerUrl(url);
  await flushServerUrl();
}

export async function restoreDefaultServerUrl(): Promise<void> {
  if (serverUrlOverrideVar() === null) {
    return;
  }
  if (getServerUrl() !== defaultRuntimeServerUrl()) {
    await clearServerScopedState();
  }
  resetServerUrl();
  await flushServerUrl();
}
