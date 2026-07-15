/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type * as Types from './types';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export * from "./types";
const defaultOptions = {} as const;
export type AccountHierarchyQueryVariables = Exact<{
  userId: string;
  ledgerId?: string | null | undefined;
}>;


export type AccountHierarchyQuery = { accountHierarchy: { success: boolean, data: Array<{ type: string, label: string, data: { account: string, balance: Record<string, number | string>, balance_children: Record<string, number | string>, children: Array<{ account: string, balance: Record<string, number | string>, balance_children: Record<string, number | string>, children: Array<{ account: string, balance: Record<string, number | string>, balance_children: Record<string, number | string>, children: Array<{ account: string, balance: Record<string, number | string>, balance_children: Record<string, number | string>, children: Array<{ account: string, balance: Record<string, number | string>, balance_children: Record<string, number | string> }> }> }> }> } }> } };

export type AccountJournalQueryVariables = Exact<{
  ledgerId: string;
  query: Types.AccountJournalQueryInput;
}>;


export type AccountJournalQuery = { getLedgerAccountJournal: { account: string, total: number, with_children: boolean, items: Array<{ entry: Record<string, number | string>, change: Record<string, number | string>, balance: Record<string, number | string> }> } };

export type AccountReportQueryVariables = Exact<{
  ledgerId: string;
  accountName: string;
  interval?: string | null | undefined;
  time?: string | null | undefined;
}>;


export type AccountReportQuery = { getLedgerAccountReport: { linechartData: Array<{ date: string, balance: Record<string, number | string> }>, intervalTotalsData: Array<{ date: string, balance: Record<string, number | string> }>, accountBalanceData: Array<{ date: string, balance: Record<string, number | string> }> } };

export type AddEntriesMutationVariables = Exact<{
  entriesInput: Array<Types.EntryInput> | Types.EntryInput;
  ledgerId?: string | null | undefined;
}>;


export type AddEntriesMutation = { addEntries: { data: string | null, success: boolean } };

export type AddPushTokenMutationVariables = Exact<{
  pushToken: string;
}>;


export type AddPushTokenMutation = { addPushToken: boolean };

export type BalanceSheetQueryVariables = Exact<{
  ledgerId: string;
  time?: string | null | undefined;
}>;


export type BalanceSheetQuery = { getLedgerBalanceSheet: { netWorthData: Array<{ date: string, balance: Record<string, number | string> }>, assetsData: Array<{ date: string, balance: Record<string, number | string> }>, liabilitiesData: Array<{ date: string, balance: Record<string, number | string> }>, assetsHierarchyData: { account: string, balance: Record<string, number | string>, balanceChildren: Record<string, number | string>, children: Array<Record<string, number | string>>, hasTxns: boolean }, liabilitiesHierarchyData: { account: string, balance: Record<string, number | string>, balanceChildren: Record<string, number | string>, children: Array<Record<string, number | string>>, hasTxns: boolean } } };

export type CancelSubscriptionMutationVariables = Exact<{
  clientId: string;
  subscriptionId: string;
}>;


export type CancelSubscriptionMutation = { cancelSubscription: { success: boolean, message: string | null } };

export type CreateSubscriptionSessionMutationVariables = Exact<{
  clientId: string;
  priceId: string;
}>;


export type CreateSubscriptionSessionMutation = { createSubscriptionSession: { success: boolean, sessionId: string | null, sessionUrl: string | null, message: string | null } };

export type DeleteAccountMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteAccountMutation = { deleteAccount: boolean };

export type DeleteLedgerEntrySourceSliceMutationVariables = Exact<{
  input: Types.DeleteSourceSliceInput;
  ledgerId: string;
}>;


export type DeleteLedgerEntrySourceSliceMutation = { deleteLedgerEntrySourceSlice: { entryHash: string, message: string } };

export type GenerateTempAssetUploadUrlMutationVariables = Exact<{
  mimeType?: string | null | undefined;
  filename?: string | null | undefined;
}>;


export type GenerateTempAssetUploadUrlMutation = { generateTempAssetUploadUrl: { uploadUrl: string, objectKey: string, expiresIn: number } };

export type GetAiCfoUsageQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAiCfoUsageQuery = { aiCfoUsage: { aiCfoTokensUsed: number, aiCfoTokensMax: number } };

export type GetCommitDetailsQueryVariables = Exact<{
  ledgerId: string;
  sha: string;
}>;


export type GetCommitDetailsQuery = { getCommitDetails: { message: string, diff: string | null, author: { name: string }, stats: { additions: number, deletions: number, total: number }, files: Array<{ filename: string, additions: number, deletions: number }> } };

export type GetFeedQueryVariables = Exact<{
  offset?: number | null | undefined;
  limit?: number | null | undefined;
  locale?: string | null | undefined;
}>;


export type GetFeedQuery = { getFeed: { hasMore: boolean, items: Array<{ id: string, title: string, summary: string | null, link: string, publishedAt: unknown, author: string | null, authorAvatar: string | null, source: Types.FeedSource }> } };

export type GetLedgerQueryVariables = Exact<{
  ledgerId: string;
}>;


export type GetLedgerQuery = { getLedger: { id: string, name: string, fullName: string, httpUrl: string, sshUrl: string, private: boolean, empty: boolean, size: number, createdAt: string, updatedAt: string, description: string | null, permissions: { admin: boolean, pull: boolean, push: boolean } | null, options: { nameAssets: string, nameEquity: string, nameExpenses: string, nameIncome: string, nameLiabilities: string, operatingCurrency: Array<string> } } };

export type GetLedgerDirContentQueryVariables = Exact<{
  ledgerId: string;
  dirPath?: string | null | undefined;
}>;


export type GetLedgerDirContentQuery = { getLedgerDirContent: Array<{ name: string, path: string, type: string, size: number, sha: string, lastCommitSha: string | null, lastAuthorDate: string | null }> };

export type GetLedgerEntryContextQueryVariables = Exact<{
  entryHash: string;
  ledgerId: string;
}>;


export type GetLedgerEntryContextQuery = { getLedgerEntryContext: { slice: string, sha256sum: string, entry: Record<string, number | string>, balances_before: Record<string, number | string> | null, balances_after: Record<string, number | string> | null } };

export type GetLedgerErrorsQueryVariables = Exact<{
  ledgerId: string;
}>;


export type GetLedgerErrorsQuery = { getLedgerErrors: Array<{ filename: string | null, lineno: number | null, message: string }> };

export type GetLedgerFileQueryVariables = Exact<{
  ledgerId: string;
  path: string;
}>;


export type GetLedgerFileQuery = { getLedgerFile: { content: string | null, encoding: string | null, name: string, path: string, sha: string, size: number, type: string } | null };

export type GetLedgerJournalQueryVariables = Exact<{
  ledgerId: string;
  query?: Types.JournalQueryInput | null | undefined;
}>;


export type GetLedgerJournalQuery = { getLedgerJournal: { total: number, data: Array<Record<string, number | string>>, is_empty: boolean } };

export type GetLedgerNarrationsQueryVariables = Exact<{
  ledgerId: string;
}>;


export type GetLedgerNarrationsQuery = { getLedgerNarrations: Array<string> };

export type GetLedgerPayeeAccountsQueryVariables = Exact<{
  ledgerId: string;
  payee: string;
}>;


export type GetLedgerPayeeAccountsQuery = { getLedgerPayeeAccounts: Array<string> };

export type GetLedgerPayeesQueryVariables = Exact<{
  ledgerId: string;
}>;


export type GetLedgerPayeesQuery = { getLedgerPayees: Array<string> };

export type HomeChartsQueryVariables = Exact<{
  userId: string;
  ledgerId?: string | null | undefined;
}>;


export type HomeChartsQuery = { homeCharts: { success: boolean, data: Array<{ type: string, label: string, data: Array<{ date: string, balance: Record<string, number | string>, budgets: Record<string, number | string> | null }> }> } };

export type IncomeStatementQueryVariables = Exact<{
  ledgerId: string;
  time?: string | null | undefined;
  interval?: string | null | undefined;
  conversion?: string | null | undefined;
}>;


export type IncomeStatementQuery = { getLedgerIncomeStatement: { expensesData: Array<{ date: string, balance: Record<string, number | string>, accountBalances: Record<string, number | string> }>, incomeData: Array<{ date: string, balance: Record<string, number | string>, accountBalances: Record<string, number | string> }>, netProfitData: Array<{ date: string, balance: Record<string, number | string> }>, expensesHierarchyData: { account: string, balance: Record<string, number | string>, balanceChildren: Record<string, number | string>, children: Array<Record<string, number | string>>, hasTxns: boolean }, incomeHierarchyData: { account: string, balance: Record<string, number | string>, balanceChildren: Record<string, number | string>, children: Array<Record<string, number | string>>, hasTxns: boolean } } };

export type InsertReceiptTransactionMutationVariables = Exact<{
  ledgerId: string;
  receiptObjectKey: string;
  input: Types.InsertReceiptTransactionInput;
}>;


export type InsertReceiptTransactionMutation = { insertReceiptTransaction: { success: boolean } };

export type JournalEntriesQueryVariables = Exact<{
  first?: number | null | undefined;
  after?: string | null | undefined;
  last?: number | null | undefined;
  before?: string | null | undefined;
  detailed?: boolean | null | undefined;
  searchQuery?: string | null | undefined;
  accountFilter?: string | null | undefined;
  amountMin?: number | null | undefined;
  amountMax?: number | null | undefined;
  entryTypes?: Array<string> | string | null | undefined;
  sortBy?: string | null | undefined;
  sortOrder?: string | null | undefined;
  groupBy?: string | null | undefined;
}>;


export type JournalEntriesQuery = { journalEntries: { success: boolean, data: Array<{ date: string, type: string | null, account: string | null, booking: string | null, currencies: Array<string> | null, flag: string | null, links: Array<string | null> | null, narration: string | null, payee: string | null, tags: Array<string | null> | null, comment: string | null, filename: string | null, entry_hash: string | null, entry_type: string | null, error: string | null, error_message: string | null, netAmount: number | null, primaryAccount: string | null, searchableText: string | null, meta: { filename: string, lineno: number } | null, postings: Array<{ account: string, cost: string | null, flag: string | null, price: string | null, meta: { filename: string, lineno: number } | null, units: { currency: string | null, number: number | null } | null }> | null, amount: { currency: string | null, number: number | null } | null }>, pageInfo: { hasNextPage: boolean, hasPreviousPage: boolean, startCursor: string | null, endCursor: string | null, totalCount: number | null } | null } };

export type LedgerMetaQueryVariables = Exact<{
  userId: string;
  ledgerId?: string | null | undefined;
}>;


export type LedgerMetaQuery = { ledgerMeta: { success: boolean, data: { accounts: Array<string>, currencies: Array<string>, errors: number, options: { name_assets: string, name_equity: string, name_expenses: string, name_income: string, name_liabilities: string, operating_currency: Array<string> } } } };

export type ListCommitsQueryVariables = Exact<{
  ledgerId: string;
  branch: string;
  page: number;
  limit: number;
}>;


export type ListCommitsQuery = { listCommits: Array<{ sha: string, shortSha: string | null, message: string, author: { name: string } }> };

export type ListLedgersQueryVariables = Exact<{
  limit?: number | null | undefined;
  page?: number | null | undefined;
}>;


export type ListLedgersQuery = { listLedgers: Array<{ id: string, name: string, fullName: string, httpUrl: string, sshUrl: string, private: boolean, empty: boolean, size: number, createdAt: string, updatedAt: string, description: string | null, permissions: { admin: boolean, pull: boolean, push: boolean } | null }> };

export type ParseReceiptWithLlmMutationVariables = Exact<{
  s3ObjectKey: string;
  ledgerId: string;
}>;


