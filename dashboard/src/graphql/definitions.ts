import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTimeISO: { input: string; output: string; }
  JSON: { input: unknown; output: unknown; }
  JSONObject: { input: Record<string, unknown>; output: Record<string, unknown>; }
};

export type AccountBalance = {
  __typename: 'AccountBalance';
  account: Scalars['String']['output'];
  balance: Scalars['JSONObject']['output'];
  balance_children: Scalars['JSONObject']['output'];
  children: Array<AccountBalance>;
};

export type AccountHierarchyResponse = {
  __typename: 'AccountHierarchyResponse';
  data: Array<LabeledHierarchyItem>;
  success: Scalars['Boolean']['output'];
};

export type AccountJournalEntry = {
  __typename: 'AccountJournalEntry';
  balance: Scalars['JSONObject']['output'];
  change: Scalars['JSONObject']['output'];
  entry: Scalars['JSONObject']['output'];
};

export type AccountJournalQueryInput = {
  account: Scalars['String']['input'];
  conversion?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Float']['input']>;
  offset?: InputMaybe<Scalars['Float']['input']>;
  time?: InputMaybe<Scalars['String']['input']>;
  with_children?: InputMaybe<Scalars['Boolean']['input']>;
};

export type AccountJournalResponse = {
  __typename: 'AccountJournalResponse';
  account: Scalars['String']['output'];
  items: Array<AccountJournalEntry>;
  total: Scalars['Float']['output'];
  with_children: Scalars['Boolean']['output'];
};

export type AccountLastEntry = {
  __typename: 'AccountLastEntry';
  account: Scalars['String']['output'];
  balance: Maybe<Scalars['JSONObject']['output']>;
  date: Maybe<Scalars['String']['output']>;
};

export type AccountReport = {
  __typename: 'AccountReport';
  accountBalanceData: Array<DateAndBalance>;
  intervalTotalsData: Array<DateAndBalance>;
  linechartData: Array<DateAndBalance>;
};

