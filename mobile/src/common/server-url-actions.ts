import { apolloClient } from "@/common/apollo/client";
import { purgeApolloCache } from "@/common/apollo/cache-persist";
import { teardownSessionCaches } from "@/common/apollo/session-teardown";
import { defaultRuntimeServerUrl } from "@/common/server-url";
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
export async function clearServerScopedState(): Promise<void> {
  ledgerVar(null);
  accountUsageVar({});
  merchantRecurringOverridesVar({});
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