export type ParseReceiptWithLlmMutation = { parseReceiptWithLLM: { date: string, payee: string, description: string, amount: number, sourceAccount: string | null, targetAccount: string | null } };

export type PaymentHistoryQueryVariables = Exact<{ [key: string]: never; }>;


export type PaymentHistoryQuery = { paymentHistory: Array<{ _id: string | null, amount: string, currency: string, paymentEmail: string, userId: string, createAt: unknown, chargeId: string | null, estimatedIotx: number | null, fulfilledHash: string | null }> };

export type SubscriptionStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type SubscriptionStatusQuery = { subscriptionStatus: { hasActiveSubscription: boolean, subscriptions: Array<{ id: string, status: string, cancelAt: unknown, cancelAtPeriodEnd: boolean, canceledAt: unknown, clientId: string, currentPeriodEnd: unknown, currentPeriodStart: unknown, items: Array<{ id: string, quantity: number, price: { id: string, amount: number, currency: string, interval: string, intervalCount: number | null, trialPeriodDays: number | null }, product: { id: string, name: string, description: string | null, images: Array<string> | null } | null }> }> } };

export type SuggestTransactionCategoriesWithLlmQueryVariables = Exact<{
  ledgerId: string;
  transactions: Array<Types.TransactionToCategorizeInput> | Types.TransactionToCategorizeInput;
}>;


export type SuggestTransactionCategoriesWithLlmQuery = { suggestTransactionCategoriesWithLLM: Array<{ targetAccount: string, confidence: number, source: string }> };

export type UpdateLedgerEntrySourceSliceMutationVariables = Exact<{
  input: Types.UpdateSourceSliceInput;
  ledgerId: string;
}>;


export type UpdateLedgerEntrySourceSliceMutation = { updateLedgerEntrySourceSlice: { entryHash: string, message: string, newSha256sum: string } };

export type UpdateLedgerFileMutationVariables = Exact<{
  ledgerId: string;
  path: string;
  content: string;
  sha: string;
  message?: string | null | undefined;
}>;


export type UpdateLedgerFileMutation = { updateLedgerFile: { content: string | null, name: string, path: string, sha: string, size: number, type: string } };

export type UpdateReportSubscribeMutationVariables = Exact<{
  userId: string;
  status: Types.ReportStatus;
}>;


export type UpdateReportSubscribeMutation = { updateReportSubscribe: { success: boolean } | null };

export type UserProfileQueryVariables = Exact<{
  userId: string;
}>;


export type UserProfileQuery = { userProfile: { email: string, emailReportStatus: Types.ReportStatus | null } | null };


export const AccountHierarchyDocument = gql`
    query AccountHierarchy($userId: String!, $ledgerId: String) {
  accountHierarchy(userId: $userId, ledgerId: $ledgerId) {
    data {
      type
      label
      data {
        account
        balance
        balance_children
        children {
          account
          balance
          balance_children
          children {
            account
            balance
            balance_children
            children {
              account
              balance
              balance_children
              children {
                account
                balance
                balance_children
              }
            }
          }
        }
      }
    }
    success
  }
}
    `;

/**
 * __useAccountHierarchyQuery__
 *
 * To run a query within a React component, call `useAccountHierarchyQuery` and pass it any options that fit your needs.
 * When your component renders, `useAccountHierarchyQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAccountHierarchyQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *      ledgerId: // value for 'ledgerId'
 *   },
 * });
 */
export function useAccountHierarchyQuery(baseOptions: Apollo.QueryHookOptions<AccountHierarchyQuery, AccountHierarchyQueryVariables> & ({ variables: AccountHierarchyQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AccountHierarchyQuery, AccountHierarchyQueryVariables>(AccountHierarchyDocument, options);
      }
export function useAccountHierarchyLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AccountHierarchyQuery, AccountHierarchyQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AccountHierarchyQuery, AccountHierarchyQueryVariables>(AccountHierarchyDocument, options);
        }
// @ts-ignore
export function useAccountHierarchySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<AccountHierarchyQuery, AccountHierarchyQueryVariables>): Apollo.UseSuspenseQueryResult<AccountHierarchyQuery, AccountHierarchyQueryVariables>;
export function useAccountHierarchySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AccountHierarchyQuery, AccountHierarchyQueryVariables>): Apollo.UseSuspenseQueryResult<AccountHierarchyQuery | undefined, AccountHierarchyQueryVariables>;
export function useAccountHierarchySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AccountHierarchyQuery, AccountHierarchyQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<AccountHierarchyQuery, AccountHierarchyQueryVariables>(AccountHierarchyDocument, options);
        }
export type AccountHierarchyQueryHookResult = ReturnType<typeof useAccountHierarchyQuery>;
export type AccountHierarchyLazyQueryHookResult = ReturnType<typeof useAccountHierarchyLazyQuery>;
export type AccountHierarchySuspenseQueryHookResult = ReturnType<typeof useAccountHierarchySuspenseQuery>;
export type AccountHierarchyQueryResult = Apollo.QueryResult<AccountHierarchyQuery, AccountHierarchyQueryVariables>;
export const AccountJournalDocument = gql`
    query AccountJournal($ledgerId: String!, $query: AccountJournalQueryInput!) {
  getLedgerAccountJournal(ledgerId: $ledgerId, query: $query) {
    account
    total
    with_children
    items {
      entry
      change
      balance
    }
  }
}
    `;

/**
 * __useAccountJournalQuery__
 *
 * To run a query within a React component, call `useAccountJournalQuery` and pass it any options that fit your needs.
 * When your component renders, `useAccountJournalQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAccountJournalQuery({
 *   variables: {
 *      ledgerId: // value for 'ledgerId'
 *      query: // value for 'query'
 *   },
 * });
 */
export function useAccountJournalQuery(baseOptions: Apollo.QueryHookOptions<AccountJournalQuery, AccountJournalQueryVariables> & ({ variables: AccountJournalQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AccountJournalQuery, AccountJournalQueryVariables>(AccountJournalDocument, options);
      }
export function useAccountJournalLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AccountJournalQuery, AccountJournalQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AccountJournalQuery, AccountJournalQueryVariables>(AccountJournalDocument, options);
        }
// @ts-ignore
export function useAccountJournalSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<AccountJournalQuery, AccountJournalQueryVariables>): Apollo.UseSuspenseQueryResult<AccountJournalQuery, AccountJournalQueryVariables>;
export function useAccountJournalSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AccountJournalQuery, AccountJournalQueryVariables>): Apollo.UseSuspenseQueryResult<AccountJournalQuery | undefined, AccountJournalQueryVariables>;
export function useAccountJournalSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AccountJournalQuery, AccountJournalQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<AccountJournalQuery, AccountJournalQueryVariables>(AccountJournalDocument, options);
        }
export type AccountJournalQueryHookResult = ReturnType<typeof useAccountJournalQuery>;
export type AccountJournalLazyQueryHookResult = ReturnType<typeof useAccountJournalLazyQuery>;
export type AccountJournalSuspenseQueryHookResult = ReturnType<typeof useAccountJournalSuspenseQuery>;
export type AccountJournalQueryResult = Apollo.QueryResult<AccountJournalQuery, AccountJournalQueryVariables>;
export const AccountReportDocument = gql`
    query AccountReport($ledgerId: String!, $accountName: String!, $interval: String, $time: String) {
  getLedgerAccountReport(
    ledgerId: $ledgerId
    accountName: $accountName
    interval: $interval
    time: $time
  ) {
    linechartData {
      date
      balance
    }
    intervalTotalsData {
      date
      balance
    }
    accountBalanceData {
      date
      balance
    }
  }
}
    `;

/**
 * __useAccountReportQuery__
 *
 * To run a query within a React component, call `useAccountReportQuery` and pass it any options that fit your needs.
 * When your component renders, `useAccountReportQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAccountReportQuery({
 *   variables: {
 *      ledgerId: // value for 'ledgerId'
 *      accountName: // value for 'accountName'
 *      interval: // value for 'interval'
 *      time: // value for 'time'
 *   },
 * });
 */
export function useAccountReportQuery(baseOptions: Apollo.QueryHookOptions<AccountReportQuery, AccountReportQueryVariables> & ({ variables: AccountReportQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AccountReportQuery, AccountReportQueryVariables>(AccountReportDocument, options);
      }
export function useAccountReportLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AccountReportQuery, AccountReportQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AccountReportQuery, AccountReportQueryVariables>(AccountReportDocument, options);
        }
// @ts-ignore
export function useAccountReportSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<AccountReportQuery, AccountReportQueryVariables>): Apollo.UseSuspenseQueryResult<AccountReportQuery, AccountReportQueryVariables>;
export function useAccountReportSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AccountReportQuery, AccountReportQueryVariables>): Apollo.UseSuspenseQueryResult<AccountReportQuery | undefined, AccountReportQueryVariables>;
export function useAccountReportSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AccountReportQuery, AccountReportQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<AccountReportQuery, AccountReportQueryVariables>(AccountReportDocument, options);
        }
export type AccountReportQueryHookResult = ReturnType<typeof useAccountReportQuery>;
export type AccountReportLazyQueryHookResult = ReturnType<typeof useAccountReportLazyQuery>;
export type AccountReportSuspenseQueryHookResult = ReturnType<typeof useAccountReportSuspenseQuery>;
export type AccountReportQueryResult = Apollo.QueryResult<AccountReportQuery, AccountReportQueryVariables>;
export const AddEntriesDocument = gql`
    mutation addEntries($entriesInput: [EntryInput!]!, $ledgerId: String) {
  addEntries(entriesInput: $entriesInput, ledgerId: $ledgerId) {
    data
    success
  }
}
    `;
export type AddEntriesMutationFn = Apollo.MutationFunction<AddEntriesMutation, AddEntriesMutationVariables>;

/**
 * __useAddEntriesMutation__
 *
 * To run a mutation, you first call `useAddEntriesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddEntriesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addEntriesMutation, { data, loading, error }] = useAddEntriesMutation({
 *   variables: {
 *      entriesInput: // value for 'entriesInput'
 *      ledgerId: // value for 'ledgerId'
 *   },
 * });
 */
export function useAddEntriesMutation(baseOptions?: Apollo.MutationHookOptions<AddEntriesMutation, AddEntriesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddEntriesMutation, AddEntriesMutationVariables>(AddEntriesDocument, options);
      }
export type AddEntriesMutationHookResult = ReturnType<typeof useAddEntriesMutation>;
export type AddEntriesMutationResult = Apollo.MutationResult<AddEntriesMutation>;
export type AddEntriesMutationOptions = Apollo.BaseMutationOptions<AddEntriesMutation, AddEntriesMutationVariables>;
export const AddPushTokenDocument = gql`
    mutation addPushToken($pushToken: String!) {
  addPushToken(token: $pushToken)
}
    `;
export type AddPushTokenMutationFn = Apollo.MutationFunction<AddPushTokenMutation, AddPushTokenMutationVariables>;

/**
 * __useAddPushTokenMutation__
 *
 * To run a mutation, you first call `useAddPushTokenMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddPushTokenMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addPushTokenMutation, { data, loading, error }] = useAddPushTokenMutation({
 *   variables: {
 *      pushToken: // value for 'pushToken'
 *   },
 * });
 */
export function useAddPushTokenMutation(baseOptions?: Apollo.MutationHookOptions<AddPushTokenMutation, AddPushTokenMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddPushTokenMutation, AddPushTokenMutationVariables>(AddPushTokenDocument, options);
      }