export type AddCollaboratorResponse = {
  __typename: 'AddCollaboratorResponse';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type AddEntryInput = {
  balance?: InputMaybe<LedgerBalanceInput>;
  budget?: InputMaybe<LedgerBudgetInput>;
  close?: InputMaybe<LedgerCloseInput>;
  commodity?: InputMaybe<LedgerCommodityInput>;
  document?: InputMaybe<LedgerDocumentInput>;
  event?: InputMaybe<LedgerEventInput>;
  note?: InputMaybe<LedgerNoteInput>;
  open?: InputMaybe<LedgerOpenInput>;
  price?: InputMaybe<LedgerPriceInput>;
  transaction?: InputMaybe<LedgerTransactionInput>;
  type: LedgerEntryType;
};

export type AddEntryResponse = {
  __typename: 'AddEntryResponse';
  data: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type AddLedgerEntryResponse = {
  __typename: 'AddLedgerEntryResponse';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type AiCfoUsageResponse = {
  __typename: 'AiCfoUsageResponse';
  aiCfoTokensMax: Scalars['Float']['output'];
  aiCfoTokensUsed: Scalars['Float']['output'];
};

export type BalanceSheetData = {
  __typename: 'BalanceSheetData';
  assetsData: Array<DateAndBalance>;
  assetsHierarchyData: SerializableTreeNode;
  equityData: Array<DateAndBalance>;
  equityHierarchyData: SerializableTreeNode;
  liabilitiesData: Array<DateAndBalance>;
  liabilitiesHierarchyData: SerializableTreeNode;
  netWorthData: Array<DateAndBalance>;
};

export type BcioOptions = {
  __typename: 'BcioOptions';
  accountFile: Maybe<Scalars['String']['output']>;
  balanceFile: Maybe<Scalars['String']['output']>;
  budgetFile: Maybe<Scalars['String']['output']>;
  defaultFile: Scalars['String']['output'];
  documentFile: Maybe<Scalars['String']['output']>;
  noteFile: Maybe<Scalars['String']['output']>;
  padFile: Maybe<Scalars['String']['output']>;
  priceFile: Maybe<Scalars['String']['output']>;
  receiptBaseFolder: Maybe<Scalars['String']['output']>;
  receiptStorage: Maybe<Scalars['String']['output']>;
  transactionFile: Maybe<Scalars['String']['output']>;
};

export type BeancountError = {
  __typename: 'BeancountError';
  filename: Maybe<Scalars['String']['output']>;
  lineno: Maybe<Scalars['Float']['output']>;
  message: Scalars['String']['output'];
};

/** Budget recurrence interval */
export enum BudgetInterval {
  Daily = 'DAILY',
  Monthly = 'MONTHLY',
  Quarterly = 'QUARTERLY',
  Weekly = 'WEEKLY',
  Yearly = 'YEARLY'
}

export type CategorySuggestion = {
  __typename: 'CategorySuggestion';
  confidence: Scalars['Float']['output'];
  reasoning: Maybe<Scalars['String']['output']>;
  rowIndex: Scalars['Int']['output'];
  source: Scalars['String']['output'];
  targetAccount: Scalars['String']['output'];
};

export type ChartItemV2 = {
  __typename: 'ChartItemV2';
  balance: Scalars['JSONObject']['output'];
  budgets: Maybe<Scalars['JSONObject']['output']>;
  date: Scalars['String']['output'];
};

/** Status of a CLI authentication session */
export enum CliAuthStatus {
  Authorized = 'AUTHORIZED',
  Consumed = 'CONSUMED',
  Denied = 'DENIED',
  Expired = 'EXPIRED',
  Pending = 'PENDING'
}

export type CollaboratorUser = {
  __typename: 'CollaboratorUser';
  active: Maybe<Scalars['Boolean']['output']>;
  created: Maybe<Scalars['String']['output']>;
  email: Maybe<Scalars['String']['output']>;
  fullName: Maybe<Scalars['String']['output']>;
  id: Maybe<Scalars['Float']['output']>;
  isAdmin: Maybe<Scalars['Boolean']['output']>;
  lastLogin: Maybe<Scalars['String']['output']>;
  login: Maybe<Scalars['String']['output']>;
  permission: Maybe<Scalars['String']['output']>;
};

export type CommitAuthor = {
  __typename: 'CommitAuthor';
  date: Scalars['String']['output'];
  email: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type CommitDetails = {
  __typename: 'CommitDetails';
  author: CommitAuthor;
  committer: Maybe<CommitAuthor>;
  diff: Maybe<Scalars['String']['output']>;
  files: Array<CommitFileChange>;
  message: Scalars['String']['output'];
  parents: Maybe<Array<Scalars['String']['output']>>;
  sha: Scalars['String']['output'];
  stats: CommitStats;
};

export type CommitFileChange = {
  __typename: 'CommitFileChange';
  additions: Scalars['Int']['output'];
  deletions: Scalars['Int']['output'];
  filename: Scalars['String']['output'];
};

export type CommitListItem = {
  __typename: 'CommitListItem';
  author: CommitAuthor;
  committer: Maybe<CommitAuthor>;
  message: Scalars['String']['output'];
  sha: Scalars['String']['output'];
  shortSha: Maybe<Scalars['String']['output']>;
};

export type CommitStats = {
  __typename: 'CommitStats';
  additions: Scalars['Int']['output'];
  deletions: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type CommodityPairWithPrices = {
  __typename: 'CommodityPairWithPrices';
  base: Scalars['String']['output'];
  prices: Array<PricePoint>;
  quote: Scalars['String']['output'];
};

export type ConfirmCliAuthSessionResponse = {
  __typename: 'ConfirmCliAuthSessionResponse';
  success: Scalars['Boolean']['output'];
};

export type ConsumeCliAuthSessionResponse = {
  __typename: 'ConsumeCliAuthSessionResponse';
  expireAt: Scalars['String']['output'];
  token: Scalars['String']['output'];
};

export type CreateCliAuthSessionResponse = {
  __typename: 'CreateCliAuthSessionResponse';
  expiresAt: Scalars['String']['output'];
  sessionId: Scalars['String']['output'];
};

export type CreateOneTimeTokenResponse = {
  __typename: 'CreateOneTimeTokenResponse';
  expireAt: Scalars['String']['output'];
  id: Scalars['String']['output'];
};

export type CreatePrFromPatchInput = {
  baseBranch?: Scalars['String']['input'];
  changes: Array<FileChangeInput>;
  description?: InputMaybe<Scalars['String']['input']>;
  ledgerName: Scalars['String']['input'];
  ledgerOwner: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type CustomerSubscriptionStatus = {
  __typename: 'CustomerSubscriptionStatus';
  hasActiveSubscription: Scalars['Boolean']['output'];
  subscriptions: Array<Subscription>;
};

export type DateAndBalance = {
  __typename: 'DateAndBalance';
  balance: Scalars['JSONObject']['output'];
  date: Scalars['String']['output'];
};

export type DateAndBalanceWithAccountBalance = {
  __typename: 'DateAndBalanceWithAccountBalance';
  accountBalances: Scalars['JSONObject']['output'];
  balance: Scalars['JSONObject']['output'];
  date: Scalars['String']['output'];
};

export type DeleteCollaboratorResponse = {
  __typename: 'DeleteCollaboratorResponse';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteLedgerFileResponse = {
  __typename: 'DeleteLedgerFileResponse';
  path: Scalars['String']['output'];
};

export type DeleteLedgerResponse = {
  __typename: 'DeleteLedgerResponse';
  ledgerId: Scalars['String']['output'];
};

export type DeleteMultiSourceSliceItemInput = {
  entryHash: Scalars['String']['input'];
  sha256sum: Scalars['String']['input'];
};

export type DeleteMultiSourceSlicesInput = {
  entries: Array<DeleteMultiSourceSliceItemInput>;
};

export type DeleteMultiSourceSlicesResponse = {
  __typename: 'DeleteMultiSourceSlicesResponse';
  deletedHashes: Array<Scalars['String']['output']>;
  message: Scalars['String']['output'];
};

export type DeletePublicKeyResponse = {
  __typename: 'DeletePublicKeyResponse';
  id: Scalars['Float']['output'];
};

export type DeleteSourceSliceInput = {
  entryHash: Scalars['String']['input'];
  sha256sum: Scalars['String']['input'];
};

export type DeleteSourceSliceResponse = {
  __typename: 'DeleteSourceSliceResponse';
  entryHash: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

export type DenyCliAuthSessionResponse = {
  __typename: 'DenyCliAuthSessionResponse';
  success: Scalars['Boolean']['output'];
};

export type Document = {
  __typename: 'Document';
  account: Scalars['String']['output'];
  date: Scalars['String']['output'];
  filename: Scalars['String']['output'];
  links: Maybe<Array<Scalars['String']['output']>>;
  meta: Maybe<Scalars['JSONObject']['output']>;
  tags: Maybe<Array<Scalars['String']['output']>>;
};

export type EntriesByType = {
  __typename: 'EntriesByType';
  number: Scalars['Float']['output'];
  type: Scalars['String']['output'];
};

export type EntryContext = {
  __typename: 'EntryContext';
  balances_after: Maybe<Scalars['JSONObject']['output']>;
  balances_before: Maybe<Scalars['JSONObject']['output']>;
  entry: Scalars['JSONObject']['output'];
  sha256sum: Scalars['String']['output'];
  slice: Scalars['String']['output'];
};

export type EntryInput = {
  date: Scalars['String']['input'];
  flag: Scalars['String']['input'];
  meta: Scalars['JSONObject']['input'];
  narration: Scalars['String']['input'];
  payee: Scalars['String']['input'];
  postings: Array<PostingInput>;
  type: Scalars['String']['input'];
};

export type EntryMeta = {
  __typename: 'EntryMeta';
  filename: Scalars['String']['output'];
  lineno: Scalars['Float']['output'];
};

export type Event = {
  __typename: 'Event';
  date: Scalars['String']['output'];
  description: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type FavaOptions = {
  __typename: 'FavaOptions';
  accountJournalIncludeChildren: Scalars['Boolean']['output'];
  autoReload: Scalars['Boolean']['output'];
  collapsePattern: Array<Scalars['String']['output']>;
  conversionCurrencies: Array<Scalars['String']['output']>;
  currencyColumn: Scalars['Int']['output'];
  defaultPage: Scalars['String']['output'];
  fiscalYearEnd: FiscalYearEnd;
  indent: Scalars['Int']['output'];
  invertIncomeLiabilitiesEquity: Scalars['Boolean']['output'];
  language: Maybe<Scalars['String']['output']>;
  locale: Maybe<Scalars['String']['output']>;
  showAccountsWithZeroBalance: Scalars['Boolean']['output'];
  showAccountsWithZeroTransactions: Scalars['Boolean']['output'];
  showClosedAccounts: Scalars['Boolean']['output'];
  sidebarShowQueries: Scalars['Int']['output'];
  unrealized: Scalars['String']['output'];
  upcomingEvents: Scalars['Int']['output'];
  uptodateIndicatorGreyLookbackDays: Scalars['Int']['output'];
  useExternalEditor: Scalars['Boolean']['output'];
};

export type FeedItem = {
  __typename: 'FeedItem';
  author: Maybe<Scalars['String']['output']>;
  authorAvatar: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  link: Scalars['String']['output'];
  publishedAt: Scalars['DateTimeISO']['output'];
  source: FeedSource;
  summary: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

export type FeedResponse = {
  __typename: 'FeedResponse';
  hasMore: Scalars['Boolean']['output'];
  items: Array<FeedItem>;
  total: Scalars['Float']['output'];
};

/** Source type of the feed item */
export enum FeedSource {
  Blog = 'BLOG',
  LedgerRss = 'LEDGER_RSS'
}

export type FileChangeInput = {
  content: Scalars['String']['input'];
  path: Scalars['String']['input'];
};

export type FileParseResult = {
  __typename: 'FileParseResult';
  rows: Array<ParsedRow>;
};

export type FiscalYearEnd = {
  __typename: 'FiscalYearEnd';
  day: Scalars['Int']['output'];
  month: Scalars['Int']['output'];
};

export type FollowUserResponse = {
  __typename: 'FollowUserResponse';
  isFollowing: Maybe<Scalars['Boolean']['output']>;
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type GetCliAuthSessionResponse = {
  __typename: 'GetCliAuthSessionResponse';
  status: CliAuthStatus;
};

export type HomeChartsResponse = {
  __typename: 'HomeChartsResponse';
  data: Array<LabeledChartItem>;
  success: Scalars['Boolean']['output'];
};

export type IncomeStatementData = {
  __typename: 'IncomeStatementData';
  expensesData: Array<DateAndBalanceWithAccountBalance>;
  expensesHierarchyData: SerializableTreeNode;
  incomeData: Array<DateAndBalanceWithAccountBalance>;
  incomeHierarchyData: SerializableTreeNode;
  netProfitData: Array<DateAndBalance>;
};

export type InsertReceiptResult = {
  __typename: 'InsertReceiptResult';
  success: Scalars['Boolean']['output'];
};

export type InsertReceiptTransactionInput = {
  date: Scalars['String']['input'];
  description: Scalars['String']['input'];
  documentAccount: Scalars['String']['input'];
  payee: Scalars['String']['input'];
  postings: Array<ReceiptPostingInput>;
};

export type IntervalTotalItem = {
  __typename: 'IntervalTotalItem';
  accountBalances: Scalars['JSONObject']['output'];
  balance: Scalars['JSONObject']['output'];
  date: Scalars['String']['output'];
};

export type JournalEntriesResponse = {
  __typename: 'JournalEntriesResponse';
  data: Array<JournalEntry>;
  /** Pagination information */
  pageInfo: Maybe<PageInfo>;
  success: Scalars['Boolean']['output'];
};

export type JournalEntry = {
  __typename: 'JournalEntry';
  account: Maybe<Scalars['String']['output']>;
  /** Amount for balance entries */
  amount: Maybe<PostingUnits>;
  booking: Maybe<Scalars['String']['output']>;
  comment: Maybe<Scalars['String']['output']>;
  currencies: Maybe<Array<Scalars['String']['output']>>;
  date: Scalars['String']['output'];
  entry_hash: Maybe<Scalars['String']['output']>;
  entry_type: Maybe<Scalars['String']['output']>;
  error: Maybe<Scalars['String']['output']>;
  error_message: Maybe<Scalars['String']['output']>;
  filename: Maybe<Scalars['String']['output']>;
  flag: Maybe<Scalars['String']['output']>;
  links: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  meta: Maybe<EntryMeta>;
  narration: Maybe<Scalars['String']['output']>;
  /** Net amount for the transaction */
  netAmount: Maybe<Scalars['Float']['output']>;
  payee: Maybe<Scalars['String']['output']>;
  postings: Maybe<Array<JournalEntryPosting>>;
  /** Primary account for display */
  primaryAccount: Maybe<Scalars['String']['output']>;
  /** Combined searchable text */
  searchableText: Maybe<Scalars['String']['output']>;
  tags: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** Entry type (Transaction, Balance, Open, etc.) */
  type: Maybe<Scalars['String']['output']>;
};

export type JournalEntryPosting = {
  __typename: 'JournalEntryPosting';
  account: Scalars['String']['output'];
  amount: Maybe<Scalars['String']['output']>;
  cost: Maybe<Scalars['String']['output']>;
  flag: Maybe<Scalars['String']['output']>;
  meta: Maybe<PostingMeta>;
  price: Maybe<Scalars['String']['output']>;
  units: Maybe<PostingUnits>;
};

export type JournalQueryInput = {
  account?: InputMaybe<Scalars['String']['input']>;
  customSubtypes?: InputMaybe<Array<Scalars['String']['input']>>;
  directiveTypes?: InputMaybe<Array<Scalars['String']['input']>>;
  documentSubtypes?: InputMaybe<Array<Scalars['String']['input']>>;
  filter?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Float']['input']>;
  offset?: InputMaybe<Scalars['Float']['input']>;
  time?: InputMaybe<Scalars['String']['input']>;
  transactionSubtypes?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type JournalResponse = {
  __typename: 'JournalResponse';
  data: Array<Scalars['JSONObject']['output']>;
  is_empty: Scalars['Boolean']['output'];
  total: Scalars['Float']['output'];
};

export type LabeledChartItem = {
  __typename: 'LabeledChartItem';
  data: Array<ChartItemV2>;
  label: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type LabeledHierarchyItem = {
  __typename: 'LabeledHierarchyItem';
  data: AccountBalance;
  label: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type Ledger = {
  __typename: 'Ledger';
  /** Get the filter options (attributes) of a ledger */
  attributes: LedgerAttributes;
  /** Get the beancount.io-specific options of a ledger */
  bcioOptions: BcioOptions;
  createdAt: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  empty: Scalars['Boolean']['output'];
  /** Get the fava options of a ledger */
  favaOptions: FavaOptions;
  fullName: Scalars['String']['output'];
  httpUrl: Scalars['String']['output'];
  id: Scalars['String']['output'];
  isStarred: Maybe<Scalars['Boolean']['output']>;
  name: Scalars['String']['output'];
  /** Get the beancount options of a ledger */
  options: LedgerOptions;
  permissions: Maybe<Permission>;
  private: Scalars['Boolean']['output'];
  size: Scalars['Float']['output'];
  sshUrl: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type LedgerAccountItem = {
  __typename: 'LedgerAccountItem';
  account: Scalars['String']['output'];
  balance: Maybe<Scalars['JSONObject']['output']>;
  closeEntryHash: Maybe<Scalars['String']['output']>;
  closedAt: Maybe<Scalars['String']['output']>;
  entryCount: Scalars['Float']['output'];
  entryHash: Scalars['String']['output'];
  openedAt: Scalars['String']['output'];
};

export type LedgerAmountInput = {
  currency: Scalars['String']['input'];
  number: Scalars['String']['input'];
};

export type LedgerAssetDownloadUrlResult = {
  __typename: 'LedgerAssetDownloadUrlResult';
  downloadUrl: Scalars['String']['output'];
};

export type LedgerAttributes = {
  __typename: 'LedgerAttributes';
  accounts: Array<Scalars['String']['output']>;
  currencies: Array<Scalars['String']['output']>;
  links: Array<Scalars['String']['output']>;
  payees: Array<Scalars['String']['output']>;
  tags: Array<Scalars['String']['output']>;
  years: Array<Scalars['String']['output']>;
};

export type LedgerBalanceInput = {
  account: Scalars['String']['input'];
  amount: LedgerAmountInput;
  date: Scalars['String']['input'];
};

export type LedgerBudgetInput = {
  account: Scalars['String']['input'];
  amount: LedgerAmountInput;
  date: Scalars['String']['input'];
  interval: BudgetInterval;
};

export type LedgerCloseInput = {
  account: Scalars['String']['input'];
  date: Scalars['String']['input'];
};

export type LedgerCollaborator = {
  __typename: 'LedgerCollaborator';
  permission: Maybe<Scalars['String']['output']>;
  roleName: Maybe<Scalars['String']['output']>;
  user: Maybe<User>;
};

export type LedgerCommit = {
  __typename: 'LedgerCommit';
  author: Maybe<LedgerCommitUser>;
  committer: Maybe<LedgerCommitUser>;
  created: Maybe<Scalars['String']['output']>;
  message: Maybe<Scalars['String']['output']>;
  sha: Scalars['String']['output'];
};

export type LedgerCommitUser = {
  __typename: 'LedgerCommitUser';
  email: Maybe<Scalars['String']['output']>;
  fullName: Maybe<Scalars['String']['output']>;
  login: Maybe<Scalars['String']['output']>;
};

export type LedgerCommodityInput = {
  currency: Scalars['String']['input'];
  date: Scalars['String']['input'];
};

export type LedgerDocumentInput = {
  account: Scalars['String']['input'];
  date: Scalars['String']['input'];
  filename: Scalars['String']['input'];
  links?: InputMaybe<Array<Scalars['String']['input']>>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** Discriminator selecting which entry payload to add */
export enum LedgerEntryType {
  Balance = 'BALANCE',
  Budget = 'BUDGET',
  Close = 'CLOSE',
  Commodity = 'COMMODITY',
  Document = 'DOCUMENT',
  Event = 'EVENT',
  Note = 'NOTE',
  Open = 'OPEN',
  Price = 'PRICE',
  Transaction = 'TRANSACTION'
}

export type LedgerEventInput = {
  date: Scalars['String']['input'];
  description: Scalars['String']['input'];
  type: Scalars['String']['input'];
};

export type LedgerFileContent = {
  __typename: 'LedgerFileContent';
  content: Maybe<Scalars['String']['output']>;
  encoding: Maybe<Scalars['String']['output']>;
  lastAuthorDate: Maybe<Scalars['String']['output']>;
  lastCommitSha: Maybe<Scalars['String']['output']>;
  lastCommitterDate: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  path: Scalars['String']['output'];
  sha: Scalars['String']['output'];
  size: Scalars['Float']['output'];
  type: Scalars['String']['output'];
};

export type LedgerMeta = {
  __typename: 'LedgerMeta';
  accounts: Array<Scalars['String']['output']>;
  currencies: Array<Scalars['String']['output']>;
  errors: Scalars['Float']['output'];
  options: Options;
};

export type LedgerMetaResponse = {
  __typename: 'LedgerMetaResponse';
  data: LedgerMeta;
  success: Scalars['Boolean']['output'];
};

export type LedgerNoteInput = {
  account: Scalars['String']['input'];
  content: Scalars['String']['input'];
  date: Scalars['String']['input'];
};

export type LedgerOpenInput = {
  account: Scalars['String']['input'];
  currencies: Array<Scalars['String']['input']>;
  date: Scalars['String']['input'];
};

export type LedgerOptions = {
  __typename: 'LedgerOptions';
  accountCurrentConversions: Scalars['String']['output'];
  accountCurrentEarnings: Scalars['String']['output'];
  nameAssets: Scalars['String']['output'];
  nameEquity: Scalars['String']['output'];
  nameExpenses: Scalars['String']['output'];
  nameIncome: Scalars['String']['output'];
  nameLiabilities: Scalars['String']['output'];
  operatingCurrency: Array<Scalars['String']['output']>;
  renderCommas: Scalars['Boolean']['output'];
  title: Scalars['String']['output'];
};

export type LedgerOverview = {
  __typename: 'LedgerOverview';
  assetsData: Array<DateAndBalance>;
  assetsHierarchyData: SerializableTreeNode;
  expensesData: Array<DateAndBalance>;
  expensesHierarchyData: SerializableTreeNode;
  expensesIntervalData: Array<DateAndBalanceWithAccountBalance>;
  incomeData: Array<DateAndBalance>;
  incomeHierarchyData: SerializableTreeNode;
  incomeIntervalData: Array<DateAndBalanceWithAccountBalance>;
  liabilitiesData: Array<DateAndBalance>;
  liabilitiesHierarchyData: SerializableTreeNode;
  netWorthData: Array<DateAndBalance>;
};

export type LedgerPostingInput = {
  account: Scalars['String']['input'];
  flag?: InputMaybe<Scalars['String']['input']>;
  price?: InputMaybe<LedgerAmountInput>;
  units: LedgerAmountInput;
};

export type LedgerPriceInput = {
  amount: LedgerAmountInput;
  currency: Scalars['String']['input'];
  date: Scalars['String']['input'];
};

/** Template used to populate a newly created ledger */
export enum LedgerTemplate {
  Sample = 'SAMPLE',
  Starter = 'STARTER'
}

export type LedgerTransactionInput = {
  date: Scalars['String']['input'];
  flag: Scalars['String']['input'];
  links?: InputMaybe<Array<Scalars['String']['input']>>;
  narration?: InputMaybe<Scalars['String']['input']>;
  payee?: InputMaybe<Scalars['String']['input']>;
  postings: Array<LedgerPostingInput>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type LogoutResponse = {
  __typename: 'LogoutResponse';
  success: Scalars['Boolean']['output'];
};

export type Mutation = {
  __typename: 'Mutation';
  addEntries: AddEntryResponse;
  addOrUpdateLedgerCollaborator: AddCollaboratorResponse;
  approvePullRequest: PullRequestResult;
  /** Add one or more entries to a specific ledger (atomic) */
  bulkEntries: AddLedgerEntryResponse;
  cancelSubscription: SubscriptionActionResult;
  /** Authorize a pending CLI session. Issues a JWT token for the CLI and stores it in the session. */
  confirmCliAuthSession: ConfirmCliAuthSessionResponse;
  /** Retrieve and consume the token from an authorized CLI auth session. Single-use: clears the token from the session after returning it. Only the CLI should call this. */
  consumeCliAuthSession: ConsumeCliAuthSessionResponse;
  /** Initiate a CLI authentication session. Returns a sessionId the CLI uses to poll for completion. */
  createCliAuthSession: CreateCliAuthSessionResponse;
  /** Create a new ledger for the current user */
  createLedger: Ledger;
  /** Create a new file in a specific ledger */
  createLedgerFile: LedgerFileContent;
  createOneTimeToken: CreateOneTimeTokenResponse;
  /** Create a Plaid Link token for connecting bank accounts */
  createPlaidLinkToken: PlaidLinkToken;
  /** Create a Plaid Link token in update mode for reauthentication */
  createPlaidUpdateModeLinkToken: PlaidLinkToken;
  /** Create a new public key for the current user */
  createPublicKey: PublicKey;
  createPullRequestFromPatch: PullRequestResult;
  createStripePortalSession: SubscriptionSessionResult;
  createSubscriptionSession: SubscriptionSessionResult;
  /** delete user account and its associated data */
  deleteAccount: Scalars['Boolean']['output'];
  /** Delete a specific ledger */
  deleteLedger: DeleteLedgerResponse;
  deleteLedgerCollaborator: DeleteCollaboratorResponse;
  /** Delete a source slice for a specific journal entry */
  deleteLedgerEntrySourceSlice: DeleteSourceSliceResponse;
  /** Delete a file from a specific ledger */
  deleteLedgerFile: DeleteLedgerFileResponse;
  /** Delete multiple source slices for journal entries in a single operation */
  deleteMultipleLedgerEntrySourceSlices: DeleteMultiSourceSlicesResponse;
  /** Delete pending (unsynced) Plaid transactions from the review list */
  deletePlaidTransactions: PlaidDeleteResult;
  /** Delete a specific public key by ID */
  deletePublicKey: DeletePublicKeyResponse;
  /** Deny a pending CLI authentication session. */
  denyCliAuthSession: DenyCliAuthSessionResponse;
  /** Exchange Plaid public token for access token and store Item */
  exchangePlaidPublicToken: PlaidItemType;
  /** Follow a user */
  followUser: FollowUserResponse;
  generateTempAssetUploadUrl: TempAssetUploadUrl;
  /** Upload a receipt and insert a transaction entry. Storage strategy (S3 or git) is controlled by the `receipt_storage` beancountio-option. */
  insertReceiptTransaction: InsertReceiptResult;
  leaveLedger: DeleteCollaboratorResponse;
  /** Logout user, revoke JWT token and clear httpOnly cookie */
  logout: LogoutResponse;
  /** Parse an uploaded file (multimodal support for PDF/images/any format) into structured transactions. File must be uploaded to S3 first. */
  parseFile: FileParseResult;
  /** Parse a receipt image or PDF and return a single summarized transaction with account recommendations. File must be uploaded to S3 first. */
  parseReceipt: ReceiptParseResult;
  /** Re-read the accounts Plaid shares for an Item and reconcile them against stored accounts. Call this after an update-mode Link session with Account Select. */
  reconcilePlaidAccounts: PlaidAccountReconcileResult;
  /** Refresh Plaid Item status from Plaid API (useful after reauthentication) */
  refreshPlaidItemStatus: PlaidItemType;
  /** Refresh authentication token - issues a new token and revokes the current one */
  refreshToken: TokenAuthResponse;
  rejectPullRequest: PullRequestResult;
  /** Rename a file in a specific ledger */
  renameLedgerFile: RenameLedgerFileResponse;
  /** Reset user password using a token from the password reset email */
  resetPassword: ResetPasswordResponse;
  resumeSubscription: SubscriptionActionResult;
  /** Send a password reset link to the user's email */
  sendForgotPasswordLink: SendForgotPasswordLinkResponse;
  signIn: TokenAuthResponse;
  signInWithOneTimeToken: TokenAuthResponse;
  /** Start signup by creating an OTP session. Sends a verification code to the user's email. */
  signUp: SignUpResponse;
  /** Star a specific ledger */
  starLedger: StarLedgerResponse;
  /** Submit Plaid transactions with user-reviewed target accounts to ledger */
  submitPlaidTransactionsToLedger: PlaidSubmitResult;
  /** Manually sync transactions for a specific Plaid Item */
  syncPlaidTransactions: PlaidSyncResult;
  /** Unfollow a user */
  unfollowUser: FollowUserResponse;
  /** Unlink a Plaid Item (remove from Plaid and delete from database) */
  unlinkPlaidItem: Scalars['Boolean']['output'];
  /** Unstar a specific ledger */
  unstarLedger: StarLedgerResponse;
  /** Update a specific ledger */
  updateLedger: Ledger;
  /** Update a source slice for a specific journal entry */
  updateLedgerEntrySourceSlice: UpdateSourceSliceResponse;
  /** Update an existing file in a specific ledger */
  updateLedgerFile: LedgerFileContent;
  /** Update the currency used for a Plaid account's transactions */
  updatePlaidAccountCurrency: Scalars['Boolean']['output'];
  /** Update the ledger account mapping for a Plaid account */
  updatePlaidAccountMapping: Scalars['Boolean']['output'];
  /** Update user profile (firstName and lastName) */
  updateProfile: UserProfileResponse;
  updateUsername: UserProfileResponse;
  upgradeSubscription: UpgradeSubscriptionResult;
  /** Verify OTP and create user account to complete signup */
  verifySignUpOtp: TokenAuthResponse;
};


export type MutationAddEntriesArgs = {
  entriesInput: Array<EntryInput>;
  ledgerId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationAddOrUpdateLedgerCollaboratorArgs = {
  collaborator: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
  permission?: InputMaybe<Scalars['String']['input']>;
};


export type MutationApprovePullRequestArgs = {
  ledgerName: Scalars['String']['input'];
  ledgerOwner: Scalars['String']['input'];
  prNumber: Scalars['Int']['input'];
};


export type MutationBulkEntriesArgs = {
  entries: Array<AddEntryInput>;
  ledgerId: Scalars['String']['input'];
};


export type MutationCancelSubscriptionArgs = {
  clientId: Scalars['String']['input'];
  subscriptionId: Scalars['String']['input'];
};


export type MutationConfirmCliAuthSessionArgs = {
  sessionId: Scalars['String']['input'];
};


export type MutationConsumeCliAuthSessionArgs = {
  sessionId: Scalars['String']['input'];
};


export type MutationCreateLedgerArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  private?: InputMaybe<Scalars['Boolean']['input']>;
  template?: InputMaybe<LedgerTemplate>;
};


export type MutationCreateLedgerFileArgs = {
  content: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  path: Scalars['String']['input'];
};


export type MutationCreatePlaidLinkTokenArgs = {
  ledgerId: Scalars['String']['input'];
};


export type MutationCreatePlaidUpdateModeLinkTokenArgs = {
  accountSelection?: InputMaybe<Scalars['Boolean']['input']>;
  itemId: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
};


export type MutationCreatePublicKeyArgs = {
  key: Scalars['String']['input'];
  readOnly?: InputMaybe<Scalars['Boolean']['input']>;
  title: Scalars['String']['input'];
};


export type MutationCreatePullRequestFromPatchArgs = {
  input: CreatePrFromPatchInput;
};


export type MutationCreateStripePortalSessionArgs = {
  clientId: Scalars['String']['input'];
};


export type MutationCreateSubscriptionSessionArgs = {
  clientId: Scalars['String']['input'];
  priceId: Scalars['String']['input'];
};


export type MutationDeleteLedgerArgs = {
  ledgerId: Scalars['String']['input'];
};


export type MutationDeleteLedgerCollaboratorArgs = {
  collaborator: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
};


export type MutationDeleteLedgerEntrySourceSliceArgs = {
  input: DeleteSourceSliceInput;
  ledgerId: Scalars['String']['input'];
};


export type MutationDeleteLedgerFileArgs = {
  ledgerId: Scalars['String']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  path: Scalars['String']['input'];
  sha: Scalars['String']['input'];
};


export type MutationDeleteMultipleLedgerEntrySourceSlicesArgs = {
  input: DeleteMultiSourceSlicesInput;
  ledgerId: Scalars['String']['input'];
};


export type MutationDeletePlaidTransactionsArgs = {
  ledgerId: Scalars['String']['input'];
  transactionIds: Array<Scalars['String']['input']>;
};


export type MutationDeletePublicKeyArgs = {
  keyId: Scalars['Float']['input'];
};


export type MutationDenyCliAuthSessionArgs = {
  sessionId: Scalars['String']['input'];
};


export type MutationExchangePlaidPublicTokenArgs = {
  ledgerId: Scalars['String']['input'];
  publicToken: Scalars['String']['input'];
};


export type MutationFollowUserArgs = {
  username: Scalars['String']['input'];
};


export type MutationGenerateTempAssetUploadUrlArgs = {
  filename?: InputMaybe<Scalars['String']['input']>;
  mimeType?: InputMaybe<Scalars['String']['input']>;
};


export type MutationInsertReceiptTransactionArgs = {
  input: InsertReceiptTransactionInput;
  ledgerId: Scalars['String']['input'];
  receiptObjectKey: Scalars['String']['input'];
};


export type MutationLeaveLedgerArgs = {
  ledgerId: Scalars['String']['input'];
};


export type MutationParseFileArgs = {
  fileFormat: Scalars['String']['input'];
  s3ObjectKey: Scalars['String']['input'];
};


export type MutationParseReceiptArgs = {
  ledgerId: Scalars['String']['input'];
  s3ObjectKey: Scalars['String']['input'];
};


export type MutationReconcilePlaidAccountsArgs = {
  itemId: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
};


export type MutationRefreshPlaidItemStatusArgs = {
  itemId: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
};


export type MutationRejectPullRequestArgs = {
  ledgerName: Scalars['String']['input'];
  ledgerOwner: Scalars['String']['input'];
  prNumber: Scalars['Int']['input'];
};


export type MutationRenameLedgerFileArgs = {
  ledgerId: Scalars['String']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  newPath: Scalars['String']['input'];
  oldPath: Scalars['String']['input'];
};


export type MutationResetPasswordArgs = {
  newPassword: Scalars['String']['input'];
  token: Scalars['String']['input'];
};


export type MutationResumeSubscriptionArgs = {
  clientId: Scalars['String']['input'];
  subscriptionId: Scalars['String']['input'];
};


export type MutationSendForgotPasswordLinkArgs = {
  email: Scalars['String']['input'];
};


export type MutationSignInArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationSignInWithOneTimeTokenArgs = {
  token: Scalars['String']['input'];
};


export type MutationSignUpArgs = {
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  inviteBy?: InputMaybe<Scalars['String']['input']>;
  inviteSrc?: InputMaybe<Scalars['String']['input']>;
  lastName: Scalars['String']['input'];
  password: Scalars['String']['input'];
  username?: InputMaybe<Scalars['String']['input']>;
  withDefaultLedger?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationStarLedgerArgs = {
  ledgerId: Scalars['String']['input'];
};


export type MutationSubmitPlaidTransactionsToLedgerArgs = {
  filename?: InputMaybe<Scalars['String']['input']>;
  ledgerId: Scalars['String']['input'];
  transactions: Array<PlaidTransactionSubmitInput>;
};


export type MutationSyncPlaidTransactionsArgs = {
  itemId: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
};


export type MutationUnfollowUserArgs = {
  username: Scalars['String']['input'];
};


export type MutationUnlinkPlaidItemArgs = {
  itemId: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
};


export type MutationUnstarLedgerArgs = {
  ledgerId: Scalars['String']['input'];
};


export type MutationUpdateLedgerArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  ledgerId: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  private?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationUpdateLedgerEntrySourceSliceArgs = {
  input: UpdateSourceSliceInput;
  ledgerId: Scalars['String']['input'];
};


export type MutationUpdateLedgerFileArgs = {
  content: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  path: Scalars['String']['input'];
  sha: Scalars['String']['input'];
};


export type MutationUpdatePlaidAccountCurrencyArgs = {
  accountId: Scalars['String']['input'];
  currency: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
};


export type MutationUpdatePlaidAccountMappingArgs = {
  accountId: Scalars['String']['input'];
  ledgerAccount: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
};


export type MutationUpdateProfileArgs = {
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateUsernameArgs = {
  username: Scalars['String']['input'];
};


export type MutationUpgradeSubscriptionArgs = {
  clientId: Scalars['String']['input'];
  priceId: Scalars['String']['input'];
};


export type MutationVerifySignUpOtpArgs = {
  otp: Scalars['String']['input'];
  sessionId: Scalars['String']['input'];
};

export type Options = {
  __typename: 'Options';
  name_assets: Scalars['String']['output'];
  name_equity: Scalars['String']['output'];
  name_expenses: Scalars['String']['output'];
  name_income: Scalars['String']['output'];
  name_liabilities: Scalars['String']['output'];
  operating_currency: Array<Scalars['String']['output']>;
};

export type PrFileChange = {
  __typename: 'PRFileChange';
  additions: Scalars['Int']['output'];
  changes: Scalars['Int']['output'];
  deletions: Scalars['Int']['output'];
  filename: Scalars['String']['output'];
};

export type PageInfo = {
  __typename: 'PageInfo';
  /** Cursor for the end of the current page */
  endCursor: Maybe<Scalars['String']['output']>;
  /** Whether there are more entries after the current page */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether there are more entries before the current page */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** Cursor for the start of the current page */
  startCursor: Maybe<Scalars['String']['output']>;
  /** Total number of entries available */
  totalCount: Maybe<Scalars['Int']['output']>;
};

export type ParsedRow = {
  __typename: 'ParsedRow';
  amount: Scalars['Float']['output'];
  date: Scalars['String']['output'];
  description: Scalars['String']['output'];
  payee: Scalars['String']['output'];
};

export type Permission = {
  __typename: 'Permission';
  admin: Scalars['Boolean']['output'];
  pull: Scalars['Boolean']['output'];
  push: Scalars['Boolean']['output'];
};

export type PlaidAccountMappingSuggestion = {
  __typename: 'PlaidAccountMappingSuggestion';
  accountId: Scalars['String']['output'];
  confidence: Scalars['Float']['output'];
  reasoning: Maybe<Scalars['String']['output']>;
  suggestedAccount: Scalars['String']['output'];
};

export type PlaidAccountReconcileResult = {
  __typename: 'PlaidAccountReconcileResult';
  /** Accounts Plaid now shares that we had not stored yet */
  addedCount: Scalars['Float']['output'];
  /** Stored accounts Plaid no longer shares; these were deleted along with their transactions */
  removedCount: Scalars['Float']['output'];
  success: Scalars['Boolean']['output'];
};

export type PlaidAccountType = {
  __typename: 'PlaidAccountType';
  accountId: Scalars['String']['output'];
  accountName: Scalars['String']['output'];
  accountSubtype: Maybe<Scalars['String']['output']>;
  accountType: Scalars['String']['output'];
  createdAt: Scalars['DateTimeISO']['output'];
  /** Currency used when writing this account's transactions to the ledger */
  currency: Scalars['String']['output'];
  enabled: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  ledgerAccount: Maybe<Scalars['String']['output']>;
  mask: Maybe<Scalars['String']['output']>;
  plaidItemId: Scalars['String']['output'];
  updatedAt: Scalars['DateTimeISO']['output'];
};

export type PlaidAccountWithInstitutionType = {
  __typename: 'PlaidAccountWithInstitutionType';
  accountId: Scalars['String']['output'];
  accountName: Scalars['String']['output'];
  accountSubtype: Maybe<Scalars['String']['output']>;
  accountType: Scalars['String']['output'];
  createdAt: Scalars['DateTimeISO']['output'];
  /** Currency used when writing this account's transactions to the ledger */
  currency: Scalars['String']['output'];
  enabled: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  /** Name of the institution this account belongs to */
  institutionName: Scalars['String']['output'];
  ledgerAccount: Maybe<Scalars['String']['output']>;
  mask: Maybe<Scalars['String']['output']>;
  plaidItemId: Scalars['String']['output'];
  updatedAt: Scalars['DateTimeISO']['output'];
};

export type PlaidDeleteResult = {
  __typename: 'PlaidDeleteResult';
  deletedCount: Scalars['Float']['output'];
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type PlaidItemType = {
  __typename: 'PlaidItemType';
  createdAt: Scalars['DateTimeISO']['output'];
  errorCode: Maybe<Scalars['String']['output']>;
  errorMessage: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  institutionId: Scalars['String']['output'];
  institutionName: Scalars['String']['output'];
  itemId: Scalars['String']['output'];
  lastSync: Maybe<PlaidLastSync>;
  status: Scalars['String']['output'];
  updatedAt: Scalars['DateTimeISO']['output'];
};

export type PlaidLastSync = {
  __typename: 'PlaidLastSync';
  errorMessage: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  timestamp: Scalars['DateTimeISO']['output'];
  transactionsAdded: Maybe<Scalars['Float']['output']>;
};

export type PlaidLinkToken = {
  __typename: 'PlaidLinkToken';
  linkToken: Scalars['String']['output'];
};

export type PlaidSubmitResult = {
  __typename: 'PlaidSubmitResult';
  addedCount: Scalars['Float']['output'];
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type PlaidSyncResult = {
  __typename: 'PlaidSyncResult';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  transactionsAdded: Scalars['Float']['output'];
  transactionsFetched: Scalars['Float']['output'];
  transactionsModified: Scalars['Float']['output'];
  transactionsRemoved: Scalars['Float']['output'];
};

export type PlaidTransactionSubmitInput = {
  /** Overrides the source account normally derived from the Plaid account's mapping */
  sourceAccount?: InputMaybe<Scalars['String']['input']>;
  targetAccount: Scalars['String']['input'];
  transactionId: Scalars['String']['input'];
};

export type PlaidTransactionType = {
  __typename: 'PlaidTransactionType';
  /** Name of the source Plaid account this transaction belongs to */
  accountName: Scalars['String']['output'];
  amount: Scalars['String']['output'];
  category: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTimeISO']['output'];
  date: Scalars['DateTimeISO']['output'];
  id: Scalars['String']['output'];
  /** Name of the institution this transaction was synced from */
  institutionName: Scalars['String']['output'];
  isPending: Scalars['Boolean']['output'];
  /** Beancount account the source Plaid account is mapped to */
  ledgerAccount: Maybe<Scalars['String']['output']>;
  merchantName: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  plaidAccountId: Scalars['String']['output'];
  syncedToLedger: Scalars['Boolean']['output'];
  transactionId: Scalars['String']['output'];
};

export type PlaintextJournalQueryInput = {
  account?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  time?: InputMaybe<Scalars['String']['input']>;
};

export type PlaintextJournalResponse = {
  __typename: 'PlaintextJournalResponse';
  content: Scalars['String']['output'];
};

export type Posting = {
  __typename: 'Posting';
  account: Scalars['String']['output'];
  amount: Scalars['String']['output'];
  commodity: Scalars['String']['output'];
  price: Maybe<Scalars['String']['output']>;
};

export type PostingInput = {
  account: Scalars['String']['input'];
  amount: Scalars['String']['input'];
};

export type PostingMeta = {
  __typename: 'PostingMeta';
  filename: Scalars['String']['output'];
  lineno: Scalars['Float']['output'];
};

export type PostingUnits = {
  __typename: 'PostingUnits';
  currency: Maybe<Scalars['String']['output']>;
  number: Maybe<Scalars['Float']['output']>;
};

export type PricePoint = {
  __typename: 'PricePoint';
  date: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type PublicKey = {
  __typename: 'PublicKey';
  createdAt: Scalars['String']['output'];
  fingerprint: Scalars['String']['output'];
  id: Scalars['Float']['output'];
  key: Scalars['String']['output'];
  lastUsedAt: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

export type PublicUserProfileResponse = {
  __typename: 'PublicUserProfileResponse';
  activities: Array<UserActivityFeedItem>;
  /** Only present if user is authenticated */
  isFollowing: Maybe<Scalars['Boolean']['output']>;
  profile: UserProfile;
  repositories: Array<UserRepository>;
};

export type PullRequestDetails = {
  __typename: 'PullRequestDetails';
  author: Scalars['String']['output'];
  baseBranch: Scalars['String']['output'];
  description: Scalars['String']['output'];
  diff: Maybe<Scalars['String']['output']>;
  files: Array<PrFileChange>;
  headBranch: Scalars['String']['output'];
  number: Scalars['Int']['output'];
  state: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type PullRequestResult = {
  __typename: 'PullRequestResult';
  message: Maybe<Scalars['String']['output']>;
  prNumber: Maybe<Scalars['Int']['output']>;
  prUrl: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type Query = {
  __typename: 'Query';
  accountHierarchy: AccountHierarchyResponse;
  /** Get AI CFO usage for the current billing month */
  aiCfoUsage: AiCfoUsageResponse;
  /** Returns quota limits for all subscription tiers */
  allTierQuotas: Array<TierQuotaItem>;
  featureFlags: Scalars['JSONObject']['output'];
  /** Generate a presigned download URL for a previously uploaded temporary asset. Use this to obtain a short-lived GET URL for an objectKey returned by generateTempAssetUploadUrl. */
  generateTempAssetDownloadUrl: TempAssetDownloadUrl;
  /** Poll the status of a CLI authentication session. When AUTHORIZED, returns the token stored in the session. */
  getCliAuthSession: GetCliAuthSessionResponse;
  getCommitDetails: CommitDetails;
  getFeed: FeedResponse;
  getLatestLedgerCommit: Maybe<LedgerCommit>;
  /** Get a specific ledger */
  getLedger: Ledger;
  /** Get all accounts with their open/close dates for a specific ledger */
  getLedgerAccountDirectives: Array<LedgerAccountItem>;
  /** Get account journal with change and balance information */
  getLedgerAccountJournal: AccountJournalResponse;
  /** Get the last entries of assets and liabilities accounts */
  getLedgerAccountLastEntries: Array<AccountLastEntry>;
  /** Get the report of a specific account */
  getLedgerAccountReport: AccountReport;
  /** Get the accounts of a specific ledger. Optional status filter: 'open' (no closeDate) or 'closed' (has closeDate). Returns all accounts when omitted. */
  getLedgerAccounts: Array<Scalars['String']['output']>;
  /** Get a downloadable URL for a ledger Git archive (gitea-main.zip). Public ledgers require no auth; private ledgers require a valid session. */
  getLedgerArchiveDownloadUrl: LedgerAssetDownloadUrlResult;
  /** Get a presigned S3 download URL for a ledger asset. Validates ledger access — public ledgers require no auth; private ledgers require a valid session. */
  getLedgerAssetDownloadUrl: LedgerAssetDownloadUrlResult;
  /** Get the filter options of a specific ledger */
  getLedgerAttributes: LedgerAttributes;
  /** Get the balance sheet of a specific ledger */
  getLedgerBalanceSheet: BalanceSheetData;
  getLedgerCollaboratorPermission: LedgerCollaborator;
  /** Get the commodities of a specific ledger */
  getLedgerCommodities: Array<CommodityPairWithPrices>;
  /** Get the currencies of a specific ledger */
  getLedgerCurrencies: Array<Scalars['String']['output']>;
  /** Get the content of a specific ledger directory */
  getLedgerDirContent: Array<LedgerFileContent>;
  /** Get documents from a specific ledger with optional filtering */
  getLedgerDocuments: Array<Document>;
  /** Get the count of entries per type */
  getLedgerEntriesCountPerType: Array<EntriesByType>;
  /** Get context for a specific journal entry */
  getLedgerEntryContext: EntryContext;
  /** Get all errors from the ledger */
  getLedgerErrors: Array<BeancountError>;
  /** Export events from a specific ledger with optional filtering */
  getLedgerEvents: Array<Event>;
  /** Get the content of a specific ledger file */
  getLedgerFile: Maybe<LedgerFileContent>;
  /** Get the income statement of a specific ledger */
  getLedgerIncomeStatement: IncomeStatementData;
  /** Get interval totals for a specific account */
  getLedgerIntervalTotals: Array<IntervalTotalItem>;
  /** Get journal entries for a specific ledger */
  getLedgerJournal: JournalResponse;
  /** Get the links of a specific ledger */
  getLedgerLinks: Array<Scalars['String']['output']>;
  /** Get the transactions for a narration */
  getLedgerNarrationTransactions: Transaction;
  getLedgerNarrations: Array<Scalars['String']['output']>;
  /** Get the overview of a specific ledger */
  getLedgerOverview: LedgerOverview;
  /** Get the accounts for a payee */
  getLedgerPayeeAccounts: Array<Scalars['String']['output']>;
  /** Get the transactions for a payee */
  getLedgerPayeeTransactions: Transaction;
  /** Get the payees of a specific ledger */
  getLedgerPayees: Array<Scalars['String']['output']>;
  /** Get plaintext journal in beancount format */
  getLedgerPlaintextJournal: PlaintextJournalResponse;
  /** Get the Beancount source files of a ledger (main.bean plus every file it includes) */
  getLedgerSourceFiles: Array<Scalars['String']['output']>;
  /** Get the tags of a specific ledger */
  getLedgerTags: Array<Scalars['String']['output']>;
  /** Get the trial balance of a specific ledger */
  getLedgerTrialBalance: TrialBalanceData;
  /** Get the years of a specific ledger */
  getLedgerYears: Array<Scalars['String']['output']>;
  /** Get all accounts for a specific Plaid Item */
  getPlaidAccounts: Array<PlaidAccountType>;
  /** Get every Plaid account in a ledger together with its owning institution. Powers ledger-wide account pickers. */
  getPlaidAccountsForLedger: Array<PlaidAccountWithInstitutionType>;
  /** Get a single Plaid Item by ID */
  getPlaidItem: PlaidItemType;
  /** Get Plaid Items for the current user, scoped to a ledger. */
  getPlaidItems: Array<PlaidItemType>;
  /** Get a specific public key by ID */
  getPublicKey: Maybe<PublicKey>;
  getPullRequestDetails: PullRequestDetails;
  /** Get unsynced transactions for a Plaid account, or for the whole ledger when accountId is omitted */
  getUnsyncedPlaidTransactions: Array<PlaidTransactionType>;
  getUserByExactMatch: Array<SearchUser>;
  /** Get user's followers */
  getUserFollowers: UserListResponse;
  /** Get users that this user is following */
  getUserFollowing: UserListResponse;
  /** Get user profile by username */
  getUserProfile: PublicUserProfileResponse;
  /** Get user's starred repositories */
  getUserStarredRepos: RepositoryListResponse;
  /** is the server healthy? */
  health: Scalars['String']['output'];
  homeCharts: HomeChartsResponse;
  /** Get journal entries with enhanced search, filtering, and pagination */
  journalEntries: JournalEntriesResponse;
  /** Get a specific ledger */
  ledgerMeta: LedgerMetaResponse;
  listCommits: Array<CommitListItem>;
  listLedgerCollaborators: Array<CollaboratorUser>;
  /** List all ledgers for the current user */
  listLedgers: Array<Ledger>;
  /** List all public keys for the current user */
  listPublicKeys: Array<PublicKey>;
  /** List all user owned ledgers for the current user */
  listUserOwnedLedgers: Array<Ledger>;
  /** Execute a shell query on a ledger */
  queryShell: Maybe<QueryResult>;
  /** Execute a shell query on a ledger and return plain text output */
  queryShellText: Maybe<QueryShellTextResult>;
  /** Search for ledgers/repositories */
  searchLedgers: Array<Ledger>;
  subscriptionStatus: CustomerSubscriptionStatus;
  /** Suggest Beancount account mappings for a Plaid Item's unmapped accounts using AI */
  suggestPlaidAccountMapping: Array<PlaidAccountMappingSuggestion>;
  /** Suggest target accounts for unsynced Plaid transactions using AI, for one account or the whole ledger when accountId is omitted */
  suggestPlaidTransactionCategories: Array<CategorySuggestion>;
  /** Suggest transaction categories based on payee, description, and transaction history */
  suggestTransactionCategories: Array<CategorySuggestion>;
  /** get the user */
  userProfile: Maybe<UserProfileResponse>;
  /** Validate whether an email token is valid and not expired */
  validateEmailToken: ValidateEmailTokenResponse;
};


export type QueryAccountHierarchyArgs = {
  ledgerId?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['String']['input'];
};


export type QueryFeatureFlagsArgs = {
  userId: Scalars['String']['input'];
};


export type QueryGenerateTempAssetDownloadUrlArgs = {
  objectKey: Scalars['String']['input'];
};


export type QueryGetCliAuthSessionArgs = {
  sessionId: Scalars['String']['input'];
};


export type QueryGetCommitDetailsArgs = {
  ledgerId: Scalars['String']['input'];
  sha: Scalars['String']['input'];
};


export type QueryGetFeedArgs = {
  limit?: Scalars['Float']['input'];
  locale?: InputMaybe<Scalars['String']['input']>;
  offset?: Scalars['Float']['input'];
  source?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetLatestLedgerCommitArgs = {
  branchName?: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
};


export type QueryGetLedgerArgs = {
  ledgerId: Scalars['String']['input'];
};


export type QueryGetLedgerAccountDirectivesArgs = {
  ledgerId: Scalars['String']['input'];
};


export type QueryGetLedgerAccountJournalArgs = {
  ledgerId: Scalars['String']['input'];
  query: AccountJournalQueryInput;
};


export type QueryGetLedgerAccountLastEntriesArgs = {
  account?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  ledgerId: Scalars['String']['input'];
  time?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetLedgerAccountReportArgs = {
  account?: InputMaybe<Scalars['String']['input']>;
  accountName: Scalars['String']['input'];
  conversion?: Scalars['String']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  interval?: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
  time?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetLedgerAccountsArgs = {
  ledgerId: Scalars['String']['input'];
  status?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetLedgerArchiveDownloadUrlArgs = {
  ledgerId: Scalars['String']['input'];
};


export type QueryGetLedgerAssetDownloadUrlArgs = {
  filename: Scalars['String']['input'];
  ledgerRepoId: Scalars['Int']['input'];
};


export type QueryGetLedgerAttributesArgs = {
  ledgerId: Scalars['String']['input'];
};


export type QueryGetLedgerBalanceSheetArgs = {
  account?: InputMaybe<Scalars['String']['input']>;
  conversion?: Scalars['String']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  interval?: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
  time?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetLedgerCollaboratorPermissionArgs = {
  collaborator: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
};


export type QueryGetLedgerCommoditiesArgs = {
  ledgerId: Scalars['String']['input'];
};


export type QueryGetLedgerCurrenciesArgs = {
  ledgerId: Scalars['String']['input'];
};


export type QueryGetLedgerDirContentArgs = {
  dirPath?: InputMaybe<Scalars['String']['input']>;
  ledgerId: Scalars['String']['input'];
};


export type QueryGetLedgerDocumentsArgs = {
  account?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  ledgerId: Scalars['String']['input'];
  time?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetLedgerEntriesCountPerTypeArgs = {
  account?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  ledgerId: Scalars['String']['input'];
  time?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetLedgerEntryContextArgs = {
  entryHash: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
};


export type QueryGetLedgerErrorsArgs = {
  ledgerId: Scalars['String']['input'];
};


export type QueryGetLedgerEventsArgs = {
  account?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  ledgerId: Scalars['String']['input'];
  time?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetLedgerFileArgs = {
  ledgerId: Scalars['String']['input'];
  path: Scalars['String']['input'];
};


export type QueryGetLedgerIncomeStatementArgs = {
  account?: InputMaybe<Scalars['String']['input']>;
  conversion?: Scalars['String']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  interval?: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
  time?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetLedgerIntervalTotalsArgs = {
  account?: InputMaybe<Scalars['String']['input']>;
  accountName: Scalars['String']['input'];
  conversion?: Scalars['String']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  interval?: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
  time?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetLedgerJournalArgs = {
  ledgerId: Scalars['String']['input'];
  query?: InputMaybe<JournalQueryInput>;
};


export type QueryGetLedgerLinksArgs = {
  ledgerId: Scalars['String']['input'];
};


export type QueryGetLedgerNarrationTransactionsArgs = {
  ledgerId: Scalars['String']['input'];
  narration: Scalars['String']['input'];
};


export type QueryGetLedgerNarrationsArgs = {
  ledgerId: Scalars['String']['input'];
};


export type QueryGetLedgerOverviewArgs = {
  account?: InputMaybe<Scalars['String']['input']>;
  conversion?: Scalars['String']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  interval?: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
  time?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetLedgerPayeeAccountsArgs = {
  ledgerId: Scalars['String']['input'];
  payee: Scalars['String']['input'];
};


export type QueryGetLedgerPayeeTransactionsArgs = {
  ledgerId: Scalars['String']['input'];
  payee: Scalars['String']['input'];
};


export type QueryGetLedgerPayeesArgs = {
  ledgerId: Scalars['String']['input'];
};


export type QueryGetLedgerPlaintextJournalArgs = {
  ledgerId: Scalars['String']['input'];
  query?: InputMaybe<PlaintextJournalQueryInput>;
};


export type QueryGetLedgerSourceFilesArgs = {
  ledgerId: Scalars['String']['input'];
};


export type QueryGetLedgerTagsArgs = {
  ledgerId: Scalars['String']['input'];
};


export type QueryGetLedgerTrialBalanceArgs = {
  account?: InputMaybe<Scalars['String']['input']>;
  conversion?: Scalars['String']['input'];
  filter?: InputMaybe<Scalars['String']['input']>;
  interval?: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
  time?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetLedgerYearsArgs = {
  ledgerId: Scalars['String']['input'];
};


export type QueryGetPlaidAccountsArgs = {
  itemId: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
};


export type QueryGetPlaidAccountsForLedgerArgs = {
  ledgerId: Scalars['String']['input'];
};


export type QueryGetPlaidItemArgs = {
  id: Scalars['String']['input'];
};


export type QueryGetPlaidItemsArgs = {
  ledgerId: Scalars['String']['input'];
};


export type QueryGetPublicKeyArgs = {
  keyId: Scalars['Float']['input'];
};


export type QueryGetPullRequestDetailsArgs = {
  ledgerName: Scalars['String']['input'];
  ledgerOwner: Scalars['String']['input'];
  prNumber: Scalars['Int']['input'];
};


export type QueryGetUnsyncedPlaidTransactionsArgs = {
  accountId?: InputMaybe<Scalars['String']['input']>;
  ledgerId: Scalars['String']['input'];
};


export type QueryGetUserByExactMatchArgs = {
  includeCurrentUser?: InputMaybe<Scalars['String']['input']>;
  keyword: Scalars['String']['input'];
};


export type QueryGetUserFollowersArgs = {
  limit?: InputMaybe<Scalars['Float']['input']>;
  page?: InputMaybe<Scalars['Float']['input']>;
  username: Scalars['String']['input'];
};


export type QueryGetUserFollowingArgs = {
  limit?: InputMaybe<Scalars['Float']['input']>;
  page?: InputMaybe<Scalars['Float']['input']>;
  username: Scalars['String']['input'];
};


export type QueryGetUserProfileArgs = {
  username: Scalars['String']['input'];
};


export type QueryGetUserStarredReposArgs = {
  limit?: InputMaybe<Scalars['Float']['input']>;
  page?: InputMaybe<Scalars['Float']['input']>;
  username: Scalars['String']['input'];
};


export type QueryHomeChartsArgs = {
  ledgerId?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['String']['input'];
};


export type QueryJournalEntriesArgs = {
  accountFilter?: InputMaybe<Scalars['String']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  amountMax?: InputMaybe<Scalars['Float']['input']>;
  amountMin?: InputMaybe<Scalars['Float']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  detailed?: InputMaybe<Scalars['Boolean']['input']>;
  entryTypes?: InputMaybe<Array<Scalars['String']['input']>>;
  first?: InputMaybe<Scalars['Int']['input']>;
  groupBy?: InputMaybe<Scalars['String']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  searchQuery?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<Scalars['String']['input']>;
};


export type QueryLedgerMetaArgs = {
  ledgerId?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['String']['input'];
};


export type QueryListCommitsArgs = {
  branch?: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
  limit?: Scalars['Int']['input'];
  page?: Scalars['Int']['input'];
};


export type QueryListLedgerCollaboratorsArgs = {
  ledgerId: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Float']['input']>;
  page?: InputMaybe<Scalars['Float']['input']>;
};


export type QueryListLedgersArgs = {
  limit?: InputMaybe<Scalars['Float']['input']>;
  page?: InputMaybe<Scalars['Float']['input']>;
};


export type QueryListPublicKeysArgs = {
  limit?: InputMaybe<Scalars['Float']['input']>;
  page?: InputMaybe<Scalars['Float']['input']>;
};


export type QueryListUserOwnedLedgersArgs = {
  limit?: InputMaybe<Scalars['Float']['input']>;
  page?: InputMaybe<Scalars['Float']['input']>;
};


export type QueryQueryShellArgs = {
  ledgerId: Scalars['String']['input'];
  query: Scalars['String']['input'];
};


export type QueryQueryShellTextArgs = {
  ledgerId: Scalars['String']['input'];
  query: Scalars['String']['input'];
};


export type QuerySearchLedgersArgs = {
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  exclusive?: InputMaybe<Scalars['Boolean']['input']>;
  includeDesc?: InputMaybe<Scalars['Boolean']['input']>;
  isPrivate?: InputMaybe<Scalars['Boolean']['input']>;
  limit?: InputMaybe<Scalars['Float']['input']>;
  mode?: InputMaybe<Scalars['String']['input']>;
  order?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Float']['input']>;
  priorityOwnerId?: InputMaybe<Scalars['Float']['input']>;
  private?: InputMaybe<Scalars['Boolean']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Scalars['String']['input']>;
  starredBy?: InputMaybe<Scalars['Float']['input']>;
  teamId?: InputMaybe<Scalars['Float']['input']>;
  template?: InputMaybe<Scalars['Boolean']['input']>;
  topic?: InputMaybe<Scalars['Boolean']['input']>;
  uid?: InputMaybe<Scalars['Float']['input']>;
};


export type QuerySuggestPlaidAccountMappingArgs = {
  itemId: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
};


export type QuerySuggestPlaidTransactionCategoriesArgs = {
  accountId?: InputMaybe<Scalars['String']['input']>;
  ledgerId: Scalars['String']['input'];
};


export type QuerySuggestTransactionCategoriesArgs = {
  ledgerId: Scalars['String']['input'];
  transactions: Array<TransactionToCategorizeInput>;
};


export type QueryUserProfileArgs = {
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryValidateEmailTokenArgs = {
  token: Scalars['String']['input'];
};

export type QueryColumn = {
  __typename: 'QueryColumn';
  dtype: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type QueryResult = {
  __typename: 'QueryResult';
  /** Result type: 'table' or 'text' */
  resultType: Scalars['String']['output'];
  table: Maybe<QueryResultTable>;
  text: Maybe<QueryResultText>;
};

export type QueryResultTable = {
  __typename: 'QueryResultTable';
  /** Query result rows as array of arrays */
  rows: Array<Array<Scalars['JSON']['output']>>;
  t: Maybe<Scalars['String']['output']>;
  types: Array<QueryColumn>;
};

export type QueryResultText = {
  __typename: 'QueryResultText';
  contents: Scalars['String']['output'];
  t: Maybe<Scalars['String']['output']>;
};

export type QueryShellTextResult = {
  __typename: 'QueryShellTextResult';
  text: Scalars['String']['output'];
};

export type ReceiptParseResult = {
  __typename: 'ReceiptParseResult';
  amount: Scalars['Float']['output'];
  date: Maybe<Scalars['String']['output']>;
  description: Scalars['String']['output'];
  payee: Scalars['String']['output'];
  sourceAccount: Maybe<Scalars['String']['output']>;
  targetAccount: Maybe<Scalars['String']['output']>;
};

export type ReceiptPostingInput = {
  account: Scalars['String']['input'];
  amountCurrency: Scalars['String']['input'];
  amountNumber: Scalars['String']['input'];
};

export type RenameLedgerFileResponse = {
  __typename: 'RenameLedgerFileResponse';
  newPath: Scalars['String']['output'];
  oldPath: Scalars['String']['output'];
};

/** The email report status (deprecated) */
export enum ReportStatus {
  Monthly = 'MONTHLY',
  Off = 'OFF',
  Weekly = 'WEEKLY'
}

export type RepositoryListItem = {
  __typename: 'RepositoryListItem';
  description: Maybe<Scalars['String']['output']>;
  fullName: Scalars['String']['output'];
  isPrivate: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  starsCount: Maybe<Scalars['Float']['output']>;
  updatedAt: Scalars['DateTimeISO']['output'];
};

export type RepositoryListResponse = {
  __typename: 'RepositoryListResponse';
  repositories: Array<RepositoryListItem>;
  total: Scalars['Float']['output'];
};

export type ResetPasswordResponse = {
  __typename: 'ResetPasswordResponse';
  success: Scalars['Boolean']['output'];
};

export type SearchUser = {
  __typename: 'SearchUser';
  email: Scalars['String']['output'];
  username: Scalars['String']['output'];
};

export type SendForgotPasswordLinkResponse = {
  __typename: 'SendForgotPasswordLinkResponse';
  success: Scalars['Boolean']['output'];
};

export type SerializableTreeNode = {
  __typename: 'SerializableTreeNode';
  account: Scalars['String']['output'];
  balance: Scalars['JSONObject']['output'];
  balanceChildren: Scalars['JSONObject']['output'];
  children: Array<Scalars['JSONObject']['output']>;
  cost: Maybe<Scalars['JSONObject']['output']>;
  costChildren: Maybe<Scalars['JSONObject']['output']>;
  hasTxns: Scalars['Boolean']['output'];
};

export type SignUpResponse = {
  __typename: 'SignUpResponse';
  expireAt: Scalars['String']['output'];
  sessionId: Scalars['String']['output'];
};

export type StarLedgerResponse = {
  __typename: 'StarLedgerResponse';
  isStarred: Scalars['Boolean']['output'];
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type Subscription = {
  __typename: 'Subscription';
  cancelAt: Maybe<Scalars['DateTimeISO']['output']>;
  cancelAtPeriodEnd: Scalars['Boolean']['output'];
  canceledAt: Maybe<Scalars['DateTimeISO']['output']>;
  clientId: Scalars['String']['output'];
  currentPeriodEnd: Scalars['DateTimeISO']['output'];
  currentPeriodStart: Scalars['DateTimeISO']['output'];
  id: Scalars['ID']['output'];
  items: Array<SubscriptionItem>;
  status: Scalars['String']['output'];
};

export type SubscriptionActionResult = {
  __typename: 'SubscriptionActionResult';
  message: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type SubscriptionItem = {
  __typename: 'SubscriptionItem';
  id: Scalars['ID']['output'];
  price: SubscriptionPrice;
  product: Maybe<SubscriptionProduct>;
  quantity: Scalars['Float']['output'];
};

export type SubscriptionPrice = {
  __typename: 'SubscriptionPrice';
  amount: Scalars['Float']['output'];
  currency: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  interval: Scalars['String']['output'];
  intervalCount: Maybe<Scalars['Float']['output']>;
  trialPeriodDays: Maybe<Scalars['Float']['output']>;
};

export type SubscriptionProduct = {
  __typename: 'SubscriptionProduct';
  description: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  images: Maybe<Array<Scalars['String']['output']>>;
  name: Scalars['String']['output'];
};

export type SubscriptionSessionResult = {
  __typename: 'SubscriptionSessionResult';
  message: Maybe<Scalars['String']['output']>;
  sessionId: Maybe<Scalars['String']['output']>;
  sessionUrl: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type TempAssetDownloadUrl = {
  __typename: 'TempAssetDownloadUrl';
  downloadUrl: Scalars['String']['output'];
  expiresIn: Scalars['Float']['output'];
};

export type TempAssetUploadUrl = {
  __typename: 'TempAssetUploadUrl';
  expiresIn: Scalars['Float']['output'];
  objectKey: Scalars['String']['output'];
  uploadUrl: Scalars['String']['output'];
};

export type TierQuotaItem = {
  __typename: 'TierQuotaItem';
  aiCfoTokensMax: Scalars['Float']['output'];
  maxCollaboratorsPerLedger: Scalars['Float']['output'];
  maxDirectives: Scalars['Float']['output'];
  maxLedgers: Scalars['Float']['output'];
  tier: Scalars['String']['output'];
};

export type TokenAuthResponse = {
  __typename: 'TokenAuthResponse';
  expireAt: Scalars['DateTimeISO']['output'];
  token: Scalars['String']['output'];
};

export type Transaction = {
  __typename: 'Transaction';
  date: Scalars['String']['output'];
  narration: Maybe<Scalars['String']['output']>;
  payee: Maybe<Scalars['String']['output']>;
  postings: Array<Posting>;
};

export type TransactionToCategorizeInput = {
  amount: Scalars['Float']['input'];
  date: Scalars['String']['input'];
  description: Scalars['String']['input'];
  payee: Scalars['String']['input'];
  rowIndex: Scalars['Int']['input'];
};

export type TrialBalanceData = {
  __typename: 'TrialBalanceData';
  assetsHierarchyData: SerializableTreeNode;
  equityHierarchyData: SerializableTreeNode;
  expensesHierarchyData: SerializableTreeNode;
  incomeHierarchyData: SerializableTreeNode;
  liabilitiesHierarchyData: SerializableTreeNode;
};

export type UpdateSourceSliceInput = {
  entryHash: Scalars['String']['input'];
  newContent: Scalars['String']['input'];
  sha256sum: Scalars['String']['input'];
};

export type UpdateSourceSliceResponse = {
  __typename: 'UpdateSourceSliceResponse';
  entryHash: Scalars['String']['output'];
  message: Scalars['String']['output'];
  newSha256sum: Scalars['String']['output'];
};

export type UpgradeSubscriptionResult = {
  __typename: 'UpgradeSubscriptionResult';
  clientSecret: Maybe<Scalars['String']['output']>;
  message: Maybe<Scalars['String']['output']>;
  newTier: Maybe<Scalars['String']['output']>;
  subscriptionId: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type User = {
  __typename: 'User';
  active: Maybe<Scalars['Boolean']['output']>;
  created: Maybe<Scalars['String']['output']>;
  email: Maybe<Scalars['String']['output']>;
  fullName: Maybe<Scalars['String']['output']>;
  id: Maybe<Scalars['Float']['output']>;
  isAdmin: Maybe<Scalars['Boolean']['output']>;
  lastLogin: Maybe<Scalars['String']['output']>;
  login: Maybe<Scalars['String']['output']>;
};

export type UserActivityFeedItem = {
  __typename: 'UserActivityFeedItem';
  content: Scalars['String']['output'];
  createdAt: Scalars['DateTimeISO']['output'];
  id: Scalars['String']['output'];
  repoFullName: Maybe<Scalars['String']['output']>;
  repoName: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
};

export type UserLimits = {
  __typename: 'UserLimits';
  collaboratorsPerLedgerMax: Scalars['Float']['output'];
  ledgersMax: Scalars['Float']['output'];
  ledgersUsed: Scalars['Float']['output'];
  maxDirectives: Scalars['Float']['output'];
};

export type UserListItem = {
  __typename: 'UserListItem';
  avatarUrl: Maybe<Scalars['String']['output']>;
  bio: Maybe<Scalars['String']['output']>;
  fullName: Maybe<Scalars['String']['output']>;
  username: Scalars['String']['output'];
};

export type UserListResponse = {
  __typename: 'UserListResponse';
  total: Scalars['Float']['output'];
  users: Array<UserListItem>;
};

export type UserProfile = {
  __typename: 'UserProfile';
  avatarUrl: Maybe<Scalars['String']['output']>;
  bio: Maybe<Scalars['String']['output']>;
  created: Maybe<Scalars['DateTimeISO']['output']>;
  followersCount: Scalars['Float']['output'];
  followingCount: Scalars['Float']['output'];
  fullName: Maybe<Scalars['String']['output']>;
  location: Maybe<Scalars['String']['output']>;
  starredReposCount: Scalars['Float']['output'];
  username: Scalars['String']['output'];
  website: Maybe<Scalars['String']['output']>;
};

export type UserProfileResponse = {
  __typename: 'UserProfileResponse';
  email: Scalars['String']['output'];
  emailReportStatus: Maybe<ReportStatus>;
  firstName: Maybe<Scalars['String']['output']>;
  hasEverSubscribed: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  lastName: Maybe<Scalars['String']['output']>;
  limits: UserLimits;
  locale: Scalars['String']['output'];
  tier: Scalars['String']['output'];
  username: Maybe<Scalars['String']['output']>;
};

export type UserRepository = {
  __typename: 'UserRepository';
  createdAt: Scalars['DateTimeISO']['output'];
  description: Maybe<Scalars['String']['output']>;
  fullName: Scalars['String']['output'];
  isPrivate: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  updatedAt: Scalars['DateTimeISO']['output'];
};

export type ValidateEmailTokenResponse = {
  __typename: 'ValidateEmailTokenResponse';
  isValid: Scalars['Boolean']['output'];
};

export type GetLedgerAccountDirectivesQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
}>;


export type GetLedgerAccountDirectivesQuery = { getLedgerAccountDirectives: Array<{ __typename: 'LedgerAccountItem', account: string, openedAt: string, closedAt: string | null, balance: Record<string, unknown> | null, entryCount: number, entryHash: string, closeEntryHash: string | null }> };

export type DeleteMultipleLedgerEntrySourceSlicesMutationVariables = Exact<{
  input: DeleteMultiSourceSlicesInput;
  ledgerId: Scalars['String']['input'];
}>;


export type DeleteMultipleLedgerEntrySourceSlicesMutation = { deleteMultipleLedgerEntrySourceSlices: { __typename: 'DeleteMultiSourceSlicesResponse', message: string, deletedHashes: Array<string> } };

export type GetLedgerIntervalTotalsQueryVariables = Exact<{
  accountName: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
  interval: Scalars['String']['input'];
  conversion: Scalars['String']['input'];
  time?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  account?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetLedgerIntervalTotalsQuery = { getLedgerIntervalTotals: Array<{ __typename: 'IntervalTotalItem', date: string, balance: Record<string, unknown>, accountBalances: Record<string, unknown> }> };

export type GetLedgerCommoditiesQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
}>;


export type GetLedgerCommoditiesQuery = { getLedgerCommodities: Array<{ __typename: 'CommodityPairWithPrices', base: string, quote: string, prices: Array<{ __typename: 'PricePoint', date: string, value: string }> }> };

export type GetLedgerDocumentsQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  time?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  account?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetLedgerDocumentsQuery = { getLedgerDocuments: Array<{ __typename: 'Document', tags: Array<string> | null, meta: Record<string, unknown> | null, links: Array<string> | null, filename: string, date: string, account: string }> };

export type GetLedgerEventsQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  time?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  account?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetLedgerEventsQuery = { getLedgerEvents: Array<{ __typename: 'Event', type: string, description: string, date: string }> };

export type GetLedgerEntriesCountPerTypeQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  time?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  account?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetLedgerEntriesCountPerTypeQuery = { getLedgerEntriesCountPerType: Array<{ __typename: 'EntriesByType', type: string, number: number }> };

export type GetLedgerAccountLastEntriesQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  time?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  account?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetLedgerAccountLastEntriesQuery = { getLedgerAccountLastEntries: Array<{ __typename: 'AccountLastEntry', date: string | null, balance: Record<string, unknown> | null, account: string }> };

export type GetLedgerArchiveDownloadUrlQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
}>;


export type GetLedgerArchiveDownloadUrlQuery = { getLedgerArchiveDownloadUrl: { __typename: 'LedgerAssetDownloadUrlResult', downloadUrl: string } };

export type GetLedgerDirContentQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  dirPath?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetLedgerDirContentQuery = { getLedgerDirContent: Array<{ __typename: 'LedgerFileContent', name: string, path: string, sha: string, size: number, type: string, encoding: string | null, content: string | null, lastCommitSha: string | null, lastAuthorDate: string | null, lastCommitterDate: string | null }> };

export type CreateLedgerFileMutationVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  path: Scalars['String']['input'];
  content: Scalars['String']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
}>;


export type CreateLedgerFileMutation = { createLedgerFile: { __typename: 'LedgerFileContent', name: string, path: string, sha: string, size: number, type: string, encoding: string | null, content: string | null, lastCommitSha: string | null, lastAuthorDate: string | null, lastCommitterDate: string | null } };

export type UpdateLedgerFileMutationVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  path: Scalars['String']['input'];
  content: Scalars['String']['input'];
  sha: Scalars['String']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
}>;


export type UpdateLedgerFileMutation = { updateLedgerFile: { __typename: 'LedgerFileContent', name: string, path: string, sha: string, size: number, type: string, encoding: string | null, content: string | null, lastCommitSha: string | null, lastAuthorDate: string | null, lastCommitterDate: string | null } };

export type DeleteLedgerFileMutationVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  path: Scalars['String']['input'];
  sha: Scalars['String']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
}>;


export type DeleteLedgerFileMutation = { deleteLedgerFile: { __typename: 'DeleteLedgerFileResponse', path: string } };

export type RenameLedgerFileMutationVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  oldPath: Scalars['String']['input'];
  newPath: Scalars['String']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
}>;


export type RenameLedgerFileMutation = { renameLedgerFile: { __typename: 'RenameLedgerFileResponse', oldPath: string, newPath: string } };

export type GetLedgerAccountReportQueryVariables = Exact<{
  accountName: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
  interval: Scalars['String']['input'];
  conversion: Scalars['String']['input'];
  time?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  account?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetLedgerAccountReportQuery = { getLedgerAccountReport: { __typename: 'AccountReport', linechartData: Array<{ __typename: 'DateAndBalance', date: string, balance: Record<string, unknown> }>, intervalTotalsData: Array<{ __typename: 'DateAndBalance', date: string, balance: Record<string, unknown> }>, accountBalanceData: Array<{ __typename: 'DateAndBalance', date: string, balance: Record<string, unknown> }> } };

export type GetLedgerAccountJournalQueryVariables = Exact<{
  query: AccountJournalQueryInput;
  ledgerId: Scalars['String']['input'];
}>;


export type GetLedgerAccountJournalQuery = { getLedgerAccountJournal: { __typename: 'AccountJournalResponse', with_children: boolean, total: number, account: string, items: Array<{ __typename: 'AccountJournalEntry', entry: Record<string, unknown>, change: Record<string, unknown>, balance: Record<string, unknown> }> } };

export type GetLedgerBalanceSheetQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  conversion?: InputMaybe<Scalars['String']['input']>;
  account?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  time?: InputMaybe<Scalars['String']['input']>;
  interval?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetLedgerBalanceSheetQuery = { getLedgerAccounts: Array<string>, getLedgerBalanceSheet: { __typename: 'BalanceSheetData', assetsHierarchyData: { __typename: 'SerializableTreeNode', account: string, balance: Record<string, unknown>, balanceChildren: Record<string, unknown>, cost: Record<string, unknown> | null, costChildren: Record<string, unknown> | null, hasTxns: boolean, children: Array<Record<string, unknown>> }, equityHierarchyData: { __typename: 'SerializableTreeNode', account: string, balance: Record<string, unknown>, balanceChildren: Record<string, unknown>, cost: Record<string, unknown> | null, costChildren: Record<string, unknown> | null, hasTxns: boolean, children: Array<Record<string, unknown>> }, liabilitiesHierarchyData: { __typename: 'SerializableTreeNode', account: string, balance: Record<string, unknown>, balanceChildren: Record<string, unknown>, cost: Record<string, unknown> | null, costChildren: Record<string, unknown> | null, hasTxns: boolean, children: Array<Record<string, unknown>> }, netWorthData: Array<{ __typename: 'DateAndBalance', date: string, balance: Record<string, unknown> }>, assetsData: Array<{ __typename: 'DateAndBalance', date: string, balance: Record<string, unknown> }>, liabilitiesData: Array<{ __typename: 'DateAndBalance', date: string, balance: Record<string, unknown> }>, equityData: Array<{ __typename: 'DateAndBalance', date: string, balance: Record<string, unknown> }> } };

export type GetLedgerIncomeStatementQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  conversion?: InputMaybe<Scalars['String']['input']>;
  account?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  time?: InputMaybe<Scalars['String']['input']>;
  interval?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetLedgerIncomeStatementQuery = { getLedgerAccounts: Array<string>, getLedgerIncomeStatement: { __typename: 'IncomeStatementData', incomeData: Array<{ __typename: 'DateAndBalanceWithAccountBalance', date: string, balance: Record<string, unknown>, accountBalances: Record<string, unknown> }>, expensesData: Array<{ __typename: 'DateAndBalanceWithAccountBalance', date: string, balance: Record<string, unknown>, accountBalances: Record<string, unknown> }>, netProfitData: Array<{ __typename: 'DateAndBalance', date: string, balance: Record<string, unknown> }>, expensesHierarchyData: { __typename: 'SerializableTreeNode', account: string, balance: Record<string, unknown>, balanceChildren: Record<string, unknown>, cost: Record<string, unknown> | null, costChildren: Record<string, unknown> | null, hasTxns: boolean, children: Array<Record<string, unknown>> }, incomeHierarchyData: { __typename: 'SerializableTreeNode', account: string, balance: Record<string, unknown>, balanceChildren: Record<string, unknown>, cost: Record<string, unknown> | null, costChildren: Record<string, unknown> | null, hasTxns: boolean, children: Array<Record<string, unknown>> } } };

export type GetLedgerOverviewQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  conversion?: InputMaybe<Scalars['String']['input']>;
  account?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  time?: InputMaybe<Scalars['String']['input']>;
  interval?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetLedgerOverviewQuery = { getLedgerOverview: { __typename: 'LedgerOverview', netWorthData: Array<{ __typename: 'DateAndBalance', date: string, balance: Record<string, unknown> }>, assetsData: Array<{ __typename: 'DateAndBalance', date: string, balance: Record<string, unknown> }>, assetsHierarchyData: { __typename: 'SerializableTreeNode', account: string, balance: Record<string, unknown>, balanceChildren: Record<string, unknown>, children: Array<Record<string, unknown>>, hasTxns: boolean, cost: Record<string, unknown> | null, costChildren: Record<string, unknown> | null }, liabilitiesData: Array<{ __typename: 'DateAndBalance', date: string, balance: Record<string, unknown> }>, liabilitiesHierarchyData: { __typename: 'SerializableTreeNode', account: string, balance: Record<string, unknown>, balanceChildren: Record<string, unknown>, children: Array<Record<string, unknown>>, hasTxns: boolean, cost: Record<string, unknown> | null, costChildren: Record<string, unknown> | null }, incomeIntervalData: Array<{ __typename: 'DateAndBalanceWithAccountBalance', date: string, balance: Record<string, unknown>, accountBalances: Record<string, unknown> }>, incomeHierarchyData: { __typename: 'SerializableTreeNode', account: string, balance: Record<string, unknown>, balanceChildren: Record<string, unknown>, children: Array<Record<string, unknown>>, hasTxns: boolean, cost: Record<string, unknown> | null, costChildren: Record<string, unknown> | null }, incomeData: Array<{ __typename: 'DateAndBalance', date: string, balance: Record<string, unknown> }>, expensesIntervalData: Array<{ __typename: 'DateAndBalanceWithAccountBalance', date: string, balance: Record<string, unknown>, accountBalances: Record<string, unknown> }>, expensesHierarchyData: { __typename: 'SerializableTreeNode', account: string, balance: Record<string, unknown>, balanceChildren: Record<string, unknown>, children: Array<Record<string, unknown>>, hasTxns: boolean, cost: Record<string, unknown> | null, costChildren: Record<string, unknown> | null }, expensesData: Array<{ __typename: 'DateAndBalance', date: string, balance: Record<string, unknown> }> } };

export type GetLedgerTrialBalanceQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  conversion: Scalars['String']['input'];
  time?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  account?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetLedgerTrialBalanceQuery = { getLedgerAccounts: Array<string>, getLedgerTrialBalance: { __typename: 'TrialBalanceData', incomeHierarchyData: { __typename: 'SerializableTreeNode', account: string, balance: Record<string, unknown>, balanceChildren: Record<string, unknown>, children: Array<Record<string, unknown>>, hasTxns: boolean, cost: Record<string, unknown> | null, costChildren: Record<string, unknown> | null }, liabilitiesHierarchyData: { __typename: 'SerializableTreeNode', account: string, balance: Record<string, unknown>, balanceChildren: Record<string, unknown>, children: Array<Record<string, unknown>>, hasTxns: boolean, cost: Record<string, unknown> | null, costChildren: Record<string, unknown> | null }, equityHierarchyData: { __typename: 'SerializableTreeNode', account: string, balance: Record<string, unknown>, balanceChildren: Record<string, unknown>, children: Array<Record<string, unknown>>, hasTxns: boolean, cost: Record<string, unknown> | null, costChildren: Record<string, unknown> | null }, expensesHierarchyData: { __typename: 'SerializableTreeNode', account: string, balance: Record<string, unknown>, balanceChildren: Record<string, unknown>, children: Array<Record<string, unknown>>, hasTxns: boolean, cost: Record<string, unknown> | null, costChildren: Record<string, unknown> | null }, assetsHierarchyData: { __typename: 'SerializableTreeNode', account: string, balance: Record<string, unknown>, balanceChildren: Record<string, unknown>, children: Array<Record<string, unknown>>, hasTxns: boolean, cost: Record<string, unknown> | null, costChildren: Record<string, unknown> | null } } };

export type InsertReceiptTransactionMutationVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  receiptObjectKey: Scalars['String']['input'];
  input: InsertReceiptTransactionInput;
}>;


export type InsertReceiptTransactionMutation = { insertReceiptTransaction: { __typename: 'InsertReceiptResult', success: boolean } };

export type ParseFileMutationVariables = Exact<{
  s3ObjectKey: Scalars['String']['input'];
  fileFormat: Scalars['String']['input'];
}>;


export type ParseFileMutation = { parseFile: { __typename: 'FileParseResult', rows: Array<{ __typename: 'ParsedRow', date: string, payee: string, description: string, amount: number }> } };

export type ParseReceiptMutationVariables = Exact<{
  s3ObjectKey: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
}>;


export type ParseReceiptMutation = { parseReceipt: { __typename: 'ReceiptParseResult', date: string | null, payee: string, description: string, amount: number, sourceAccount: string | null, targetAccount: string | null } };

export type CreatePlaidLinkTokenMutationVariables = Exact<{
  ledgerId: Scalars['String']['input'];
}>;


export type CreatePlaidLinkTokenMutation = { createPlaidLinkToken: { __typename: 'PlaidLinkToken', linkToken: string } };

export type CreatePlaidUpdateModeLinkTokenMutationVariables = Exact<{
  itemId: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
  accountSelection?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type CreatePlaidUpdateModeLinkTokenMutation = { createPlaidUpdateModeLinkToken: { __typename: 'PlaidLinkToken', linkToken: string } };

export type ReconcilePlaidAccountsMutationVariables = Exact<{
  itemId: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
}>;


export type ReconcilePlaidAccountsMutation = { reconcilePlaidAccounts: { __typename: 'PlaidAccountReconcileResult', success: boolean, addedCount: number, removedCount: number } };

export type ExchangePlaidPublicTokenMutationVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  publicToken: Scalars['String']['input'];
}>;


export type ExchangePlaidPublicTokenMutation = { exchangePlaidPublicToken: { __typename: 'PlaidItemType', id: string, institutionName: string, status: string } };

export type UpdatePlaidAccountMappingMutationVariables = Exact<{
  accountId: Scalars['String']['input'];
  ledgerAccount: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
}>;


export type UpdatePlaidAccountMappingMutation = { updatePlaidAccountMapping: boolean };

export type UpdatePlaidAccountCurrencyMutationVariables = Exact<{
  accountId: Scalars['String']['input'];
  currency: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
}>;


export type UpdatePlaidAccountCurrencyMutation = { updatePlaidAccountCurrency: boolean };

export type RefreshPlaidItemStatusMutationVariables = Exact<{
  itemId: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
}>;


export type RefreshPlaidItemStatusMutation = { refreshPlaidItemStatus: { __typename: 'PlaidItemType', id: string, status: string, errorCode: string | null, errorMessage: string | null } };

export type UnlinkPlaidItemMutationVariables = Exact<{
  itemId: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
}>;


export type UnlinkPlaidItemMutation = { unlinkPlaidItem: boolean };

export type SyncPlaidTransactionsMutationVariables = Exact<{
  itemId: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
}>;


export type SyncPlaidTransactionsMutation = { syncPlaidTransactions: { __typename: 'PlaidSyncResult', success: boolean, transactionsFetched: number, transactionsAdded: number, message: string | null } };

export type SubmitPlaidTransactionsToLedgerMutationVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  transactions: Array<PlaidTransactionSubmitInput> | PlaidTransactionSubmitInput;
  filename?: InputMaybe<Scalars['String']['input']>;
}>;


export type SubmitPlaidTransactionsToLedgerMutation = { submitPlaidTransactionsToLedger: { __typename: 'PlaidSubmitResult', success: boolean, addedCount: number, message: string | null } };

export type DeletePlaidTransactionsMutationVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  transactionIds: Array<Scalars['String']['input']> | Scalars['String']['input'];
}>;


export type DeletePlaidTransactionsMutation = { deletePlaidTransactions: { __typename: 'PlaidDeleteResult', success: boolean, deletedCount: number, message: string | null } };

export type ApprovePullRequestMutationVariables = Exact<{
  ledgerOwner: Scalars['String']['input'];
  ledgerName: Scalars['String']['input'];
  prNumber: Scalars['Int']['input'];
}>;


export type ApprovePullRequestMutation = { approvePullRequest: { __typename: 'PullRequestResult', success: boolean, message: string | null } };

export type RejectPullRequestMutationVariables = Exact<{
  ledgerOwner: Scalars['String']['input'];
  ledgerName: Scalars['String']['input'];
  prNumber: Scalars['Int']['input'];
}>;


export type RejectPullRequestMutation = { rejectPullRequest: { __typename: 'PullRequestResult', success: boolean, message: string | null } };

export type CancelSubscriptionMutationVariables = Exact<{
  clientId: Scalars['String']['input'];
  subscriptionId: Scalars['String']['input'];
}>;


export type CancelSubscriptionMutation = { cancelSubscription: { __typename: 'SubscriptionActionResult', success: boolean, message: string | null } };

export type ResumeSubscriptionMutationVariables = Exact<{
  clientId: Scalars['String']['input'];
  subscriptionId: Scalars['String']['input'];
}>;


export type ResumeSubscriptionMutation = { resumeSubscription: { __typename: 'SubscriptionActionResult', success: boolean, message: string | null } };

export type CreateSubscriptionSessionMutationVariables = Exact<{
  clientId: Scalars['String']['input'];
  priceId: Scalars['String']['input'];
}>;


export type CreateSubscriptionSessionMutation = { createSubscriptionSession: { __typename: 'SubscriptionSessionResult', success: boolean, sessionId: string | null, sessionUrl: string | null, message: string | null } };

export type CreateStripePortalSessionMutationVariables = Exact<{
  clientId: Scalars['String']['input'];
}>;


export type CreateStripePortalSessionMutation = { createStripePortalSession: { __typename: 'SubscriptionSessionResult', success: boolean, sessionId: string | null, sessionUrl: string | null, message: string | null } };

export type UpgradeSubscriptionMutationVariables = Exact<{
  clientId: Scalars['String']['input'];
  priceId: Scalars['String']['input'];
}>;


export type UpgradeSubscriptionMutation = { upgradeSubscription: { __typename: 'UpgradeSubscriptionResult', success: boolean, message: string | null, clientSecret: string | null, subscriptionId: string | null, newTier: string | null } };

export type GenerateTempAssetUploadUrlMutationVariables = Exact<{
  mimeType?: InputMaybe<Scalars['String']['input']>;
  filename?: InputMaybe<Scalars['String']['input']>;
}>;


export type GenerateTempAssetUploadUrlMutation = { generateTempAssetUploadUrl: { __typename: 'TempAssetUploadUrl', uploadUrl: string, objectKey: string, expiresIn: number } };

export type FollowUserMutationVariables = Exact<{
  username: Scalars['String']['input'];
}>;


export type FollowUserMutation = { followUser: { __typename: 'FollowUserResponse', success: boolean, isFollowing: boolean | null, message: string | null } };

export type UnfollowUserMutationVariables = Exact<{
  username: Scalars['String']['input'];
}>;


export type UnfollowUserMutation = { unfollowUser: { __typename: 'FollowUserResponse', success: boolean, isFollowing: boolean | null, message: string | null } };

export type IsAuthenticatedQueryVariables = Exact<{ [key: string]: never; }>;


export type IsAuthenticatedQuery = { userProfile: { __typename: 'UserProfileResponse', id: string } | null };

export type SignInMutationVariables = Exact<{
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type SignInMutation = { signIn: { __typename: 'TokenAuthResponse', token: string, expireAt: string } };

export type GetCurrentUserQueryVariables = Exact<{ [key: string]: never; }>;


export type GetCurrentUserQuery = { userProfile: { __typename: 'UserProfileResponse', locale: string, lastName: string | null, id: string, firstName: string | null, emailReportStatus: ReportStatus | null, email: string, username: string | null, tier: string, hasEverSubscribed: boolean, limits: { __typename: 'UserLimits', ledgersUsed: number, ledgersMax: number, collaboratorsPerLedgerMax: number, maxDirectives: number } } | null };

export type GetAiCfoUsageQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAiCfoUsageQuery = { aiCfoUsage: { __typename: 'AiCfoUsageResponse', aiCfoTokensUsed: number, aiCfoTokensMax: number } };

export type SignInWithOneTimeTokenMutationVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type SignInWithOneTimeTokenMutation = { signInWithOneTimeToken: { __typename: 'TokenAuthResponse', token: string, expireAt: string } };

export type RefreshTokenMutationVariables = Exact<{ [key: string]: never; }>;


export type RefreshTokenMutation = { refreshToken: { __typename: 'TokenAuthResponse', token: string, expireAt: string } };

export type DeleteAccountMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteAccountMutation = { deleteAccount: boolean };

export type LogoutMutationVariables = Exact<{ [key: string]: never; }>;


export type LogoutMutation = { logout: { __typename: 'LogoutResponse', success: boolean } };

export type UpdateUsernameMutationVariables = Exact<{
  username: Scalars['String']['input'];
}>;


export type UpdateUsernameMutation = { updateUsername: { __typename: 'UserProfileResponse', username: string | null, locale: string, lastName: string | null, id: string, firstName: string | null, emailReportStatus: ReportStatus | null, email: string } };

export type UpdateProfileMutationVariables = Exact<{
  firstName?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
}>;


export type UpdateProfileMutation = { updateProfile: { __typename: 'UserProfileResponse', username: string | null, locale: string, lastName: string | null, id: string, firstName: string | null, emailReportStatus: ReportStatus | null, email: string } };

export type SendForgotPasswordLinkMutationVariables = Exact<{
  email: Scalars['String']['input'];
}>;


export type SendForgotPasswordLinkMutation = { sendForgotPasswordLink: { __typename: 'SendForgotPasswordLinkResponse', success: boolean } };

export type ValidateEmailTokenQueryVariables = Exact<{
  token: Scalars['String']['input'];
}>;


export type ValidateEmailTokenQuery = { validateEmailToken: { __typename: 'ValidateEmailTokenResponse', isValid: boolean } };

export type ResetPasswordMutationVariables = Exact<{
  token: Scalars['String']['input'];
  newPassword: Scalars['String']['input'];
}>;


export type ResetPasswordMutation = { resetPassword: { __typename: 'ResetPasswordResponse', success: boolean } };

export type SignUpMutationVariables = Exact<{
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  inviteBy?: InputMaybe<Scalars['String']['input']>;
  inviteSrc?: InputMaybe<Scalars['String']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
  withDefaultLedger?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type SignUpMutation = { signUp: { __typename: 'SignUpResponse', sessionId: string, expireAt: string } };

export type VerifySignUpOtpMutationVariables = Exact<{
  sessionId: Scalars['String']['input'];
  otp: Scalars['String']['input'];
}>;


export type VerifySignUpOtpMutation = { verifySignUpOtp: { __typename: 'TokenAuthResponse', token: string, expireAt: string } };

export type ConfirmCliAuthSessionMutationVariables = Exact<{
  sessionId: Scalars['String']['input'];
}>;


export type ConfirmCliAuthSessionMutation = { confirmCliAuthSession: { __typename: 'ConfirmCliAuthSessionResponse', success: boolean } };

export type DenyCliAuthSessionMutationVariables = Exact<{
  sessionId: Scalars['String']['input'];
}>;


export type DenyCliAuthSessionMutation = { denyCliAuthSession: { __typename: 'DenyCliAuthSessionResponse', success: boolean } };

export type GetCliAuthSessionQueryVariables = Exact<{
  sessionId: Scalars['String']['input'];
}>;


export type GetCliAuthSessionQuery = { getCliAuthSession: { __typename: 'GetCliAuthSessionResponse', status: CliAuthStatus } };

export type ListLedgerCollaboratorsQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Float']['input']>;
  page?: InputMaybe<Scalars['Float']['input']>;
}>;


export type ListLedgerCollaboratorsQuery = { listLedgerCollaborators: Array<{ __typename: 'CollaboratorUser', login: string | null, lastLogin: string | null, isAdmin: boolean | null, id: number | null, fullName: string | null, email: string | null, created: string | null, active: boolean | null, permission: string | null }> };

export type AddLedgerCollaboratorMutationVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  collaborator: Scalars['String']['input'];
  permission?: InputMaybe<Scalars['String']['input']>;
}>;


export type AddLedgerCollaboratorMutation = { addOrUpdateLedgerCollaborator: { __typename: 'AddCollaboratorResponse', success: boolean, message: string | null } };

export type DeleteLedgerCollaboratorMutationVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  collaborator: Scalars['String']['input'];
}>;


export type DeleteLedgerCollaboratorMutation = { deleteLedgerCollaborator: { __typename: 'DeleteCollaboratorResponse', success: boolean, message: string | null } };

export type GetUserByExactMatchQueryVariables = Exact<{
  keyword: Scalars['String']['input'];
}>;


export type GetUserByExactMatchQuery = { getUserByExactMatch: Array<{ __typename: 'SearchUser', username: string, email: string }> };

export type LeaveLedgerMutationVariables = Exact<{
  ledgerId: Scalars['String']['input'];
}>;


export type LeaveLedgerMutation = { leaveLedger: { __typename: 'DeleteCollaboratorResponse', success: boolean, message: string | null } };

export type ListCommitsQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  branch?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListCommitsQuery = { listCommits: Array<{ __typename: 'CommitListItem', sha: string, shortSha: string | null, message: string, author: { __typename: 'CommitAuthor', name: string, email: string, date: string } }> };

export type GetLatestLedgerCommitQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  branchName?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetLatestLedgerCommitQuery = { getLatestLedgerCommit: { __typename: 'LedgerCommit', sha: string, message: string | null, created: string | null } | null };

export type GetCommitDetailsQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  sha: Scalars['String']['input'];
}>;


export type GetCommitDetailsQuery = { getCommitDetails: { __typename: 'CommitDetails', sha: string, message: string, diff: string | null, parents: Array<string> | null, author: { __typename: 'CommitAuthor', name: string, email: string, date: string }, committer: { __typename: 'CommitAuthor', name: string, email: string, date: string } | null, files: Array<{ __typename: 'CommitFileChange', filename: string, additions: number, deletions: number }>, stats: { __typename: 'CommitStats', additions: number, deletions: number, total: number } } };

export type GetFeedQueryVariables = Exact<{
  offset?: InputMaybe<Scalars['Float']['input']>;
  limit?: InputMaybe<Scalars['Float']['input']>;
  source?: InputMaybe<Scalars['String']['input']>;
  locale?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetFeedQuery = { getFeed: { __typename: 'FeedResponse', total: number, hasMore: boolean, items: Array<{ __typename: 'FeedItem', id: string, title: string, summary: string | null, link: string, publishedAt: string, author: string | null, authorAvatar: string | null, source: FeedSource }> } };

export type GetLedgerFileQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  path: Scalars['String']['input'];
}>;


export type GetLedgerFileQuery = { getLedgerFile: { __typename: 'LedgerFileContent', name: string, path: string, sha: string, size: number, type: string, encoding: string | null, content: string | null, lastCommitSha: string | null, lastAuthorDate: string | null, lastCommitterDate: string | null } | null };

export type GetLedgerJournalQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  query?: InputMaybe<JournalQueryInput>;
}>;


export type GetLedgerJournalQuery = { getLedgerJournal: { __typename: 'JournalResponse', total: number, data: Array<Record<string, unknown>>, is_empty: boolean } };

export type BulkEntriesMutationVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  entries: Array<AddEntryInput> | AddEntryInput;
}>;


export type BulkEntriesMutation = { bulkEntries: { __typename: 'AddLedgerEntryResponse', success: boolean, message: string | null } };

export type SuggestTransactionCategoriesQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  transactions: Array<TransactionToCategorizeInput> | TransactionToCategorizeInput;
}>;


export type SuggestTransactionCategoriesQuery = { suggestTransactionCategories: Array<{ __typename: 'CategorySuggestion', rowIndex: number, targetAccount: string, confidence: number, source: string, reasoning: string | null }> };

export type GetLedgerEntryContextQueryVariables = Exact<{
  entryHash: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
}>;


export type GetLedgerEntryContextQuery = { getLedgerEntryContext: { __typename: 'EntryContext', slice: string, sha256sum: string, entry: Record<string, unknown>, balances_before: Record<string, unknown> | null, balances_after: Record<string, unknown> | null } };

export type DeleteLedgerEntrySourceSliceMutationVariables = Exact<{
  input: DeleteSourceSliceInput;
  ledgerId: Scalars['String']['input'];
}>;


export type DeleteLedgerEntrySourceSliceMutation = { deleteLedgerEntrySourceSlice: { __typename: 'DeleteSourceSliceResponse', message: string, entryHash: string } };

export type UpdateLedgerEntrySourceSliceMutationVariables = Exact<{
  input: UpdateSourceSliceInput;
  ledgerId: Scalars['String']['input'];
}>;


export type UpdateLedgerEntrySourceSliceMutation = { updateLedgerEntrySourceSlice: { __typename: 'UpdateSourceSliceResponse', newSha256sum: string, message: string, entryHash: string } };

export type GetLedgerPlaintextJournalQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  query?: InputMaybe<PlaintextJournalQueryInput>;
}>;


export type GetLedgerPlaintextJournalQuery = { getLedgerPlaintextJournal: { __typename: 'PlaintextJournalResponse', content: string } };

export type CreatePublicKeyMutationVariables = Exact<{
  key: Scalars['String']['input'];
  title: Scalars['String']['input'];
  readOnly?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type CreatePublicKeyMutation = { createPublicKey: { __typename: 'PublicKey', id: number, key: string, title: string, fingerprint: string, createdAt: string, lastUsedAt: string | null } };

export type DeletePublicKeyMutationVariables = Exact<{
  keyId: Scalars['Float']['input'];
}>;


export type DeletePublicKeyMutation = { deletePublicKey: { __typename: 'DeletePublicKeyResponse', id: number } };

export type ListPublicKeysQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Float']['input']>;
  page?: InputMaybe<Scalars['Float']['input']>;
}>;


export type ListPublicKeysQuery = { listPublicKeys: Array<{ __typename: 'PublicKey', id: number, key: string, title: string, fingerprint: string, createdAt: string, lastUsedAt: string | null }> };

export type GetPublicKeyQueryVariables = Exact<{
  keyId: Scalars['Float']['input'];
}>;


export type GetPublicKeyQuery = { getPublicKey: { __typename: 'PublicKey', id: number, key: string, title: string, fingerprint: string, createdAt: string, lastUsedAt: string | null } | null };

export type GetLedgerAssetDownloadUrlQueryVariables = Exact<{
  ledgerRepoId: Scalars['Int']['input'];
  filename: Scalars['String']['input'];
}>;


export type GetLedgerAssetDownloadUrlQuery = { getLedgerAssetDownloadUrl: { __typename: 'LedgerAssetDownloadUrlResult', downloadUrl: string } };

export type CreateLedgerMutationVariables = Exact<{
  name: Scalars['String']['input'];
  private?: InputMaybe<Scalars['Boolean']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  template?: InputMaybe<LedgerTemplate>;
}>;


export type CreateLedgerMutation = { createLedger: { __typename: 'Ledger', updatedAt: string, sshUrl: string, size: number, private: boolean, name: string, id: string, fullName: string, empty: boolean, createdAt: string, httpUrl: string, description: string | null, permissions: { __typename: 'Permission', admin: boolean, pull: boolean, push: boolean } | null } };

export type UpdateLedgerMutationVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  private?: InputMaybe<Scalars['Boolean']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
}>;


export type UpdateLedgerMutation = { updateLedger: { __typename: 'Ledger', id: string, name: string, fullName: string, httpUrl: string, sshUrl: string, private: boolean, empty: boolean, size: number, createdAt: string, updatedAt: string, description: string | null, permissions: { __typename: 'Permission', admin: boolean, pull: boolean, push: boolean } | null } };

export type DeleteLedgerMutationVariables = Exact<{
  ledgerId: Scalars['String']['input'];
}>;


export type DeleteLedgerMutation = { deleteLedger: { __typename: 'DeleteLedgerResponse', ledgerId: string } };

export type ListLedgersQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Float']['input']>;
  page?: InputMaybe<Scalars['Float']['input']>;
}>;


export type ListLedgersQuery = { listLedgers: Array<{ __typename: 'Ledger', id: string, name: string, fullName: string, httpUrl: string, sshUrl: string, private: boolean, empty: boolean, size: number, createdAt: string, updatedAt: string, description: string | null, permissions: { __typename: 'Permission', admin: boolean, pull: boolean, push: boolean } | null }> };

export type GetLedgerQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
}>;


export type GetLedgerQuery = { getLedger: { __typename: 'Ledger', id: string, name: string, fullName: string, httpUrl: string, sshUrl: string, private: boolean, empty: boolean, size: number, createdAt: string, updatedAt: string, description: string | null, isStarred: boolean | null, permissions: { __typename: 'Permission', admin: boolean, pull: boolean, push: boolean } | null, options: { __typename: 'LedgerOptions', title: string, nameAssets: string, nameEquity: string, nameExpenses: string, nameIncome: string, nameLiabilities: string, accountCurrentConversions: string, accountCurrentEarnings: string, renderCommas: boolean, operatingCurrency: Array<string> }, favaOptions: { __typename: 'FavaOptions', accountJournalIncludeChildren: boolean, autoReload: boolean, collapsePattern: Array<string>, conversionCurrencies: Array<string>, currencyColumn: number, defaultPage: string, indent: number, invertIncomeLiabilitiesEquity: boolean, language: string | null, locale: string | null, showAccountsWithZeroBalance: boolean, showAccountsWithZeroTransactions: boolean, showClosedAccounts: boolean, sidebarShowQueries: number, unrealized: string, upcomingEvents: number, uptodateIndicatorGreyLookbackDays: number, useExternalEditor: boolean, fiscalYearEnd: { __typename: 'FiscalYearEnd', month: number, day: number } }, bcioOptions: { __typename: 'BcioOptions', defaultFile: string, transactionFile: string | null, accountFile: string | null, priceFile: string | null, balanceFile: string | null, noteFile: string | null, padFile: string | null } } };

export type GetLedgerSourceFilesQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
}>;


export type GetLedgerSourceFilesQuery = { getLedgerSourceFiles: Array<string> };

export type GetLedgerOperatingCurrenciesQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
}>;


export type GetLedgerOperatingCurrenciesQuery = { getLedger: { __typename: 'Ledger', id: string, options: { __typename: 'LedgerOptions', operatingCurrency: Array<string> } } };

export type SearchLedgersQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Float']['input']>;
  page?: InputMaybe<Scalars['Float']['input']>;
  order?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<Scalars['String']['input']>;
  exclusive?: InputMaybe<Scalars['Boolean']['input']>;
  mode?: InputMaybe<Scalars['String']['input']>;
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  template?: InputMaybe<Scalars['Boolean']['input']>;
  uid?: InputMaybe<Scalars['Float']['input']>;
  includeDesc?: InputMaybe<Scalars['Boolean']['input']>;
  topic?: InputMaybe<Scalars['Boolean']['input']>;
  q?: InputMaybe<Scalars['String']['input']>;
  private?: InputMaybe<Scalars['Boolean']['input']>;
  starredBy?: InputMaybe<Scalars['Float']['input']>;
  teamId?: InputMaybe<Scalars['Float']['input']>;
  priorityOwnerId?: InputMaybe<Scalars['Float']['input']>;
  isPrivate?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type SearchLedgersQuery = { searchLedgers: Array<{ __typename: 'Ledger', updatedAt: string, sshUrl: string, size: number, private: boolean, name: string, createdAt: string, empty: boolean, fullName: string, httpUrl: string, id: string, description: string | null, permissions: { __typename: 'Permission', admin: boolean, pull: boolean, push: boolean } | null }> };

export type ListUserOwnedLedgersQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Float']['input']>;
  page?: InputMaybe<Scalars['Float']['input']>;
}>;


export type ListUserOwnedLedgersQuery = { listUserOwnedLedgers: Array<{ __typename: 'Ledger', updatedAt: string, sshUrl: string, size: number, private: boolean, id: string, httpUrl: string, fullName: string, empty: boolean, description: string | null, createdAt: string, name: string }> };

export type StarLedgerMutationVariables = Exact<{
  ledgerId: Scalars['String']['input'];
}>;


export type StarLedgerMutation = { starLedger: { __typename: 'StarLedgerResponse', success: boolean, isStarred: boolean, message: string | null } };

export type UnstarLedgerMutationVariables = Exact<{
  ledgerId: Scalars['String']['input'];
}>;


export type UnstarLedgerMutation = { unstarLedger: { __typename: 'StarLedgerResponse', success: boolean, isStarred: boolean, message: string | null } };

export type GetPlaidItemsQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
}>;


export type GetPlaidItemsQuery = { getPlaidItems: Array<{ __typename: 'PlaidItemType', id: string, institutionName: string, status: string, errorMessage: string | null, createdAt: string, lastSync: { __typename: 'PlaidLastSync', status: string, timestamp: string, transactionsAdded: number | null, errorMessage: string | null } | null }> };

export type GetPlaidAccountsQueryVariables = Exact<{
  itemId: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
}>;


export type GetPlaidAccountsQuery = { getPlaidAccounts: Array<{ __typename: 'PlaidAccountType', id: string, accountName: string, accountType: string, mask: string | null, ledgerAccount: string | null, currency: string, enabled: boolean }> };

export type GetPlaidAccountsForLedgerQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
}>;


export type GetPlaidAccountsForLedgerQuery = { getPlaidAccountsForLedger: Array<{ __typename: 'PlaidAccountWithInstitutionType', id: string, plaidItemId: string, accountName: string, mask: string | null, institutionName: string }> };

export type GetUnsyncedPlaidTransactionsQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  accountId?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetUnsyncedPlaidTransactionsQuery = { getUnsyncedPlaidTransactions: Array<{ __typename: 'PlaidTransactionType', id: string, plaidAccountId: string, transactionId: string, date: string, amount: string, merchantName: string | null, name: string, isPending: boolean, accountName: string, institutionName: string, ledgerAccount: string | null }> };

export type SuggestPlaidTransactionCategoriesQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  accountId?: InputMaybe<Scalars['String']['input']>;
}>;


export type SuggestPlaidTransactionCategoriesQuery = { suggestPlaidTransactionCategories: Array<{ __typename: 'CategorySuggestion', rowIndex: number, targetAccount: string, confidence: number, reasoning: string | null }> };

export type SuggestPlaidAccountMappingQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  itemId: Scalars['String']['input'];
}>;


export type SuggestPlaidAccountMappingQuery = { suggestPlaidAccountMapping: Array<{ __typename: 'PlaidAccountMappingSuggestion', accountId: string, suggestedAccount: string, confidence: number, reasoning: string | null }> };

export type GetPullRequestDetailsQueryVariables = Exact<{
  ledgerOwner: Scalars['String']['input'];
  ledgerName: Scalars['String']['input'];
  prNumber: Scalars['Int']['input'];
}>;


export type GetPullRequestDetailsQuery = { getPullRequestDetails: { __typename: 'PullRequestDetails', number: number, title: string, description: string, state: string, author: string, headBranch: string, baseBranch: string, diff: string | null, files: Array<{ __typename: 'PRFileChange', filename: string, additions: number, deletions: number, changes: number }> } };

export type QueryShellQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  query: Scalars['String']['input'];
}>;


export type QueryShellQuery = { queryShell: { __typename: 'QueryResult', resultType: string, text: { __typename: 'QueryResultText', t: string | null, contents: string } | null, table: { __typename: 'QueryResultTable', t: string | null, rows: Array<Array<unknown>>, types: Array<{ __typename: 'QueryColumn', name: string, dtype: string }> } | null } | null };

export type GetLedgerErrorsQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
}>;


export type GetLedgerErrorsQuery = { getLedgerErrors: Array<{ __typename: 'BeancountError', message: string, lineno: number | null, filename: string | null }> };

export type GetLedgerAttributesQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
}>;


export type GetLedgerAttributesQuery = { getLedgerAttributes: { __typename: 'LedgerAttributes', accounts: Array<string>, tags: Array<string>, years: Array<string>, links: Array<string>, payees: Array<string>, currencies: Array<string> } };

export type GetLedgerAccountsQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  status?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetLedgerAccountsQuery = { getLedgerAccounts: Array<string> };

export type GetLedgerCurrenciesQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
}>;


export type GetLedgerCurrenciesQuery = { getLedgerCurrencies: Array<string> };

export type GetLedgerNarrationsQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
}>;


export type GetLedgerNarrationsQuery = { getLedgerNarrations: Array<string> };

export type GetLedgerPayeesQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
}>;


export type GetLedgerPayeesQuery = { getLedgerPayees: Array<string> };

export type GetSubscriptionStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type GetSubscriptionStatusQuery = { subscriptionStatus: { __typename: 'CustomerSubscriptionStatus', hasActiveSubscription: boolean, subscriptions: Array<{ __typename: 'Subscription', id: string, status: string, currentPeriodStart: string, currentPeriodEnd: string, clientId: string, cancelAt: string | null, canceledAt: string | null, cancelAtPeriodEnd: boolean, items: Array<{ __typename: 'SubscriptionItem', id: string, quantity: number, price: { __typename: 'SubscriptionPrice', id: string, amount: number, currency: string, interval: string, intervalCount: number | null, trialPeriodDays: number | null }, product: { __typename: 'SubscriptionProduct', id: string, name: string, description: string | null, images: Array<string> | null } | null }> }> } };

export type GetAllTierQuotasQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllTierQuotasQuery = { allTierQuotas: Array<{ __typename: 'TierQuotaItem', tier: string, aiCfoTokensMax: number, maxLedgers: number, maxCollaboratorsPerLedger: number, maxDirectives: number }> };

export type GenerateTempAssetDownloadUrlQueryVariables = Exact<{
  objectKey: Scalars['String']['input'];
}>;


export type GenerateTempAssetDownloadUrlQuery = { generateTempAssetDownloadUrl: { __typename: 'TempAssetDownloadUrl', downloadUrl: string, expiresIn: number } };

export type GetUserProfileQueryVariables = Exact<{
  username: Scalars['String']['input'];
}>;


export type GetUserProfileQuery = { getUserProfile: { __typename: 'PublicUserProfileResponse', isFollowing: boolean | null, profile: { __typename: 'UserProfile', username: string, fullName: string | null, avatarUrl: string | null, bio: string | null, location: string | null, website: string | null, followersCount: number, followingCount: number, starredReposCount: number, created: string | null }, activities: Array<{ __typename: 'UserActivityFeedItem', id: string, type: string, content: string, createdAt: string, repoName: string | null, repoFullName: string | null }>, repositories: Array<{ __typename: 'UserRepository', name: string, fullName: string, description: string | null, isPrivate: boolean, createdAt: string, updatedAt: string }> } };

export type GetUserFollowersQueryVariables = Exact<{
  username: Scalars['String']['input'];
  page?: InputMaybe<Scalars['Float']['input']>;
  limit?: InputMaybe<Scalars['Float']['input']>;
}>;


export type GetUserFollowersQuery = { getUserFollowers: { __typename: 'UserListResponse', total: number, users: Array<{ __typename: 'UserListItem', username: string, fullName: string | null, avatarUrl: string | null, bio: string | null }> } };

export type GetUserFollowingQueryVariables = Exact<{
  username: Scalars['String']['input'];
  page?: InputMaybe<Scalars['Float']['input']>;
  limit?: InputMaybe<Scalars['Float']['input']>;
}>;


export type GetUserFollowingQuery = { getUserFollowing: { __typename: 'UserListResponse', total: number, users: Array<{ __typename: 'UserListItem', username: string, fullName: string | null, avatarUrl: string | null, bio: string | null }> } };

export type GetUserStarredReposQueryVariables = Exact<{
  username: Scalars['String']['input'];
  page?: InputMaybe<Scalars['Float']['input']>;
  limit?: InputMaybe<Scalars['Float']['input']>;
}>;


export type GetUserStarredReposQuery = { getUserStarredRepos: { __typename: 'RepositoryListResponse', total: number, repositories: Array<{ __typename: 'RepositoryListItem', name: string, fullName: string, description: string | null, isPrivate: boolean, updatedAt: string, starsCount: number | null }> } };


export const GetLedgerAccountDirectivesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerAccountDirectives"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerAccountDirectives"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"}},{"kind":"Field","name":{"kind":"Name","value":"openedAt"}},{"kind":"Field","name":{"kind":"Name","value":"closedAt"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"entryCount"}},{"kind":"Field","name":{"kind":"Name","value":"entryHash"}},{"kind":"Field","name":{"kind":"Name","value":"closeEntryHash"}}]}}]}}]} as unknown as DocumentNode<GetLedgerAccountDirectivesQuery, GetLedgerAccountDirectivesQueryVariables>;
export const DeleteMultipleLedgerEntrySourceSlicesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteMultipleLedgerEntrySourceSlices"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DeleteMultiSourceSlicesInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteMultipleLedgerEntrySourceSlices"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}},{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"deletedHashes"}}]}}]}}]} as unknown as DocumentNode<DeleteMultipleLedgerEntrySourceSlicesMutation, DeleteMultipleLedgerEntrySourceSlicesMutationVariables>;
export const GetLedgerIntervalTotalsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerIntervalTotals"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"interval"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"conversion"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"time"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"account"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerIntervalTotals"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountName"}}},{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"interval"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interval"}}},{"kind":"Argument","name":{"kind":"Name","value":"conversion"},"value":{"kind":"Variable","name":{"kind":"Name","value":"conversion"}}},{"kind":"Argument","name":{"kind":"Name","value":"time"},"value":{"kind":"Variable","name":{"kind":"Name","value":"time"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"account"},"value":{"kind":"Variable","name":{"kind":"Name","value":"account"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"accountBalances"}}]}}]}}]} as unknown as DocumentNode<GetLedgerIntervalTotalsQuery, GetLedgerIntervalTotalsQueryVariables>;
export const GetLedgerCommoditiesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerCommodities"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerCommodities"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"base"}},{"kind":"Field","name":{"kind":"Name","value":"quote"}},{"kind":"Field","name":{"kind":"Name","value":"prices"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}}]}}]} as unknown as DocumentNode<GetLedgerCommoditiesQuery, GetLedgerCommoditiesQueryVariables>;
export const GetLedgerDocumentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerDocuments"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"time"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"account"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerDocuments"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"time"},"value":{"kind":"Variable","name":{"kind":"Name","value":"time"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"account"},"value":{"kind":"Variable","name":{"kind":"Name","value":"account"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"meta"}},{"kind":"Field","name":{"kind":"Name","value":"links"}},{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"account"}}]}}]}}]} as unknown as DocumentNode<GetLedgerDocumentsQuery, GetLedgerDocumentsQueryVariables>;
export const GetLedgerEventsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerEvents"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"time"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"account"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerEvents"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"time"},"value":{"kind":"Variable","name":{"kind":"Name","value":"time"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"account"},"value":{"kind":"Variable","name":{"kind":"Name","value":"account"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"date"}}]}}]}}]} as unknown as DocumentNode<GetLedgerEventsQuery, GetLedgerEventsQueryVariables>;
export const GetLedgerEntriesCountPerTypeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerEntriesCountPerType"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"time"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"account"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerEntriesCountPerType"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"time"},"value":{"kind":"Variable","name":{"kind":"Name","value":"time"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"account"},"value":{"kind":"Variable","name":{"kind":"Name","value":"account"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"number"}}]}}]}}]} as unknown as DocumentNode<GetLedgerEntriesCountPerTypeQuery, GetLedgerEntriesCountPerTypeQueryVariables>;
export const GetLedgerAccountLastEntriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerAccountLastEntries"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"time"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"account"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerAccountLastEntries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"time"},"value":{"kind":"Variable","name":{"kind":"Name","value":"time"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"account"},"value":{"kind":"Variable","name":{"kind":"Name","value":"account"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"account"}}]}}]}}]} as unknown as DocumentNode<GetLedgerAccountLastEntriesQuery, GetLedgerAccountLastEntriesQueryVariables>;
export const GetLedgerArchiveDownloadUrlDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerArchiveDownloadUrl"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerArchiveDownloadUrl"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"downloadUrl"}}]}}]}}]} as unknown as DocumentNode<GetLedgerArchiveDownloadUrlQuery, GetLedgerArchiveDownloadUrlQueryVariables>;
export const GetLedgerDirContentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerDirContent"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"dirPath"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerDirContent"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"dirPath"},"value":{"kind":"Variable","name":{"kind":"Name","value":"dirPath"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"sha"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"encoding"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"lastCommitSha"}},{"kind":"Field","name":{"kind":"Name","value":"lastAuthorDate"}},{"kind":"Field","name":{"kind":"Name","value":"lastCommitterDate"}}]}}]}}]} as unknown as DocumentNode<GetLedgerDirContentQuery, GetLedgerDirContentQueryVariables>;
export const CreateLedgerFileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateLedgerFile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"content"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"message"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createLedgerFile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}},{"kind":"Argument","name":{"kind":"Name","value":"content"},"value":{"kind":"Variable","name":{"kind":"Name","value":"content"}}},{"kind":"Argument","name":{"kind":"Name","value":"message"},"value":{"kind":"Variable","name":{"kind":"Name","value":"message"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"sha"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"encoding"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"lastCommitSha"}},{"kind":"Field","name":{"kind":"Name","value":"lastAuthorDate"}},{"kind":"Field","name":{"kind":"Name","value":"lastCommitterDate"}}]}}]}}]} as unknown as DocumentNode<CreateLedgerFileMutation, CreateLedgerFileMutationVariables>;
export const UpdateLedgerFileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateLedgerFile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"content"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sha"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"message"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateLedgerFile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}},{"kind":"Argument","name":{"kind":"Name","value":"content"},"value":{"kind":"Variable","name":{"kind":"Name","value":"content"}}},{"kind":"Argument","name":{"kind":"Name","value":"sha"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sha"}}},{"kind":"Argument","name":{"kind":"Name","value":"message"},"value":{"kind":"Variable","name":{"kind":"Name","value":"message"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"sha"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"encoding"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"lastCommitSha"}},{"kind":"Field","name":{"kind":"Name","value":"lastAuthorDate"}},{"kind":"Field","name":{"kind":"Name","value":"lastCommitterDate"}}]}}]}}]} as unknown as DocumentNode<UpdateLedgerFileMutation, UpdateLedgerFileMutationVariables>;
export const DeleteLedgerFileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteLedgerFile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sha"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"message"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteLedgerFile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}},{"kind":"Argument","name":{"kind":"Name","value":"sha"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sha"}}},{"kind":"Argument","name":{"kind":"Name","value":"message"},"value":{"kind":"Variable","name":{"kind":"Name","value":"message"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"path"}}]}}]}}]} as unknown as DocumentNode<DeleteLedgerFileMutation, DeleteLedgerFileMutationVariables>;
export const RenameLedgerFileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RenameLedgerFile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"oldPath"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newPath"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"message"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"renameLedgerFile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"oldPath"},"value":{"kind":"Variable","name":{"kind":"Name","value":"oldPath"}}},{"kind":"Argument","name":{"kind":"Name","value":"newPath"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newPath"}}},{"kind":"Argument","name":{"kind":"Name","value":"message"},"value":{"kind":"Variable","name":{"kind":"Name","value":"message"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"oldPath"}},{"kind":"Field","name":{"kind":"Name","value":"newPath"}}]}}]}}]} as unknown as DocumentNode<RenameLedgerFileMutation, RenameLedgerFileMutationVariables>;
export const GetLedgerAccountReportDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerAccountReport"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"interval"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"conversion"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"time"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"account"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerAccountReport"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountName"}}},{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"interval"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interval"}}},{"kind":"Argument","name":{"kind":"Name","value":"conversion"},"value":{"kind":"Variable","name":{"kind":"Name","value":"conversion"}}},{"kind":"Argument","name":{"kind":"Name","value":"time"},"value":{"kind":"Variable","name":{"kind":"Name","value":"time"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"account"},"value":{"kind":"Variable","name":{"kind":"Name","value":"account"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"linechartData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}}]}},{"kind":"Field","name":{"kind":"Name","value":"intervalTotalsData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}}]}},{"kind":"Field","name":{"kind":"Name","value":"accountBalanceData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}}]}}]}}]}}]} as unknown as DocumentNode<GetLedgerAccountReportQuery, GetLedgerAccountReportQueryVariables>;
export const GetLedgerAccountJournalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerAccountJournal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AccountJournalQueryInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerAccountJournal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"with_children"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"entry"}},{"kind":"Field","name":{"kind":"Name","value":"change"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}}]}},{"kind":"Field","name":{"kind":"Name","value":"account"}}]}}]}}]} as unknown as DocumentNode<GetLedgerAccountJournalQuery, GetLedgerAccountJournalQueryVariables>;
export const GetLedgerBalanceSheetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerBalanceSheet"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"conversion"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"account"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"time"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"interval"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerAccounts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"StringValue","value":"closed","block":false}}]},{"kind":"Field","name":{"kind":"Name","value":"getLedgerBalanceSheet"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"conversion"},"value":{"kind":"Variable","name":{"kind":"Name","value":"conversion"}}},{"kind":"Argument","name":{"kind":"Name","value":"account"},"value":{"kind":"Variable","name":{"kind":"Name","value":"account"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"time"},"value":{"kind":"Variable","name":{"kind":"Name","value":"time"}}},{"kind":"Argument","name":{"kind":"Name","value":"interval"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interval"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"assetsHierarchyData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"balanceChildren"}},{"kind":"Field","name":{"kind":"Name","value":"cost"}},{"kind":"Field","name":{"kind":"Name","value":"costChildren"}},{"kind":"Field","name":{"kind":"Name","value":"hasTxns"}},{"kind":"Field","name":{"kind":"Name","value":"children"}}]}},{"kind":"Field","name":{"kind":"Name","value":"equityHierarchyData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"balanceChildren"}},{"kind":"Field","name":{"kind":"Name","value":"cost"}},{"kind":"Field","name":{"kind":"Name","value":"costChildren"}},{"kind":"Field","name":{"kind":"Name","value":"hasTxns"}},{"kind":"Field","name":{"kind":"Name","value":"children"}}]}},{"kind":"Field","name":{"kind":"Name","value":"liabilitiesHierarchyData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"balanceChildren"}},{"kind":"Field","name":{"kind":"Name","value":"cost"}},{"kind":"Field","name":{"kind":"Name","value":"costChildren"}},{"kind":"Field","name":{"kind":"Name","value":"hasTxns"}},{"kind":"Field","name":{"kind":"Name","value":"children"}}]}},{"kind":"Field","name":{"kind":"Name","value":"netWorthData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}}]}},{"kind":"Field","name":{"kind":"Name","value":"assetsData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}}]}},{"kind":"Field","name":{"kind":"Name","value":"liabilitiesData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}}]}},{"kind":"Field","name":{"kind":"Name","value":"equityData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}}]}}]}}]}}]} as unknown as DocumentNode<GetLedgerBalanceSheetQuery, GetLedgerBalanceSheetQueryVariables>;
export const GetLedgerIncomeStatementDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerIncomeStatement"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"conversion"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"account"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"time"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"interval"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerAccounts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"StringValue","value":"closed","block":false}}]},{"kind":"Field","name":{"kind":"Name","value":"getLedgerIncomeStatement"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"conversion"},"value":{"kind":"Variable","name":{"kind":"Name","value":"conversion"}}},{"kind":"Argument","name":{"kind":"Name","value":"account"},"value":{"kind":"Variable","name":{"kind":"Name","value":"account"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"time"},"value":{"kind":"Variable","name":{"kind":"Name","value":"time"}}},{"kind":"Argument","name":{"kind":"Name","value":"interval"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interval"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"incomeData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"accountBalances"}}]}},{"kind":"Field","name":{"kind":"Name","value":"expensesData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"accountBalances"}}]}},{"kind":"Field","name":{"kind":"Name","value":"netProfitData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}}]}},{"kind":"Field","name":{"kind":"Name","value":"expensesHierarchyData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"balanceChildren"}},{"kind":"Field","name":{"kind":"Name","value":"cost"}},{"kind":"Field","name":{"kind":"Name","value":"costChildren"}},{"kind":"Field","name":{"kind":"Name","value":"hasTxns"}},{"kind":"Field","name":{"kind":"Name","value":"children"}}]}},{"kind":"Field","name":{"kind":"Name","value":"incomeHierarchyData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"balanceChildren"}},{"kind":"Field","name":{"kind":"Name","value":"cost"}},{"kind":"Field","name":{"kind":"Name","value":"costChildren"}},{"kind":"Field","name":{"kind":"Name","value":"hasTxns"}},{"kind":"Field","name":{"kind":"Name","value":"children"}}]}}]}}]}}]} as unknown as DocumentNode<GetLedgerIncomeStatementQuery, GetLedgerIncomeStatementQueryVariables>;
export const GetLedgerOverviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerOverview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"conversion"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"account"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"time"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"interval"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerOverview"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"conversion"},"value":{"kind":"Variable","name":{"kind":"Name","value":"conversion"}}},{"kind":"Argument","name":{"kind":"Name","value":"account"},"value":{"kind":"Variable","name":{"kind":"Name","value":"account"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"time"},"value":{"kind":"Variable","name":{"kind":"Name","value":"time"}}},{"kind":"Argument","name":{"kind":"Name","value":"interval"},"value":{"kind":"Variable","name":{"kind":"Name","value":"interval"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"netWorthData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}}]}},{"kind":"Field","name":{"kind":"Name","value":"assetsData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}}]}},{"kind":"Field","name":{"kind":"Name","value":"assetsHierarchyData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"balanceChildren"}},{"kind":"Field","name":{"kind":"Name","value":"children"}},{"kind":"Field","name":{"kind":"Name","value":"hasTxns"}},{"kind":"Field","name":{"kind":"Name","value":"cost"}},{"kind":"Field","name":{"kind":"Name","value":"costChildren"}}]}},{"kind":"Field","name":{"kind":"Name","value":"liabilitiesData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}}]}},{"kind":"Field","name":{"kind":"Name","value":"liabilitiesHierarchyData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"balanceChildren"}},{"kind":"Field","name":{"kind":"Name","value":"children"}},{"kind":"Field","name":{"kind":"Name","value":"hasTxns"}},{"kind":"Field","name":{"kind":"Name","value":"cost"}},{"kind":"Field","name":{"kind":"Name","value":"costChildren"}}]}},{"kind":"Field","name":{"kind":"Name","value":"incomeIntervalData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"accountBalances"}}]}},{"kind":"Field","name":{"kind":"Name","value":"incomeHierarchyData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"balanceChildren"}},{"kind":"Field","name":{"kind":"Name","value":"children"}},{"kind":"Field","name":{"kind":"Name","value":"hasTxns"}},{"kind":"Field","name":{"kind":"Name","value":"cost"}},{"kind":"Field","name":{"kind":"Name","value":"costChildren"}}]}},{"kind":"Field","name":{"kind":"Name","value":"incomeData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}}]}},{"kind":"Field","name":{"kind":"Name","value":"expensesIntervalData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"accountBalances"}}]}},{"kind":"Field","name":{"kind":"Name","value":"expensesHierarchyData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"balanceChildren"}},{"kind":"Field","name":{"kind":"Name","value":"children"}},{"kind":"Field","name":{"kind":"Name","value":"hasTxns"}},{"kind":"Field","name":{"kind":"Name","value":"cost"}},{"kind":"Field","name":{"kind":"Name","value":"costChildren"}}]}},{"kind":"Field","name":{"kind":"Name","value":"expensesData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}}]}}]}}]}}]} as unknown as DocumentNode<GetLedgerOverviewQuery, GetLedgerOverviewQueryVariables>;
export const GetLedgerTrialBalanceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerTrialBalance"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"conversion"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"time"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filter"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"account"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerAccounts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"StringValue","value":"closed","block":false}}]},{"kind":"Field","name":{"kind":"Name","value":"getLedgerTrialBalance"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"conversion"},"value":{"kind":"Variable","name":{"kind":"Name","value":"conversion"}}},{"kind":"Argument","name":{"kind":"Name","value":"time"},"value":{"kind":"Variable","name":{"kind":"Name","value":"time"}}},{"kind":"Argument","name":{"kind":"Name","value":"filter"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filter"}}},{"kind":"Argument","name":{"kind":"Name","value":"account"},"value":{"kind":"Variable","name":{"kind":"Name","value":"account"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"incomeHierarchyData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"balanceChildren"}},{"kind":"Field","name":{"kind":"Name","value":"children"}},{"kind":"Field","name":{"kind":"Name","value":"hasTxns"}},{"kind":"Field","name":{"kind":"Name","value":"cost"}},{"kind":"Field","name":{"kind":"Name","value":"costChildren"}}]}},{"kind":"Field","name":{"kind":"Name","value":"liabilitiesHierarchyData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"balanceChildren"}},{"kind":"Field","name":{"kind":"Name","value":"children"}},{"kind":"Field","name":{"kind":"Name","value":"hasTxns"}},{"kind":"Field","name":{"kind":"Name","value":"cost"}},{"kind":"Field","name":{"kind":"Name","value":"costChildren"}}]}},{"kind":"Field","name":{"kind":"Name","value":"equityHierarchyData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"balanceChildren"}},{"kind":"Field","name":{"kind":"Name","value":"children"}},{"kind":"Field","name":{"kind":"Name","value":"hasTxns"}},{"kind":"Field","name":{"kind":"Name","value":"cost"}},{"kind":"Field","name":{"kind":"Name","value":"costChildren"}}]}},{"kind":"Field","name":{"kind":"Name","value":"expensesHierarchyData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"balanceChildren"}},{"kind":"Field","name":{"kind":"Name","value":"children"}},{"kind":"Field","name":{"kind":"Name","value":"hasTxns"}},{"kind":"Field","name":{"kind":"Name","value":"cost"}},{"kind":"Field","name":{"kind":"Name","value":"costChildren"}}]}},{"kind":"Field","name":{"kind":"Name","value":"assetsHierarchyData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"account"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"balanceChildren"}},{"kind":"Field","name":{"kind":"Name","value":"children"}},{"kind":"Field","name":{"kind":"Name","value":"hasTxns"}},{"kind":"Field","name":{"kind":"Name","value":"cost"}},{"kind":"Field","name":{"kind":"Name","value":"costChildren"}}]}}]}}]}}]} as unknown as DocumentNode<GetLedgerTrialBalanceQuery, GetLedgerTrialBalanceQueryVariables>;
export const InsertReceiptTransactionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"InsertReceiptTransaction"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"receiptObjectKey"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"InsertReceiptTransactionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"insertReceiptTransaction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"receiptObjectKey"},"value":{"kind":"Variable","name":{"kind":"Name","value":"receiptObjectKey"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<InsertReceiptTransactionMutation, InsertReceiptTransactionMutationVariables>;
export const ParseFileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ParseFile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"s3ObjectKey"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"fileFormat"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"parseFile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"s3ObjectKey"},"value":{"kind":"Variable","name":{"kind":"Name","value":"s3ObjectKey"}}},{"kind":"Argument","name":{"kind":"Name","value":"fileFormat"},"value":{"kind":"Variable","name":{"kind":"Name","value":"fileFormat"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rows"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"payee"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}}]}}]}}]}}]} as unknown as DocumentNode<ParseFileMutation, ParseFileMutationVariables>;
export const ParseReceiptDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ParseReceipt"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"s3ObjectKey"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"parseReceipt"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"s3ObjectKey"},"value":{"kind":"Variable","name":{"kind":"Name","value":"s3ObjectKey"}}},{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"payee"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"sourceAccount"}},{"kind":"Field","name":{"kind":"Name","value":"targetAccount"}}]}}]}}]} as unknown as DocumentNode<ParseReceiptMutation, ParseReceiptMutationVariables>;
export const CreatePlaidLinkTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePlaidLinkToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPlaidLinkToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"linkToken"}}]}}]}}]} as unknown as DocumentNode<CreatePlaidLinkTokenMutation, CreatePlaidLinkTokenMutationVariables>;
export const CreatePlaidUpdateModeLinkTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePlaidUpdateModeLinkToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"itemId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountSelection"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPlaidUpdateModeLinkToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"itemId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"itemId"}}},{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"accountSelection"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountSelection"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"linkToken"}}]}}]}}]} as unknown as DocumentNode<CreatePlaidUpdateModeLinkTokenMutation, CreatePlaidUpdateModeLinkTokenMutationVariables>;
export const ReconcilePlaidAccountsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ReconcilePlaidAccounts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"itemId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reconcilePlaidAccounts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"itemId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"itemId"}}},{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"addedCount"}},{"kind":"Field","name":{"kind":"Name","value":"removedCount"}}]}}]}}]} as unknown as DocumentNode<ReconcilePlaidAccountsMutation, ReconcilePlaidAccountsMutationVariables>;
export const ExchangePlaidPublicTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ExchangePlaidPublicToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"publicToken"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exchangePlaidPublicToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"publicToken"},"value":{"kind":"Variable","name":{"kind":"Name","value":"publicToken"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<ExchangePlaidPublicTokenMutation, ExchangePlaidPublicTokenMutationVariables>;
export const UpdatePlaidAccountMappingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdatePlaidAccountMapping"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerAccount"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePlaidAccountMapping"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}}},{"kind":"Argument","name":{"kind":"Name","value":"ledgerAccount"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerAccount"}}},{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}]}]}}]} as unknown as DocumentNode<UpdatePlaidAccountMappingMutation, UpdatePlaidAccountMappingMutationVariables>;
export const UpdatePlaidAccountCurrencyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdatePlaidAccountCurrency"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"currency"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePlaidAccountCurrency"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"accountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}}},{"kind":"Argument","name":{"kind":"Name","value":"currency"},"value":{"kind":"Variable","name":{"kind":"Name","value":"currency"}}},{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}]}]}}]} as unknown as DocumentNode<UpdatePlaidAccountCurrencyMutation, UpdatePlaidAccountCurrencyMutationVariables>;
export const RefreshPlaidItemStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RefreshPlaidItemStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"itemId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"refreshPlaidItemStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"itemId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"itemId"}}},{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"errorCode"}},{"kind":"Field","name":{"kind":"Name","value":"errorMessage"}}]}}]}}]} as unknown as DocumentNode<RefreshPlaidItemStatusMutation, RefreshPlaidItemStatusMutationVariables>;
export const UnlinkPlaidItemDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnlinkPlaidItem"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"itemId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unlinkPlaidItem"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"itemId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"itemId"}}},{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}]}]}}]} as unknown as DocumentNode<UnlinkPlaidItemMutation, UnlinkPlaidItemMutationVariables>;
export const SyncPlaidTransactionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SyncPlaidTransactions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"itemId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"syncPlaidTransactions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"itemId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"itemId"}}},{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"transactionsFetched"}},{"kind":"Field","name":{"kind":"Name","value":"transactionsAdded"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<SyncPlaidTransactionsMutation, SyncPlaidTransactionsMutationVariables>;
export const SubmitPlaidTransactionsToLedgerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SubmitPlaidTransactionsToLedger"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"transactions"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PlaidTransactionSubmitInput"}}}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filename"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"submitPlaidTransactionsToLedger"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"transactions"},"value":{"kind":"Variable","name":{"kind":"Name","value":"transactions"}}},{"kind":"Argument","name":{"kind":"Name","value":"filename"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filename"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"addedCount"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<SubmitPlaidTransactionsToLedgerMutation, SubmitPlaidTransactionsToLedgerMutationVariables>;
export const DeletePlaidTransactionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeletePlaidTransactions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"transactionIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deletePlaidTransactions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"transactionIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"transactionIds"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"deletedCount"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeletePlaidTransactionsMutation, DeletePlaidTransactionsMutationVariables>;
export const ApprovePullRequestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ApprovePullRequest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerOwner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"prNumber"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"approvePullRequest"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerOwner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerOwner"}}},{"kind":"Argument","name":{"kind":"Name","value":"ledgerName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerName"}}},{"kind":"Argument","name":{"kind":"Name","value":"prNumber"},"value":{"kind":"Variable","name":{"kind":"Name","value":"prNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<ApprovePullRequestMutation, ApprovePullRequestMutationVariables>;
export const RejectPullRequestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RejectPullRequest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerOwner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"prNumber"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rejectPullRequest"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerOwner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerOwner"}}},{"kind":"Argument","name":{"kind":"Name","value":"ledgerName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerName"}}},{"kind":"Argument","name":{"kind":"Name","value":"prNumber"},"value":{"kind":"Variable","name":{"kind":"Name","value":"prNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<RejectPullRequestMutation, RejectPullRequestMutationVariables>;
export const CancelSubscriptionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CancelSubscription"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"clientId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"subscriptionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelSubscription"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"clientId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"clientId"}}},{"kind":"Argument","name":{"kind":"Name","value":"subscriptionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subscriptionId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<CancelSubscriptionMutation, CancelSubscriptionMutationVariables>;
export const ResumeSubscriptionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResumeSubscription"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"clientId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"subscriptionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resumeSubscription"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"clientId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"clientId"}}},{"kind":"Argument","name":{"kind":"Name","value":"subscriptionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"subscriptionId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<ResumeSubscriptionMutation, ResumeSubscriptionMutationVariables>;
export const CreateSubscriptionSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSubscriptionSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"clientId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"priceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSubscriptionSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"clientId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"clientId"}}},{"kind":"Argument","name":{"kind":"Name","value":"priceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"priceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"sessionId"}},{"kind":"Field","name":{"kind":"Name","value":"sessionUrl"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<CreateSubscriptionSessionMutation, CreateSubscriptionSessionMutationVariables>;
export const CreateStripePortalSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateStripePortalSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"clientId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createStripePortalSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"clientId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"clientId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"sessionId"}},{"kind":"Field","name":{"kind":"Name","value":"sessionUrl"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<CreateStripePortalSessionMutation, CreateStripePortalSessionMutationVariables>;
export const UpgradeSubscriptionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpgradeSubscription"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"clientId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"priceId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"upgradeSubscription"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"clientId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"clientId"}}},{"kind":"Argument","name":{"kind":"Name","value":"priceId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"priceId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"clientSecret"}},{"kind":"Field","name":{"kind":"Name","value":"subscriptionId"}},{"kind":"Field","name":{"kind":"Name","value":"newTier"}}]}}]}}]} as unknown as DocumentNode<UpgradeSubscriptionMutation, UpgradeSubscriptionMutationVariables>;
export const GenerateTempAssetUploadUrlDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateTempAssetUploadUrl"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"mimeType"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filename"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateTempAssetUploadUrl"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"mimeType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"mimeType"}}},{"kind":"Argument","name":{"kind":"Name","value":"filename"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filename"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"uploadUrl"}},{"kind":"Field","name":{"kind":"Name","value":"objectKey"}},{"kind":"Field","name":{"kind":"Name","value":"expiresIn"}}]}}]}}]} as unknown as DocumentNode<GenerateTempAssetUploadUrlMutation, GenerateTempAssetUploadUrlMutationVariables>;
export const FollowUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"FollowUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"username"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"followUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"username"},"value":{"kind":"Variable","name":{"kind":"Name","value":"username"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"isFollowing"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<FollowUserMutation, FollowUserMutationVariables>;
export const UnfollowUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnfollowUser"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"username"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unfollowUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"username"},"value":{"kind":"Variable","name":{"kind":"Name","value":"username"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"isFollowing"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<UnfollowUserMutation, UnfollowUserMutationVariables>;
export const IsAuthenticatedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"IsAuthenticated"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userProfile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<IsAuthenticatedQuery, IsAuthenticatedQueryVariables>;
export const SignInDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SignIn"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"signIn"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expireAt"}}]}}]}}]} as unknown as DocumentNode<SignInMutation, SignInMutationVariables>;
export const GetCurrentUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCurrentUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userProfile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"emailReportStatus"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"hasEverSubscribed"}},{"kind":"Field","name":{"kind":"Name","value":"limits"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ledgersUsed"}},{"kind":"Field","name":{"kind":"Name","value":"ledgersMax"}},{"kind":"Field","name":{"kind":"Name","value":"collaboratorsPerLedgerMax"}},{"kind":"Field","name":{"kind":"Name","value":"maxDirectives"}}]}}]}}]}}]} as unknown as DocumentNode<GetCurrentUserQuery, GetCurrentUserQueryVariables>;
export const GetAiCfoUsageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAiCfoUsage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"aiCfoUsage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"aiCfoTokensUsed"}},{"kind":"Field","name":{"kind":"Name","value":"aiCfoTokensMax"}}]}}]}}]} as unknown as DocumentNode<GetAiCfoUsageQuery, GetAiCfoUsageQueryVariables>;
export const SignInWithOneTimeTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SignInWithOneTimeToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"signInWithOneTimeToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expireAt"}}]}}]}}]} as unknown as DocumentNode<SignInWithOneTimeTokenMutation, SignInWithOneTimeTokenMutationVariables>;
export const RefreshTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RefreshToken"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"refreshToken"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expireAt"}}]}}]}}]} as unknown as DocumentNode<RefreshTokenMutation, RefreshTokenMutationVariables>;
export const DeleteAccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteAccount"}}]}}]} as unknown as DocumentNode<DeleteAccountMutation, DeleteAccountMutationVariables>;
export const LogoutDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Logout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"logout"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<LogoutMutation, LogoutMutationVariables>;
export const UpdateUsernameDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUsername"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"username"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUsername"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"username"},"value":{"kind":"Variable","name":{"kind":"Name","value":"username"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"emailReportStatus"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}}]} as unknown as DocumentNode<UpdateUsernameMutation, UpdateUsernameMutationVariables>;
export const UpdateProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"firstName"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"lastName"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProfile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"firstName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"firstName"}}},{"kind":"Argument","name":{"kind":"Name","value":"lastName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"lastName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"lastName"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"firstName"}},{"kind":"Field","name":{"kind":"Name","value":"emailReportStatus"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}}]} as unknown as DocumentNode<UpdateProfileMutation, UpdateProfileMutationVariables>;
export const SendForgotPasswordLinkDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SendForgotPasswordLink"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sendForgotPasswordLink"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<SendForgotPasswordLinkMutation, SendForgotPasswordLinkMutationVariables>;
export const ValidateEmailTokenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ValidateEmailToken"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"validateEmailToken"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"isValid"}}]}}]}}]} as unknown as DocumentNode<ValidateEmailTokenQuery, ValidateEmailTokenQueryVariables>;
export const ResetPasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResetPassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"token"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newPassword"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resetPassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"token"},"value":{"kind":"Variable","name":{"kind":"Name","value":"token"}}},{"kind":"Argument","name":{"kind":"Name","value":"newPassword"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newPassword"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<ResetPasswordMutation, ResetPasswordMutationVariables>;
export const SignUpDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SignUp"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"email"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"password"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"firstName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"lastName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"inviteBy"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"inviteSrc"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"username"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"withDefaultLedger"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"signUp"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"email"},"value":{"kind":"Variable","name":{"kind":"Name","value":"email"}}},{"kind":"Argument","name":{"kind":"Name","value":"password"},"value":{"kind":"Variable","name":{"kind":"Name","value":"password"}}},{"kind":"Argument","name":{"kind":"Name","value":"firstName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"firstName"}}},{"kind":"Argument","name":{"kind":"Name","value":"lastName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"lastName"}}},{"kind":"Argument","name":{"kind":"Name","value":"inviteBy"},"value":{"kind":"Variable","name":{"kind":"Name","value":"inviteBy"}}},{"kind":"Argument","name":{"kind":"Name","value":"inviteSrc"},"value":{"kind":"Variable","name":{"kind":"Name","value":"inviteSrc"}}},{"kind":"Argument","name":{"kind":"Name","value":"username"},"value":{"kind":"Variable","name":{"kind":"Name","value":"username"}}},{"kind":"Argument","name":{"kind":"Name","value":"withDefaultLedger"},"value":{"kind":"Variable","name":{"kind":"Name","value":"withDefaultLedger"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sessionId"}},{"kind":"Field","name":{"kind":"Name","value":"expireAt"}}]}}]}}]} as unknown as DocumentNode<SignUpMutation, SignUpMutationVariables>;
export const VerifySignUpOtpDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"VerifySignUpOtp"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"otp"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"verifySignUpOtp"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sessionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}}},{"kind":"Argument","name":{"kind":"Name","value":"otp"},"value":{"kind":"Variable","name":{"kind":"Name","value":"otp"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"token"}},{"kind":"Field","name":{"kind":"Name","value":"expireAt"}}]}}]}}]} as unknown as DocumentNode<VerifySignUpOtpMutation, VerifySignUpOtpMutationVariables>;
export const ConfirmCliAuthSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ConfirmCliAuthSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"confirmCliAuthSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sessionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<ConfirmCliAuthSessionMutation, ConfirmCliAuthSessionMutationVariables>;
export const DenyCliAuthSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DenyCliAuthSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"denyCliAuthSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sessionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<DenyCliAuthSessionMutation, DenyCliAuthSessionMutationVariables>;
export const GetCliAuthSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCliAuthSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getCliAuthSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sessionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<GetCliAuthSessionQuery, GetCliAuthSessionQueryVariables>;
export const ListLedgerCollaboratorsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListLedgerCollaborators"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"page"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listLedgerCollaborators"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"page"},"value":{"kind":"Variable","name":{"kind":"Name","value":"page"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"lastLogin"}},{"kind":"Field","name":{"kind":"Name","value":"isAdmin"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"created"}},{"kind":"Field","name":{"kind":"Name","value":"active"}},{"kind":"Field","name":{"kind":"Name","value":"permission"}}]}}]}}]} as unknown as DocumentNode<ListLedgerCollaboratorsQuery, ListLedgerCollaboratorsQueryVariables>;
export const AddLedgerCollaboratorDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddLedgerCollaborator"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"collaborator"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"permission"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addOrUpdateLedgerCollaborator"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"collaborator"},"value":{"kind":"Variable","name":{"kind":"Name","value":"collaborator"}}},{"kind":"Argument","name":{"kind":"Name","value":"permission"},"value":{"kind":"Variable","name":{"kind":"Name","value":"permission"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<AddLedgerCollaboratorMutation, AddLedgerCollaboratorMutationVariables>;
export const DeleteLedgerCollaboratorDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteLedgerCollaborator"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"collaborator"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteLedgerCollaborator"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"collaborator"},"value":{"kind":"Variable","name":{"kind":"Name","value":"collaborator"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<DeleteLedgerCollaboratorMutation, DeleteLedgerCollaboratorMutationVariables>;
export const GetUserByExactMatchDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserByExactMatch"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"keyword"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getUserByExactMatch"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"keyword"},"value":{"kind":"Variable","name":{"kind":"Name","value":"keyword"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}}]} as unknown as DocumentNode<GetUserByExactMatchQuery, GetUserByExactMatchQueryVariables>;
export const LeaveLedgerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"LeaveLedger"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"leaveLedger"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<LeaveLedgerMutation, LeaveLedgerMutationVariables>;
export const ListCommitsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListCommits"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"branch"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"page"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listCommits"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"branch"},"value":{"kind":"Variable","name":{"kind":"Name","value":"branch"}}},{"kind":"Argument","name":{"kind":"Name","value":"page"},"value":{"kind":"Variable","name":{"kind":"Name","value":"page"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sha"}},{"kind":"Field","name":{"kind":"Name","value":"shortSha"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"date"}}]}}]}}]}}]} as unknown as DocumentNode<ListCommitsQuery, ListCommitsQueryVariables>;
export const GetLatestLedgerCommitDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLatestLedgerCommit"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"branchName"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLatestLedgerCommit"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"branchName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"branchName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sha"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"created"}}]}}]}}]} as unknown as DocumentNode<GetLatestLedgerCommitQuery, GetLatestLedgerCommitQueryVariables>;
export const GetCommitDetailsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetCommitDetails"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sha"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getCommitDetails"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"sha"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sha"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sha"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"author"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"date"}}]}},{"kind":"Field","name":{"kind":"Name","value":"committer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"date"}}]}},{"kind":"Field","name":{"kind":"Name","value":"files"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"additions"}},{"kind":"Field","name":{"kind":"Name","value":"deletions"}}]}},{"kind":"Field","name":{"kind":"Name","value":"stats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"additions"}},{"kind":"Field","name":{"kind":"Name","value":"deletions"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}},{"kind":"Field","name":{"kind":"Name","value":"diff"}},{"kind":"Field","name":{"kind":"Name","value":"parents"}}]}}]}}]} as unknown as DocumentNode<GetCommitDetailsQuery, GetCommitDetailsQueryVariables>;
export const GetFeedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetFeed"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"source"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"locale"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getFeed"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"source"},"value":{"kind":"Variable","name":{"kind":"Name","value":"source"}}},{"kind":"Argument","name":{"kind":"Name","value":"locale"},"value":{"kind":"Variable","name":{"kind":"Name","value":"locale"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"link"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"author"}},{"kind":"Field","name":{"kind":"Name","value":"authorAvatar"}},{"kind":"Field","name":{"kind":"Name","value":"source"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"hasMore"}}]}}]}}]} as unknown as DocumentNode<GetFeedQuery, GetFeedQueryVariables>;
export const GetLedgerFileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerFile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerFile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"sha"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"encoding"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"lastCommitSha"}},{"kind":"Field","name":{"kind":"Name","value":"lastAuthorDate"}},{"kind":"Field","name":{"kind":"Name","value":"lastCommitterDate"}}]}}]}}]} as unknown as DocumentNode<GetLedgerFileQuery, GetLedgerFileQueryVariables>;
export const GetLedgerJournalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerJournal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JournalQueryInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerJournal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"data"}},{"kind":"Field","name":{"kind":"Name","value":"is_empty"}}]}}]}}]} as unknown as DocumentNode<GetLedgerJournalQuery, GetLedgerJournalQueryVariables>;
export const BulkEntriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BulkEntries"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entries"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AddEntryInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"bulkEntries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"entries"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entries"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<BulkEntriesMutation, BulkEntriesMutationVariables>;
export const SuggestTransactionCategoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SuggestTransactionCategories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"transactions"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TransactionToCategorizeInput"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"suggestTransactionCategories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"transactions"},"value":{"kind":"Variable","name":{"kind":"Name","value":"transactions"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rowIndex"}},{"kind":"Field","name":{"kind":"Name","value":"targetAccount"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"reasoning"}}]}}]}}]} as unknown as DocumentNode<SuggestTransactionCategoriesQuery, SuggestTransactionCategoriesQueryVariables>;
export const GetLedgerEntryContextDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerEntryContext"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"entryHash"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerEntryContext"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"entryHash"},"value":{"kind":"Variable","name":{"kind":"Name","value":"entryHash"}}},{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"slice"}},{"kind":"Field","name":{"kind":"Name","value":"sha256sum"}},{"kind":"Field","name":{"kind":"Name","value":"entry"}},{"kind":"Field","name":{"kind":"Name","value":"balances_before"}},{"kind":"Field","name":{"kind":"Name","value":"balances_after"}}]}}]}}]} as unknown as DocumentNode<GetLedgerEntryContextQuery, GetLedgerEntryContextQueryVariables>;
export const DeleteLedgerEntrySourceSliceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteLedgerEntrySourceSlice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DeleteSourceSliceInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteLedgerEntrySourceSlice"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}},{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"entryHash"}}]}}]}}]} as unknown as DocumentNode<DeleteLedgerEntrySourceSliceMutation, DeleteLedgerEntrySourceSliceMutationVariables>;
export const UpdateLedgerEntrySourceSliceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateLedgerEntrySourceSlice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateSourceSliceInput"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateLedgerEntrySourceSlice"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}},{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"newSha256sum"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"entryHash"}}]}}]}}]} as unknown as DocumentNode<UpdateLedgerEntrySourceSliceMutation, UpdateLedgerEntrySourceSliceMutationVariables>;
export const GetLedgerPlaintextJournalDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerPlaintextJournal"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"PlaintextJournalQueryInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerPlaintextJournal"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"content"}}]}}]}}]} as unknown as DocumentNode<GetLedgerPlaintextJournalQuery, GetLedgerPlaintextJournalQueryVariables>;
export const CreatePublicKeyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreatePublicKey"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"key"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"title"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"readOnly"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createPublicKey"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"key"},"value":{"kind":"Variable","name":{"kind":"Name","value":"key"}}},{"kind":"Argument","name":{"kind":"Name","value":"title"},"value":{"kind":"Variable","name":{"kind":"Name","value":"title"}}},{"kind":"Argument","name":{"kind":"Name","value":"readOnly"},"value":{"kind":"Variable","name":{"kind":"Name","value":"readOnly"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"fingerprint"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsedAt"}}]}}]}}]} as unknown as DocumentNode<CreatePublicKeyMutation, CreatePublicKeyMutationVariables>;
export const DeletePublicKeyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeletePublicKey"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"keyId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deletePublicKey"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"keyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"keyId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<DeletePublicKeyMutation, DeletePublicKeyMutationVariables>;
export const ListPublicKeysDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListPublicKeys"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"page"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listPublicKeys"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"page"},"value":{"kind":"Variable","name":{"kind":"Name","value":"page"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"fingerprint"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsedAt"}}]}}]}}]} as unknown as DocumentNode<ListPublicKeysQuery, ListPublicKeysQueryVariables>;
export const GetPublicKeyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPublicKey"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"keyId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getPublicKey"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"keyId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"keyId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"fingerprint"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastUsedAt"}}]}}]}}]} as unknown as DocumentNode<GetPublicKeyQuery, GetPublicKeyQueryVariables>;
export const GetLedgerAssetDownloadUrlDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerAssetDownloadUrl"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerRepoId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"filename"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerAssetDownloadUrl"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerRepoId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerRepoId"}}},{"kind":"Argument","name":{"kind":"Name","value":"filename"},"value":{"kind":"Variable","name":{"kind":"Name","value":"filename"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"downloadUrl"}}]}}]}}]} as unknown as DocumentNode<GetLedgerAssetDownloadUrlQuery, GetLedgerAssetDownloadUrlQueryVariables>;
export const CreateLedgerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateLedger"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"private"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"template"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"LedgerTemplate"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createLedger"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"private"},"value":{"kind":"Variable","name":{"kind":"Name","value":"private"}}},{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}},{"kind":"Argument","name":{"kind":"Name","value":"template"},"value":{"kind":"Variable","name":{"kind":"Name","value":"template"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"sshUrl"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"private"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"empty"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"httpUrl"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"admin"}},{"kind":"Field","name":{"kind":"Name","value":"pull"}},{"kind":"Field","name":{"kind":"Name","value":"push"}}]}}]}}]}}]} as unknown as DocumentNode<CreateLedgerMutation, CreateLedgerMutationVariables>;
export const UpdateLedgerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateLedger"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"private"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"description"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateLedger"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}},{"kind":"Argument","name":{"kind":"Name","value":"private"},"value":{"kind":"Variable","name":{"kind":"Name","value":"private"}}},{"kind":"Argument","name":{"kind":"Name","value":"description"},"value":{"kind":"Variable","name":{"kind":"Name","value":"description"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"httpUrl"}},{"kind":"Field","name":{"kind":"Name","value":"sshUrl"}},{"kind":"Field","name":{"kind":"Name","value":"private"}},{"kind":"Field","name":{"kind":"Name","value":"empty"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"admin"}},{"kind":"Field","name":{"kind":"Name","value":"pull"}},{"kind":"Field","name":{"kind":"Name","value":"push"}}]}}]}}]}}]} as unknown as DocumentNode<UpdateLedgerMutation, UpdateLedgerMutationVariables>;
export const DeleteLedgerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteLedger"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteLedger"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ledgerId"}}]}}]}}]} as unknown as DocumentNode<DeleteLedgerMutation, DeleteLedgerMutationVariables>;
export const ListLedgersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListLedgers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"page"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listLedgers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"page"},"value":{"kind":"Variable","name":{"kind":"Name","value":"page"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"httpUrl"}},{"kind":"Field","name":{"kind":"Name","value":"sshUrl"}},{"kind":"Field","name":{"kind":"Name","value":"private"}},{"kind":"Field","name":{"kind":"Name","value":"empty"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"admin"}},{"kind":"Field","name":{"kind":"Name","value":"pull"}},{"kind":"Field","name":{"kind":"Name","value":"push"}}]}}]}}]}}]} as unknown as DocumentNode<ListLedgersQuery, ListLedgersQueryVariables>;
export const GetLedgerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedger"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedger"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"httpUrl"}},{"kind":"Field","name":{"kind":"Name","value":"sshUrl"}},{"kind":"Field","name":{"kind":"Name","value":"private"}},{"kind":"Field","name":{"kind":"Name","value":"empty"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"isStarred"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"admin"}},{"kind":"Field","name":{"kind":"Name","value":"pull"}},{"kind":"Field","name":{"kind":"Name","value":"push"}}]}},{"kind":"Field","name":{"kind":"Name","value":"options"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"nameAssets"}},{"kind":"Field","name":{"kind":"Name","value":"nameEquity"}},{"kind":"Field","name":{"kind":"Name","value":"nameExpenses"}},{"kind":"Field","name":{"kind":"Name","value":"nameIncome"}},{"kind":"Field","name":{"kind":"Name","value":"nameLiabilities"}},{"kind":"Field","name":{"kind":"Name","value":"accountCurrentConversions"}},{"kind":"Field","name":{"kind":"Name","value":"accountCurrentEarnings"}},{"kind":"Field","name":{"kind":"Name","value":"renderCommas"}},{"kind":"Field","name":{"kind":"Name","value":"operatingCurrency"}}]}},{"kind":"Field","name":{"kind":"Name","value":"favaOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accountJournalIncludeChildren"}},{"kind":"Field","name":{"kind":"Name","value":"autoReload"}},{"kind":"Field","name":{"kind":"Name","value":"collapsePattern"}},{"kind":"Field","name":{"kind":"Name","value":"conversionCurrencies"}},{"kind":"Field","name":{"kind":"Name","value":"currencyColumn"}},{"kind":"Field","name":{"kind":"Name","value":"defaultPage"}},{"kind":"Field","name":{"kind":"Name","value":"fiscalYearEnd"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"month"}},{"kind":"Field","name":{"kind":"Name","value":"day"}}]}},{"kind":"Field","name":{"kind":"Name","value":"indent"}},{"kind":"Field","name":{"kind":"Name","value":"invertIncomeLiabilitiesEquity"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"locale"}},{"kind":"Field","name":{"kind":"Name","value":"showAccountsWithZeroBalance"}},{"kind":"Field","name":{"kind":"Name","value":"showAccountsWithZeroTransactions"}},{"kind":"Field","name":{"kind":"Name","value":"showClosedAccounts"}},{"kind":"Field","name":{"kind":"Name","value":"sidebarShowQueries"}},{"kind":"Field","name":{"kind":"Name","value":"unrealized"}},{"kind":"Field","name":{"kind":"Name","value":"upcomingEvents"}},{"kind":"Field","name":{"kind":"Name","value":"uptodateIndicatorGreyLookbackDays"}},{"kind":"Field","name":{"kind":"Name","value":"useExternalEditor"}}]}},{"kind":"Field","name":{"kind":"Name","value":"bcioOptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"defaultFile"}},{"kind":"Field","name":{"kind":"Name","value":"transactionFile"}},{"kind":"Field","name":{"kind":"Name","value":"accountFile"}},{"kind":"Field","name":{"kind":"Name","value":"priceFile"}},{"kind":"Field","name":{"kind":"Name","value":"balanceFile"}},{"kind":"Field","name":{"kind":"Name","value":"noteFile"}},{"kind":"Field","name":{"kind":"Name","value":"padFile"}}]}}]}}]}}]} as unknown as DocumentNode<GetLedgerQuery, GetLedgerQueryVariables>;
export const GetLedgerSourceFilesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerSourceFiles"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerSourceFiles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}]}]}}]} as unknown as DocumentNode<GetLedgerSourceFilesQuery, GetLedgerSourceFilesQueryVariables>;
export const GetLedgerOperatingCurrenciesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerOperatingCurrencies"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedger"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"options"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"operatingCurrency"}}]}}]}}]}}]} as unknown as DocumentNode<GetLedgerOperatingCurrenciesQuery, GetLedgerOperatingCurrenciesQueryVariables>;
export const SearchLedgersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SearchLedgers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"page"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sort"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"exclusive"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"mode"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"archived"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"template"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"uid"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"includeDesc"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"topic"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"q"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"private"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"starredBy"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"teamId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"priorityOwnerId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isPrivate"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"searchLedgers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"page"},"value":{"kind":"Variable","name":{"kind":"Name","value":"page"}}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order"}}},{"kind":"Argument","name":{"kind":"Name","value":"sort"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sort"}}},{"kind":"Argument","name":{"kind":"Name","value":"exclusive"},"value":{"kind":"Variable","name":{"kind":"Name","value":"exclusive"}}},{"kind":"Argument","name":{"kind":"Name","value":"mode"},"value":{"kind":"Variable","name":{"kind":"Name","value":"mode"}}},{"kind":"Argument","name":{"kind":"Name","value":"archived"},"value":{"kind":"Variable","name":{"kind":"Name","value":"archived"}}},{"kind":"Argument","name":{"kind":"Name","value":"template"},"value":{"kind":"Variable","name":{"kind":"Name","value":"template"}}},{"kind":"Argument","name":{"kind":"Name","value":"uid"},"value":{"kind":"Variable","name":{"kind":"Name","value":"uid"}}},{"kind":"Argument","name":{"kind":"Name","value":"includeDesc"},"value":{"kind":"Variable","name":{"kind":"Name","value":"includeDesc"}}},{"kind":"Argument","name":{"kind":"Name","value":"topic"},"value":{"kind":"Variable","name":{"kind":"Name","value":"topic"}}},{"kind":"Argument","name":{"kind":"Name","value":"q"},"value":{"kind":"Variable","name":{"kind":"Name","value":"q"}}},{"kind":"Argument","name":{"kind":"Name","value":"private"},"value":{"kind":"Variable","name":{"kind":"Name","value":"private"}}},{"kind":"Argument","name":{"kind":"Name","value":"starredBy"},"value":{"kind":"Variable","name":{"kind":"Name","value":"starredBy"}}},{"kind":"Argument","name":{"kind":"Name","value":"teamId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"teamId"}}},{"kind":"Argument","name":{"kind":"Name","value":"priorityOwnerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"priorityOwnerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"isPrivate"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isPrivate"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"sshUrl"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"private"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"empty"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"httpUrl"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"permissions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"admin"}},{"kind":"Field","name":{"kind":"Name","value":"pull"}},{"kind":"Field","name":{"kind":"Name","value":"push"}}]}}]}}]}}]} as unknown as DocumentNode<SearchLedgersQuery, SearchLedgersQueryVariables>;
export const ListUserOwnedLedgersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListUserOwnedLedgers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"page"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listUserOwnedLedgers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"page"},"value":{"kind":"Variable","name":{"kind":"Name","value":"page"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"sshUrl"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"private"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"httpUrl"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"empty"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<ListUserOwnedLedgersQuery, ListUserOwnedLedgersQueryVariables>;
export const StarLedgerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StarLedger"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"starLedger"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"isStarred"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<StarLedgerMutation, StarLedgerMutationVariables>;
export const UnstarLedgerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnstarLedger"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unstarLedger"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"isStarred"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<UnstarLedgerMutation, UnstarLedgerMutationVariables>;
export const GetPlaidItemsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPlaidItems"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getPlaidItems"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"errorMessage"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"lastSync"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"timestamp"}},{"kind":"Field","name":{"kind":"Name","value":"transactionsAdded"}},{"kind":"Field","name":{"kind":"Name","value":"errorMessage"}}]}}]}}]}}]} as unknown as DocumentNode<GetPlaidItemsQuery, GetPlaidItemsQueryVariables>;
export const GetPlaidAccountsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPlaidAccounts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"itemId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getPlaidAccounts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"itemId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"itemId"}}},{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"accountName"}},{"kind":"Field","name":{"kind":"Name","value":"accountType"}},{"kind":"Field","name":{"kind":"Name","value":"mask"}},{"kind":"Field","name":{"kind":"Name","value":"ledgerAccount"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}}]}}]}}]} as unknown as DocumentNode<GetPlaidAccountsQuery, GetPlaidAccountsQueryVariables>;
export const GetPlaidAccountsForLedgerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPlaidAccountsForLedger"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getPlaidAccountsForLedger"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"plaidItemId"}},{"kind":"Field","name":{"kind":"Name","value":"accountName"}},{"kind":"Field","name":{"kind":"Name","value":"mask"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}}]}}]}}]} as unknown as DocumentNode<GetPlaidAccountsForLedgerQuery, GetPlaidAccountsForLedgerQueryVariables>;
export const GetUnsyncedPlaidTransactionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUnsyncedPlaidTransactions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getUnsyncedPlaidTransactions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"accountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"plaidAccountId"}},{"kind":"Field","name":{"kind":"Name","value":"transactionId"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"merchantName"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"isPending"}},{"kind":"Field","name":{"kind":"Name","value":"accountName"}},{"kind":"Field","name":{"kind":"Name","value":"institutionName"}},{"kind":"Field","name":{"kind":"Name","value":"ledgerAccount"}}]}}]}}]} as unknown as DocumentNode<GetUnsyncedPlaidTransactionsQuery, GetUnsyncedPlaidTransactionsQueryVariables>;
export const SuggestPlaidTransactionCategoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SuggestPlaidTransactionCategories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"suggestPlaidTransactionCategories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"accountId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"accountId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rowIndex"}},{"kind":"Field","name":{"kind":"Name","value":"targetAccount"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"reasoning"}}]}}]}}]} as unknown as DocumentNode<SuggestPlaidTransactionCategoriesQuery, SuggestPlaidTransactionCategoriesQueryVariables>;
export const SuggestPlaidAccountMappingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SuggestPlaidAccountMapping"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"itemId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"suggestPlaidAccountMapping"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"itemId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"itemId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accountId"}},{"kind":"Field","name":{"kind":"Name","value":"suggestedAccount"}},{"kind":"Field","name":{"kind":"Name","value":"confidence"}},{"kind":"Field","name":{"kind":"Name","value":"reasoning"}}]}}]}}]} as unknown as DocumentNode<SuggestPlaidAccountMappingQuery, SuggestPlaidAccountMappingQueryVariables>;
export const GetPullRequestDetailsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPullRequestDetails"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerOwner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"prNumber"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getPullRequestDetails"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerOwner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerOwner"}}},{"kind":"Argument","name":{"kind":"Name","value":"ledgerName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerName"}}},{"kind":"Argument","name":{"kind":"Name","value":"prNumber"},"value":{"kind":"Variable","name":{"kind":"Name","value":"prNumber"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"number"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"author"}},{"kind":"Field","name":{"kind":"Name","value":"headBranch"}},{"kind":"Field","name":{"kind":"Name","value":"baseBranch"}},{"kind":"Field","name":{"kind":"Name","value":"files"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"filename"}},{"kind":"Field","name":{"kind":"Name","value":"additions"}},{"kind":"Field","name":{"kind":"Name","value":"deletions"}},{"kind":"Field","name":{"kind":"Name","value":"changes"}}]}},{"kind":"Field","name":{"kind":"Name","value":"diff"}}]}}]}}]} as unknown as DocumentNode<GetPullRequestDetailsQuery, GetPullRequestDetailsQueryVariables>;
export const QueryShellDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"QueryShell"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"queryShell"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"text"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"t"}},{"kind":"Field","name":{"kind":"Name","value":"contents"}}]}},{"kind":"Field","name":{"kind":"Name","value":"table"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"types"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"dtype"}}]}},{"kind":"Field","name":{"kind":"Name","value":"t"}},{"kind":"Field","name":{"kind":"Name","value":"rows"}}]}},{"kind":"Field","name":{"kind":"Name","value":"resultType"}}]}}]}}]} as unknown as DocumentNode<QueryShellQuery, QueryShellQueryVariables>;
export const GetLedgerErrorsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerErrors"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerErrors"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"lineno"}},{"kind":"Field","name":{"kind":"Name","value":"filename"}}]}}]}}]} as unknown as DocumentNode<GetLedgerErrorsQuery, GetLedgerErrorsQueryVariables>;
export const GetLedgerAttributesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerAttributes"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerAttributes"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accounts"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"years"}},{"kind":"Field","name":{"kind":"Name","value":"links"}},{"kind":"Field","name":{"kind":"Name","value":"payees"}},{"kind":"Field","name":{"kind":"Name","value":"currencies"}}]}}]}}]} as unknown as DocumentNode<GetLedgerAttributesQuery, GetLedgerAttributesQueryVariables>;
export const GetLedgerAccountsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerAccounts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerAccounts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}]}]}}]} as unknown as DocumentNode<GetLedgerAccountsQuery, GetLedgerAccountsQueryVariables>;
export const GetLedgerCurrenciesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerCurrencies"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerCurrencies"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}]}]}}]} as unknown as DocumentNode<GetLedgerCurrenciesQuery, GetLedgerCurrenciesQueryVariables>;
export const GetLedgerNarrationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerNarrations"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerNarrations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}]}]}}]} as unknown as DocumentNode<GetLedgerNarrationsQuery, GetLedgerNarrationsQueryVariables>;
export const GetLedgerPayeesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetLedgerPayees"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getLedgerPayees"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"ledgerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"ledgerId"}}}]}]}}]} as unknown as DocumentNode<GetLedgerPayeesQuery, GetLedgerPayeesQueryVariables>;
export const GetSubscriptionStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetSubscriptionStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subscriptionStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"subscriptions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"currentPeriodStart"}},{"kind":"Field","name":{"kind":"Name","value":"currentPeriodEnd"}},{"kind":"Field","name":{"kind":"Name","value":"clientId"}},{"kind":"Field","name":{"kind":"Name","value":"cancelAt"}},{"kind":"Field","name":{"kind":"Name","value":"canceledAt"}},{"kind":"Field","name":{"kind":"Name","value":"cancelAtPeriodEnd"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"price"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"amount"}},{"kind":"Field","name":{"kind":"Name","value":"currency"}},{"kind":"Field","name":{"kind":"Name","value":"interval"}},{"kind":"Field","name":{"kind":"Name","value":"intervalCount"}},{"kind":"Field","name":{"kind":"Name","value":"trialPeriodDays"}}]}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}},{"kind":"Field","name":{"kind":"Name","value":"product"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"images"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"hasActiveSubscription"}}]}}]}}]} as unknown as DocumentNode<GetSubscriptionStatusQuery, GetSubscriptionStatusQueryVariables>;
export const GetAllTierQuotasDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAllTierQuotas"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allTierQuotas"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"aiCfoTokensMax"}},{"kind":"Field","name":{"kind":"Name","value":"maxLedgers"}},{"kind":"Field","name":{"kind":"Name","value":"maxCollaboratorsPerLedger"}},{"kind":"Field","name":{"kind":"Name","value":"maxDirectives"}}]}}]}}]} as unknown as DocumentNode<GetAllTierQuotasQuery, GetAllTierQuotasQueryVariables>;
export const GenerateTempAssetDownloadUrlDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GenerateTempAssetDownloadUrl"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"objectKey"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateTempAssetDownloadUrl"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"objectKey"},"value":{"kind":"Variable","name":{"kind":"Name","value":"objectKey"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"downloadUrl"}},{"kind":"Field","name":{"kind":"Name","value":"expiresIn"}}]}}]}}]} as unknown as DocumentNode<GenerateTempAssetDownloadUrlQuery, GenerateTempAssetDownloadUrlQueryVariables>;
export const GetUserProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"username"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getUserProfile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"username"},"value":{"kind":"Variable","name":{"kind":"Name","value":"username"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"profile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"followersCount"}},{"kind":"Field","name":{"kind":"Name","value":"followingCount"}},{"kind":"Field","name":{"kind":"Name","value":"starredReposCount"}},{"kind":"Field","name":{"kind":"Name","value":"created"}}]}},{"kind":"Field","name":{"kind":"Name","value":"isFollowing"}},{"kind":"Field","name":{"kind":"Name","value":"activities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"repoName"}},{"kind":"Field","name":{"kind":"Name","value":"repoFullName"}}]}},{"kind":"Field","name":{"kind":"Name","value":"repositories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"isPrivate"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<GetUserProfileQuery, GetUserProfileQueryVariables>;
export const GetUserFollowersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserFollowers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"username"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"page"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getUserFollowers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"username"},"value":{"kind":"Variable","name":{"kind":"Name","value":"username"}}},{"kind":"Argument","name":{"kind":"Name","value":"page"},"value":{"kind":"Variable","name":{"kind":"Name","value":"page"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"users"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]} as unknown as DocumentNode<GetUserFollowersQuery, GetUserFollowersQueryVariables>;
export const GetUserFollowingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserFollowing"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"username"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"page"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getUserFollowing"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"username"},"value":{"kind":"Variable","name":{"kind":"Name","value":"username"}}},{"kind":"Argument","name":{"kind":"Name","value":"page"},"value":{"kind":"Variable","name":{"kind":"Name","value":"page"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"users"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]} as unknown as DocumentNode<GetUserFollowingQuery, GetUserFollowingQueryVariables>;
export const GetUserStarredReposDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserStarredRepos"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"username"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"page"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Float"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getUserStarredRepos"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"username"},"value":{"kind":"Variable","name":{"kind":"Name","value":"username"}}},{"kind":"Argument","name":{"kind":"Name","value":"page"},"value":{"kind":"Variable","name":{"kind":"Name","value":"page"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repositories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"fullName"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"isPrivate"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"starsCount"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]} as unknown as DocumentNode<GetUserStarredReposQuery, GetUserStarredReposQueryVariables>;