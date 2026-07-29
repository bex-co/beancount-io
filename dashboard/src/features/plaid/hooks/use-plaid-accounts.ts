import { useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
import {
  GetPlaidItemsDocument,
  GetPlaidAccountsDocument,
  GetPlaidAccountsForLedgerDocument,
  GetUnsyncedPlaidTransactionsDocument,
  UpdatePlaidAccountMappingDocument,
  UpdatePlaidAccountCurrencyDocument,
  UnlinkPlaidItemDocument,
  SyncPlaidTransactionsDocument,
  SuggestPlaidTransactionCategoriesDocument,
  SuggestPlaidAccountMappingDocument,
  SubmitPlaidTransactionsToLedgerDocument,
  DeletePlaidTransactionsDocument,
} from "@/graphql/definitions";
import type { PlaidItem } from "../types";

export function usePlaidItems(ledgerId: string) {
  const { data, loading, error, refetch } = useQuery(GetPlaidItemsDocument, {
    variables: { ledgerId },
  });

  return {
    items: data?.getPlaidItems || [],
    loading,
    error,
    refetch,
  };
}

export function usePlaidAccountsForItem(
  ledgerId: string,
  itemId: string | null,
) {
  const { data, loading, error, refetch } = useQuery(GetPlaidAccountsDocument, {
    variables: { itemId: itemId || "", ledgerId },
    skip: !itemId,
  });

  return {
    accounts: data?.getPlaidAccounts || [],
    loading,
    error,
    refetch,
  };
}

/**
 * Every Plaid account in the ledger, each carrying its institution name.
 *
 * Use this for ledger-wide pickers: it returns accounts that currently have no
 * transactions to review, which deriving options from fetched rows cannot.
 */
export function usePlaidAccountsForLedger(ledgerId: string) {
  const { data, loading, error, refetch } = useQuery(
    GetPlaidAccountsForLedgerDocument,
    { variables: { ledgerId } },
  );

  return {
    accounts: data?.getPlaidAccountsForLedger || [],
    loading,
    error,
    refetch,
  };
}

export function useUnsyncedTransactions(
  ledgerId: string,
  accountId?: string | null,
) {
  const { data, loading, error, refetch } = useQuery(
    GetUnsyncedPlaidTransactionsDocument,
    {
      variables: { accountId: accountId || undefined, ledgerId },
      fetchPolicy: "cache-and-network",
    },
  );

  return {
    transactions: data?.getUnsyncedPlaidTransactions || [],
    loading,
    error,
    refetch,
  };
}

/** No refetchQueries here — this and useUpdateAccountCurrency are always
 * committed together via Promise.all in AccountMappingForm's handleSave,
 * which refetches once itself afterward, same discipline as
 * useBatchUpdateAccountMapping below. */
export function useUpdateAccountMapping() {
  const [updateMapping, { loading, error }] = useMutation(
    UpdatePlaidAccountMappingDocument,
  );

  return {
    updateMapping: async (
      ledgerId: string,
      accountId: string,
      ledgerAccount: string,
    ) => {
      await updateMapping({
        variables: { accountId, ledgerAccount, ledgerId },
      });
    },
    loading,
    error,
  };
}

/** No refetchQueries — see useUpdateAccountMapping. */
export function useUpdateAccountCurrency() {
  const [updateCurrency, { loading, error }] = useMutation(
    UpdatePlaidAccountCurrencyDocument,
  );

  return {
    updateCurrency: async (
      ledgerId: string,
      accountId: string,
      currency: string,
    ) => {
      await updateCurrency({
        variables: { accountId, currency, ledgerId },
      });
    },
    loading,
    error,
  };
}

/** For accepting N mapping suggestions at once — no per-call refetchQueries so
 * accepting-all doesn't schedule N redundant account-list refetches; the
 * caller refetches once after every mutation resolves. */
export function useBatchUpdateAccountMapping() {
  const [updateMapping, { loading, error }] = useMutation(
    UpdatePlaidAccountMappingDocument,
  );

  return {
    updateMappings: async (
      ledgerId: string,
      mappings: Array<{ accountId: string; ledgerAccount: string }>,
    ) => {
      await Promise.all(
        mappings.map(({ accountId, ledgerAccount }) =>
          updateMapping({ variables: { accountId, ledgerAccount, ledgerId } }),
        ),
      );
    },
    loading,
    error,
  };
}

export function useUnlinkItem() {
  const [unlinkItem, { loading, error }] = useMutation(
    UnlinkPlaidItemDocument,
    {
      refetchQueries: [GetPlaidItemsDocument],
    },
  );

  return {
    unlinkItem: async (ledgerId: string, itemId: string) => {
      await unlinkItem({ variables: { itemId, ledgerId } });
    },
    loading,
    error,
  };
}

/** Syncs every active item in parallel with no per-call refetchQueries — the
 * caller refetches the ledger-wide unsynced-transactions/items queries once
 * after every mutation resolves, same discipline as useBatchUpdateAccountMapping. */
export function useSyncAllTransactions() {
  const [syncTransactions, { loading, error }] = useMutation(
    SyncPlaidTransactionsDocument,
  );

  return {
    syncAllTransactions: async (ledgerId: string, items: PlaidItem[]) => {
      const activeItems = items.filter((item) => item.status === "active");
      const results = await Promise.all(
        activeItems.map((item) =>
          syncTransactions({ variables: { itemId: item.id, ledgerId } }),
        ),
      );
      const transactionsAdded = results.reduce(
        (sum, result) =>
          sum + (result.data?.syncPlaidTransactions?.transactionsAdded || 0),
        0,
      );
      return {
        transactionsAdded,
        institutionsSynced: activeItems.length,
        skippedCount: items.length - activeItems.length,
      };
    },
    loading,
    error,
  };
}

export function useSuggestPlaidCategories() {
  const [suggestCategories, { loading, error }] = useLazyQuery(
    SuggestPlaidTransactionCategoriesDocument,
  );

  return {
    suggestCategories: async (ledgerId: string, accountId?: string | null) => {
      const result = await suggestCategories({
        variables: { ledgerId, accountId: accountId || undefined },
      });
      return result.data?.suggestPlaidTransactionCategories || [];
    },
    loading,
    error,
  };
}

export function useSuggestPlaidAccountMapping() {
  const [suggestAccountMapping, { loading, error }] = useLazyQuery(
    SuggestPlaidAccountMappingDocument,
  );

  return {
    suggestAccountMapping: async (ledgerId: string, itemId: string) => {
      const result = await suggestAccountMapping({
        variables: { ledgerId, itemId },
      });
      return result.data?.suggestPlaidAccountMapping || [];
    },
    loading,
    error,
  };
}

export function useSubmitPlaidTransactions() {
  const [submitTransactions, { loading, error }] = useMutation(
    SubmitPlaidTransactionsToLedgerDocument,
    {
      refetchQueries: [GetUnsyncedPlaidTransactionsDocument],
    },
  );

  return {
    submitTransactions: async (
      ledgerId: string,
      transactions: Array<{
        transactionId: string;
        targetAccount: string;
        sourceAccount?: string;
      }>,
      /** Existing ledger file to write to; omit to let the backend use main.bean. */
      filename?: string,
    ) => {
      const result = await submitTransactions({
        variables: { ledgerId, transactions, filename },
      });
      return result.data?.submitPlaidTransactionsToLedger;
    },
    loading,
    error,
  };
}

export function useDeletePlaidTransactions() {
  const [deleteTransactions, { loading, error }] = useMutation(
    DeletePlaidTransactionsDocument,
    {
      refetchQueries: [GetUnsyncedPlaidTransactionsDocument],
    },
  );

  return {
    deleteTransactions: async (ledgerId: string, transactionIds: string[]) => {
      const result = await deleteTransactions({
        variables: { ledgerId, transactionIds },
      });
      return result.data?.deletePlaidTransactions;
    },
    loading,
    error,
  };
}