export type AddPushTokenMutationHookResult = ReturnType<typeof useAddPushTokenMutation>;
export type AddPushTokenMutationResult = Apollo.MutationResult<AddPushTokenMutation>;
export type AddPushTokenMutationOptions = Apollo.BaseMutationOptions<AddPushTokenMutation, AddPushTokenMutationVariables>;
export const BalanceSheetDocument = gql`
    query BalanceSheet($ledgerId: String!, $time: String) {
  getLedgerBalanceSheet(ledgerId: $ledgerId, time: $time) {
    netWorthData {
      date
      balance
    }
    assetsData {
      date
      balance
    }
    liabilitiesData {
      date
      balance
    }
    assetsHierarchyData {
      account
      balance
      balanceChildren
      children
      hasTxns
    }
    liabilitiesHierarchyData {
      account
      balance
      balanceChildren
      children
      hasTxns
    }
  }
}
    `;

/**
 * __useBalanceSheetQuery__
 *
 * To run a query within a React component, call `useBalanceSheetQuery` and pass it any options that fit your needs.
 * When your component renders, `useBalanceSheetQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBalanceSheetQuery({
 *   variables: {
 *      ledgerId: // value for 'ledgerId'
 *      time: // value for 'time'
 *   },
 * });
 */
export function useBalanceSheetQuery(baseOptions: Apollo.QueryHookOptions<BalanceSheetQuery, BalanceSheetQueryVariables> & ({ variables: BalanceSheetQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<BalanceSheetQuery, BalanceSheetQueryVariables>(BalanceSheetDocument, options);
      }
export function useBalanceSheetLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<BalanceSheetQuery, BalanceSheetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<BalanceSheetQuery, BalanceSheetQueryVariables>(BalanceSheetDocument, options);
        }
// @ts-ignore
export function useBalanceSheetSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<BalanceSheetQuery, BalanceSheetQueryVariables>): Apollo.UseSuspenseQueryResult<BalanceSheetQuery, BalanceSheetQueryVariables>;
export function useBalanceSheetSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<BalanceSheetQuery, BalanceSheetQueryVariables>): Apollo.UseSuspenseQueryResult<BalanceSheetQuery | undefined, BalanceSheetQueryVariables>;
export function useBalanceSheetSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<BalanceSheetQuery, BalanceSheetQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<BalanceSheetQuery, BalanceSheetQueryVariables>(BalanceSheetDocument, options);
        }
export type BalanceSheetQueryHookResult = ReturnType<typeof useBalanceSheetQuery>;
export type BalanceSheetLazyQueryHookResult = ReturnType<typeof useBalanceSheetLazyQuery>;
export type BalanceSheetSuspenseQueryHookResult = ReturnType<typeof useBalanceSheetSuspenseQuery>;
export type BalanceSheetQueryResult = Apollo.QueryResult<BalanceSheetQuery, BalanceSheetQueryVariables>;
export const CancelSubscriptionDocument = gql`
    mutation CancelSubscription($clientId: String!, $subscriptionId: String!) {
  cancelSubscription(clientId: $clientId, subscriptionId: $subscriptionId) {
    success
    message
  }
}
    `;
export type CancelSubscriptionMutationFn = Apollo.MutationFunction<CancelSubscriptionMutation, CancelSubscriptionMutationVariables>;

/**
 * __useCancelSubscriptionMutation__
 *
 * To run a mutation, you first call `useCancelSubscriptionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCancelSubscriptionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [cancelSubscriptionMutation, { data, loading, error }] = useCancelSubscriptionMutation({
 *   variables: {
 *      clientId: // value for 'clientId'
 *      subscriptionId: // value for 'subscriptionId'
 *   },
 * });
 */
export function useCancelSubscriptionMutation(baseOptions?: Apollo.MutationHookOptions<CancelSubscriptionMutation, CancelSubscriptionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CancelSubscriptionMutation, CancelSubscriptionMutationVariables>(CancelSubscriptionDocument, options);
      }
export type CancelSubscriptionMutationHookResult = ReturnType<typeof useCancelSubscriptionMutation>;
export type CancelSubscriptionMutationResult = Apollo.MutationResult<CancelSubscriptionMutation>;
export type CancelSubscriptionMutationOptions = Apollo.BaseMutationOptions<CancelSubscriptionMutation, CancelSubscriptionMutationVariables>;
export const CreateSubscriptionSessionDocument = gql`
    mutation CreateSubscriptionSession($clientId: String!, $priceId: String!) {
  createSubscriptionSession(clientId: $clientId, priceId: $priceId) {
    success
    sessionId
    sessionUrl
    message
  }
}
    `;
export type CreateSubscriptionSessionMutationFn = Apollo.MutationFunction<CreateSubscriptionSessionMutation, CreateSubscriptionSessionMutationVariables>;

/**
 * __useCreateSubscriptionSessionMutation__
 *
 * To run a mutation, you first call `useCreateSubscriptionSessionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateSubscriptionSessionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createSubscriptionSessionMutation, { data, loading, error }] = useCreateSubscriptionSessionMutation({
 *   variables: {
 *      clientId: // value for 'clientId'
 *      priceId: // value for 'priceId'
 *   },
 * });
 */
export function useCreateSubscriptionSessionMutation(baseOptions?: Apollo.MutationHookOptions<CreateSubscriptionSessionMutation, CreateSubscriptionSessionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateSubscriptionSessionMutation, CreateSubscriptionSessionMutationVariables>(CreateSubscriptionSessionDocument, options);
      }
export type CreateSubscriptionSessionMutationHookResult = ReturnType<typeof useCreateSubscriptionSessionMutation>;
export type CreateSubscriptionSessionMutationResult = Apollo.MutationResult<CreateSubscriptionSessionMutation>;
export type CreateSubscriptionSessionMutationOptions = Apollo.BaseMutationOptions<CreateSubscriptionSessionMutation, CreateSubscriptionSessionMutationVariables>;
export const DeleteAccountDocument = gql`
    mutation deleteAccount {
  deleteAccount
}
    `;
export type DeleteAccountMutationFn = Apollo.MutationFunction<DeleteAccountMutation, DeleteAccountMutationVariables>;

/**
 * __useDeleteAccountMutation__
 *
 * To run a mutation, you first call `useDeleteAccountMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteAccountMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteAccountMutation, { data, loading, error }] = useDeleteAccountMutation({
 *   variables: {
 *   },
 * });
 */
export function useDeleteAccountMutation(baseOptions?: Apollo.MutationHookOptions<DeleteAccountMutation, DeleteAccountMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteAccountMutation, DeleteAccountMutationVariables>(DeleteAccountDocument, options);
      }
export type DeleteAccountMutationHookResult = ReturnType<typeof useDeleteAccountMutation>;
export type DeleteAccountMutationResult = Apollo.MutationResult<DeleteAccountMutation>;
export type DeleteAccountMutationOptions = Apollo.BaseMutationOptions<DeleteAccountMutation, DeleteAccountMutationVariables>;
export const DeleteLedgerEntrySourceSliceDocument = gql`
    mutation deleteLedgerEntrySourceSlice($input: DeleteSourceSliceInput!, $ledgerId: String!) {
  deleteLedgerEntrySourceSlice(input: $input, ledgerId: $ledgerId) {
    entryHash
    message
  }
}
    `;
export type DeleteLedgerEntrySourceSliceMutationFn = Apollo.MutationFunction<DeleteLedgerEntrySourceSliceMutation, DeleteLedgerEntrySourceSliceMutationVariables>;

/**
 * __useDeleteLedgerEntrySourceSliceMutation__
 *
 * To run a mutation, you first call `useDeleteLedgerEntrySourceSliceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteLedgerEntrySourceSliceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteLedgerEntrySourceSliceMutation, { data, loading, error }] = useDeleteLedgerEntrySourceSliceMutation({
 *   variables: {
 *      input: // value for 'input'
 *      ledgerId: // value for 'ledgerId'
 *   },
 * });
 */
export function useDeleteLedgerEntrySourceSliceMutation(baseOptions?: Apollo.MutationHookOptions<DeleteLedgerEntrySourceSliceMutation, DeleteLedgerEntrySourceSliceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteLedgerEntrySourceSliceMutation, DeleteLedgerEntrySourceSliceMutationVariables>(DeleteLedgerEntrySourceSliceDocument, options);
      }
export type DeleteLedgerEntrySourceSliceMutationHookResult = ReturnType<typeof useDeleteLedgerEntrySourceSliceMutation>;
export type DeleteLedgerEntrySourceSliceMutationResult = Apollo.MutationResult<DeleteLedgerEntrySourceSliceMutation>;
export type DeleteLedgerEntrySourceSliceMutationOptions = Apollo.BaseMutationOptions<DeleteLedgerEntrySourceSliceMutation, DeleteLedgerEntrySourceSliceMutationVariables>;
export const GenerateTempAssetUploadUrlDocument = gql`
    mutation GenerateTempAssetUploadUrl($mimeType: String, $filename: String) {
  generateTempAssetUploadUrl(mimeType: $mimeType, filename: $filename) {
    uploadUrl
    objectKey
    expiresIn
  }
}
    `;
export type GenerateTempAssetUploadUrlMutationFn = Apollo.MutationFunction<GenerateTempAssetUploadUrlMutation, GenerateTempAssetUploadUrlMutationVariables>;

/**
 * __useGenerateTempAssetUploadUrlMutation__
 *
 * To run a mutation, you first call `useGenerateTempAssetUploadUrlMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGenerateTempAssetUploadUrlMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [generateTempAssetUploadUrlMutation, { data, loading, error }] = useGenerateTempAssetUploadUrlMutation({
 *   variables: {
 *      mimeType: // value for 'mimeType'
 *      filename: // value for 'filename'
 *   },
 * });
 */
export function useGenerateTempAssetUploadUrlMutation(baseOptions?: Apollo.MutationHookOptions<GenerateTempAssetUploadUrlMutation, GenerateTempAssetUploadUrlMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GenerateTempAssetUploadUrlMutation, GenerateTempAssetUploadUrlMutationVariables>(GenerateTempAssetUploadUrlDocument, options);
      }
export type GenerateTempAssetUploadUrlMutationHookResult = ReturnType<typeof useGenerateTempAssetUploadUrlMutation>;
export type GenerateTempAssetUploadUrlMutationResult = Apollo.MutationResult<GenerateTempAssetUploadUrlMutation>;
export type GenerateTempAssetUploadUrlMutationOptions = Apollo.BaseMutationOptions<GenerateTempAssetUploadUrlMutation, GenerateTempAssetUploadUrlMutationVariables>;
export const GetAiCfoUsageDocument = gql`
    query GetAiCfoUsage {
  aiCfoUsage {
    aiCfoTokensUsed
    aiCfoTokensMax
  }
}
    `;

/**
 * __useGetAiCfoUsageQuery__
 *
 * To run a query within a React component, call `useGetAiCfoUsageQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAiCfoUsageQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAiCfoUsageQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetAiCfoUsageQuery(baseOptions?: Apollo.QueryHookOptions<GetAiCfoUsageQuery, GetAiCfoUsageQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetAiCfoUsageQuery, GetAiCfoUsageQueryVariables>(GetAiCfoUsageDocument, options);
      }
export function useGetAiCfoUsageLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetAiCfoUsageQuery, GetAiCfoUsageQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetAiCfoUsageQuery, GetAiCfoUsageQueryVariables>(GetAiCfoUsageDocument, options);
        }
// @ts-ignore
export function useGetAiCfoUsageSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetAiCfoUsageQuery, GetAiCfoUsageQueryVariables>): Apollo.UseSuspenseQueryResult<GetAiCfoUsageQuery, GetAiCfoUsageQueryVariables>;
export function useGetAiCfoUsageSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetAiCfoUsageQuery, GetAiCfoUsageQueryVariables>): Apollo.UseSuspenseQueryResult<GetAiCfoUsageQuery | undefined, GetAiCfoUsageQueryVariables>;
export function useGetAiCfoUsageSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetAiCfoUsageQuery, GetAiCfoUsageQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetAiCfoUsageQuery, GetAiCfoUsageQueryVariables>(GetAiCfoUsageDocument, options);
        }
export type GetAiCfoUsageQueryHookResult = ReturnType<typeof useGetAiCfoUsageQuery>;
export type GetAiCfoUsageLazyQueryHookResult = ReturnType<typeof useGetAiCfoUsageLazyQuery>;
export type GetAiCfoUsageSuspenseQueryHookResult = ReturnType<typeof useGetAiCfoUsageSuspenseQuery>;
export type GetAiCfoUsageQueryResult = Apollo.QueryResult<GetAiCfoUsageQuery, GetAiCfoUsageQueryVariables>;
export const GetCommitDetailsDocument = gql`
    query getCommitDetails($ledgerId: String!, $sha: String!) {
  getCommitDetails(ledgerId: $ledgerId, sha: $sha) {
    message
    author {
      name
    }
    stats {
      additions
      deletions
      total
    }
    files {
      filename
      additions
      deletions
    }
    diff
  }
}
    `;

/**
 * __useGetCommitDetailsQuery__
 *
 * To run a query within a React component, call `useGetCommitDetailsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCommitDetailsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCommitDetailsQuery({
 *   variables: {
 *      ledgerId: // value for 'ledgerId'
 *      sha: // value for 'sha'
 *   },
 * });
 */
