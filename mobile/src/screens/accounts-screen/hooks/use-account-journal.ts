import {
  AccountJournalQueryInput,
  useAccountJournalQuery,
} from "@/generated-graphql/graphql";

/** Default page size for account-journal pagination. */
export const ACCOUNT_JOURNAL_PAGE_SIZE = 20;

/**
 * Paginated journal for a single account: each item carries the `entry`, the
 * `change` it applied, and the running `balance` afterward. `with_children`
 * rolls sub-accounts in (true by default). Consumers page via `fetchMore` using
 * `offset`; `total` bounds the end of the list.
 */
export const useAccountJournal = (
  ledgerId: string,
  account: string,
  options?: Partial<AccountJournalQueryInput>,
) => {
  const query: AccountJournalQueryInput = {
    account,
    limit: ACCOUNT_JOURNAL_PAGE_SIZE,
    offset: 0,
    with_children: true,
    ...options,
  };
  const { loading, data, error, refetch, fetchMore, networkStatus } =
    useAccountJournalQuery({
      variables: { ledgerId, query },
      skip: !ledgerId || !account,
      notifyOnNetworkStatusChange: true,
    });
  return { loading, data, error, refetch, fetchMore, networkStatus };
};
