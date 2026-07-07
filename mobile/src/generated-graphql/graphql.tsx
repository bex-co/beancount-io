import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  JSONObject: { input: Record<string, number | string>; output: Record<string, number | string>; }
  DateTimeISO: { input: any; output: any; }
  JSON: { input: any; output: any; }
};

export type Query = {
  __typename?: 'Query';
  accountHierarchy: AccountHierarchyResponse;
  featureFlags: Scalars['JSONObject']['output'];
  /** Get a specific ledger */
  getLedger: Ledger;
  /** Get account journal with change and balance information */
  getLedgerAccountJournal: AccountJournalResponse;
  /** Get the last entries of assets and liabilities accounts */
  getLedgerAccountLastEntries: Array<AccountLastEntry>;
  /** Get the report of a specific account */
  getLedgerAccountReport: AccountReport;
  /** Get the accounts of a specific ledger */
  getLedgerAccounts: Array<Scalars['String']['output']>;
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
  /** Get journal entries for a specific ledger */
  getLedgerJournal: JournalResponse;
  /** Get the links of a specific ledger */
  getLedgerLinks: Array<Scalars['String']['output']>;
  getLedgerNarrations: Array<Scalars['String']['output']>;
  /** Get the transactions for a narration */
  getLedgerNarrationTransactions: Transaction;
  /** Get the overview of a specific ledger */
  getLedgerOverview: LedgerOverview;
  /** Get the accounts for a payee */
  getLedgerPayeeAccounts: Array<Scalars['String']['output']>;
  /** Get the payees of a specific ledger */
  getLedgerPayees: Array<Scalars['String']['output']>;
  /** Get the transactions for a payee */
  getLedgerPayeeTransactions: Transaction;
  /** Get plaintext journal in beancount format */
  getLedgerPlaintextJournal: PlaintextJournalResponse;
  /** Get the tags of a specific ledger */
  getLedgerTags: Array<Scalars['String']['output']>;
  /** Get the trial balance of a specific ledger */
  getLedgerTrialBalance: TrialBalanceData;
  /** Get the years of a specific ledger */
  getLedgerYears: Array<Scalars['String']['output']>;
  /** Get a specific public key by ID */
  getPublicKey?: Maybe<PublicKey>;
  getUserByExactMatch: Array<SearchUser>;
  /** is the server healthy? */
  health: Scalars['String']['output'];
  homeCharts: HomeChartsResponse;
  isPaid: IsPaidResponse;
  /** Get journal entries with enhanced search, filtering, and pagination */
  journalEntries: JournalEntriesResponse;
  /** Get a specific ledger */
  ledgerMeta: LedgerMetaResponse;
  listLedgerCollaborators: Array<CollaboratorUser>;
  /** List all ledgers for the current user */
  listLedgers: Array<Ledger>;
  /** List all public keys for the current user */
  listPublicKeys: Array<PublicKey>;
  /** List all user owned ledgers for the current user */
  listUserOwnedLedgers: Array<Ledger>;
  paymentHistory: Array<Receipt>;
  /** Execute a shell query on a ledger */
  queryShell?: Maybe<QueryResult>;
  /** Search for ledgers/repositories */
  searchLedgers: Array<Ledger>;
  subscriptionStatus: CustomerSubscriptionStatus;
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


export type QueryGetLedgerArgs = {
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
  invertIncomeLiabilitiesEquity?: Scalars['Boolean']['input'];
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


export type QueryGetLedgerNarrationsArgs = {
  ledgerId: Scalars['String']['input'];
};


export type QueryGetLedgerNarrationTransactionsArgs = {
  ledgerId: Scalars['String']['input'];
  narration: Scalars['String']['input'];
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


export type QueryGetLedgerPayeesArgs = {
  ledgerId: Scalars['String']['input'];
};


export type QueryGetLedgerPayeeTransactionsArgs = {
  ledgerId: Scalars['String']['input'];
  payee: Scalars['String']['input'];
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


export type QueryGetPublicKeyArgs = {
  keyId: Scalars['Float']['input'];
};


export type QueryGetUserByExactMatchArgs = {
  includeCurrentUser?: InputMaybe<Scalars['String']['input']>;
  keyword: Scalars['String']['input'];
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


export type QueryUserProfileArgs = {
  userId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryValidateEmailTokenArgs = {
  token: Scalars['String']['input'];
};

export type AccountHierarchyResponse = {
  __typename?: 'AccountHierarchyResponse';
  data: Array<LabeledHierarchyItem>;
  success: Scalars['Boolean']['output'];
};

export type LabeledHierarchyItem = {
  __typename?: 'LabeledHierarchyItem';
  data: AccountBalance;
  label: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type AccountBalance = {
  __typename?: 'AccountBalance';
  account: Scalars['String']['output'];
  balance: Scalars['JSONObject']['output'];
  balance_children: Scalars['JSONObject']['output'];
  children: Array<AccountBalance>;
};

export type Ledger = {
  __typename?: 'Ledger';
  /** Get the filter options (attributes) of a ledger */
  attributes: LedgerAttributes;
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  empty: Scalars['Boolean']['output'];
  fullName: Scalars['String']['output'];
  httpUrl: Scalars['String']['output'];
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  /** Get the beancount options of a ledger */
  options: LedgerOptions;
  permissions?: Maybe<Permission>;
  private: Scalars['Boolean']['output'];
  size: Scalars['Float']['output'];
  sshUrl: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
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

export type LedgerOptions = {
  __typename?: 'LedgerOptions';
  nameAssets: Scalars['String']['output'];
  nameEquity: Scalars['String']['output'];
  nameExpenses: Scalars['String']['output'];
  nameIncome: Scalars['String']['output'];
  nameLiabilities: Scalars['String']['output'];
  operatingCurrency: Array<Scalars['String']['output']>;
};

export type Permission = {
  __typename?: 'Permission';
  admin: Scalars['Boolean']['output'];
  pull: Scalars['Boolean']['output'];
  push: Scalars['Boolean']['output'];
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

export type AccountJournalEntry = {
  __typename?: 'AccountJournalEntry';
  balance: Scalars['JSONObject']['output'];
  change: Scalars['JSONObject']['output'];
  entry: Scalars['JSONObject']['output'];
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

export type DateAndBalance = {
  __typename?: 'DateAndBalance';
  balance: Scalars['JSONObject']['output'];
  date: Scalars['String']['output'];
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

export type LedgerCollaborator = {
  __typename?: 'LedgerCollaborator';
  permission?: Maybe<Scalars['String']['output']>;
  roleName?: Maybe<Scalars['String']['output']>;
  user?: Maybe<User>;
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

export type CommodityPairWithPrices = {
  __typename?: 'CommodityPairWithPrices';
  base: Scalars['String']['output'];
  prices: Array<PricePoint>;
  quote: Scalars['String']['output'];
};

export type PricePoint = {
  __typename?: 'PricePoint';
  date: Scalars['String']['output'];
  value: Scalars['String']['output'];
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

export type BeancountError = {
  __typename?: 'BeancountError';
  filename?: Maybe<Scalars['String']['output']>;
  lineno?: Maybe<Scalars['Float']['output']>;
  message: Scalars['String']['output'];
};

export type Event = {
  __typename?: 'Event';
  date: Scalars['String']['output'];
  description: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type IncomeStatementData = {
  __typename?: 'IncomeStatementData';
  expensesData: Array<DateAndBalanceWithAccountBalance>;
  expensesHierarchyData: SerializableTreeNode;
  incomeData: Array<DateAndBalanceWithAccountBalance>;
  incomeHierarchyData: SerializableTreeNode;
  netProfitData: Array<DateAndBalance>;
};

export type DateAndBalanceWithAccountBalance = {
  __typename?: 'DateAndBalanceWithAccountBalance';
  accountBalances: Scalars['JSONObject']['output'];
  balance: Scalars['JSONObject']['output'];
  budgets: Scalars['JSONObject']['output'];
  date: Scalars['String']['output'];
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

export type Transaction = {
  __typename?: 'Transaction';
  date: Scalars['String']['output'];
  narration?: Maybe<Scalars['String']['output']>;
  payee?: Maybe<Scalars['String']['output']>;
  postings: Array<Posting>;
};

export type Posting = {
  __typename?: 'Posting';
  account: Scalars['String']['output'];
  amount: Scalars['String']['output'];
  commodity: Scalars['String']['output'];
  price?: Maybe<Scalars['String']['output']>;
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

export type PlaintextJournalQueryInput = {
  account?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<Scalars['String']['input']>;
  time?: InputMaybe<Scalars['String']['input']>;
};

export type PlaintextJournalResponse = {
  __typename?: 'PlaintextJournalResponse';
  content: Scalars['String']['output'];
};

export type TrialBalanceData = {
  __typename?: 'TrialBalanceData';
  assetsHierarchyData: SerializableTreeNode;
  equityHierarchyData: SerializableTreeNode;
  expensesHierarchyData: SerializableTreeNode;
  incomeHierarchyData: SerializableTreeNode;
  liabilitiesHierarchyData: SerializableTreeNode;
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

export type SearchUser = {
  __typename?: 'SearchUser';
  email: Scalars['String']['output'];
  username: Scalars['String']['output'];
};

export type HomeChartsResponse = {
  __typename?: 'HomeChartsResponse';
  data: Array<LabeledChartItem>;
  success: Scalars['Boolean']['output'];
};

export type LabeledChartItem = {
  __typename?: 'LabeledChartItem';
  data: Array<ChartItemV2>;
  label: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type ChartItemV2 = {
  __typename?: 'ChartItemV2';
  balance: Scalars['JSONObject']['output'];
  budgets?: Maybe<Scalars['JSONObject']['output']>;
  date: Scalars['String']['output'];
};

export type IsPaidResponse = {
  __typename?: 'IsPaidResponse';
  isForcedToPay: Scalars['Boolean']['output'];
  isPaid: Scalars['Boolean']['output'];
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

export type PostingUnits = {
  __typename?: 'PostingUnits';
  currency?: Maybe<Scalars['String']['output']>;
  number?: Maybe<Scalars['Float']['output']>;
};

export type EntryMeta = {
  __typename?: 'EntryMeta';
  filename: Scalars['String']['output'];
  lineno: Scalars['Float']['output'];
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

export type PostingMeta = {
  __typename?: 'PostingMeta';
  filename: Scalars['String']['output'];
  lineno: Scalars['Float']['output'];
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

export type LedgerMetaResponse = {
  __typename?: 'LedgerMetaResponse';
  data: LedgerMeta;
  success: Scalars['Boolean']['output'];
};

export type LedgerMeta = {
  __typename?: 'LedgerMeta';
  accounts: Array<Scalars['String']['output']>;
  currencies: Array<Scalars['String']['output']>;
  errors: Scalars['Float']['output'];
  options: Options;
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

export type QueryColumn = {
  __typename?: 'QueryColumn';
  dtype: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type QueryResultText = {
  __typename?: 'QueryResultText';
  contents: Scalars['String']['output'];
  t?: Maybe<Scalars['String']['output']>;
};

export type CustomerSubscriptionStatus = {
  __typename?: 'CustomerSubscriptionStatus';
  hasActiveSubscription: Scalars['Boolean']['output'];
  subscriptions: Array<Subscription>;
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

export type UserProfileResponse = {
  __typename?: 'UserProfileResponse';
  email: Scalars['String']['output'];
  emailReportStatus?: Maybe<ReportStatus>;
  firstName?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  lastName?: Maybe<Scalars['String']['output']>;
  limits: UserLimits;
  locale: Scalars['String']['output'];
  tier: Scalars['String']['output'];
  username?: Maybe<Scalars['String']['output']>;
};

/** The email report status */
export enum ReportStatus {
  Monthly = 'MONTHLY',
  Off = 'OFF',
  Weekly = 'WEEKLY'
}

export type UserLimits = {
  __typename?: 'UserLimits';
  collaboratorsPerLedgerMax: Scalars['Float']['output'];
  ledgersMax: Scalars['Float']['output'];
  ledgersUsed: Scalars['Float']['output'];
};

export type ValidateEmailTokenResponse = {
  __typename?: 'ValidateEmailTokenResponse';
  isValid: Scalars['Boolean']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  addEntries: AddEntryResponse;
  /** Add a new balance entry to a specific ledger */
  addEntryBalance: AddLedgerEntryResponse;
  /** Add a new commodity entry to a specific ledger */
  addEntryCommodity: AddLedgerEntryResponse;
  /** Add a new note entry to a specific ledger */
  addEntryNote: AddLedgerEntryResponse;
  /** Add a new price entry to a specific ledger */
  addEntryPrice: AddLedgerEntryResponse;
  /** Add a new transaction entry to a specific ledger */
  addEntryTransaction: AddLedgerEntryResponse;
  addOrUpdateLedgerCollaborator: AddCollaboratorResponse;
  addPushToken: Scalars['Boolean']['output'];
  cancelSubscription: SubscriptionActionResult;
  /** Create a new ledger for the current user */
  createLedger: Ledger;
  /** Create a new file in a specific ledger */
  createLedgerFile: LedgerFileContent;
  createOneTimeToken: CreateOneTimeTokenResponse;
  /** Create a new public key for the current user */
  createPublicKey: PublicKey;
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
  /** Delete a specific public key by ID */
  deletePublicKey: DeletePublicKeyResponse;
  /** Finish signup process by verifying OTP and creating user account */
  finishSignUp: TokenAuthResponse;
  /** Create a pre-signup session with OTP verification. Sends OTP to user's email. */
  preSignUp: PreSignUpResponse;
  /** Refresh authentication token - issues a new token and revokes the current one */
  refreshToken: TokenAuthResponse;
  removeSelfFromRepo: DeleteCollaboratorResponse;
  /** Rename a file in a specific ledger */
  renameLedgerFile: RenameLedgerFileResponse;
  /** Reset user password using a token from the password reset email */
  resetPassword: ResetPasswordResponse;
  /** Send a password reset link to the user's email */
  sendForgotPasswordLink: SendForgotPasswordLinkResponse;
  sendPushNotification: Scalars['Boolean']['output'];
  signIn: TokenAuthResponse;
  signInWithOneTimeToken: TokenAuthResponse;
  /** Update a specific ledger */
  updateLedger: Ledger;
  /** Update a source slice for a specific journal entry */
  updateLedgerEntrySourceSlice: UpdateSourceSliceResponse;
  /** Update an existing file in a specific ledger */
  updateLedgerFile: LedgerFileContent;
  /** Update user profile (firstName and lastName) */
  updateProfile: UserProfileResponse;
  /** update or insert user report subscribe status */
  updateReportSubscribe?: Maybe<UpdateReportSubscribeResponse>;
  updateUsername: UserProfileResponse;
};


export type MutationAddEntriesArgs = {
  entriesInput: Array<EntryInput>;
  ledgerId?: InputMaybe<Scalars['String']['input']>;
};


export type MutationAddEntryBalanceArgs = {
  balance: LedgerBalanceInput;
  ledgerId: Scalars['String']['input'];
};


export type MutationAddEntryCommodityArgs = {
  commodity: LedgerCommodityInput;
  ledgerId: Scalars['String']['input'];
};


export type MutationAddEntryNoteArgs = {
  ledgerId: Scalars['String']['input'];
  note: LedgerNoteInput;
};


export type MutationAddEntryPriceArgs = {
  ledgerId: Scalars['String']['input'];
  price: LedgerPriceInput;
};


export type MutationAddEntryTransactionArgs = {
  ledgerId: Scalars['String']['input'];
  transaction: LedgerTransactionInput;
};


export type MutationAddOrUpdateLedgerCollaboratorArgs = {
  collaborator: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
  permission?: InputMaybe<Scalars['String']['input']>;
};


export type MutationAddPushTokenArgs = {
  token: Scalars['String']['input'];
};


export type MutationCancelSubscriptionArgs = {
  clientId: Scalars['String']['input'];
  subscriptionId: Scalars['String']['input'];
};


export type MutationCreateLedgerArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  private?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationCreateLedgerFileArgs = {
  content: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  path: Scalars['String']['input'];
};


export type MutationCreatePublicKeyArgs = {
  key: Scalars['String']['input'];
  readOnly?: InputMaybe<Scalars['Boolean']['input']>;
  title: Scalars['String']['input'];
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


export type MutationDeletePublicKeyArgs = {
  keyId: Scalars['Float']['input'];
};


export type MutationFinishSignUpArgs = {
  otp: Scalars['String']['input'];
  sessionId: Scalars['String']['input'];
};


export type MutationPreSignUpArgs = {
  email: Scalars['String']['input'];
  firstName: Scalars['String']['input'];
  inviteBy?: InputMaybe<Scalars['String']['input']>;
  inviteSrc?: InputMaybe<Scalars['String']['input']>;
  lastName: Scalars['String']['input'];
  password: Scalars['String']['input'];
  username?: InputMaybe<Scalars['String']['input']>;
  withDefaultLedger?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationRemoveSelfFromRepoArgs = {
  ledgerId: Scalars['String']['input'];
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

export type EntryInput = {
  date: Scalars['String']['input'];
  flag: Scalars['String']['input'];
  meta: Scalars['JSONObject']['input'];
  narration: Scalars['String']['input'];
  payee: Scalars['String']['input'];
  postings: Array<PostingInput>;
  type: Scalars['String']['input'];
};

export type PostingInput = {
  account: Scalars['String']['input'];
  amount: Scalars['String']['input'];
};

export type AddEntryResponse = {
  __typename?: 'AddEntryResponse';
  data?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type LedgerBalanceInput = {
  account: Scalars['String']['input'];
  amount: LedgerAmountInput;
  date: Scalars['String']['input'];
};

export type LedgerAmountInput = {
  currency: Scalars['String']['input'];
  number: Scalars['String']['input'];
};

export type AddLedgerEntryResponse = {
  __typename?: 'AddLedgerEntryResponse';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type LedgerCommodityInput = {
  currency: Scalars['String']['input'];
  date: Scalars['String']['input'];
};

export type LedgerNoteInput = {
  account: Scalars['String']['input'];
  content: Scalars['String']['input'];
  date: Scalars['String']['input'];
};

export type LedgerPriceInput = {
  amount: LedgerAmountInput;
  currency: Scalars['String']['input'];
  date: Scalars['String']['input'];
};

export type LedgerTransactionInput = {
  date: Scalars['String']['input'];
  flag: Scalars['String']['input'];
  links?: InputMaybe<Array<Scalars['String']['input']>>;
  narration?: InputMaybe<Scalars['String']['input']>;
  payee?: InputMaybe<Scalars['String']['input']>;
  postings: Array<LedgerPostingInput>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type LedgerPostingInput = {
  account: Scalars['String']['input'];
  flag?: InputMaybe<Scalars['String']['input']>;
  price?: InputMaybe<LedgerAmountInput>;
  units: LedgerAmountInput;
};

export type AddCollaboratorResponse = {
  __typename?: 'AddCollaboratorResponse';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type SubscriptionActionResult = {
  __typename?: 'SubscriptionActionResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type CreateOneTimeTokenResponse = {
  __typename?: 'CreateOneTimeTokenResponse';
  expireAt: Scalars['String']['output'];
  id: Scalars['String']['output'];
};

export type SubscriptionSessionResult = {
  __typename?: 'SubscriptionSessionResult';
  message?: Maybe<Scalars['String']['output']>;
  sessionId?: Maybe<Scalars['String']['output']>;
  sessionUrl?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type DeleteLedgerResponse = {
  __typename?: 'DeleteLedgerResponse';
  ledgerId: Scalars['String']['output'];
};

export type DeleteCollaboratorResponse = {
  __typename?: 'DeleteCollaboratorResponse';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
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

export type DeleteLedgerFileResponse = {
  __typename?: 'DeleteLedgerFileResponse';
  path: Scalars['String']['output'];
};

export type DeletePublicKeyResponse = {
  __typename?: 'DeletePublicKeyResponse';
  id: Scalars['Float']['output'];
};

export type TokenAuthResponse = {
  __typename?: 'TokenAuthResponse';
  expireAt: Scalars['DateTimeISO']['output'];
  token: Scalars['String']['output'];
};

export type PreSignUpResponse = {
  __typename?: 'PreSignUpResponse';
  expireAt: Scalars['String']['output'];
  sessionId: Scalars['String']['output'];
};

export type RenameLedgerFileResponse = {
  __typename?: 'RenameLedgerFileResponse';
  newPath: Scalars['String']['output'];
  oldPath: Scalars['String']['output'];
};

export type ResetPasswordResponse = {
  __typename?: 'ResetPasswordResponse';
  success: Scalars['Boolean']['output'];
};

export type SendForgotPasswordLinkResponse = {
  __typename?: 'SendForgotPasswordLinkResponse';
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

export type UpdateReportSubscribeResponse = {
  __typename?: 'UpdateReportSubscribeResponse';
  success: Scalars['Boolean']['output'];
};

export type AccountHierarchyQueryVariables = Exact<{
  userId: Scalars['String']['input'];
  ledgerId?: InputMaybe<Scalars['String']['input']>;
}>;


export type AccountHierarchyQuery = { __typename?: 'Query', accountHierarchy: { __typename?: 'AccountHierarchyResponse', success: boolean, data: Array<{ __typename?: 'LabeledHierarchyItem', type: string, label: string, data: { __typename?: 'AccountBalance', account: string, balance: Record<string, number | string>, balance_children: Record<string, number | string>, children: Array<{ __typename?: 'AccountBalance', account: string, balance: Record<string, number | string>, balance_children: Record<string, number | string>, children: Array<{ __typename?: 'AccountBalance', account: string, balance: Record<string, number | string>, balance_children: Record<string, number | string>, children: Array<{ __typename?: 'AccountBalance', account: string, balance: Record<string, number | string>, balance_children: Record<string, number | string>, children: Array<{ __typename?: 'AccountBalance', account: string, balance: Record<string, number | string>, balance_children: Record<string, number | string> }> }> }> }> } }> } };

export type AddEntriesMutationVariables = Exact<{
  entriesInput: Array<EntryInput> | EntryInput;
  ledgerId?: InputMaybe<Scalars['String']['input']>;
}>;


export type AddEntriesMutation = { __typename?: 'Mutation', addEntries: { __typename?: 'AddEntryResponse', data?: string | null, success: boolean } };

export type AddPushTokenMutationVariables = Exact<{
  pushToken: Scalars['String']['input'];
}>;


export type AddPushTokenMutation = { __typename?: 'Mutation', addPushToken: boolean };

export type CancelSubscriptionMutationVariables = Exact<{
  clientId: Scalars['String']['input'];
  subscriptionId: Scalars['String']['input'];
}>;


export type CancelSubscriptionMutation = { __typename?: 'Mutation', cancelSubscription: { __typename?: 'SubscriptionActionResult', success: boolean, message?: string | null } };

export type CreateSubscriptionSessionMutationVariables = Exact<{
  clientId: Scalars['String']['input'];
  priceId: Scalars['String']['input'];
}>;


export type CreateSubscriptionSessionMutation = { __typename?: 'Mutation', createSubscriptionSession: { __typename?: 'SubscriptionSessionResult', success: boolean, sessionId?: string | null, sessionUrl?: string | null, message?: string | null } };

export type DeleteAccountMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteAccountMutation = { __typename?: 'Mutation', deleteAccount: boolean };

export type GetLedgerQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
}>;


export type GetLedgerQuery = { __typename?: 'Query', getLedger: { __typename?: 'Ledger', id: string, name: string, fullName: string, httpUrl: string, sshUrl: string, private: boolean, empty: boolean, size: number, createdAt: string, updatedAt: string, description?: string | null, permissions?: { __typename?: 'Permission', admin: boolean, pull: boolean, push: boolean } | null, options: { __typename?: 'LedgerOptions', nameAssets: string, nameEquity: string, nameExpenses: string, nameIncome: string, nameLiabilities: string, operatingCurrency: Array<string> } } };

export type GetLedgerEntryContextQueryVariables = Exact<{
  entryHash: Scalars['String']['input'];
  ledgerId: Scalars['String']['input'];
}>;


export type GetLedgerEntryContextQuery = { __typename?: 'Query', getLedgerEntryContext: { __typename?: 'EntryContext', slice: string, sha256sum: string, entry: Record<string, number | string>, balances_before?: Record<string, number | string> | null, balances_after?: Record<string, number | string> | null } };

export type GetLedgerJournalQueryVariables = Exact<{
  ledgerId: Scalars['String']['input'];
  query?: InputMaybe<JournalQueryInput>;
}>;


export type GetLedgerJournalQuery = { __typename?: 'Query', getLedgerJournal: { __typename?: 'JournalResponse', total: number, data: Array<Record<string, number | string>>, is_empty: boolean } };

export type HomeChartsQueryVariables = Exact<{
  userId: Scalars['String']['input'];
  ledgerId?: InputMaybe<Scalars['String']['input']>;
}>;


export type HomeChartsQuery = { __typename?: 'Query', homeCharts: { __typename?: 'HomeChartsResponse', success: boolean, data: Array<{ __typename?: 'LabeledChartItem', type: string, label: string, data: Array<{ __typename?: 'ChartItemV2', date: string, balance: Record<string, number | string>, budgets?: Record<string, number | string> | null }> }> } };

export type IsPaidQueryVariables = Exact<{ [key: string]: never; }>;


export type IsPaidQuery = { __typename?: 'Query', isPaid: { __typename?: 'IsPaidResponse', isPaid: boolean, isForcedToPay: boolean } };

export type JournalEntriesQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
  after?: InputMaybe<Scalars['String']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  detailed?: InputMaybe<Scalars['Boolean']['input']>;
  searchQuery?: InputMaybe<Scalars['String']['input']>;
  accountFilter?: InputMaybe<Scalars['String']['input']>;
  amountMin?: InputMaybe<Scalars['Float']['input']>;
  amountMax?: InputMaybe<Scalars['Float']['input']>;
  entryTypes?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<Scalars['String']['input']>;
  groupBy?: InputMaybe<Scalars['String']['input']>;
}>;


export type JournalEntriesQuery = { __typename?: 'Query', journalEntries: { __typename?: 'JournalEntriesResponse', success: boolean, data: Array<{ __typename?: 'JournalEntry', date: string, type?: string | null, account?: string | null, booking?: string | null, currencies?: Array<string> | null, flag?: string | null, links?: Array<string | null> | null, narration?: string | null, payee?: string | null, tags?: Array<string | null> | null, comment?: string | null, filename?: string | null, entry_hash?: string | null, entry_type?: string | null, error?: string | null, error_message?: string | null, netAmount?: number | null, primaryAccount?: string | null, searchableText?: string | null, meta?: { __typename?: 'EntryMeta', filename: string, lineno: number } | null, postings?: Array<{ __typename?: 'JournalEntryPosting', account: string, cost?: string | null, flag?: string | null, price?: string | null, meta?: { __typename?: 'PostingMeta', filename: string, lineno: number } | null, units?: { __typename?: 'PostingUnits', currency?: string | null, number?: number | null } | null }> | null, amount?: { __typename?: 'PostingUnits', currency?: string | null, number?: number | null } | null }>, pageInfo?: { __typename?: 'PageInfo', hasNextPage: boolean, hasPreviousPage: boolean, startCursor?: string | null, endCursor?: string | null, totalCount?: number | null } | null } };

export type LedgerMetaQueryVariables = Exact<{
  userId: Scalars['String']['input'];
  ledgerId?: InputMaybe<Scalars['String']['input']>;
}>;


export type LedgerMetaQuery = { __typename?: 'Query', ledgerMeta: { __typename?: 'LedgerMetaResponse', success: boolean, data: { __typename?: 'LedgerMeta', accounts: Array<string>, currencies: Array<string>, errors: number, options: { __typename?: 'Options', name_assets: string, name_equity: string, name_expenses: string, name_income: string, name_liabilities: string, operating_currency: Array<string> } } } };

export type ListLedgersQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Float']['input']>;
  page?: InputMaybe<Scalars['Float']['input']>;
}>;


export type ListLedgersQuery = { __typename?: 'Query', listLedgers: Array<{ __typename?: 'Ledger', id: string, name: string, fullName: string, httpUrl: string, sshUrl: string, private: boolean, empty: boolean, size: number, createdAt: string, updatedAt: string, description?: string | null, permissions?: { __typename?: 'Permission', admin: boolean, pull: boolean, push: boolean } | null }> };

export type PaymentHistoryQueryVariables = Exact<{ [key: string]: never; }>;


export type PaymentHistoryQuery = { __typename?: 'Query', paymentHistory: Array<{ __typename?: 'Receipt', _id?: string | null, amount: string, currency: string, paymentEmail: string, userId: string, createAt?: any | null, chargeId?: string | null, estimatedIotx?: number | null, fulfilledHash?: string | null }> };

export type SubscriptionStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type SubscriptionStatusQuery = { __typename?: 'Query', subscriptionStatus: { __typename?: 'CustomerSubscriptionStatus', hasActiveSubscription: boolean, subscriptions: Array<{ __typename?: 'Subscription', id: string, status: string, cancelAt?: any | null, cancelAtPeriodEnd: boolean, canceledAt?: any | null, clientId: string, currentPeriodEnd: any, currentPeriodStart: any, items: Array<{ __typename?: 'SubscriptionItem', id: string, quantity: number, price: { __typename?: 'SubscriptionPrice', id: string, amount: number, currency: string, interval: string, intervalCount?: number | null, trialPeriodDays?: number | null }, product?: { __typename?: 'SubscriptionProduct', id: string, name: string, description?: string | null, images?: Array<string> | null } | null }> }> } };

export type UpdateReportSubscribeMutationVariables = Exact<{
  userId: Scalars['String']['input'];
  status: ReportStatus;
}>;


export type UpdateReportSubscribeMutation = { __typename?: 'Mutation', updateReportSubscribe?: { __typename?: 'UpdateReportSubscribeResponse', success: boolean } | null };

export type UserProfileQueryVariables = Exact<{
  userId: Scalars['String']['input'];
}>;


export type UserProfileQuery = { __typename?: 'Query', userProfile?: { __typename?: 'UserProfileResponse', email: string, emailReportStatus?: ReportStatus | null } | null };


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
export function useAccountHierarchySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AccountHierarchyQuery, AccountHierarchyQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<AccountHierarchyQuery, AccountHierarchyQueryVariables>(AccountHierarchyDocument, options);
        }
export type AccountHierarchyQueryHookResult = ReturnType<typeof useAccountHierarchyQuery>;
export type AccountHierarchyLazyQueryHookResult = ReturnType<typeof useAccountHierarchyLazyQuery>;
export type AccountHierarchySuspenseQueryHookResult = ReturnType<typeof useAccountHierarchySuspenseQuery>;
export type AccountHierarchyQueryResult = Apollo.QueryResult<AccountHierarchyQuery, AccountHierarchyQueryVariables>;
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
export function useGetLedgerSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLedgerQuery, GetLedgerQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLedgerQuery, GetLedgerQueryVariables>(GetLedgerDocument, options);
        }
export type GetLedgerQueryHookResult = ReturnType<typeof useGetLedgerQuery>;
export type GetLedgerLazyQueryHookResult = ReturnType<typeof useGetLedgerLazyQuery>;
export type GetLedgerSuspenseQueryHookResult = ReturnType<typeof useGetLedgerSuspenseQuery>;
export type GetLedgerQueryResult = Apollo.QueryResult<GetLedgerQuery, GetLedgerQueryVariables>;
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
export function useGetLedgerEntryContextSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLedgerEntryContextQuery, GetLedgerEntryContextQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLedgerEntryContextQuery, GetLedgerEntryContextQueryVariables>(GetLedgerEntryContextDocument, options);
        }
export type GetLedgerEntryContextQueryHookResult = ReturnType<typeof useGetLedgerEntryContextQuery>;
export type GetLedgerEntryContextLazyQueryHookResult = ReturnType<typeof useGetLedgerEntryContextLazyQuery>;
export type GetLedgerEntryContextSuspenseQueryHookResult = ReturnType<typeof useGetLedgerEntryContextSuspenseQuery>;
export type GetLedgerEntryContextQueryResult = Apollo.QueryResult<GetLedgerEntryContextQuery, GetLedgerEntryContextQueryVariables>;
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
export function useGetLedgerJournalSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLedgerJournalQuery, GetLedgerJournalQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLedgerJournalQuery, GetLedgerJournalQueryVariables>(GetLedgerJournalDocument, options);
        }
export type GetLedgerJournalQueryHookResult = ReturnType<typeof useGetLedgerJournalQuery>;
export type GetLedgerJournalLazyQueryHookResult = ReturnType<typeof useGetLedgerJournalLazyQuery>;
export type GetLedgerJournalSuspenseQueryHookResult = ReturnType<typeof useGetLedgerJournalSuspenseQuery>;
export type GetLedgerJournalQueryResult = Apollo.QueryResult<GetLedgerJournalQuery, GetLedgerJournalQueryVariables>;
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
export function useHomeChartsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<HomeChartsQuery, HomeChartsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<HomeChartsQuery, HomeChartsQueryVariables>(HomeChartsDocument, options);
        }
export type HomeChartsQueryHookResult = ReturnType<typeof useHomeChartsQuery>;
export type HomeChartsLazyQueryHookResult = ReturnType<typeof useHomeChartsLazyQuery>;
export type HomeChartsSuspenseQueryHookResult = ReturnType<typeof useHomeChartsSuspenseQuery>;
export type HomeChartsQueryResult = Apollo.QueryResult<HomeChartsQuery, HomeChartsQueryVariables>;
export const IsPaidDocument = gql`
    query IsPaid {
  isPaid {
    isPaid
    isForcedToPay
  }
}
    `;

/**
 * __useIsPaidQuery__
 *
 * To run a query within a React component, call `useIsPaidQuery` and pass it any options that fit your needs.
 * When your component renders, `useIsPaidQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useIsPaidQuery({
 *   variables: {
 *   },
 * });
 */
export function useIsPaidQuery(baseOptions?: Apollo.QueryHookOptions<IsPaidQuery, IsPaidQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<IsPaidQuery, IsPaidQueryVariables>(IsPaidDocument, options);
      }
export function useIsPaidLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<IsPaidQuery, IsPaidQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<IsPaidQuery, IsPaidQueryVariables>(IsPaidDocument, options);
        }
export function useIsPaidSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<IsPaidQuery, IsPaidQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<IsPaidQuery, IsPaidQueryVariables>(IsPaidDocument, options);
        }
export type IsPaidQueryHookResult = ReturnType<typeof useIsPaidQuery>;
export type IsPaidLazyQueryHookResult = ReturnType<typeof useIsPaidLazyQuery>;
export type IsPaidSuspenseQueryHookResult = ReturnType<typeof useIsPaidSuspenseQuery>;
export type IsPaidQueryResult = Apollo.QueryResult<IsPaidQuery, IsPaidQueryVariables>;
export const JournalEntriesDocument = gql`
    query JournalEntries($first: Int, $after: String, $last: Int, $before: String, $detailed: Boolean, $searchQuery: String, $accountFilter: String, $amountMin: Float, $amountMax: Float, $entryTypes: [String!], $sortBy: String, $sortOrder: String, $groupBy: String) {
  journalEntries(first: $first, after: $after, last: $last, before: $before, detailed: $detailed, searchQuery: $searchQuery, accountFilter: $accountFilter, amountMin: $amountMin, amountMax: $amountMax, entryTypes: $entryTypes, sortBy: $sortBy, sortOrder: $sortOrder, groupBy: $groupBy) {
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
export function useLedgerMetaSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<LedgerMetaQuery, LedgerMetaQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<LedgerMetaQuery, LedgerMetaQueryVariables>(LedgerMetaDocument, options);
        }
export type LedgerMetaQueryHookResult = ReturnType<typeof useLedgerMetaQuery>;
export type LedgerMetaLazyQueryHookResult = ReturnType<typeof useLedgerMetaLazyQuery>;
export type LedgerMetaSuspenseQueryHookResult = ReturnType<typeof useLedgerMetaSuspenseQuery>;
export type LedgerMetaQueryResult = Apollo.QueryResult<LedgerMetaQuery, LedgerMetaQueryVariables>;
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
export function useListLedgersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ListLedgersQuery, ListLedgersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ListLedgersQuery, ListLedgersQueryVariables>(ListLedgersDocument, options);
        }
export type ListLedgersQueryHookResult = ReturnType<typeof useListLedgersQuery>;
export type ListLedgersLazyQueryHookResult = ReturnType<typeof useListLedgersLazyQuery>;
export type ListLedgersSuspenseQueryHookResult = ReturnType<typeof useListLedgersSuspenseQuery>;
export type ListLedgersQueryResult = Apollo.QueryResult<ListLedgersQuery, ListLedgersQueryVariables>;
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
export function useSubscriptionStatusSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SubscriptionStatusQuery, SubscriptionStatusQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SubscriptionStatusQuery, SubscriptionStatusQueryVariables>(SubscriptionStatusDocument, options);
        }
export type SubscriptionStatusQueryHookResult = ReturnType<typeof useSubscriptionStatusQuery>;
export type SubscriptionStatusLazyQueryHookResult = ReturnType<typeof useSubscriptionStatusLazyQuery>;
export type SubscriptionStatusSuspenseQueryHookResult = ReturnType<typeof useSubscriptionStatusSuspenseQuery>;
export type SubscriptionStatusQueryResult = Apollo.QueryResult<SubscriptionStatusQuery, SubscriptionStatusQueryVariables>;
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
export function useUserProfileSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<UserProfileQuery, UserProfileQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<UserProfileQuery, UserProfileQueryVariables>(UserProfileDocument, options);
        }
export type UserProfileQueryHookResult = ReturnType<typeof useUserProfileQuery>;
export type UserProfileLazyQueryHookResult = ReturnType<typeof useUserProfileLazyQuery>;
export type UserProfileSuspenseQueryHookResult = ReturnType<typeof useUserProfileSuspenseQuery>;
export type UserProfileQueryResult = Apollo.QueryResult<UserProfileQuery, UserProfileQueryVariables>;