export function useGetCommitDetailsQuery(baseOptions: Apollo.QueryHookOptions<GetCommitDetailsQuery, GetCommitDetailsQueryVariables> & ({ variables: GetCommitDetailsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetCommitDetailsQuery, GetCommitDetailsQueryVariables>(GetCommitDetailsDocument, options);
      }
export function useGetCommitDetailsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetCommitDetailsQuery, GetCommitDetailsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetCommitDetailsQuery, GetCommitDetailsQueryVariables>(GetCommitDetailsDocument, options);
        }
// @ts-ignore
export function useGetCommitDetailsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetCommitDetailsQuery, GetCommitDetailsQueryVariables>): Apollo.UseSuspenseQueryResult<GetCommitDetailsQuery, GetCommitDetailsQueryVariables>;
export function useGetCommitDetailsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCommitDetailsQuery, GetCommitDetailsQueryVariables>): Apollo.UseSuspenseQueryResult<GetCommitDetailsQuery | undefined, GetCommitDetailsQueryVariables>;
export function useGetCommitDetailsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCommitDetailsQuery, GetCommitDetailsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetCommitDetailsQuery, GetCommitDetailsQueryVariables>(GetCommitDetailsDocument, options);
        }
export type GetCommitDetailsQueryHookResult = ReturnType<typeof useGetCommitDetailsQuery>;
export type GetCommitDetailsLazyQueryHookResult = ReturnType<typeof useGetCommitDetailsLazyQuery>;
export type GetCommitDetailsSuspenseQueryHookResult = ReturnType<typeof useGetCommitDetailsSuspenseQuery>;
export type GetCommitDetailsQueryResult = Apollo.QueryResult<GetCommitDetailsQuery, GetCommitDetailsQueryVariables>;
export const GetFeedDocument = gql`
    query GetFeed($offset: Float, $limit: Float, $locale: String) {
  getFeed(offset: $offset, limit: $limit, locale: $locale) {
    items {
      id
      title
      summary
      link
      publishedAt
      author
      authorAvatar
      source
    }
    hasMore
  }
}
    `;

/**
 * __useGetFeedQuery__
 *
 * To run a query within a React component, call `useGetFeedQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFeedQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetFeedQuery({
 *   variables: {
 *      offset: // value for 'offset'
 *      limit: // value for 'limit'
 *      locale: // value for 'locale'
 *   },
 * });
 */
export function useGetFeedQuery(baseOptions?: Apollo.QueryHookOptions<GetFeedQuery, GetFeedQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetFeedQuery, GetFeedQueryVariables>(GetFeedDocument, options);
      }
export function useGetFeedLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetFeedQuery, GetFeedQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetFeedQuery, GetFeedQueryVariables>(GetFeedDocument, options);
        }
// @ts-ignore
export function useGetFeedSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetFeedQuery, GetFeedQueryVariables>): Apollo.UseSuspenseQueryResult<GetFeedQuery, GetFeedQueryVariables>;
export function useGetFeedSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetFeedQuery, GetFeedQueryVariables>): Apollo.UseSuspenseQueryResult<GetFeedQuery | undefined, GetFeedQueryVariables>;
export function useGetFeedSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetFeedQuery, GetFeedQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetFeedQuery, GetFeedQueryVariables>(GetFeedDocument, options);
        }
export type GetFeedQueryHookResult = ReturnType<typeof useGetFeedQuery>;
export type GetFeedLazyQueryHookResult = ReturnType<typeof useGetFeedLazyQuery>;
export type GetFeedSuspenseQueryHookResult = ReturnType<typeof useGetFeedSuspenseQuery>;
export type GetFeedQueryResult = Apollo.QueryResult<GetFeedQuery, GetFeedQueryVariables>;
export const GetLedgerDocument = gql`
    query GetLedger($ledgerId: String!) {
  getLedger(ledgerId: $ledgerId) {
    id
    name
    fullName
    httpUrl
    sshUrl
    private
    empty
    size
    createdAt
    updatedAt
    description
    permissions {
      admin
      pull
      push
    }
    options {
      nameAssets
      nameEquity
      nameExpenses
      nameIncome
      nameLiabilities
      operatingCurrency
    }
  }
}
    `;

/**
 * __useGetLedgerQuery__
 *
 * To run a query within a React component, call `useGetLedgerQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLedgerQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLedgerQuery({
 *   variables: {
 *      ledgerId: // value for 'ledgerId'
 *   },
 * });
 */
export function useGetLedgerQuery(baseOptions: Apollo.QueryHookOptions<GetLedgerQuery, GetLedgerQueryVariables> & ({ variables: GetLedgerQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLedgerQuery, GetLedgerQueryVariables>(GetLedgerDocument, options);
      }
export function useGetLedgerLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLedgerQuery, GetLedgerQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLedgerQuery, GetLedgerQueryVariables>(GetLedgerDocument, options);
        }
// @ts-ignore
export function useGetLedgerSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetLedgerQuery, GetLedgerQueryVariables>): Apollo.UseSuspenseQueryResult<GetLedgerQuery, GetLedgerQueryVariables>;
export function useGetLedgerSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLedgerQuery, GetLedgerQueryVariables>): Apollo.UseSuspenseQueryResult<GetLedgerQuery | undefined, GetLedgerQueryVariables>;
export function useGetLedgerSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLedgerQuery, GetLedgerQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLedgerQuery, GetLedgerQueryVariables>(GetLedgerDocument, options);
        }
export type GetLedgerQueryHookResult = ReturnType<typeof useGetLedgerQuery>;
export type GetLedgerLazyQueryHookResult = ReturnType<typeof useGetLedgerLazyQuery>;
export type GetLedgerSuspenseQueryHookResult = ReturnType<typeof useGetLedgerSuspenseQuery>;
export type GetLedgerQueryResult = Apollo.QueryResult<GetLedgerQuery, GetLedgerQueryVariables>;
export const GetLedgerDirContentDocument = gql`
    query getLedgerDirContent($ledgerId: String!, $dirPath: String) {
  getLedgerDirContent(ledgerId: $ledgerId, dirPath: $dirPath) {
    name
    path
    type
    size
    sha
    lastCommitSha
    lastAuthorDate
  }
}
    `;

/**
 * __useGetLedgerDirContentQuery__
 *
 * To run a query within a React component, call `useGetLedgerDirContentQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLedgerDirContentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLedgerDirContentQuery({
 *   variables: {
 *      ledgerId: // value for 'ledgerId'
 *      dirPath: // value for 'dirPath'
 *   },
 * });
 */
export function useGetLedgerDirContentQuery(baseOptions: Apollo.QueryHookOptions<GetLedgerDirContentQuery, GetLedgerDirContentQueryVariables> & ({ variables: GetLedgerDirContentQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLedgerDirContentQuery, GetLedgerDirContentQueryVariables>(GetLedgerDirContentDocument, options);
      }
export function useGetLedgerDirContentLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLedgerDirContentQuery, GetLedgerDirContentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLedgerDirContentQuery, GetLedgerDirContentQueryVariables>(GetLedgerDirContentDocument, options);
        }
// @ts-ignore
export function useGetLedgerDirContentSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetLedgerDirContentQuery, GetLedgerDirContentQueryVariables>): Apollo.UseSuspenseQueryResult<GetLedgerDirContentQuery, GetLedgerDirContentQueryVariables>;
export function useGetLedgerDirContentSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLedgerDirContentQuery, GetLedgerDirContentQueryVariables>): Apollo.UseSuspenseQueryResult<GetLedgerDirContentQuery | undefined, GetLedgerDirContentQueryVariables>;
export function useGetLedgerDirContentSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLedgerDirContentQuery, GetLedgerDirContentQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLedgerDirContentQuery, GetLedgerDirContentQueryVariables>(GetLedgerDirContentDocument, options);
        }
export type GetLedgerDirContentQueryHookResult = ReturnType<typeof useGetLedgerDirContentQuery>;
export type GetLedgerDirContentLazyQueryHookResult = ReturnType<typeof useGetLedgerDirContentLazyQuery>;
export type GetLedgerDirContentSuspenseQueryHookResult = ReturnType<typeof useGetLedgerDirContentSuspenseQuery>;
export type GetLedgerDirContentQueryResult = Apollo.QueryResult<GetLedgerDirContentQuery, GetLedgerDirContentQueryVariables>;
export const GetLedgerEntryContextDocument = gql`
    query GetLedgerEntryContext($entryHash: String!, $ledgerId: String!) {
  getLedgerEntryContext(entryHash: $entryHash, ledgerId: $ledgerId) {
    slice
    sha256sum
    entry
    balances_before
    balances_after
  }
}
    `;

/**
 * __useGetLedgerEntryContextQuery__
 *
 * To run a query within a React component, call `useGetLedgerEntryContextQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLedgerEntryContextQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLedgerEntryContextQuery({
 *   variables: {
 *      entryHash: // value for 'entryHash'
 *      ledgerId: // value for 'ledgerId'
 *   },
 * });
 */
export function useGetLedgerEntryContextQuery(baseOptions: Apollo.QueryHookOptions<GetLedgerEntryContextQuery, GetLedgerEntryContextQueryVariables> & ({ variables: GetLedgerEntryContextQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLedgerEntryContextQuery, GetLedgerEntryContextQueryVariables>(GetLedgerEntryContextDocument, options);
      }
export function useGetLedgerEntryContextLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLedgerEntryContextQuery, GetLedgerEntryContextQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLedgerEntryContextQuery, GetLedgerEntryContextQueryVariables>(GetLedgerEntryContextDocument, options);
        }
// @ts-ignore
export function useGetLedgerEntryContextSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetLedgerEntryContextQuery, GetLedgerEntryContextQueryVariables>): Apollo.UseSuspenseQueryResult<GetLedgerEntryContextQuery, GetLedgerEntryContextQueryVariables>;
export function useGetLedgerEntryContextSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLedgerEntryContextQuery, GetLedgerEntryContextQueryVariables>): Apollo.UseSuspenseQueryResult<GetLedgerEntryContextQuery | undefined, GetLedgerEntryContextQueryVariables>;
export function useGetLedgerEntryContextSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLedgerEntryContextQuery, GetLedgerEntryContextQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLedgerEntryContextQuery, GetLedgerEntryContextQueryVariables>(GetLedgerEntryContextDocument, options);
        }
