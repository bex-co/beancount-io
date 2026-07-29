import { ApolloClient } from "@apollo/client";
import {
  ListUserOwnedLedgersDocument,
  ListLedgersDocument,
  type ListUserOwnedLedgersQuery,
  type ListLedgersQuery,
} from "@/graphql/definitions";
import { parseLedgerFullName } from "./encode";

/**
 * Gets the user's default ledger by first trying to get the first item from
 * ListUserOwnedLedgersDocument, then falling back to ListLedgersDocument if needed.
 * Returns null if no ledgers are found.
 *
 * @param apolloClient - The Apollo client instance to use for queries
 * @returns The first ledger if found, null otherwise
 */
export async function getUserDefaultLedger(
  apolloClient: ApolloClient,
): Promise<{ id: string } | null> {
  try {
    // First, try to get user-owned ledgers
    const ownedLedgersResult =
      await apolloClient.query<ListUserOwnedLedgersQuery>({
        query: ListUserOwnedLedgersDocument,
        fetchPolicy: "network-only", // Force fresh data
      });

    const ownedLedgers = ownedLedgersResult.data?.listUserOwnedLedgers || [];

    if (ownedLedgers.length > 0) {
      return ownedLedgers[0];
    }
  } catch (error) {
    // If query fails, fall through to try ListLedgersDocument
    console.warn("Failed to query user-owned ledgers:", error);
  }

  try {
    // Fallback to all ledgers
    const allLedgersResult = await apolloClient.query<ListLedgersQuery>({
      query: ListLedgersDocument,
      fetchPolicy: "network-only", // Force fresh data
    });

    const allLedgers = allLedgersResult.data?.listLedgers || [];

    if (allLedgers.length > 0) {
      return allLedgers[0];
    }
  } catch (error) {
    // If this also fails, return null
    console.warn("Failed to query ledgers:", error);
  }

  return null;
}

/**
 * Groups ledgers by their owner
 * @param ledgers - Array of ledgers with fullName property
 * @returns Map of owner -> array of ledgers
 */
export function groupLedgersByOwner<T extends { fullName: string }>(
  ledgers: T[],
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const ledger of ledgers) {
    const { owner } = parseLedgerFullName(ledger.fullName);
    const ownerKey = owner || "unknown";

    if (!groups.has(ownerKey)) {
      groups.set(ownerKey, []);
    }
    groups.get(ownerKey)!.push(ledger);
  }

  return groups;
}
