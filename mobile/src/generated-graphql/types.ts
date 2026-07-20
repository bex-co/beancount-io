export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTimeISO: { input: unknown; output: unknown; }
  JSON: { input: unknown; output: unknown; }
  JSONObject: { input: Record<string, number | string>; output: Record<string, number | string>; }
};

export type AcceptLedgerInvitationResult = {
  __typename?: 'AcceptLedgerInvitationResult';
  ledgerId?: Maybe<Scalars['String']['output']>;
  permission?: Maybe<LedgerInvitationAccess>;
  state: LedgerInvitationState;
};

export type AccountBalance = {
  __typename?: 'AccountBalance';
  account: Scalars['String']['output'];
  balance: Scalars['JSONObject']['output'];
  balance_children: Scalars['JSONObject']['output'];
  children: Array<AccountBalance>;
};

export type AccountHierarchyResponse = {
  __typename?: 'AccountHierarchyResponse';
  data: Array<LabeledHierarchyItem>;
  success: Scalars['Boolean']['output'];
};

export type AccountJournalEntry = {
  __typename?: 'AccountJournalEntry';
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
  __typename?: 'AccountJournalResponse';
  account: Scalars['String']['output'];
  items: Array<AccountJournalEntry>;
  total: Scalars['Float']['output'];
  with_children: Scalars['Boolean']['output'];
};

export type AccountLastEntry = {
  __typename?: 'AccountLastEntry';
  account: Scalars['String']['output'];
  balance?: Maybe<Scalars['JSONObject']['output']>;
  date?: Maybe<Scalars['String']['output']>;
};

export type AccountReport = {
  __typename?: 'AccountReport';
  accountBalanceData: Array<DateAndBalance>;
  intervalTotalsData: Array<DateAndBalance>;
  linechartData: Array<DateAndBalance>;
};