export type GetLedgerEntryContextQueryHookResult = ReturnType<typeof useGetLedgerEntryContextQuery>;
export type GetLedgerEntryContextLazyQueryHookResult = ReturnType<typeof useGetLedgerEntryContextLazyQuery>;
export type GetLedgerEntryContextSuspenseQueryHookResult = ReturnType<typeof useGetLedgerEntryContextSuspenseQuery>;
export type GetLedgerEntryContextQueryResult = Apollo.QueryResult<GetLedgerEntryContextQuery, GetLedgerEntryContextQueryVariables>;
export const GetLedgerErrorsDocument = gql`
    query getLedgerErrors($ledgerId: String!) {
  getLedgerErrors(ledgerId: $ledgerId) {
    filename
    lineno
    message
  }
}
    `;

/**
 * __useGetLedgerErrorsQuery__
 *
 * To run a query within a React component, call `useGetLedgerErrorsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLedgerErrorsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLedgerErrorsQuery({
 *   variables: {
 *      ledgerId: // value for 'ledgerId'
 *   },
 * });
 */
export function useGetLedgerErrorsQuery(baseOptions: Apollo.QueryHookOptions<GetLedgerErrorsQuery, GetLedgerErrorsQueryVariables> & ({ variables: GetLedgerErrorsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLedgerErrorsQuery, GetLedgerErrorsQueryVariables>(GetLedgerErrorsDocument, options);
      }
export function useGetLedgerErrorsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLedgerErrorsQuery, GetLedgerErrorsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLedgerErrorsQuery, GetLedgerErrorsQueryVariables>(GetLedgerErrorsDocument, options);
        }
// @ts-ignore
export function useGetLedgerErrorsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetLedgerErrorsQuery, GetLedgerErrorsQueryVariables>): Apollo.UseSuspenseQueryResult<GetLedgerErrorsQuery, GetLedgerErrorsQueryVariables>;
export function useGetLedgerErrorsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLedgerErrorsQuery, GetLedgerErrorsQueryVariables>): Apollo.UseSuspenseQueryResult<GetLedgerErrorsQuery | undefined, GetLedgerErrorsQueryVariables>;
export function useGetLedgerErrorsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLedgerErrorsQuery, GetLedgerErrorsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLedgerErrorsQuery, GetLedgerErrorsQueryVariables>(GetLedgerErrorsDocument, options);
        }
export type GetLedgerErrorsQueryHookResult = ReturnType<typeof useGetLedgerErrorsQuery>;
export type GetLedgerErrorsLazyQueryHookResult = ReturnType<typeof useGetLedgerErrorsLazyQuery>;
export type GetLedgerErrorsSuspenseQueryHookResult = ReturnType<typeof useGetLedgerErrorsSuspenseQuery>;
export type GetLedgerErrorsQueryResult = Apollo.QueryResult<GetLedgerErrorsQuery, GetLedgerErrorsQueryVariables>;
export const GetLedgerFileDocument = gql`
    query getLedgerFile($ledgerId: String!, $path: String!) {
  getLedgerFile(ledgerId: $ledgerId, path: $path) {
    content
    encoding
    name
    path
    sha
    size
    type
  }
}
    `;

/**
 * __useGetLedgerFileQuery__
 *
 * To run a query within a React component, call `useGetLedgerFileQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLedgerFileQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLedgerFileQuery({
 *   variables: {
 *      ledgerId: // value for 'ledgerId'
 *      path: // value for 'path'
 *   },
 * });
 */
export function useGetLedgerFileQuery(baseOptions: Apollo.QueryHookOptions<GetLedgerFileQuery, GetLedgerFileQueryVariables> & ({ variables: GetLedgerFileQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLedgerFileQuery, GetLedgerFileQueryVariables>(GetLedgerFileDocument, options);
      }
export function useGetLedgerFileLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLedgerFileQuery, GetLedgerFileQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLedgerFileQuery, GetLedgerFileQueryVariables>(GetLedgerFileDocument, options);
        }
// @ts-ignore
export function useGetLedgerFileSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetLedgerFileQuery, GetLedgerFileQueryVariables>): Apollo.UseSuspenseQueryResult<GetLedgerFileQuery, GetLedgerFileQueryVariables>;
export function useGetLedgerFileSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLedgerFileQuery, GetLedgerFileQueryVariables>): Apollo.UseSuspenseQueryResult<GetLedgerFileQuery | undefined, GetLedgerFileQueryVariables>;
export function useGetLedgerFileSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLedgerFileQuery, GetLedgerFileQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLedgerFileQuery, GetLedgerFileQueryVariables>(GetLedgerFileDocument, options);
        }
export type GetLedgerFileQueryHookResult = ReturnType<typeof useGetLedgerFileQuery>;
export type GetLedgerFileLazyQueryHookResult = ReturnType<typeof useGetLedgerFileLazyQuery>;
export type GetLedgerFileSuspenseQueryHookResult = ReturnType<typeof useGetLedgerFileSuspenseQuery>;
export type GetLedgerFileQueryResult = Apollo.QueryResult<GetLedgerFileQuery, GetLedgerFileQueryVariables>;
export const GetLedgerJournalDocument = gql`
    query GetLedgerJournal($ledgerId: String!, $query: JournalQueryInput) {
  getLedgerJournal(ledgerId: $ledgerId, query: $query) {
    total
    data
    is_empty
  }
}
    `;

/**
 * __useGetLedgerJournalQuery__
 *
 * To run a query within a React component, call `useGetLedgerJournalQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLedgerJournalQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLedgerJournalQuery({
 *   variables: {
 *      ledgerId: // value for 'ledgerId'
 *      query: // value for 'query'
 *   },
 * });
 */
export function useGetLedgerJournalQuery(baseOptions: Apollo.QueryHookOptions<GetLedgerJournalQuery, GetLedgerJournalQueryVariables> & ({ variables: GetLedgerJournalQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLedgerJournalQuery, GetLedgerJournalQueryVariables>(GetLedgerJournalDocument, options);
      }
export function useGetLedgerJournalLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLedgerJournalQuery, GetLedgerJournalQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLedgerJournalQuery, GetLedgerJournalQueryVariables>(GetLedgerJournalDocument, options);
        }
// @ts-ignore
export function useGetLedgerJournalSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetLedgerJournalQuery, GetLedgerJournalQueryVariables>): Apollo.UseSuspenseQueryResult<GetLedgerJournalQuery, GetLedgerJournalQueryVariables>;
export function useGetLedgerJournalSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLedgerJournalQuery, GetLedgerJournalQueryVariables>): Apollo.UseSuspenseQueryResult<GetLedgerJournalQuery | undefined, GetLedgerJournalQueryVariables>;
export function useGetLedgerJournalSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLedgerJournalQuery, GetLedgerJournalQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLedgerJournalQuery, GetLedgerJournalQueryVariables>(GetLedgerJournalDocument, options);
        }
export type GetLedgerJournalQueryHookResult = ReturnType<typeof useGetLedgerJournalQuery>;
export type GetLedgerJournalLazyQueryHookResult = ReturnType<typeof useGetLedgerJournalLazyQuery>;
export type GetLedgerJournalSuspenseQueryHookResult = ReturnType<typeof useGetLedgerJournalSuspenseQuery>;
export type GetLedgerJournalQueryResult = Apollo.QueryResult<GetLedgerJournalQuery, GetLedgerJournalQueryVariables>;
export const GetLedgerNarrationsDocument = gql`
    query getLedgerNarrations($ledgerId: String!) {
  getLedgerNarrations(ledgerId: $ledgerId)
}
    `;

/**
 * __useGetLedgerNarrationsQuery__
 *
 * To run a query within a React component, call `useGetLedgerNarrationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLedgerNarrationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLedgerNarrationsQuery({
 *   variables: {
 *      ledgerId: // value for 'ledgerId'
 *   },
 * });
 */
export function useGetLedgerNarrationsQuery(baseOptions: Apollo.QueryHookOptions<GetLedgerNarrationsQuery, GetLedgerNarrationsQueryVariables> & ({ variables: GetLedgerNarrationsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLedgerNarrationsQuery, GetLedgerNarrationsQueryVariables>(GetLedgerNarrationsDocument, options);
      }
export function useGetLedgerNarrationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLedgerNarrationsQuery, GetLedgerNarrationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLedgerNarrationsQuery, GetLedgerNarrationsQueryVariables>(GetLedgerNarrationsDocument, options);
        }
// @ts-ignore
export function useGetLedgerNarrationsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetLedgerNarrationsQuery, GetLedgerNarrationsQueryVariables>): Apollo.UseSuspenseQueryResult<GetLedgerNarrationsQuery, GetLedgerNarrationsQueryVariables>;
export function useGetLedgerNarrationsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLedgerNarrationsQuery, GetLedgerNarrationsQueryVariables>): Apollo.UseSuspenseQueryResult<GetLedgerNarrationsQuery | undefined, GetLedgerNarrationsQueryVariables>;
export function useGetLedgerNarrationsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLedgerNarrationsQuery, GetLedgerNarrationsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLedgerNarrationsQuery, GetLedgerNarrationsQueryVariables>(GetLedgerNarrationsDocument, options);
        }
export type GetLedgerNarrationsQueryHookResult = ReturnType<typeof useGetLedgerNarrationsQuery>;
export type GetLedgerNarrationsLazyQueryHookResult = ReturnType<typeof useGetLedgerNarrationsLazyQuery>;
export type GetLedgerNarrationsSuspenseQueryHookResult = ReturnType<typeof useGetLedgerNarrationsSuspenseQuery>;
export type GetLedgerNarrationsQueryResult = Apollo.QueryResult<GetLedgerNarrationsQuery, GetLedgerNarrationsQueryVariables>;
export const GetLedgerPayeeAccountsDocument = gql`
    query getLedgerPayeeAccounts($ledgerId: String!, $payee: String!) {
  getLedgerPayeeAccounts(ledgerId: $ledgerId, payee: $payee)
}
    `;

/**
 * __useGetLedgerPayeeAccountsQuery__
 *
 * To run a query within a React component, call `useGetLedgerPayeeAccountsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLedgerPayeeAccountsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLedgerPayeeAccountsQuery({
 *   variables: {
 *      ledgerId: // value for 'ledgerId'
 *      payee: // value for 'payee'
 *   },
 * });
 */
export function useGetLedgerPayeeAccountsQuery(baseOptions: Apollo.QueryHookOptions<GetLedgerPayeeAccountsQuery, GetLedgerPayeeAccountsQueryVariables> & ({ variables: GetLedgerPayeeAccountsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLedgerPayeeAccountsQuery, GetLedgerPayeeAccountsQueryVariables>(GetLedgerPayeeAccountsDocument, options);
      }
export function useGetLedgerPayeeAccountsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLedgerPayeeAccountsQuery, GetLedgerPayeeAccountsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLedgerPayeeAccountsQuery, GetLedgerPayeeAccountsQueryVariables>(GetLedgerPayeeAccountsDocument, options);
        }
// @ts-ignore
export function useGetLedgerPayeeAccountsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetLedgerPayeeAccountsQuery, GetLedgerPayeeAccountsQueryVariables>): Apollo.UseSuspenseQueryResult<GetLedgerPayeeAccountsQuery, GetLedgerPayeeAccountsQueryVariables>;
export function useGetLedgerPayeeAccountsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLedgerPayeeAccountsQuery, GetLedgerPayeeAccountsQueryVariables>): Apollo.UseSuspenseQueryResult<GetLedgerPayeeAccountsQuery | undefined, GetLedgerPayeeAccountsQueryVariables>;
export function useGetLedgerPayeeAccountsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLedgerPayeeAccountsQuery, GetLedgerPayeeAccountsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLedgerPayeeAccountsQuery, GetLedgerPayeeAccountsQueryVariables>(GetLedgerPayeeAccountsDocument, options);
        }
