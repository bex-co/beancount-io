import { FavaApiError } from "@/foundation/fava";
import type { IFavaClientFactory } from "@/foundation/clients/fava-client-factory";
import { parseLedgerId } from "@/shared/str";

/**
 * A credential pin names a ledger by its stable repository ID, so a rename
 * moves the pin with the ledger and a recreated name never inherits it
 * (w23/065, ADR 0007 amendment). This turns a name into that ID and an ID
 * back into the ledger's current `owner/name`.
 *
 * `undefined` means "no such ledger" (a deleted repository, or a name nothing
 * owns). A failed lookup throws: an outage must never read as a match.
 */
export interface LedgerPinResolver {
  repoIdOf(ledgerId: string): Promise<number | undefined>;
  nameOf(repoId: number): Promise<string | undefined>;
}

/** How long a lookup is reused; a rename shows within this window. */
const PIN_CACHE_TTL_MS = 30_000;

type Lookup<T> = { value: T; at: number };

async function orMissing<T>(
  call: () => Promise<{ data: { success?: boolean; data?: T } }>,
): Promise<T | undefined> {
  try {
    const response = await call();
    return response.data?.success === true ? response.data.data : undefined;
  } catch (error) {
    if (error instanceof FavaApiError && error.status === 404) return undefined;
    throw error;
  }
}

export function createLedgerPinResolver(
  favaClientFactory: Pick<IFavaClientFactory, "getAdminClient">,
  now: () => number = Date.now,
): LedgerPinResolver {
  const ids = new Map<string, Lookup<number | undefined>>();
  const names = new Map<number, Lookup<string | undefined>>();
  const fresh = <T>(entry: Lookup<T> | undefined) =>
    entry !== undefined && now() - entry.at < PIN_CACHE_TTL_MS;

  return {
    async repoIdOf(ledgerId) {
      const cached = ids.get(ledgerId);
      if (cached && fresh(cached)) return cached.value;
      const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);
      const ledger = await orMissing<{ id: number }>(() =>
        favaClientFactory
          .getAdminClient()
          .ledgers.getLedger(ledgerOwner, ledgerName),
      );
      const value =
        Number.isSafeInteger(ledger?.id) && (ledger?.id ?? 0) > 0
          ? ledger?.id
          : undefined;
      ids.set(ledgerId, { value, at: now() });
      return value;
    },

    async nameOf(repoId) {
      const cached = names.get(repoId);
      if (cached && fresh(cached)) return cached.value;
      const ledger = await orMissing<{ full_name?: string }>(() =>
        favaClientFactory.getAdminClient().admin.getLedgerByRepoId(repoId),
      );
      const value = ledger?.full_name || undefined;
      names.set(repoId, { value, at: now() });
      return value;
    },
  };
}