export type AddCollaboratorResponse = {
  __typename?: 'AddCollaboratorResponse';
  message?: Maybe<Scalars['String']['output']>;
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
  __typename?: 'AddEntryResponse';
  data?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type AddLedgerEntryResponse = {
  __typename?: 'AddLedgerEntryResponse';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type AiCfoUsageResponse = {
  __typename?: 'AiCfoUsageResponse';
  aiCfoTokensMax: Scalars['Float']['output'];
  aiCfoTokensUsed: Scalars['Float']['output'];
};

export type BalanceSheetData = {
  __typename?: 'BalanceSheetData';
  assetsData: Array<DateAndBalance>;
  assetsHierarchyData: SerializableTreeNode;
  equityData: Array<DateAndBalance>;
  equityHierarchyData: SerializableTreeNode;
  liabilitiesData: Array<DateAndBalance>;
  liabilitiesHierarchyData: SerializableTreeNode;
  netWorthData: Array<DateAndBalance>;
};

export type BcioOptions = {
  __typename?: 'BcioOptions';
  accountFile?: Maybe<Scalars['String']['output']>;
  balanceFile?: Maybe<Scalars['String']['output']>;
  budgetFile?: Maybe<Scalars['String']['output']>;
  defaultFile: Scalars['String']['output'];
  documentFile?: Maybe<Scalars['String']['output']>;
  noteFile?: Maybe<Scalars['String']['output']>;
  padFile?: Maybe<Scalars['String']['output']>;
  priceFile?: Maybe<Scalars['String']['output']>;
  receiptBaseFolder?: Maybe<Scalars['String']['output']>;
  receiptStorage?: Maybe<Scalars['String']['output']>;
  transactionFile?: Maybe<Scalars['String']['output']>;
};

export type BeancountError = {
  __typename?: 'BeancountError';
  filename?: Maybe<Scalars['String']['output']>;
  lineno?: Maybe<Scalars['Float']['output']>;
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
  __typename?: 'CategorySuggestion';
  confidence: Scalars['Float']['output'];
  reasoning?: Maybe<Scalars['String']['output']>;
  rowIndex: Scalars['Int']['output'];
  source: Scalars['String']['output'];
  targetAccount: Scalars['String']['output'];
};

export type ChartItemV2 = {
  __typename?: 'ChartItemV2';
  balance: Scalars['JSONObject']['output'];
  budgets?: Maybe<Scalars['JSONObject']['output']>;
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
  __typename?: 'CollaboratorUser';
  active?: Maybe<Scalars['Boolean']['output']>;
  created?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  fullName?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['Float']['output']>;
  isAdmin?: Maybe<Scalars['Boolean']['output']>;
  lastLogin?: Maybe<Scalars['String']['output']>;
  login?: Maybe<Scalars['String']['output']>;
  permission?: Maybe<Scalars['String']['output']>;
};

export type CommitAuthor = {
  __typename?: 'CommitAuthor';
  date: Scalars['String']['output'];
  email: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type CommitDetails = {
  __typename?: 'CommitDetails';
  author: CommitAuthor;
  committer?: Maybe<CommitAuthor>;
  diff?: Maybe<Scalars['String']['output']>;
  files: Array<CommitFileChange>;
  message: Scalars['String']['output'];
  parents?: Maybe<Array<Scalars['String']['output']>>;
  sha: Scalars['String']['output'];
  stats: CommitStats;
};

export type CommitFileChange = {
  __typename?: 'CommitFileChange';
  additions: Scalars['Int']['output'];
  deletions: Scalars['Int']['output'];
  filename: Scalars['String']['output'];
};

export type CommitListItem = {
  __typename?: 'CommitListItem';
  author: CommitAuthor;
  committer?: Maybe<CommitAuthor>;
  message: Scalars['String']['output'];
  sha: Scalars['String']['output'];
  shortSha?: Maybe<Scalars['String']['output']>;
};

export type CommitStats = {
  __typename?: 'CommitStats';
  additions: Scalars['Int']['output'];
  deletions: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type CommodityPairWithPrices = {
  __typename?: 'CommodityPairWithPrices';
  base: Scalars['String']['output'];
  prices: Array<PricePoint>;
  quote: Scalars['String']['output'];
};

export type ConfirmCliAuthSessionResponse = {
  __typename?: 'ConfirmCliAuthSessionResponse';
  success: Scalars['Boolean']['output'];
};

export type ConsumeCliAuthSessionResponse = {
  __typename?: 'ConsumeCliAuthSessionResponse';
  expireAt: Scalars['String']['output'];
  token: Scalars['String']['output'];
};

export type CreateCliAuthSessionResponse = {
  __typename?: 'CreateCliAuthSessionResponse';
  expiresAt: Scalars['String']['output'];
  sessionId: Scalars['String']['output'];
};

export type CreateOneTimeTokenResponse = {
  __typename?: 'CreateOneTimeTokenResponse';
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
  __typename?: 'CustomerSubscriptionStatus';
  hasActiveSubscription: Scalars['Boolean']['output'];
  subscriptions: Array<Subscription>;
};

export type DateAndBalance = {
  __typename?: 'DateAndBalance';
  balance: Scalars['JSONObject']['output'];
  date: Scalars['String']['output'];
};

export type DateAndBalanceWithAccountBalance = {
  __typename?: 'DateAndBalanceWithAccountBalance';
  accountBalances: Scalars['JSONObject']['output'];
  balance: Scalars['JSONObject']['output'];
  date: Scalars['String']['output'];
};

export type DeleteCollaboratorResponse = {
  __typename?: 'DeleteCollaboratorResponse';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteLedgerFileResponse = {
  __typename?: 'DeleteLedgerFileResponse';
  path: Scalars['String']['output'];
};

export type DeleteLedgerResponse = {
  __typename?: 'DeleteLedgerResponse';
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
  __typename?: 'DeleteMultiSourceSlicesResponse';
  deletedHashes: Array<Scalars['String']['output']>;
  message: Scalars['String']['output'];
};

export type DeletePublicKeyResponse = {
  __typename?: 'DeletePublicKeyResponse';
  id: Scalars['Float']['output'];
};

export type DeleteSourceSliceInput = {
  entryHash: Scalars['String']['input'];
  sha256sum: Scalars['String']['input'];
};

export type DeleteSourceSliceResponse = {
  __typename?: 'DeleteSourceSliceResponse';
  entryHash: Scalars['String']['output'];
  message: Scalars['String']['output'];
};

export type DenyCliAuthSessionResponse = {
  __typename?: 'DenyCliAuthSessionResponse';
  success: Scalars['Boolean']['output'];
};

export type Document = {
  __typename?: 'Document';
  account: Scalars['String']['output'];
  date: Scalars['String']['output'];
  filename: Scalars['String']['output'];
  links?: Maybe<Array<Scalars['String']['output']>>;
  meta?: Maybe<Scalars['JSONObject']['output']>;
  tags?: Maybe<Array<Scalars['String']['output']>>;
};

export type EntriesByType = {
  __typename?: 'EntriesByType';
  number: Scalars['Float']['output'];
  type: Scalars['String']['output'];
};

export type EntryContext = {
  __typename?: 'EntryContext';
  balances_after?: Maybe<Scalars['JSONObject']['output']>;
  balances_before?: Maybe<Scalars['JSONObject']['output']>;
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
  __typename?: 'EntryMeta';
  filename: Scalars['String']['output'];
  lineno: Scalars['Float']['output'];
};

export type Event = {
  __typename?: 'Event';
  date: Scalars['String']['output'];
  description: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type FavaOptions = {
  __typename?: 'FavaOptions';
  accountJournalIncludeChildren: Scalars['Boolean']['output'];
  autoReload: Scalars['Boolean']['output'];
  collapsePattern: Array<Scalars['String']['output']>;
  conversionCurrencies: Array<Scalars['String']['output']>;
  currencyColumn: Scalars['Int']['output'];
  defaultPage: Scalars['String']['output'];
  fiscalYearEnd: FiscalYearEnd;
  indent: Scalars['Int']['output'];
  invertIncomeLiabilitiesEquity: Scalars['Boolean']['output'];
  language?: Maybe<Scalars['String']['output']>;
  locale?: Maybe<Scalars['String']['output']>;
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
  __typename?: 'FeedItem';
  author?: Maybe<Scalars['String']['output']>;
  authorAvatar?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  link: Scalars['String']['output'];
  publishedAt: Scalars['DateTimeISO']['output'];
  source: FeedSource;
  summary?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

export type FeedResponse = {
  __typename?: 'FeedResponse';
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

export type FiscalYearEnd = {
  __typename?: 'FiscalYearEnd';
  day: Scalars['Int']['output'];
  month: Scalars['Int']['output'];
};

export type FollowUserResponse = {
  __typename?: 'FollowUserResponse';
  isFollowing?: Maybe<Scalars['Boolean']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type GetCliAuthSessionResponse = {
  __typename?: 'GetCliAuthSessionResponse';
  status: CliAuthStatus;
};

export type HomeChartsResponse = {
  __typename?: 'HomeChartsResponse';
  data: Array<LabeledChartItem>;
  success: Scalars['Boolean']['output'];
};

export type IncomeStatementData = {
  __typename?: 'IncomeStatementData';
  expensesData: Array<DateAndBalanceWithAccountBalance>;
  expensesHierarchyData: SerializableTreeNode;
  incomeData: Array<DateAndBalanceWithAccountBalance>;
  incomeHierarchyData: SerializableTreeNode;
  netProfitData: Array<DateAndBalance>;
};

export type InsertReceiptResult = {
  __typename?: 'InsertReceiptResult';
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
  __typename?: 'IntervalTotalItem';
  accountBalances: Scalars['JSONObject']['output'];
  balance: Scalars['JSONObject']['output'];
  date: Scalars['String']['output'];
};

export type InvitationSignUpResponse = {
  __typename?: 'InvitationSignUpResponse';
  expireAt: Scalars['String']['output'];
};

export type JournalEntriesResponse = {
  __typename?: 'JournalEntriesResponse';
  data: Array<JournalEntry>;
  /** Pagination information */
  pageInfo?: Maybe<PageInfo>;
  success: Scalars['Boolean']['output'];
};

export type JournalEntry = {
  __typename?: 'JournalEntry';
  account?: Maybe<Scalars['String']['output']>;
  /** Amount for balance entries */
  amount?: Maybe<PostingUnits>;
  booking?: Maybe<Scalars['String']['output']>;
  comment?: Maybe<Scalars['String']['output']>;
  currencies?: Maybe<Array<Scalars['String']['output']>>;
  date: Scalars['String']['output'];
  entry_hash?: Maybe<Scalars['String']['output']>;
  entry_type?: Maybe<Scalars['String']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  error_message?: Maybe<Scalars['String']['output']>;
  filename?: Maybe<Scalars['String']['output']>;
  flag?: Maybe<Scalars['String']['output']>;
  links?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  meta?: Maybe<EntryMeta>;
  narration?: Maybe<Scalars['String']['output']>;
  /** Net amount for the transaction */
  netAmount?: Maybe<Scalars['Float']['output']>;
  payee?: Maybe<Scalars['String']['output']>;
  postings?: Maybe<Array<JournalEntryPosting>>;
  /** Primary account for display */
  primaryAccount?: Maybe<Scalars['String']['output']>;
  /** Combined searchable text */
  searchableText?: Maybe<Scalars['String']['output']>;
  tags?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** Entry type (Transaction, Balance, Open, etc.) */
  type?: Maybe<Scalars['String']['output']>;
};

export type JournalEntryPosting = {
  __typename?: 'JournalEntryPosting';
  account: Scalars['String']['output'];
  amount?: Maybe<Scalars['String']['output']>;
  cost?: Maybe<Scalars['String']['output']>;
  flag?: Maybe<Scalars['String']['output']>;
  meta?: Maybe<PostingMeta>;
  price?: Maybe<Scalars['String']['output']>;
  units?: Maybe<PostingUnits>;
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
  __typename?: 'JournalResponse';
  data: Array<Scalars['JSONObject']['output']>;
  is_empty: Scalars['Boolean']['output'];
  total: Scalars['Float']['output'];
};

export type LlmParseResult = {
  __typename?: 'LLMParseResult';
  rows: Array<ParsedRow>;
};

export type LabeledChartItem = {
  __typename?: 'LabeledChartItem';
  data: Array<ChartItemV2>;
  label: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type LabeledHierarchyItem = {
  __typename?: 'LabeledHierarchyItem';
  data: AccountBalance;
  label: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type Ledger = {
  __typename?: 'Ledger';
  /** Get the filter options (attributes) of a ledger */
  attributes: LedgerAttributes;
  /** Get the beancount.io-specific options of a ledger */
  bcioOptions: BcioOptions;
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  empty: Scalars['Boolean']['output'];
  /** Get the fava options of a ledger */
  favaOptions: FavaOptions;
  fullName: Scalars['String']['output'];
  httpUrl: Scalars['String']['output'];
  id: Scalars['String']['output'];
  isStarred?: Maybe<Scalars['Boolean']['output']>;
  name: Scalars['String']['output'];
  /** Get the beancount options of a ledger */
  options: LedgerOptions;
  permissions?: Maybe<Permission>;
  private: Scalars['Boolean']['output'];
  size: Scalars['Float']['output'];
  sshUrl: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type LedgerAccountItem = {
  __typename?: 'LedgerAccountItem';
  account: Scalars['String']['output'];
  balance?: Maybe<Scalars['JSONObject']['output']>;
  closeEntryHash?: Maybe<Scalars['String']['output']>;
  closedAt?: Maybe<Scalars['String']['output']>;
  entryCount: Scalars['Float']['output'];
  entryHash: Scalars['String']['output'];
  openedAt: Scalars['String']['output'];
};

export type LedgerAmountInput = {
  currency: Scalars['String']['input'];
  number: Scalars['String']['input'];
};

export type LedgerAssetDownloadUrlResult = {
  __typename?: 'LedgerAssetDownloadUrlResult';
  downloadUrl: Scalars['String']['output'];
};

export type LedgerAttributes = {
  __typename?: 'LedgerAttributes';
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
  __typename?: 'LedgerCollaborator';
  permission?: Maybe<Scalars['String']['output']>;
  roleName?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
};

export type LedgerCommit = {
  __typename?: 'LedgerCommit';
  author?: Maybe<LedgerCommitUser>;
  committer?: Maybe<LedgerCommitUser>;
  created?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  sha: Scalars['String']['output'];
};

export type LedgerCommitUser = {
  __typename?: 'LedgerCommitUser';
  email?: Maybe<Scalars['String']['output']>;
  fullName?: Maybe<Scalars['String']['output']>;
  login?: Maybe<Scalars['String']['output']>;
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
  __typename?: 'LedgerFileContent';
  content?: Maybe<Scalars['String']['output']>;
  encoding?: Maybe<Scalars['String']['output']>;
  lastAuthorDate?: Maybe<Scalars['String']['output']>;
  lastCommitSha?: Maybe<Scalars['String']['output']>;
  lastCommitterDate?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  path: Scalars['String']['output'];
  sha: Scalars['String']['output'];
  size: Scalars['Float']['output'];
  type: Scalars['String']['output'];
};

/** View or Edit access for a shared ledger invitation */
export enum LedgerInvitationAccess {
  Edit = 'EDIT',
  View = 'VIEW'
}

export type LedgerInvitationDeliveryResult = {
  __typename?: 'LedgerInvitationDeliveryResult';
  deliverySucceeded: Scalars['Boolean']['output'];
  invitation: PendingLedgerInvitation;
};

export enum LedgerInvitationDeliveryStatus {
  Delivered = 'DELIVERED',
  Failed = 'FAILED',
  Pending = 'PENDING'
}

export type LedgerInvitationPresentation = {
  __typename?: 'LedgerInvitationPresentation';
  acceptedAt?: Maybe<Scalars['DateTimeISO']['output']>;
  expiresAt?: Maybe<Scalars['DateTimeISO']['output']>;
  inviterName?: Maybe<Scalars['String']['output']>;
  ledgerId?: Maybe<Scalars['String']['output']>;
  ledgerName?: Maybe<Scalars['String']['output']>;
  ledgerOwner?: Maybe<Scalars['String']['output']>;
  maskedEmail?: Maybe<Scalars['String']['output']>;
  permission?: Maybe<LedgerInvitationAccess>;
  signupPending?: Maybe<Scalars['Boolean']['output']>;
  state: LedgerInvitationState;
};

export enum LedgerInvitationState {
  Accepted = 'ACCEPTED',
  Blocked = 'BLOCKED',
  Expired = 'EXPIRED',
  Invalid = 'INVALID',
  LedgerDeleted = 'LEDGER_DELETED',
  Ready = 'READY',
  Retry = 'RETRY',
  Revoked = 'REVOKED',
  WrongAccount = 'WRONG_ACCOUNT'
}

export type LedgerMeta = {
  __typename?: 'LedgerMeta';
  accounts: Array<Scalars['String']['output']>;
  currencies: Array<Scalars['String']['output']>;
  errors: Scalars['Float']['output'];
  options: Options;
};

export type LedgerMetaResponse = {
  __typename?: 'LedgerMetaResponse';
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
  __typename?: 'LedgerOptions';
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
  __typename?: 'LedgerOverview';
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
  __typename?: 'LogoutResponse';
  success: Scalars['Boolean']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  acceptLedgerInvitation: AcceptLedgerInvitationResult;
  addEntries: AddEntryResponse;
  addOrUpdateLedgerCollaborator: AddCollaboratorResponse;
  /** @deprecated Push token tracking has been removed. This endpoint returns true for API compatibility but does not store tokens. */
  addPushToken: Scalars['Boolean']['output'];
  approvePullRequest: PullRequestResult;
  beginLedgerInvitation: LedgerInvitationPresentation;
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
  createLedgerInvitation: LedgerInvitationDeliveryResult;
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
  /** Parse file using LLM (multimodal support for PDF/images/any format). File must be uploaded to S3 first. */
  parseFileWithLLM: LlmParseResult;
  /** Parse a receipt image or PDF using LLM and return a single summarized transaction with account recommendations. File must be uploaded to S3 first. */
  parseReceiptWithLLM: ReceiptParseResult;
  /** Refresh Plaid Item status from Plaid API (useful after reauthentication) */
  refreshPlaidItemStatus: PlaidItemType;
  /** Refresh authentication token - issues a new token and revokes the current one */
  refreshToken: TokenAuthResponse;
  rejectPullRequest: PullRequestResult;
  /** Rename a file in a specific ledger */
  renameLedgerFile: RenameLedgerFileResponse;
  resendLedgerInvitation: LedgerInvitationDeliveryResult;
  /** Reset user password using a token from the password reset email */
  resetPassword: ResetPasswordResponse;
  resumeSubscription: SubscriptionActionResult;
  revokeLedgerInvitation: RevokeLedgerInvitationResult;
  /** Send a password reset link to the user's email */
  sendForgotPasswordLink: SendForgotPasswordLinkResponse;
  /** @deprecated Push notification functionality has been removed. This endpoint returns false for API compatibility but does not send notifications. */
  sendPushNotification: Scalars['Boolean']['output'];
  signIn: TokenAuthResponse;
  signInWithOneTimeToken: TokenAuthResponse;
  /** Start signup by creating an OTP session. Sends a verification code to the user's email. */
  signUp: SignUpResponse;
  /** Star a specific ledger */
  starLedger: StarLedgerResponse;
  /** Start signup using the email bound to the active ledger invitation */
  startInvitationSignUp: InvitationSignUpResponse;
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
  /**
   * update or insert user report subscribe status
   * @deprecated Report subscription tracking has been removed. This endpoint returns success for API compatibility but does not store subscription status.
   */
  updateReportSubscribe?: Maybe<UpdateReportSubscribeResponse>;
  updateUsername: UserProfileResponse;
  upgradeSubscription: UpgradeSubscriptionResult;
  /** Verify OTP and create the invitation-bound user account */
  verifyInvitationSignUpOtp: TokenAuthResponse;
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
  permission?: InputMaybe<LedgerInvitationAccess>;
};


export type MutationAddPushTokenArgs = {
  token: Scalars['String']['input'];
};


export type MutationApprovePullRequestArgs = {
  ledgerName: Scalars['String']['input'];
  ledgerOwner: Scalars['String']['input'];
  prNumber: Scalars['Int']['input'];
};


export type MutationBeginLedgerInvitationArgs = {
  secret: Scalars['String']['input'];
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


export type MutationCreateLedgerInvitationArgs = {
  email: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
  permission: LedgerInvitationAccess;
};


export type MutationCreatePlaidLinkTokenArgs = {
  ledgerId: Scalars['String']['input'];
};


export type MutationCreatePlaidUpdateModeLinkTokenArgs = {
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


export type MutationParseFileWithLlmArgs = {
  fileFormat: Scalars['String']['input'];
  s3ObjectKey: Scalars['String']['input'];
};


export type MutationParseReceiptWithLlmArgs = {
  ledgerId: Scalars['String']['input'];
  s3ObjectKey: Scalars['String']['input'];
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


export type MutationResendLedgerInvitationArgs = {
  invitationId: Scalars['String']['input'];
};


export type MutationResetPasswordArgs = {
  newPassword: Scalars['String']['input'];
  token: Scalars['String']['input'];
};


export type MutationResumeSubscriptionArgs = {
  clientId: Scalars['String']['input'];
  subscriptionId: Scalars['String']['input'];
};


export type MutationRevokeLedgerInvitationArgs = {
  invitationId: Scalars['String']['input'];
};


export type MutationSendForgotPasswordLinkArgs = {
  email: Scalars['String']['input'];
};


export type MutationSendPushNotificationArgs = {
  data: Scalars['JSONObject']['input'];
  message: Scalars['String']['input'];
  pushToken: Scalars['String']['input'];
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


export type MutationStartInvitationSignUpArgs = {
  firstName: Scalars['String']['input'];
  lastName: Scalars['String']['input'];
  password: Scalars['String']['input'];
  username?: InputMaybe<Scalars['String']['input']>;
};


export type MutationSubmitPlaidTransactionsToLedgerArgs = {
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


export type MutationUpdateReportSubscribeArgs = {
  status: ReportStatus;
  userId: Scalars['String']['input'];
};


export type MutationUpdateUsernameArgs = {
  username: Scalars['String']['input'];
};


export type MutationUpgradeSubscriptionArgs = {
  clientId: Scalars['String']['input'];
  priceId: Scalars['String']['input'];
};


export type MutationVerifyInvitationSignUpOtpArgs = {
  otp: Scalars['String']['input'];
};


export type MutationVerifySignUpOtpArgs = {
  otp: Scalars['String']['input'];
  sessionId: Scalars['String']['input'];
};

export type Options = {
  __typename?: 'Options';
  name_assets: Scalars['String']['output'];
  name_equity: Scalars['String']['output'];
  name_expenses: Scalars['String']['output'];
  name_income: Scalars['String']['output'];
  name_liabilities: Scalars['String']['output'];
  operating_currency: Array<Scalars['String']['output']>;
};

export type PrFileChange = {
  __typename?: 'PRFileChange';
  additions: Scalars['Int']['output'];
  changes: Scalars['Int']['output'];
  deletions: Scalars['Int']['output'];
  filename: Scalars['String']['output'];
};

export type PageInfo = {
  __typename?: 'PageInfo';
  /** Cursor for the end of the current page */
  endCursor?: Maybe<Scalars['String']['output']>;
  /** Whether there are more entries after the current page */
  hasNextPage: Scalars['Boolean']['output'];
  /** Whether there are more entries before the current page */
  hasPreviousPage: Scalars['Boolean']['output'];
  /** Cursor for the start of the current page */
  startCursor?: Maybe<Scalars['String']['output']>;
  /** Total number of entries available */
  totalCount?: Maybe<Scalars['Int']['output']>;
};

export type ParsedRow = {
  __typename?: 'ParsedRow';
  amount: Scalars['Float']['output'];
  date: Scalars['String']['output'];
  description: Scalars['String']['output'];
  payee: Scalars['String']['output'];
};

export type PendingLedgerInvitation = {
  __typename?: 'PendingLedgerInvitation';
  deliveryStatus: LedgerInvitationDeliveryStatus;
  expiresAt: Scalars['DateTimeISO']['output'];
  id: Scalars['String']['output'];
  inviterName: Scalars['String']['output'];
  maskedEmail: Scalars['String']['output'];
  nextResendAt: Scalars['DateTimeISO']['output'];
  permission: LedgerInvitationAccess;
  sentAt: Scalars['DateTimeISO']['output'];
};

export type Permission = {
  __typename?: 'Permission';
  admin: Scalars['Boolean']['output'];
  pull: Scalars['Boolean']['output'];
  push: Scalars['Boolean']['output'];
};

export type PlaidAccountMappingSuggestion = {
  __typename?: 'PlaidAccountMappingSuggestion';
  accountId: Scalars['String']['output'];
  confidence: Scalars['Float']['output'];
  reasoning?: Maybe<Scalars['String']['output']>;
  suggestedAccount: Scalars['String']['output'];
};

export type PlaidAccountType = {
  __typename?: 'PlaidAccountType';
  accountId: Scalars['String']['output'];
  accountName: Scalars['String']['output'];
  accountSubtype?: Maybe<Scalars['String']['output']>;
  accountType: Scalars['String']['output'];
  createdAt: Scalars['DateTimeISO']['output'];
  /** Currency used when writing this account's transactions to the ledger */
  currency: Scalars['String']['output'];
  enabled: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  ledgerAccount?: Maybe<Scalars['String']['output']>;
  mask?: Maybe<Scalars['String']['output']>;
  plaidItemId: Scalars['String']['output'];
  updatedAt: Scalars['DateTimeISO']['output'];
};

export type PlaidDeleteResult = {
  __typename?: 'PlaidDeleteResult';
  deletedCount: Scalars['Float']['output'];
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type PlaidItemType = {
  __typename?: 'PlaidItemType';
  createdAt: Scalars['DateTimeISO']['output'];
  errorCode?: Maybe<Scalars['String']['output']>;
  errorMessage?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  institutionId: Scalars['String']['output'];
  institutionName: Scalars['String']['output'];
  itemId: Scalars['String']['output'];
  lastSync?: Maybe<PlaidLastSync>;
  status: Scalars['String']['output'];
  updatedAt: Scalars['DateTimeISO']['output'];
};

export type PlaidLastSync = {
  __typename?: 'PlaidLastSync';
  errorMessage?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  timestamp: Scalars['DateTimeISO']['output'];
  transactionsAdded?: Maybe<Scalars['Float']['output']>;
};

export type PlaidLinkToken = {
  __typename?: 'PlaidLinkToken';
  linkToken: Scalars['String']['output'];
};

export type PlaidSubmitResult = {
  __typename?: 'PlaidSubmitResult';
  addedCount: Scalars['Float']['output'];
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type PlaidSyncResult = {
  __typename?: 'PlaidSyncResult';
  message?: Maybe<Scalars['String']['output']>;
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
  __typename?: 'PlaidTransactionType';
  /** Name of the source Plaid account this transaction belongs to */
  accountName: Scalars['String']['output'];
  amount: Scalars['String']['output'];
  category?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTimeISO']['output'];
  date: Scalars['DateTimeISO']['output'];
  id: Scalars['String']['output'];
  /** Name of the institution this transaction was synced from */
  institutionName: Scalars['String']['output'];
  isPending: Scalars['Boolean']['output'];
  /** Beancount account the source Plaid account is mapped to */
  ledgerAccount?: Maybe<Scalars['String']['output']>;
  merchantName?: Maybe<Scalars['String']['output']>;
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
  __typename?: 'PlaintextJournalResponse';
  content: Scalars['String']['output'];
};

export type Posting = {
  __typename?: 'Posting';
  account: Scalars['String']['output'];
  amount: Scalars['String']['output'];
  commodity: Scalars['String']['output'];
  price?: Maybe<Scalars['String']['output']>;
};

export type PostingInput = {
  account: Scalars['String']['input'];
  amount: Scalars['String']['input'];
};

export type PostingMeta = {
  __typename?: 'PostingMeta';
  filename: Scalars['String']['output'];
  lineno: Scalars['Float']['output'];
};

export type PostingUnits = {
  __typename?: 'PostingUnits';
  currency?: Maybe<Scalars['String']['output']>;
  number?: Maybe<Scalars['Float']['output']>;
};

export type PricePoint = {
  __typename?: 'PricePoint';
  date: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type PublicKey = {
  __typename?: 'PublicKey';
  createdAt: Scalars['String']['output'];
  fingerprint: Scalars['String']['output'];
  id: Scalars['Float']['output'];
  key: Scalars['String']['output'];
  lastUsedAt?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

export type PublicUserProfileResponse = {
  __typename?: 'PublicUserProfileResponse';
  activities: Array<UserActivityFeedItem>;
  /** Only present if user is authenticated */
  isFollowing?: Maybe<Scalars['Boolean']['output']>;
  profile: UserProfile;
  repositories: Array<UserRepository>;
};

export type PullRequestDetails = {
  __typename?: 'PullRequestDetails';
  author: Scalars['String']['output'];
  baseBranch: Scalars['String']['output'];
  description: Scalars['String']['output'];
  diff?: Maybe<Scalars['String']['output']>;
  files: Array<PrFileChange>;
  headBranch: Scalars['String']['output'];
  number: Scalars['Int']['output'];
  state: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type PullRequestResult = {
  __typename?: 'PullRequestResult';
  message?: Maybe<Scalars['String']['output']>;
  prNumber?: Maybe<Scalars['Int']['output']>;
  prUrl?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type Query = {
  __typename?: 'Query';
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
  getLatestLedgerCommit?: Maybe<LedgerCommit>;
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
  getLedgerFile?: Maybe<LedgerFileContent>;
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
  /** Get the tags of a specific ledger */
  getLedgerTags: Array<Scalars['String']['output']>;
  /** Get the trial balance of a specific ledger */
  getLedgerTrialBalance: TrialBalanceData;
  /** Get the years of a specific ledger */
  getLedgerYears: Array<Scalars['String']['output']>;
  /** Get all accounts for a specific Plaid Item */
  getPlaidAccounts: Array<PlaidAccountType>;
  /** Get a single Plaid Item by ID */
  getPlaidItem: PlaidItemType;
  /** Get Plaid Items for the current user, scoped to a ledger. */
  getPlaidItems: Array<PlaidItemType>;
  /** Get a specific public key by ID */
  getPublicKey?: Maybe<PublicKey>;
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
  ledgerInvitationStatus: LedgerInvitationPresentation;
  /** Get a specific ledger */
  ledgerMeta: LedgerMetaResponse;
  listCommits: Array<CommitListItem>;
  listLedgerCollaborators: Array<CollaboratorUser>;
  /** List all ledgers for the current user */
  listLedgers: Array<Ledger>;
  listPendingLedgerInvitations: Array<PendingLedgerInvitation>;
  /** List all public keys for the current user */
  listPublicKeys: Array<PublicKey>;
  /** List all user owned ledgers for the current user */
  listUserOwnedLedgers: Array<Ledger>;
  /** @deprecated Receipt tracking has been removed. This endpoint returns an empty array for API compatibility but does not track receipts. */
  paymentHistory: Array<Receipt>;
  /** Execute a shell query on a ledger */
  queryShell?: Maybe<QueryResult>;
  /** Execute a shell query on a ledger and return plain text output */
  queryShellText?: Maybe<QueryShellTextResult>;
  /** Search for ledgers/repositories */
  searchLedgers: Array<Ledger>;
  subscriptionStatus: CustomerSubscriptionStatus;
  /** Suggest Beancount account mappings for a Plaid Item's unmapped accounts using AI */
  suggestPlaidAccountMapping: Array<PlaidAccountMappingSuggestion>;
  /** Suggest target accounts for unsynced Plaid transactions using AI, for one account or the whole ledger when accountId is omitted */
  suggestPlaidTransactionCategories: Array<CategorySuggestion>;
  /** Suggest transaction categories using LLM based on payee, description, and transaction history */
  suggestTransactionCategoriesWithLLM: Array<CategorySuggestion>;
  /** get the user */
  userProfile?: Maybe<UserProfileResponse>;
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


export type QueryListPendingLedgerInvitationsArgs = {
  ledgerId: Scalars['String']['input'];
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


export type QuerySuggestTransactionCategoriesWithLlmArgs = {
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
  __typename?: 'QueryColumn';
  dtype: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type QueryResult = {
  __typename?: 'QueryResult';
  /** Result type: 'table' or 'text' */
  resultType: Scalars['String']['output'];
  table?: Maybe<QueryResultTable>;
  text?: Maybe<QueryResultText>;
};

export type QueryResultTable = {
  __typename?: 'QueryResultTable';
  /** Query result rows as array of arrays */
  rows: Array<Array<Scalars['JSON']['output']>>;
  t?: Maybe<Scalars['String']['output']>;
  types: Array<QueryColumn>;
};

export type QueryResultText = {
  __typename?: 'QueryResultText';
  contents: Scalars['String']['output'];
  t?: Maybe<Scalars['String']['output']>;
};

export type QueryShellTextResult = {
  __typename?: 'QueryShellTextResult';
  text: Scalars['String']['output'];
};

export type Receipt = {
  __typename?: 'Receipt';
  _id?: Maybe<Scalars['String']['output']>;
  amount: Scalars['String']['output'];
  chargeId?: Maybe<Scalars['String']['output']>;
  createAt?: Maybe<Scalars['DateTimeISO']['output']>;
  currency: Scalars['String']['output'];
  estimatedIotx?: Maybe<Scalars['Float']['output']>;
  fulfilledHash?: Maybe<Scalars['String']['output']>;
  paymentEmail: Scalars['String']['output'];
  userId: Scalars['String']['output'];
};

export type ReceiptParseResult = {
  __typename?: 'ReceiptParseResult';
  amount: Scalars['Float']['output'];
  date: Scalars['String']['output'];
  description: Scalars['String']['output'];
  payee: Scalars['String']['output'];
  sourceAccount?: Maybe<Scalars['String']['output']>;
  targetAccount?: Maybe<Scalars['String']['output']>;
};

export type ReceiptPostingInput = {
  account: Scalars['String']['input'];
  amountCurrency: Scalars['String']['input'];
  amountNumber: Scalars['String']['input'];
};

export type RenameLedgerFileResponse = {
  __typename?: 'RenameLedgerFileResponse';
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
  __typename?: 'RepositoryListItem';
  description?: Maybe<Scalars['String']['output']>;
  fullName: Scalars['String']['output'];
  isPrivate: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  starsCount?: Maybe<Scalars['Float']['output']>;
  updatedAt: Scalars['DateTimeISO']['output'];
};

export type RepositoryListResponse = {
  __typename?: 'RepositoryListResponse';
  repositories: Array<RepositoryListItem>;
  total: Scalars['Float']['output'];
};

export type ResetPasswordResponse = {
  __typename?: 'ResetPasswordResponse';
  success: Scalars['Boolean']['output'];
};

export type RevokeLedgerInvitationResult = {
  __typename?: 'RevokeLedgerInvitationResult';
  success: Scalars['Boolean']['output'];
};

export type SearchUser = {
  __typename?: 'SearchUser';
  email: Scalars['String']['output'];
  username: Scalars['String']['output'];
};

export type SendForgotPasswordLinkResponse = {
  __typename?: 'SendForgotPasswordLinkResponse';
  success: Scalars['Boolean']['output'];
};

export type SerializableTreeNode = {
  __typename?: 'SerializableTreeNode';
  account: Scalars['String']['output'];
  balance: Scalars['JSONObject']['output'];
  balanceChildren: Scalars['JSONObject']['output'];
  children: Array<Scalars['JSONObject']['output']>;
  cost?: Maybe<Scalars['JSONObject']['output']>;
  costChildren?: Maybe<Scalars['JSONObject']['output']>;
  hasTxns: Scalars['Boolean']['output'];
};

export type SignUpResponse = {
  __typename?: 'SignUpResponse';
  expireAt: Scalars['String']['output'];
  sessionId: Scalars['String']['output'];
};

export type StarLedgerResponse = {
  __typename?: 'StarLedgerResponse';
  isStarred: Scalars['Boolean']['output'];
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type Subscription = {
  __typename?: 'Subscription';
  cancelAt?: Maybe<Scalars['DateTimeISO']['output']>;
  cancelAtPeriodEnd: Scalars['Boolean']['output'];
  canceledAt?: Maybe<Scalars['DateTimeISO']['output']>;
  clientId: Scalars['String']['output'];
  currentPeriodEnd: Scalars['DateTimeISO']['output'];
  currentPeriodStart: Scalars['DateTimeISO']['output'];
  id: Scalars['ID']['output'];
  items: Array<SubscriptionItem>;
  status: Scalars['String']['output'];
};

export type SubscriptionActionResult = {
  __typename?: 'SubscriptionActionResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type SubscriptionItem = {
  __typename?: 'SubscriptionItem';
  id: Scalars['ID']['output'];
  price: SubscriptionPrice;
  product?: Maybe<SubscriptionProduct>;
  quantity: Scalars['Float']['output'];
};

export type SubscriptionPrice = {
  __typename?: 'SubscriptionPrice';
  amount: Scalars['Float']['output'];
  currency: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  interval: Scalars['String']['output'];
  intervalCount?: Maybe<Scalars['Float']['output']>;
  trialPeriodDays?: Maybe<Scalars['Float']['output']>;
};

export type SubscriptionProduct = {
  __typename?: 'SubscriptionProduct';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  images?: Maybe<Array<Scalars['String']['output']>>;
  name: Scalars['String']['output'];
};

export type SubscriptionSessionResult = {
  __typename?: 'SubscriptionSessionResult';
  message?: Maybe<Scalars['String']['output']>;
  sessionId?: Maybe<Scalars['String']['output']>;
  sessionUrl?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type TempAssetDownloadUrl = {
  __typename?: 'TempAssetDownloadUrl';
  downloadUrl: Scalars['String']['output'];
  expiresIn: Scalars['Float']['output'];
};

export type TempAssetUploadUrl = {
  __typename?: 'TempAssetUploadUrl';
  expiresIn: Scalars['Float']['output'];
  objectKey: Scalars['String']['output'];
  uploadUrl: Scalars['String']['output'];
};

export type TierQuotaItem = {
  __typename?: 'TierQuotaItem';
  aiCfoTokensMax: Scalars['Float']['output'];
  maxCollaboratorsPerLedger: Scalars['Float']['output'];
  maxDirectives: Scalars['Float']['output'];
  maxLedgers: Scalars['Float']['output'];
  tier: Scalars['String']['output'];
};

export type TokenAuthResponse = {
  __typename?: 'TokenAuthResponse';
  expireAt: Scalars['DateTimeISO']['output'];
  token: Scalars['String']['output'];
};

export type Transaction = {
  __typename?: 'Transaction';
  date: Scalars['String']['output'];
  narration?: Maybe<Scalars['String']['output']>;
  payee?: Maybe<Scalars['String']['output']>;
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
  __typename?: 'TrialBalanceData';
  assetsHierarchyData: SerializableTreeNode;
  equityHierarchyData: SerializableTreeNode;
  expensesHierarchyData: SerializableTreeNode;
  incomeHierarchyData: SerializableTreeNode;
  liabilitiesHierarchyData: SerializableTreeNode;
};

export type UpdateReportSubscribeResponse = {
  __typename?: 'UpdateReportSubscribeResponse';
  success: Scalars['Boolean']['output'];
};

export type UpdateSourceSliceInput = {
  entryHash: Scalars['String']['input'];
  newContent: Scalars['String']['input'];
  sha256sum: Scalars['String']['input'];
};

export type UpdateSourceSliceResponse = {
  __typename?: 'UpdateSourceSliceResponse';
  entryHash: Scalars['String']['output'];
  message: Scalars['String']['output'];
  newSha256sum: Scalars['String']['output'];
};

export type UpgradeSubscriptionResult = {
  __typename?: 'UpgradeSubscriptionResult';
  clientSecret?: Maybe<Scalars['String']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  newTier?: Maybe<Scalars['String']['output']>;
  subscriptionId?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type User = {
  __typename?: 'User';
  active?: Maybe<Scalars['Boolean']['output']>;
  created?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  fullName?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['Float']['output']>;
  isAdmin?: Maybe<Scalars['Boolean']['output']>;
  lastLogin?: Maybe<Scalars['String']['output']>;
  login?: Maybe<Scalars['String']['output']>;
};

export type UserActivityFeedItem = {
  __typename?: 'UserActivityFeedItem';
  content: Scalars['String']['output'];
  createdAt: Scalars['DateTimeISO']['output'];
  id: Scalars['String']['output'];
  repoFullName?: Maybe<Scalars['String']['output']>;
  repoName?: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
};

export type UserLimits = {
  __typename?: 'UserLimits';
  collaboratorsPerLedgerMax: Scalars['Float']['output'];
  ledgersMax: Scalars['Float']['output'];
  ledgersUsed: Scalars['Float']['output'];
  maxDirectives: Scalars['Float']['output'];
};

export type UserListItem = {
  __typename?: 'UserListItem';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  bio?: Maybe<Scalars['String']['output']>;
  fullName?: Maybe<Scalars['String']['output']>;
  username: Scalars['String']['output'];
};

export type UserListResponse = {
  __typename?: 'UserListResponse';
  total: Scalars['Float']['output'];
  users: Array<UserListItem>;
};

export type UserProfile = {
  __typename?: 'UserProfile';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  bio?: Maybe<Scalars['String']['output']>;
  created?: Maybe<Scalars['DateTimeISO']['output']>;
  followersCount: Scalars['Float']['output'];
  followingCount: Scalars['Float']['output'];
  fullName?: Maybe<Scalars['String']['output']>;
  location?: Maybe<Scalars['String']['output']>;
  starredReposCount: Scalars['Float']['output'];
  username: Scalars['String']['output'];
  website?: Maybe<Scalars['String']['output']>;
};

export type UserProfileResponse = {
  __typename?: 'UserProfileResponse';
  email: Scalars['String']['output'];
  emailReportStatus?: Maybe<ReportStatus>;
  firstName?: Maybe<Scalars['String']['output']>;
  hasEverSubscribed: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  lastName?: Maybe<Scalars['String']['output']>;
  limits: UserLimits;
  locale: Scalars['String']['output'];
  tier: Scalars['String']['output'];
  username?: Maybe<Scalars['String']['output']>;
};

export type UserRepository = {
  __typename?: 'UserRepository';
  createdAt: Scalars['DateTimeISO']['output'];
  description?: Maybe<Scalars['String']['output']>;
  fullName: Scalars['String']['output'];
  isPrivate: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  updatedAt: Scalars['DateTimeISO']['output'];
};

export type ValidateEmailTokenResponse = {
  __typename?: 'ValidateEmailTokenResponse';
  isValid: Scalars['Boolean']['output'];
};