export type GetLedgerPayeeAccountsQueryHookResult = ReturnType<typeof useGetLedgerPayeeAccountsQuery>;
export type GetLedgerPayeeAccountsLazyQueryHookResult = ReturnType<typeof useGetLedgerPayeeAccountsLazyQuery>;
export type GetLedgerPayeeAccountsSuspenseQueryHookResult = ReturnType<typeof useGetLedgerPayeeAccountsSuspenseQuery>;
export type GetLedgerPayeeAccountsQueryResult = Apollo.QueryResult<GetLedgerPayeeAccountsQuery, GetLedgerPayeeAccountsQueryVariables>;
export const GetLedgerPayeesDocument = gql`
    query getLedgerPayees($ledgerId: String!) {
  getLedgerPayees(ledgerId: $ledgerId)
}
    `;

/**
 * __useGetLedgerPayeesQuery__
 *
 * To run a query within a React component, call `useGetLedgerPayeesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLedgerPayeesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLedgerPayeesQuery({
 *   variables: {
 *      ledgerId: // value for 'ledgerId'
 *   },
 * });
 */
export function useGetLedgerPayeesQuery(baseOptions: Apollo.QueryHookOptions<GetLedgerPayeesQuery, GetLedgerPayeesQueryVariables> & ({ variables: GetLedgerPayeesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLedgerPayeesQuery, GetLedgerPayeesQueryVariables>(GetLedgerPayeesDocument, options);
      }
export function useGetLedgerPayeesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLedgerPayeesQuery, GetLedgerPayeesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLedgerPayeesQuery, GetLedgerPayeesQueryVariables>(GetLedgerPayeesDocument, options);
        }
// @ts-ignore
export function useGetLedgerPayeesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetLedgerPayeesQuery, GetLedgerPayeesQueryVariables>): Apollo.UseSuspenseQueryResult<GetLedgerPayeesQuery, GetLedgerPayeesQueryVariables>;
export function useGetLedgerPayeesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLedgerPayeesQuery, GetLedgerPayeesQueryVariables>): Apollo.UseSuspenseQueryResult<GetLedgerPayeesQuery | undefined, GetLedgerPayeesQueryVariables>;
export function useGetLedgerPayeesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLedgerPayeesQuery, GetLedgerPayeesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLedgerPayeesQuery, GetLedgerPayeesQueryVariables>(GetLedgerPayeesDocument, options);
        }
export type GetLedgerPayeesQueryHookResult = ReturnType<typeof useGetLedgerPayeesQuery>;
export type GetLedgerPayeesLazyQueryHookResult = ReturnType<typeof useGetLedgerPayeesLazyQuery>;
export type GetLedgerPayeesSuspenseQueryHookResult = ReturnType<typeof useGetLedgerPayeesSuspenseQuery>;
export type GetLedgerPayeesQueryResult = Apollo.QueryResult<GetLedgerPayeesQuery, GetLedgerPayeesQueryVariables>;
export const HomeChartsDocument = gql`
    query HomeCharts($userId: String!, $ledgerId: String) {
  homeCharts(userId: $userId, ledgerId: $ledgerId) {
    data {
      type
      label
      data {
        date
        balance
        budgets
      }
    }
    success
  }
}
    `;

/**
 * __useHomeChartsQuery__
 *
 * To run a query within a React component, call `useHomeChartsQuery` and pass it any options that fit your needs.
 * When your component renders, `useHomeChartsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHomeChartsQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *      ledgerId: // value for 'ledgerId'
 *   },
 * });
 */
export function useHomeChartsQuery(baseOptions: Apollo.QueryHookOptions<HomeChartsQuery, HomeChartsQueryVariables> & ({ variables: HomeChartsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<HomeChartsQuery, HomeChartsQueryVariables>(HomeChartsDocument, options);
      }
export function useHomeChartsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<HomeChartsQuery, HomeChartsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<HomeChartsQuery, HomeChartsQueryVariables>(HomeChartsDocument, options);
        }
// @ts-ignore
export function useHomeChartsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<HomeChartsQuery, HomeChartsQueryVariables>): Apollo.UseSuspenseQueryResult<HomeChartsQuery, HomeChartsQueryVariables>;
export function useHomeChartsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<HomeChartsQuery, HomeChartsQueryVariables>): Apollo.UseSuspenseQueryResult<HomeChartsQuery | undefined, HomeChartsQueryVariables>;
export function useHomeChartsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<HomeChartsQuery, HomeChartsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<HomeChartsQuery, HomeChartsQueryVariables>(HomeChartsDocument, options);
        }
export type HomeChartsQueryHookResult = ReturnType<typeof useHomeChartsQuery>;
export type HomeChartsLazyQueryHookResult = ReturnType<typeof useHomeChartsLazyQuery>;
export type HomeChartsSuspenseQueryHookResult = ReturnType<typeof useHomeChartsSuspenseQuery>;
export type HomeChartsQueryResult = Apollo.QueryResult<HomeChartsQuery, HomeChartsQueryVariables>;
export const IncomeStatementDocument = gql`
    query IncomeStatement($ledgerId: String!, $time: String, $interval: String, $conversion: String) {
  getLedgerIncomeStatement(
    ledgerId: $ledgerId
    time: $time
    interval: $interval
    conversion: $conversion
  ) {
    expensesData {
      date
      balance
      accountBalances
    }
    incomeData {
      date
      balance
      accountBalances
    }
    netProfitData {
      date
      balance
    }
    expensesHierarchyData {
      account
      balance
      balanceChildren
      children
      hasTxns
    }
    incomeHierarchyData {
      account
      balance
      balanceChildren
      children
      hasTxns
    }
  }
}
    `;

/**
 * __useIncomeStatementQuery__
 *
 * To run a query within a React component, call `useIncomeStatementQuery` and pass it any options that fit your needs.
 * When your component renders, `useIncomeStatementQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useIncomeStatementQuery({
 *   variables: {
 *      ledgerId: // value for 'ledgerId'
 *      time: // value for 'time'
 *      interval: // value for 'interval'
 *      conversion: // value for 'conversion'
 *   },
 * });
 */
export function useIncomeStatementQuery(baseOptions: Apollo.QueryHookOptions<IncomeStatementQuery, IncomeStatementQueryVariables> & ({ variables: IncomeStatementQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<IncomeStatementQuery, IncomeStatementQueryVariables>(IncomeStatementDocument, options);
      }
export function useIncomeStatementLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<IncomeStatementQuery, IncomeStatementQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<IncomeStatementQuery, IncomeStatementQueryVariables>(IncomeStatementDocument, options);
        }
// @ts-ignore
export function useIncomeStatementSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<IncomeStatementQuery, IncomeStatementQueryVariables>): Apollo.UseSuspenseQueryResult<IncomeStatementQuery, IncomeStatementQueryVariables>;
export function useIncomeStatementSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<IncomeStatementQuery, IncomeStatementQueryVariables>): Apollo.UseSuspenseQueryResult<IncomeStatementQuery | undefined, IncomeStatementQueryVariables>;
export function useIncomeStatementSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<IncomeStatementQuery, IncomeStatementQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<IncomeStatementQuery, IncomeStatementQueryVariables>(IncomeStatementDocument, options);
        }
export type IncomeStatementQueryHookResult = ReturnType<typeof useIncomeStatementQuery>;
export type IncomeStatementLazyQueryHookResult = ReturnType<typeof useIncomeStatementLazyQuery>;
export type IncomeStatementSuspenseQueryHookResult = ReturnType<typeof useIncomeStatementSuspenseQuery>;
export type IncomeStatementQueryResult = Apollo.QueryResult<IncomeStatementQuery, IncomeStatementQueryVariables>;
export const InsertReceiptTransactionDocument = gql`
    mutation InsertReceiptTransaction($ledgerId: String!, $receiptObjectKey: String!, $input: InsertReceiptTransactionInput!) {
  insertReceiptTransaction(
    ledgerId: $ledgerId
    receiptObjectKey: $receiptObjectKey
    input: $input
  ) {
    success
  }
}
    `;
export type InsertReceiptTransactionMutationFn = Apollo.MutationFunction<InsertReceiptTransactionMutation, InsertReceiptTransactionMutationVariables>;

/**
 * __useInsertReceiptTransactionMutation__
 *
 * To run a mutation, you first call `useInsertReceiptTransactionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useInsertReceiptTransactionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [insertReceiptTransactionMutation, { data, loading, error }] = useInsertReceiptTransactionMutation({
 *   variables: {
 *      ledgerId: // value for 'ledgerId'
 *      receiptObjectKey: // value for 'receiptObjectKey'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useInsertReceiptTransactionMutation(baseOptions?: Apollo.MutationHookOptions<InsertReceiptTransactionMutation, InsertReceiptTransactionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<InsertReceiptTransactionMutation, InsertReceiptTransactionMutationVariables>(InsertReceiptTransactionDocument, options);
      }
export type InsertReceiptTransactionMutationHookResult = ReturnType<typeof useInsertReceiptTransactionMutation>;
export type InsertReceiptTransactionMutationResult = Apollo.MutationResult<InsertReceiptTransactionMutation>;
export type InsertReceiptTransactionMutationOptions = Apollo.BaseMutationOptions<InsertReceiptTransactionMutation, InsertReceiptTransactionMutationVariables>;
export const JournalEntriesDocument = gql`
    query JournalEntries($first: Int, $after: String, $last: Int, $before: String, $detailed: Boolean, $searchQuery: String, $accountFilter: String, $amountMin: Float, $amountMax: Float, $entryTypes: [String!], $sortBy: String, $sortOrder: String, $groupBy: String) {
  journalEntries(
    first: $first
    after: $after
    last: $last
    before: $before
    detailed: $detailed
    searchQuery: $searchQuery
    accountFilter: $accountFilter
    amountMin: $amountMin
    amountMax: $amountMax
    entryTypes: $entryTypes
    sortBy: $sortBy
    sortOrder: $sortOrder
    groupBy: $groupBy
  ) {
    success
    data {
      date
      type
      meta {
        filename
        lineno
      }
      account
      booking
      currencies
      flag
      links
      narration
      payee
      postings {
        account
        cost
        flag
        meta {
          filename
          lineno
        }
        price
        units {
          currency
          number
        }
      }
      tags
      amount {
        currency
        number
      }
      comment
      filename
      entry_hash
      entry_type
      error
      error_message
      netAmount
      primaryAccount
      searchableText
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
      totalCount
    }
  }
}
    `;

/**
 * __useJournalEntriesQuery__
 *
 * To run a query within a React component, call `useJournalEntriesQuery` and pass it any options that fit your needs.
 * When your component renders, `useJournalEntriesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useJournalEntriesQuery({
 *   variables: {
 *      first: // value for 'first'
 *      after: // value for 'after'
 *      last: // value for 'last'
 *      before: // value for 'before'
 *      detailed: // value for 'detailed'
 *      searchQuery: // value for 'searchQuery'
 *      accountFilter: // value for 'accountFilter'
 *      amountMin: // value for 'amountMin'
 *      amountMax: // value for 'amountMax'
 *      entryTypes: // value for 'entryTypes'
 *      sortBy: // value for 'sortBy'
 *      sortOrder: // value for 'sortOrder'
 *      groupBy: // value for 'groupBy'
 *   },
 * });
 */
export function useJournalEntriesQuery(baseOptions?: Apollo.QueryHookOptions<JournalEntriesQuery, JournalEntriesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<JournalEntriesQuery, JournalEntriesQueryVariables>(JournalEntriesDocument, options);
      }
export function useJournalEntriesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<JournalEntriesQuery, JournalEntriesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<JournalEntriesQuery, JournalEntriesQueryVariables>(JournalEntriesDocument, options);
        }
// @ts-ignore
export function useJournalEntriesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<JournalEntriesQuery, JournalEntriesQueryVariables>): Apollo.UseSuspenseQueryResult<JournalEntriesQuery, JournalEntriesQueryVariables>;
export function useJournalEntriesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<JournalEntriesQuery, JournalEntriesQueryVariables>): Apollo.UseSuspenseQueryResult<JournalEntriesQuery | undefined, JournalEntriesQueryVariables>;
export function useJournalEntriesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<JournalEntriesQuery, JournalEntriesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<JournalEntriesQuery, JournalEntriesQueryVariables>(JournalEntriesDocument, options);
        }
export type JournalEntriesQueryHookResult = ReturnType<typeof useJournalEntriesQuery>;
export type JournalEntriesLazyQueryHookResult = ReturnType<typeof useJournalEntriesLazyQuery>;
export type JournalEntriesSuspenseQueryHookResult = ReturnType<typeof useJournalEntriesSuspenseQuery>;
export type JournalEntriesQueryResult = Apollo.QueryResult<JournalEntriesQuery, JournalEntriesQueryVariables>;
export const LedgerMetaDocument = gql`
    query ledgerMeta($userId: String!, $ledgerId: String) {
  ledgerMeta(userId: $userId, ledgerId: $ledgerId) {
    data {
      accounts
      currencies
      errors
      options {
        name_assets
        name_equity
        name_expenses
        name_income
        name_liabilities
        operating_currency
      }
    }
    success
  }
}
    `;

/**
 * __useLedgerMetaQuery__
 *
 * To run a query within a React component, call `useLedgerMetaQuery` and pass it any options that fit your needs.
 * When your component renders, `useLedgerMetaQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLedgerMetaQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *      ledgerId: // value for 'ledgerId'
 *   },
 * });
 */
export function useLedgerMetaQuery(baseOptions: Apollo.QueryHookOptions<LedgerMetaQuery, LedgerMetaQueryVariables> & ({ variables: LedgerMetaQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<LedgerMetaQuery, LedgerMetaQueryVariables>(LedgerMetaDocument, options);
      }
export function useLedgerMetaLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<LedgerMetaQuery, LedgerMetaQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<LedgerMetaQuery, LedgerMetaQueryVariables>(LedgerMetaDocument, options);
        }
// @ts-ignore
export function useLedgerMetaSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<LedgerMetaQuery, LedgerMetaQueryVariables>): Apollo.UseSuspenseQueryResult<LedgerMetaQuery, LedgerMetaQueryVariables>;
export function useLedgerMetaSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<LedgerMetaQuery, LedgerMetaQueryVariables>): Apollo.UseSuspenseQueryResult<LedgerMetaQuery | undefined, LedgerMetaQueryVariables>;
export function useLedgerMetaSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<LedgerMetaQuery, LedgerMetaQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<LedgerMetaQuery, LedgerMetaQueryVariables>(LedgerMetaDocument, options);
        }
export type LedgerMetaQueryHookResult = ReturnType<typeof useLedgerMetaQuery>;
export type LedgerMetaLazyQueryHookResult = ReturnType<typeof useLedgerMetaLazyQuery>;
export type LedgerMetaSuspenseQueryHookResult = ReturnType<typeof useLedgerMetaSuspenseQuery>;
export type LedgerMetaQueryResult = Apollo.QueryResult<LedgerMetaQuery, LedgerMetaQueryVariables>;
export const ListCommitsDocument = gql`
    query listCommits($ledgerId: String!, $branch: String!, $page: Int!, $limit: Int!) {
  listCommits(ledgerId: $ledgerId, branch: $branch, page: $page, limit: $limit) {
    sha
    shortSha
    message
    author {
      name
    }
  }
}
    `;

/**
 * __useListCommitsQuery__
 *
 * To run a query within a React component, call `useListCommitsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListCommitsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListCommitsQuery({
 *   variables: {
 *      ledgerId: // value for 'ledgerId'
 *      branch: // value for 'branch'
 *      page: // value for 'page'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useListCommitsQuery(baseOptions: Apollo.QueryHookOptions<ListCommitsQuery, ListCommitsQueryVariables> & ({ variables: ListCommitsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ListCommitsQuery, ListCommitsQueryVariables>(ListCommitsDocument, options);
      }
export function useListCommitsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ListCommitsQuery, ListCommitsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ListCommitsQuery, ListCommitsQueryVariables>(ListCommitsDocument, options);
        }
// @ts-ignore
export function useListCommitsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ListCommitsQuery, ListCommitsQueryVariables>): Apollo.UseSuspenseQueryResult<ListCommitsQuery, ListCommitsQueryVariables>;
export function useListCommitsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ListCommitsQuery, ListCommitsQueryVariables>): Apollo.UseSuspenseQueryResult<ListCommitsQuery | undefined, ListCommitsQueryVariables>;
export function useListCommitsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ListCommitsQuery, ListCommitsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ListCommitsQuery, ListCommitsQueryVariables>(ListCommitsDocument, options);
        }
export type ListCommitsQueryHookResult = ReturnType<typeof useListCommitsQuery>;
export type ListCommitsLazyQueryHookResult = ReturnType<typeof useListCommitsLazyQuery>;
export type ListCommitsSuspenseQueryHookResult = ReturnType<typeof useListCommitsSuspenseQuery>;
export type ListCommitsQueryResult = Apollo.QueryResult<ListCommitsQuery, ListCommitsQueryVariables>;
export const ListLedgersDocument = gql`
    query ListLedgers($limit: Float, $page: Float) {
  listLedgers(limit: $limit, page: $page) {
    id
    name
    fullName
    httpUrl
    sshUrl
    private
    empty
    size
    createdAt
    updatedAt
    description
    permissions {
      admin
      pull
      push
    }
  }
}
    `;

/**
 * __useListLedgersQuery__
 *
 * To run a query within a React component, call `useListLedgersQuery` and pass it any options that fit your needs.
 * When your component renders, `useListLedgersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListLedgersQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useListLedgersQuery(baseOptions?: Apollo.QueryHookOptions<ListLedgersQuery, ListLedgersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ListLedgersQuery, ListLedgersQueryVariables>(ListLedgersDocument, options);
      }
export function useListLedgersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ListLedgersQuery, ListLedgersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ListLedgersQuery, ListLedgersQueryVariables>(ListLedgersDocument, options);
        }
// @ts-ignore
export function useListLedgersSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ListLedgersQuery, ListLedgersQueryVariables>): Apollo.UseSuspenseQueryResult<ListLedgersQuery, ListLedgersQueryVariables>;
export function useListLedgersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ListLedgersQuery, ListLedgersQueryVariables>): Apollo.UseSuspenseQueryResult<ListLedgersQuery | undefined, ListLedgersQueryVariables>;
export function useListLedgersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ListLedgersQuery, ListLedgersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ListLedgersQuery, ListLedgersQueryVariables>(ListLedgersDocument, options);
        }
export type ListLedgersQueryHookResult = ReturnType<typeof useListLedgersQuery>;
export type ListLedgersLazyQueryHookResult = ReturnType<typeof useListLedgersLazyQuery>;
export type ListLedgersSuspenseQueryHookResult = ReturnType<typeof useListLedgersSuspenseQuery>;
export type ListLedgersQueryResult = Apollo.QueryResult<ListLedgersQuery, ListLedgersQueryVariables>;
export const ParseReceiptWithLlmDocument = gql`
    mutation ParseReceiptWithLLM($s3ObjectKey: String!, $ledgerId: String!) {
  parseReceiptWithLLM(s3ObjectKey: $s3ObjectKey, ledgerId: $ledgerId) {
    date
    payee
    description
    amount
    sourceAccount
    targetAccount
  }
}
    `;
export type ParseReceiptWithLlmMutationFn = Apollo.MutationFunction<ParseReceiptWithLlmMutation, ParseReceiptWithLlmMutationVariables>;

/**
 * __useParseReceiptWithLlmMutation__
 *
 * To run a mutation, you first call `useParseReceiptWithLlmMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useParseReceiptWithLlmMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [parseReceiptWithLlmMutation, { data, loading, error }] = useParseReceiptWithLlmMutation({
 *   variables: {
 *      s3ObjectKey: // value for 's3ObjectKey'
 *      ledgerId: // value for 'ledgerId'
 *   },
 * });
 */
export function useParseReceiptWithLlmMutation(baseOptions?: Apollo.MutationHookOptions<ParseReceiptWithLlmMutation, ParseReceiptWithLlmMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ParseReceiptWithLlmMutation, ParseReceiptWithLlmMutationVariables>(ParseReceiptWithLlmDocument, options);
      }
export type ParseReceiptWithLlmMutationHookResult = ReturnType<typeof useParseReceiptWithLlmMutation>;
export type ParseReceiptWithLlmMutationResult = Apollo.MutationResult<ParseReceiptWithLlmMutation>;
export type ParseReceiptWithLlmMutationOptions = Apollo.BaseMutationOptions<ParseReceiptWithLlmMutation, ParseReceiptWithLlmMutationVariables>;
export const PaymentHistoryDocument = gql`
    query PaymentHistory {
  paymentHistory {
    _id
    amount
    currency
    paymentEmail
    userId
    createAt
    chargeId
    estimatedIotx
    fulfilledHash
  }
}
    `;

/**
 * __usePaymentHistoryQuery__
 *
 * To run a query within a React component, call `usePaymentHistoryQuery` and pass it any options that fit your needs.
 * When your component renders, `usePaymentHistoryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePaymentHistoryQuery({
 *   variables: {
 *   },
 * });
 */
export function usePaymentHistoryQuery(baseOptions?: Apollo.QueryHookOptions<PaymentHistoryQuery, PaymentHistoryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PaymentHistoryQuery, PaymentHistoryQueryVariables>(PaymentHistoryDocument, options);
      }
export function usePaymentHistoryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PaymentHistoryQuery, PaymentHistoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PaymentHistoryQuery, PaymentHistoryQueryVariables>(PaymentHistoryDocument, options);
        }
// @ts-ignore
export function usePaymentHistorySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PaymentHistoryQuery, PaymentHistoryQueryVariables>): Apollo.UseSuspenseQueryResult<PaymentHistoryQuery, PaymentHistoryQueryVariables>;
export function usePaymentHistorySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PaymentHistoryQuery, PaymentHistoryQueryVariables>): Apollo.UseSuspenseQueryResult<PaymentHistoryQuery | undefined, PaymentHistoryQueryVariables>;
export function usePaymentHistorySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PaymentHistoryQuery, PaymentHistoryQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PaymentHistoryQuery, PaymentHistoryQueryVariables>(PaymentHistoryDocument, options);
        }
export type PaymentHistoryQueryHookResult = ReturnType<typeof usePaymentHistoryQuery>;
export type PaymentHistoryLazyQueryHookResult = ReturnType<typeof usePaymentHistoryLazyQuery>;
export type PaymentHistorySuspenseQueryHookResult = ReturnType<typeof usePaymentHistorySuspenseQuery>;
export type PaymentHistoryQueryResult = Apollo.QueryResult<PaymentHistoryQuery, PaymentHistoryQueryVariables>;
export const SubscriptionStatusDocument = gql`
    query SubscriptionStatus {
  subscriptionStatus {
    hasActiveSubscription
    subscriptions {
      id
      status
      cancelAt
      cancelAtPeriodEnd
      canceledAt
      clientId
      currentPeriodEnd
      currentPeriodStart
      items {
        id
        quantity
        price {
          id
          amount
          currency
          interval
          intervalCount
          trialPeriodDays
        }
        product {
          id
          name
          description
          images
        }
      }
    }
  }
}
    `;

/**
 * __useSubscriptionStatusQuery__
 *
 * To run a query within a React component, call `useSubscriptionStatusQuery` and pass it any options that fit your needs.
 * When your component renders, `useSubscriptionStatusQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSubscriptionStatusQuery({
 *   variables: {
 *   },
 * });
 */
export function useSubscriptionStatusQuery(baseOptions?: Apollo.QueryHookOptions<SubscriptionStatusQuery, SubscriptionStatusQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SubscriptionStatusQuery, SubscriptionStatusQueryVariables>(SubscriptionStatusDocument, options);
      }
export function useSubscriptionStatusLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SubscriptionStatusQuery, SubscriptionStatusQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SubscriptionStatusQuery, SubscriptionStatusQueryVariables>(SubscriptionStatusDocument, options);
        }
// @ts-ignore
export function useSubscriptionStatusSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SubscriptionStatusQuery, SubscriptionStatusQueryVariables>): Apollo.UseSuspenseQueryResult<SubscriptionStatusQuery, SubscriptionStatusQueryVariables>;
export function useSubscriptionStatusSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SubscriptionStatusQuery, SubscriptionStatusQueryVariables>): Apollo.UseSuspenseQueryResult<SubscriptionStatusQuery | undefined, SubscriptionStatusQueryVariables>;
export function useSubscriptionStatusSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SubscriptionStatusQuery, SubscriptionStatusQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SubscriptionStatusQuery, SubscriptionStatusQueryVariables>(SubscriptionStatusDocument, options);
        }
export type SubscriptionStatusQueryHookResult = ReturnType<typeof useSubscriptionStatusQuery>;
export type SubscriptionStatusLazyQueryHookResult = ReturnType<typeof useSubscriptionStatusLazyQuery>;
export type SubscriptionStatusSuspenseQueryHookResult = ReturnType<typeof useSubscriptionStatusSuspenseQuery>;
export type SubscriptionStatusQueryResult = Apollo.QueryResult<SubscriptionStatusQuery, SubscriptionStatusQueryVariables>;
export const SuggestTransactionCategoriesWithLlmDocument = gql`
    query suggestTransactionCategoriesWithLLM($ledgerId: String!, $transactions: [TransactionToCategorizeInput!]!) {
  suggestTransactionCategoriesWithLLM(
    ledgerId: $ledgerId
    transactions: $transactions
  ) {
    targetAccount
    confidence
    source
  }
}
    `;

/**
 * __useSuggestTransactionCategoriesWithLlmQuery__
 *
 * To run a query within a React component, call `useSuggestTransactionCategoriesWithLlmQuery` and pass it any options that fit your needs.
 * When your component renders, `useSuggestTransactionCategoriesWithLlmQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSuggestTransactionCategoriesWithLlmQuery({
 *   variables: {
 *      ledgerId: // value for 'ledgerId'
 *      transactions: // value for 'transactions'
 *   },
 * });
 */
export function useSuggestTransactionCategoriesWithLlmQuery(baseOptions: Apollo.QueryHookOptions<SuggestTransactionCategoriesWithLlmQuery, SuggestTransactionCategoriesWithLlmQueryVariables> & ({ variables: SuggestTransactionCategoriesWithLlmQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SuggestTransactionCategoriesWithLlmQuery, SuggestTransactionCategoriesWithLlmQueryVariables>(SuggestTransactionCategoriesWithLlmDocument, options);
      }
export function useSuggestTransactionCategoriesWithLlmLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SuggestTransactionCategoriesWithLlmQuery, SuggestTransactionCategoriesWithLlmQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SuggestTransactionCategoriesWithLlmQuery, SuggestTransactionCategoriesWithLlmQueryVariables>(SuggestTransactionCategoriesWithLlmDocument, options);
        }
// @ts-ignore
export function useSuggestTransactionCategoriesWithLlmSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SuggestTransactionCategoriesWithLlmQuery, SuggestTransactionCategoriesWithLlmQueryVariables>): Apollo.UseSuspenseQueryResult<SuggestTransactionCategoriesWithLlmQuery, SuggestTransactionCategoriesWithLlmQueryVariables>;
export function useSuggestTransactionCategoriesWithLlmSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SuggestTransactionCategoriesWithLlmQuery, SuggestTransactionCategoriesWithLlmQueryVariables>): Apollo.UseSuspenseQueryResult<SuggestTransactionCategoriesWithLlmQuery | undefined, SuggestTransactionCategoriesWithLlmQueryVariables>;
export function useSuggestTransactionCategoriesWithLlmSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SuggestTransactionCategoriesWithLlmQuery, SuggestTransactionCategoriesWithLlmQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SuggestTransactionCategoriesWithLlmQuery, SuggestTransactionCategoriesWithLlmQueryVariables>(SuggestTransactionCategoriesWithLlmDocument, options);
        }
export type SuggestTransactionCategoriesWithLlmQueryHookResult = ReturnType<typeof useSuggestTransactionCategoriesWithLlmQuery>;
export type SuggestTransactionCategoriesWithLlmLazyQueryHookResult = ReturnType<typeof useSuggestTransactionCategoriesWithLlmLazyQuery>;
export type SuggestTransactionCategoriesWithLlmSuspenseQueryHookResult = ReturnType<typeof useSuggestTransactionCategoriesWithLlmSuspenseQuery>;
export type SuggestTransactionCategoriesWithLlmQueryResult = Apollo.QueryResult<SuggestTransactionCategoriesWithLlmQuery, SuggestTransactionCategoriesWithLlmQueryVariables>;
export const UpdateLedgerEntrySourceSliceDocument = gql`
    mutation updateLedgerEntrySourceSlice($input: UpdateSourceSliceInput!, $ledgerId: String!) {
  updateLedgerEntrySourceSlice(input: $input, ledgerId: $ledgerId) {
    entryHash
    message
    newSha256sum
  }
}
    `;
export type UpdateLedgerEntrySourceSliceMutationFn = Apollo.MutationFunction<UpdateLedgerEntrySourceSliceMutation, UpdateLedgerEntrySourceSliceMutationVariables>;

/**
 * __useUpdateLedgerEntrySourceSliceMutation__
 *
 * To run a mutation, you first call `useUpdateLedgerEntrySourceSliceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateLedgerEntrySourceSliceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateLedgerEntrySourceSliceMutation, { data, loading, error }] = useUpdateLedgerEntrySourceSliceMutation({
 *   variables: {
 *      input: // value for 'input'
 *      ledgerId: // value for 'ledgerId'
 *   },
 * });
 */
export function useUpdateLedgerEntrySourceSliceMutation(baseOptions?: Apollo.MutationHookOptions<UpdateLedgerEntrySourceSliceMutation, UpdateLedgerEntrySourceSliceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateLedgerEntrySourceSliceMutation, UpdateLedgerEntrySourceSliceMutationVariables>(UpdateLedgerEntrySourceSliceDocument, options);
      }
export type UpdateLedgerEntrySourceSliceMutationHookResult = ReturnType<typeof useUpdateLedgerEntrySourceSliceMutation>;
export type UpdateLedgerEntrySourceSliceMutationResult = Apollo.MutationResult<UpdateLedgerEntrySourceSliceMutation>;
export type UpdateLedgerEntrySourceSliceMutationOptions = Apollo.BaseMutationOptions<UpdateLedgerEntrySourceSliceMutation, UpdateLedgerEntrySourceSliceMutationVariables>;
export const UpdateLedgerFileDocument = gql`
    mutation updateLedgerFile($ledgerId: String!, $path: String!, $content: String!, $sha: String!, $message: String) {
  updateLedgerFile(
    ledgerId: $ledgerId
    path: $path
    content: $content
    sha: $sha
    message: $message
  ) {
    content
    name
    path
    sha
    size
    type
  }
}
    `;
export type UpdateLedgerFileMutationFn = Apollo.MutationFunction<UpdateLedgerFileMutation, UpdateLedgerFileMutationVariables>;

/**
 * __useUpdateLedgerFileMutation__
 *
 * To run a mutation, you first call `useUpdateLedgerFileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateLedgerFileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateLedgerFileMutation, { data, loading, error }] = useUpdateLedgerFileMutation({
 *   variables: {
 *      ledgerId: // value for 'ledgerId'
 *      path: // value for 'path'
 *      content: // value for 'content'
 *      sha: // value for 'sha'
 *      message: // value for 'message'
 *   },
 * });
 */
export function useUpdateLedgerFileMutation(baseOptions?: Apollo.MutationHookOptions<UpdateLedgerFileMutation, UpdateLedgerFileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateLedgerFileMutation, UpdateLedgerFileMutationVariables>(UpdateLedgerFileDocument, options);
      }
export type UpdateLedgerFileMutationHookResult = ReturnType<typeof useUpdateLedgerFileMutation>;
export type UpdateLedgerFileMutationResult = Apollo.MutationResult<UpdateLedgerFileMutation>;
export type UpdateLedgerFileMutationOptions = Apollo.BaseMutationOptions<UpdateLedgerFileMutation, UpdateLedgerFileMutationVariables>;
export const UpdateReportSubscribeDocument = gql`
    mutation updateReportSubscribe($userId: String!, $status: ReportStatus!) {
  updateReportSubscribe(userId: $userId, status: $status) {
    success
  }
}
    `;
export type UpdateReportSubscribeMutationFn = Apollo.MutationFunction<UpdateReportSubscribeMutation, UpdateReportSubscribeMutationVariables>;

/**
 * __useUpdateReportSubscribeMutation__
 *
 * To run a mutation, you first call `useUpdateReportSubscribeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateReportSubscribeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateReportSubscribeMutation, { data, loading, error }] = useUpdateReportSubscribeMutation({
 *   variables: {
 *      userId: // value for 'userId'
 *      status: // value for 'status'
 *   },
 * });
 */
export function useUpdateReportSubscribeMutation(baseOptions?: Apollo.MutationHookOptions<UpdateReportSubscribeMutation, UpdateReportSubscribeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateReportSubscribeMutation, UpdateReportSubscribeMutationVariables>(UpdateReportSubscribeDocument, options);
      }
export type UpdateReportSubscribeMutationHookResult = ReturnType<typeof useUpdateReportSubscribeMutation>;
export type UpdateReportSubscribeMutationResult = Apollo.MutationResult<UpdateReportSubscribeMutation>;
export type UpdateReportSubscribeMutationOptions = Apollo.BaseMutationOptions<UpdateReportSubscribeMutation, UpdateReportSubscribeMutationVariables>;
export const UserProfileDocument = gql`
    query UserProfile($userId: String!) {
  userProfile(userId: $userId) {
    email
    emailReportStatus
  }
}
    `;

/**
 * __useUserProfileQuery__
 *
 * To run a query within a React component, call `useUserProfileQuery` and pass it any options that fit your needs.
 * When your component renders, `useUserProfileQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUserProfileQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useUserProfileQuery(baseOptions: Apollo.QueryHookOptions<UserProfileQuery, UserProfileQueryVariables> & ({ variables: UserProfileQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UserProfileQuery, UserProfileQueryVariables>(UserProfileDocument, options);
      }
export function useUserProfileLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UserProfileQuery, UserProfileQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UserProfileQuery, UserProfileQueryVariables>(UserProfileDocument, options);
        }
// @ts-ignore
export function useUserProfileSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<UserProfileQuery, UserProfileQueryVariables>): Apollo.UseSuspenseQueryResult<UserProfileQuery, UserProfileQueryVariables>;
export function useUserProfileSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<UserProfileQuery, UserProfileQueryVariables>): Apollo.UseSuspenseQueryResult<UserProfileQuery | undefined, UserProfileQueryVariables>;
export function useUserProfileSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<UserProfileQuery, UserProfileQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<UserProfileQuery, UserProfileQueryVariables>(UserProfileDocument, options);
        }
export type UserProfileQueryHookResult = ReturnType<typeof useUserProfileQuery>;
export type UserProfileLazyQueryHookResult = ReturnType<typeof useUserProfileLazyQuery>;
export type UserProfileSuspenseQueryHookResult = ReturnType<typeof useUserProfileSuspenseQuery>;
export type UserProfileQueryResult = Apollo.QueryResult<UserProfileQuery, UserProfileQueryVariables>;