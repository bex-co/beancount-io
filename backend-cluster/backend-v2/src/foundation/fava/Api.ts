/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

/**
 * WebhookType
 * Supported webhook types
 */
export enum WebhookType {
  Dingtalk = "dingtalk",
  Discord = "discord",
  Gitea = "gitea",
  Gogs = "gogs",
  Msteams = "msteams",
  Slack = "slack",
  Telegram = "telegram",
  Feishu = "feishu",
  Wechatwork = "wechatwork",
  Packagist = "packagist",
}

/**
 * WebhookEvent
 * Supported webhook events
 */
export enum WebhookEvent {
  Create = "create",
  Delete = "delete",
  Fork = "fork",
  Push = "push",
  Issues = "issues",
  IssueAssign = "issue_assign",
  IssueLabel = "issue_label",
  IssueMilestone = "issue_milestone",
  IssueComment = "issue_comment",
  PullRequest = "pull_request",
  PullRequestAssign = "pull_request_assign",
  PullRequestLabel = "pull_request_label",
  PullRequestMilestone = "pull_request_milestone",
  PullRequestComment = "pull_request_comment",
  PullRequestReviewApproved = "pull_request_review_approved",
  PullRequestReviewRejected = "pull_request_review_rejected",
  PullRequestReviewComment = "pull_request_review_comment",
  PullRequestSync = "pull_request_sync",
  PullRequestReviewRequest = "pull_request_review_request",
  Wiki = "wiki",
  Repository = "repository",
  Release = "release",
  Package = "package",
  Status = "status",
  WorkflowJob = "workflow_job",
}

/**
 * TransactionSubtype
 * Enum for transaction subtypes.
 */
export enum TransactionSubtype {
  Cleared = "cleared",
  Pending = "pending",
  Other = "other",
}

/**
 * DocumentSubtype
 * Enum for document subtypes.
 */
export enum DocumentSubtype {
  Discovered = "discovered",
  Linked = "linked",
}

/**
 * DirectiveType
 * Enum for Beancount directive types.
 */
export enum DirectiveType {
  Transaction = "Transaction",
  Balance = "Balance",
  Commodity = "Commodity",
  Close = "Close",
  Custom = "Custom",
  Document = "Document",
  Event = "Event",
  Note = "Note",
  Open = "Open",
  Pad = "Pad",
  Price = "Price",
}

/**
 * CustomSubtype
 * Enum for custom subtypes.
 */
export enum CustomSubtype {
  Budget = "budget",
}

/**
 * AccountDataPublic
 * Public schema for detailed account data.
 */
export interface AccountDataPublic {
  /** Close Date */
  close_date?: string | null;
  /** Meta */
  meta?: Record<string, string | number | boolean | null> | null;
  /** Uptodate Status */
  uptodate_status?: string | null;
  /** Balance String */
  balance_string?: string | null;
  last_entry?: LastEntryPublic | null;
}

/**
 * AccountJournalEntryPublic
 * Account journal entry with change and balance information.
 */
export interface AccountJournalEntryPublic {
  /**
   * Entry
   * The journal entry
   */
  entry:
    | JournalTransactionPublic
    | JournalBalancePublic
    | JournalCommodityPublic
    | JournalClosePublic
    | JournalCustomPublic
    | JournalDocumentPublic
    | JournalEventPublic
    | JournalNotePublic
    | JournalOpenPublic
    | JournalPadPublic
    | JournalPricePublic;
  /**
   * Change
   * Change amounts for this entry
   */
  change: Record<string, string>;
  /**
   * Balance
   * Running balance after this entry
   */
  balance: Record<string, string>;
}

/**
 * AccountJournalResponsePublic
 * Response schema for account journal entries.
 */
export interface AccountJournalResponsePublic {
  /**
   * Items
   * Account journal entries
   */
  items: AccountJournalEntryPublic[];
  /**
   * Total
   * Total number of account journal entries
   */
  total: number;
  /**
   * Account
   * Account name
   */
  account: string;
  /**
   * With Children
   * Whether subaccounts were included
   */
  with_children: boolean;
}

/**
 * AccountLastEntryPublic
 * Public schema for account last entry information.
 */
export interface AccountLastEntryPublic {
  /** Account */
  account: string;
  /** Date */
  date: string | null;
  /** Balance */
  balance: Record<string, string>;
}

/**
 * AccountReportPublic
 * Public schema for account report.
 */
export interface AccountReportPublic {
  /** Linechart Data */
  linechart_data: DateAndBalancePublic[];
  /** Interval Totals Data */
  interval_totals_data: DateAndBalancePublic[];
  /** Account Balance Data */
  account_balance_data: DateAndBalancePublic[];
}

/**
 * Amount
 * An amount in some currency.
 */
export interface Amount {
  /**
   * Number
   * Number of units in the amount
   */
  number: number | string;
  /**
   * Currency
   * Currency of the amount
   */
  currency: string;
}

/**
 * AttributesPublic
 * Public schema for attributes.
 */
export interface AttributesPublic {
  /** Accounts */
  accounts: string[];
  /** Tags */
  tags: string[];
  /** Links */
  links: string[];
  /** Years */
  years: string[];
  /** Currencies */
  currencies: string[];
  /** Payees */
  payees: string[];
}

/**
 * Balance
 * A Beancount Balance directive.
 */
export interface Balance {
  /**
   * Date
   * Date of the directive
   * @format date
   */
  date: string;
  /**
   * Meta
   * Metadata of the directive
   */
  meta?: Record<string, string | number | boolean | null> | null;
  /**
   * Account
   * Account to assert the balance for
   */
  account: string;
  /** Expected balance amount for the account */
  amount: Amount;
  /** Difference between expected and actual balance amounts */
  diff_amount?: Amount | null;
}

/**
 * BalanceSheetDataPublic
 * Public schema for balance sheet data for visualization.
 */
export interface BalanceSheetDataPublic {
  /** Net Worth Data */
  net_worth_data: DateAndBalancePublic[];
  /** Assets Data */
  assets_data: DateAndBalancePublic[];
  /** Liabilities Data */
  liabilities_data: DateAndBalancePublic[];
  /** Equity Data */
  equity_data: DateAndBalancePublic[];
  /** A serializable tree node for account hierarchy. */
  assets_hierarchy_data: SerializableTreeNodePublic;
  /** A serializable tree node for account hierarchy. */
  liabilities_hierarchy_data: SerializableTreeNodePublic;
  /** A serializable tree node for account hierarchy. */
  equity_hierarchy_data: SerializableTreeNodePublic;
}

/**
 * BcioOptionsPublic
 * Public schema for BcioOptions (beancount.io-specific options).
 */
export interface BcioOptionsPublic {
  /** Default File */
  default_file: string;
  /** Transaction File */
  transaction_file: string | null;
  /** Account File */
  account_file: string | null;
  /** Price File */
  price_file: string | null;
  /** Balance File */
  balance_file: string | null;
  /** Note File */
  note_file: string | null;
  /** Pad File */
  pad_file: string | null;
  /** Budget File */
  budget_file: string | null;
  /** Receipt Base Folder */
  receipt_base_folder: string | null;
  /** Receipt Storage */
  receipt_storage: string | null;
  /** Document File */
  document_file: string | null;
}

/**
 * BeancountErrorPublic
 * Public schema for BeancountError.
 */
export interface BeancountErrorPublic {
  source?: BeancountErrorSourcePublic | null;
  /** Message */
  message: string;
}

/**
 * BeancountErrorSourcePublic
 * Public schema for BeancountErrorSource.
 */
export interface BeancountErrorSourcePublic {
  /** Filename */
  filename: string;
  /** Lineno */
  lineno: number;
}

/**
 * BeancountOptionsPublic
 * Public schema for BeancountOptions.
 */
export interface BeancountOptionsPublic {
  /** Title */
  title: string;
  /** Name Assets */
  name_assets: string;
  /** Name Liabilities */
  name_liabilities: string;
  /** Name Equity */
  name_equity: string;
  /** Name Income */
  name_income: string;
  /** Name Expenses */
  name_expenses: string;
  /** Account Current Conversions */
  account_current_conversions: string;
  /** Account Current Earnings */
  account_current_earnings: string;
  /** Render Commas */
  render_commas: boolean;
  /** Operating Currency */
  operating_currency: string[];
}

/** Body_webhookGiteaPreReceiveCheck */
export interface BodyWebhookGiteaPreReceiveCheck {
  /** Owner */
  owner: string;
  /** Repo */
  repo: string;
  /**
   * Archive
   * @format binary
   */
  archive: File;
  /** Old Archive */
  old_archive?: File | null;
}

/**
 * BulkBalanceEntry
 * A balance entry in a bulk request.
 */
export interface BulkBalanceEntry {
  /** Type */
  type: "balance";
  /** Balance to add */
  item: Balance;
  /**
   * Filename
   * Target file path (defaults to the request filename or main.bean)
   */
  filename?: string | null;
}

/**
 * BulkCloseEntry
 * A close account entry in a bulk request.
 */
export interface BulkCloseEntry {
  /** Type */
  type: "close";
  /** Close directive to add */
  item: Close;
  /**
   * Filename
   * Target file path (defaults to the request filename or main.bean)
   */
  filename?: string | null;
}

/**
 * BulkCommodityEntry
 * A commodity entry in a bulk request.
 */
export interface BulkCommodityEntry {
  /** Type */
  type: "commodity";
  /** Commodity to add */
  item: Commodity;
  /**
   * Filename
   * Target file path (defaults to the request filename or main.bean)
   */
  filename?: string | null;
}

/**
 * BulkCustomEntry
 * A custom directive entry in a bulk request.
 */
export interface BulkCustomEntry {
  /** Type */
  type: "custom";
  /** Custom directive to add */
  item: CustomDirectiveCreate;
  /**
   * Filename
   * Target file path (defaults to the request filename or main.bean)
   */
  filename?: string | null;
}

/**
 * BulkDocumentEntry
 * A document directive entry in a bulk request.
 */
export interface BulkDocumentEntry {
  /** Type */
  type: "document";
  /** Document directive to add */
  item: DocumentCreate;
  /**
   * Filename
   * Target file path (defaults to the request filename or main.bean)
   */
  filename?: string | null;
}

/**
 * BulkEventEntry
 * An event entry in a bulk request.
 */
export interface BulkEventEntry {
  /** Type */
  type: "event";
  /** Event directive to add */
  item: Event;
  /**
   * Filename
   * Target file path (defaults to the request filename or main.bean)
   */
  filename?: string | null;
}

/**
 * BulkNoteEntry
 * A note entry in a bulk request.
 */
export interface BulkNoteEntry {
  /** Type */
  type: "note";
  /** Note to add */
  item: Note;
  /**
   * Filename
   * Target file path (defaults to the request filename or main.bean)
   */
  filename?: string | null;
}

/**
 * BulkOpenEntry
 * An open account entry in a bulk request.
 */
export interface BulkOpenEntry {
  /** Type */
  type: "open";
  /** Open directive to add */
  item: Open;
  /**
   * Filename
   * Target file path (defaults to the request filename or main.bean)
   */
  filename?: string | null;
}

/**
 * BulkPriceEntry
 * A price entry in a bulk request.
 */
export interface BulkPriceEntry {
  /** Type */
  type: "price";
  /** Price to add */
  item: Price;
  /**
   * Filename
   * Target file path (defaults to the request filename or main.bean)
   */
  filename?: string | null;
}

/**
 * BulkTransactionEntry
 * A transaction entry in a bulk request.
 */
export interface BulkTransactionEntry {
  /** Type */
  type: "transaction";
  /** Transaction to add */
  item: Transaction;
  /**
   * Filename
   * Target file path (defaults to the request filename or main.bean)
   */
  filename?: string | null;
}

/**
 * Close
 * A Beancount Close directive.
 */
export interface Close {
  /**
   * Date
   * Date of the directive
   * @format date
   */
  date: string;
  /**
   * Meta
   * Metadata of the directive
   */
  meta?: Record<string, string | number | boolean | null> | null;
  /**
   * Account
   * Account of the directive
   */
  account: string;
}

/** CommitPublic */
export interface CommitPublic {
  /** Sha */
  sha: string;
  author?: UserPublic | null;
  committer?: UserPublic | null;
  commit?: RepoCommitPublic | null;
  /** Created */
  created?: string | null;
}

/**
 * Commodity
 * A Beancount Commodity directive.
 */
export interface Commodity {
  /**
   * Date
   * Date of the directive
   * @format date
   */
  date: string;
  /**
   * Meta
   * Metadata of the directive
   */
  meta?: Record<string, string | number | boolean | null> | null;
  /**
   * Currency
   * Currency
   */
  currency: string;
}

/**
 * CommodityPairWithPricesPublic
 * A pair of commodities and prices for them.
 */
export interface CommodityPairWithPricesPublic {
  /** Base */
  base: string;
  /** Quote */
  quote: string;
  /** Prices */
  prices: PricePointPublic[];
}

/**
 * ContextPublic
 * Context for an entry.
 */
export interface ContextPublic {
  /**
   * Entry
   * Serialized entry
   */
  entry:
    | JournalTransactionPublic
    | JournalBalancePublic
    | JournalCommodityPublic
    | JournalClosePublic
    | JournalCustomPublic
    | JournalDocumentPublic
    | JournalEventPublic
    | JournalNotePublic
    | JournalOpenPublic
    | JournalPadPublic
    | JournalPricePublic;
  /**
   * Balances Before
   * Account balances before the entry
   */
  balances_before?: Record<string, string[]> | null;
  /**
   * Balances After
   * Account balances after the entry
   */
  balances_after?: Record<string, string[]> | null;
  /**
   * Sha256Sum
   * SHA256 hash of the entry source
   */
  sha256sum: string;
  /**
   * Slice
   * Source code slice of the entry
   */
  slice: string;
}

/**
 * Cost
 * A cost (basically an amount with date and label).
 */
export interface Cost {
  /**
   * Number
   * Number of units in the cost
   */
  number: number | string;
  /**
   * Currency
   * Currency of the cost
   */
  currency: string;
  /**
   * Date
   * Date of the cost
   * @format date
   */
  date: string;
  /**
   * Label
   * Label of the cost
   */
  label?: string | null;
}

/** CreateUserRequest */
export interface CreateUserRequest {
  /** Username */
  username: string;
  /** Password */
  password: string;
  /**
   * Email
   * @format email
   */
  email: string;
}

/**
 * CreateWebhookRequest
 * Request model for creating a webhook
 */
export interface CreateWebhookRequest {
  /**
   * Active
   * Whether the webhook is active
   * @default false
   */
  active?: boolean | null;
  /**
   * Authorization Header
   * Authorization header value
   */
  authorization_header?: string | null;
  /**
   * Branch Filter
   * Branch filter pattern
   */
  branch_filter?: string | null;
  /**
   * Config
   * Webhook configuration (must include 'content_type' and 'url')
   */
  config: Record<string, string>;
  /**
   * Events
   * List of events to trigger webhook
   */
  events?: WebhookEvent[] | null;
  /** Webhook type (dingtalk, discord, gitea, gogs, msteams, slack, telegram, feishu, wechatwork, packagist) */
  type: WebhookType;
}

/**
 * CustomDirectiveCreate
 * Input model for creating a Custom directive.
 */
export interface CustomDirectiveCreate {
  /**
   * Date
   * Date of the directive
   * @format date
   */
  date: string;
  /**
   * Type
   * Custom directive type name (e.g. 'budget')
   */
  type: string;
  /**
   * Values
   * Values for the directive
   */
  values?: (
    | ({
        kind: "account";
      } & CustomDirectiveValueAccount)
    | ({
        kind: "amount";
      } & CustomDirectiveValueAmount)
    | ({
        kind: "number";
      } & CustomDirectiveValueNumber)
    | ({
        kind: "text";
      } & CustomDirectiveValueText)
  )[];
}

/**
 * CustomDirectiveValueAccount
 * An account reference in a custom directive (written unquoted in the beancount file).
 */
export interface CustomDirectiveValueAccount {
  /** Kind */
  kind: "account";
  /**
   * Value
   * Account name (will appear unquoted in beancount)
   */
  value: string;
}

/**
 * CustomDirectiveValueAmount
 * An amount value in a custom directive.
 */
export interface CustomDirectiveValueAmount {
  /** Kind */
  kind: "amount";
  /**
   * Number
   * Amount number
   */
  number: number | string;
  /**
   * Currency
   * Amount currency
   */
  currency: string;
}

/**
 * CustomDirectiveValueNumber
 * A numeric value in a custom directive.
 */
export interface CustomDirectiveValueNumber {
  /** Kind */
  kind: "number";
  /**
   * Value
   * Numeric value
   */
  value: number | string;
}

/**
 * CustomDirectiveValueText
 * A string value in a custom directive (will be quoted in the beancount file).
 */
export interface CustomDirectiveValueText {
  /** Kind */
  kind: "text";
  /**
   * Value
   * String value (will appear quoted in beancount)
   */
  value: string;
}

/**
 * DateAndBalancePublic
 * Public schema for balance at a date.
 */
export interface DateAndBalancePublic {
  /**
   * Date
   * @format date
   */
  date: string;
  /** Balance */
  balance: Record<string, string>;
}

/**
 * DateAndBalanceWithAccountBalancePublic
 * Public schema for balance at a date with per-account breakdown.
 */
export interface DateAndBalanceWithAccountBalancePublic {
  /**
   * Date
   * @format date
   */
  date: string;
  /** Balance */
  balance: Record<string, string>;
  /** Account Balances */
  account_balances: Record<string, Record<string, string>>;
}

/**
 * DeleteMultiSourceSliceItem
 * A single entry hash and sha256sum pair for bulk deletion.
 */
export interface DeleteMultiSourceSliceItem {
  /**
   * Entry Hash
   * Hash of the entry to delete
   */
  entry_hash: string;
  /**
   * Sha256Sum
   * SHA256 hash of the current entry source for validation
   */
  sha256sum: string;
}

/**
 * DeleteMultiSourceSlicesRequest
 * Request schema for deleting multiple source slices in a single operation.
 */
export interface DeleteMultiSourceSlicesRequest {
  /**
   * Entries
   * List of entries to delete
   */
  entries: DeleteMultiSourceSliceItem[];
}

/**
 * DeleteMultiSourceSlicesResponse
 * Response schema for deleting multiple source slices.
 */
export interface DeleteMultiSourceSlicesResponse {
  /**
   * Message
   * Success message
   */
  message: string;
  /**
   * Deleted Hashes
   * Hashes of the deleted entries
   */
  deleted_hashes: string[];
}

/**
 * DeleteSourceSliceRequest
 * Request schema for deleting a source slice.
 */
export interface DeleteSourceSliceRequest {
  /**
   * Entry Hash
   * Hash of the entry to delete
   */
  entry_hash: string;
  /**
   * Sha256Sum
   * SHA256 hash of the current entry source for validation
   */
  sha256sum: string;
}

/**
 * DeleteSourceSliceResponse
 * Response schema for deleting a source slice.
 */
export interface DeleteSourceSliceResponse {
  /**
   * Message
   * Success message
   */
  message: string;
  /**
   * Entry Hash
   * Hash of the deleted entry
   */
  entry_hash: string;
}

/**
 * DocumentCreate
 * Input model for creating a Document directive.
 */
export interface DocumentCreate {
  /**
   * Date
   * Date of the directive
   * @format date
   */
  date: string;
  /**
   * Account
   * Account the document is attached to
   */
  account: string;
  /**
   * Filename
   * Path to the document file within the repository
   */
  filename: string;
  /**
   * Tags
   * Entry tags
   * @uniqueItems true
   */
  tags?: string[];
  /**
   * Links
   * Entry links
   * @uniqueItems true
   */
  links?: string[];
}

/**
 * DocumentPublic
 * Public schema for beancount documents.
 */
export interface DocumentPublic {
  /**
   * Date
   * @format date
   */
  date: string;
  /** Account */
  account: string;
  /** Filename */
  filename: string;
  /** Tags */
  tags?: string[] | null;
  /** Links */
  links?: string[] | null;
  /** Meta */
  meta?: Record<string, string | number | boolean | null> | null;
}

/**
 * EditUserRequest
 * Request schema for editing a user
 */
export interface EditUserRequest {
  /** Login Name */
  login_name: string;
  /** Source Id */
  source_id: number;
  /** Active */
  active?: boolean | null;
  /** Admin */
  admin?: boolean | null;
  /** Allow Create Organization */
  allow_create_organization?: boolean | null;
  /** Allow Git Hook */
  allow_git_hook?: boolean | null;
  /** Allow Import Local */
  allow_import_local?: boolean | null;
  /** Description */
  description?: string | null;
  /** Email */
  email?: string | null;
  /** Full Name */
  full_name?: string | null;
  /** Location */
  location?: string | null;
  /** Max Repo Creation */
  max_repo_creation?: number | null;
  /** Must Change Password */
  must_change_password?: boolean | null;
  /** Password */
  password?: string | null;
  /** Prohibit Login */
  prohibit_login?: boolean | null;
  /** Restricted */
  restricted?: boolean | null;
  /** Visibility */
  visibility?: string | null;
  /** Website */
  website?: string | null;
}

/**
 * EntriesCountPerTypePublic
 * Public schema for entries count per type.
 */
export interface EntriesCountPerTypePublic {
  /** Type */
  type: string;
  /** Number */
  number: number;
}

/**
 * EntryAddBulkEntriesRequest
 * Request schema for adding multiple entries of mixed directive types in one commit.
 */
export interface EntryAddBulkEntriesRequest {
  /**
   * Entries
   * Entries to add, in submission order
   */
  entries: (
    | ({
        type: "balance";
      } & BulkBalanceEntry)
    | ({
        type: "close";
      } & BulkCloseEntry)
    | ({
        type: "commodity";
      } & BulkCommodityEntry)
    | ({
        type: "custom";
      } & BulkCustomEntry)
    | ({
        type: "document";
      } & BulkDocumentEntry)
    | ({
        type: "event";
      } & BulkEventEntry)
    | ({
        type: "note";
      } & BulkNoteEntry)
    | ({
        type: "open";
      } & BulkOpenEntry)
    | ({
        type: "price";
      } & BulkPriceEntry)
    | ({
        type: "transaction";
      } & BulkTransactionEntry)
  )[];
  /**
   * Filename
   * Default target file for items that omit their own (defaults to main.bean)
   */
  filename?: string | null;
}

/**
 * ErrorResponse
 * 统一错误响应格式
 */
export interface ErrorResponse {
  /**
   * Success
   * @default false
   */
  success?: boolean;
  /** Error */
  error: string;
  /**
   * Code
   * Machine-readable error code for structured client handling (e.g. 'directive_limit_exceeded')
   */
  code?: string | null;
  /**
   * Details
   * Structured details for `code`, e.g. {'limit': 1000, 'current': 1005}
   */
  details?: Record<string, number | string> | null;
}

/**
 * Event
 * A Beancount Event directive.
 */
export interface Event {
  /**
   * Date
   * Date of the directive
   * @format date
   */
  date: string;
  /**
   * Meta
   * Metadata of the directive
   */
  meta?: Record<string, string | number | boolean | null> | null;
  /**
   * Type
   * Type of the event
   */
  type: string;
  /**
   * Description
   * Description of the event
   */
  description: string;
}

/**
 * EventPublic
 * Public schema for beancount events.
 */
export interface EventPublic {
  /**
   * Date
   * @format date
   */
  date: string;
  /** Type */
  type: string;
  /** Description */
  description: string;
}

/**
 * FavaOptionsPublic
 * Public schema for FavaOptions.
 */
export interface FavaOptionsPublic {
  /** Account Journal Include Children */
  account_journal_include_children: boolean;
  /** Auto Reload */
  auto_reload: boolean;
  /** Collapse Pattern */
  collapse_pattern: string[];
  /** Conversion Currencies */
  conversion_currencies: string[];
  /** Currency Column */
  currency_column: number;
  /** Default Page */
  default_page: string;
  /** Public schema for FiscalYearEnd. */
  fiscal_year_end: FiscalYearEndPublic;
  /** Indent */
  indent: number;
  /** Invert Income Liabilities Equity */
  invert_income_liabilities_equity: boolean;
  /** Language */
  language: string | null;
  /** Locale */
  locale: string | null;
  /** Show Accounts With Zero Balance */
  show_accounts_with_zero_balance: boolean;
  /** Show Accounts With Zero Transactions */
  show_accounts_with_zero_transactions: boolean;
  /** Show Closed Accounts */
  show_closed_accounts: boolean;
  /** Sidebar Show Queries */
  sidebar_show_queries: number;
  /** Unrealized */
  unrealized: string;
  /** Upcoming Events */
  upcoming_events: number;
  /** Uptodate Indicator Grey Lookback Days */
  uptodate_indicator_grey_lookback_days: number;
  /** Use External Editor */
  use_external_editor: boolean;
}

/**
 * FiscalYearEndPublic
 * Public schema for FiscalYearEnd.
 */
export interface FiscalYearEndPublic {
  /** Month */
  month: number;
  /** Day */
  day: number;
}

/** GitObjectPublic */
export interface GitObjectPublic {
  /** Sha */
  sha: string;
  /** Type */
  type: string;
}

/** HealthCheck */
export interface HealthCheck {
  /** Status */
  status: string;
  /** Timestamp */
  timestamp: string;
}

/**
 * IncomeStatementDataPublic
 * Public schema for income statement data for visualization.
 */
export interface IncomeStatementDataPublic {
  /** Net Profit Data */
  net_profit_data: DateAndBalancePublic[];
  /** Income Data */
  income_data: DateAndBalanceWithAccountBalancePublic[];
  /** Expenses Data */
  expenses_data: DateAndBalanceWithAccountBalancePublic[];
  /** A serializable tree node for account hierarchy. */
  income_hierarchy_data: SerializableTreeNodePublic;
  /** A serializable tree node for account hierarchy. */
  expenses_hierarchy_data: SerializableTreeNodePublic;
}

/**
 * JournalAmountPublic
 * An amount in some currency.
 */
export interface JournalAmountPublic {
  /**
   * Number
   * Number of units in the amount
   */
  number: string;
  /**
   * Currency
   * Currency of the amount
   */
  currency: string;
}

/**
 * JournalBalancePublic
 * A Beancount Balance directive.
 */
export interface JournalBalancePublic {
  /**
   * Date
   * Date of the directive
   * @format date
   */
  date: string;
  /**
   * Meta
   * Metadata of the directive
   */
  meta?: Record<string, string | number | boolean | null> | null;
  /**
   * Entry Hash
   * Hash of the entry
   */
  entry_hash: string;
  /** Type of the directive */
  directive_type: DirectiveType;
  /**
   * Account
   * Account of the directive
   */
  account: string;
  /** Difference amount */
  diff_amount?: JournalAmountPublic | null;
}

/**
 * JournalClosePublic
 * A Beancount Close directive.
 */
export interface JournalClosePublic {
  /**
   * Date
   * Date of the directive
   * @format date
   */
  date: string;
  /**
   * Meta
   * Metadata of the directive
   */
  meta?: Record<string, string | number | boolean | null> | null;
  /**
   * Entry Hash
   * Hash of the entry
   */
  entry_hash: string;
  /** Type of the directive */
  directive_type: DirectiveType;
  /**
   * Account
   * Account of the directive
   */
  account: string;
}

/**
 * JournalCommodityPublic
 * A Beancount Commodity directive.
 */
export interface JournalCommodityPublic {
  /**
   * Date
   * Date of the directive
   * @format date
   */
  date: string;
  /**
   * Meta
   * Metadata of the directive
   */
  meta?: Record<string, string | number | boolean | null> | null;
  /**
   * Entry Hash
   * Hash of the entry
   */
  entry_hash: string;
  /** Type of the directive */
  directive_type: DirectiveType;
  /**
   * Currency
   * Currency
   */
  currency: string;
}

/**
 * JournalCostPublic
 * A cost (basically an amount with date and label).
 */
export interface JournalCostPublic {
  /**
   * Number
   * Number of units in the cost
   */
  number: string;
  /**
   * Currency
   * Currency of the cost
   */
  currency: string;
  /**
   * Date
   * Date of the cost
   * @format date
   */
  date: string;
  /**
   * Label
   * Label of the cost
   */
  label?: string | null;
}

/**
 * JournalCustomPublic
 * A Beancount Custom directive.
 */
export interface JournalCustomPublic {
  /**
   * Date
   * Date of the directive
   * @format date
   */
  date: string;
  /**
   * Meta
   * Metadata of the directive
   */
  meta?: Record<string, string | number | boolean | null> | null;
  /**
   * Entry Hash
   * Hash of the entry
   */
  entry_hash: string;
  /** Type of the directive */
  directive_type: DirectiveType;
  /**
   * Type
   * Directive type
   */
  type: string;
  /**
   * Values
   * Custom values
   */
  values: (string | number | boolean | null)[];
}

/**
 * JournalDocumentPublic
 * A Beancount Document directive.
 */
export interface JournalDocumentPublic {
  /**
   * Date
   * Date of the directive
   * @format date
   */
  date: string;
  /**
   * Meta
   * Metadata of the directive
   */
  meta?: Record<string, string | number | boolean | null> | null;
  /**
   * Entry Hash
   * Hash of the entry
   */
  entry_hash: string;
  /** Type of the directive */
  directive_type: DirectiveType;
  /**
   * Filename
   * Filename of the document
   */
  filename: string;
  /**
   * Account
   * Account of the directive
   */
  account: string;
  /**
   * Tags
   * Entry tags
   * @uniqueItems true
   */
  tags?: string[];
  /**
   * Links
   * Entry links
   * @uniqueItems true
   */
  links?: string[];
}

/**
 * JournalEventPublic
 * A Beancount Event directive.
 */
export interface JournalEventPublic {
  /**
   * Date
   * Date of the directive
   * @format date
   */
  date: string;
  /**
   * Meta
   * Metadata of the directive
   */
  meta?: Record<string, string | number | boolean | null> | null;
  /**
   * Entry Hash
   * Hash of the entry
   */
  entry_hash: string;
  /** Type of the directive */
  directive_type: DirectiveType;
  /**
   * Type
   * Type of the event
   */
  type: string;
  /**
   * Description
   * Description of the event
   */
  description: string;
}

/**
 * JournalNotePublic
 * A Beancount Note directive.
 */
export interface JournalNotePublic {
  /**
   * Date
   * Date of the directive
   * @format date
   */
  date: string;
  /**
   * Meta
   * Metadata of the directive
   */
  meta?: Record<string, string | number | boolean | null> | null;
  /**
   * Entry Hash
   * Hash of the entry
   */
  entry_hash: string;
  /** Type of the directive */
  directive_type: DirectiveType;
  /**
   * Account
   * Account of the directive
   */
  account: string;
  /**
   * Comment
   * Note comment
   */
  comment: string;
}

/**
 * JournalOpenPublic
 * A Beancount Open directive.
 */
export interface JournalOpenPublic {
  /**
   * Date
   * Date of the directive
   * @format date
   */
  date: string;
  /**
   * Meta
   * Metadata of the directive
   */
  meta?: Record<string, string | number | boolean | null> | null;
  /**
   * Entry Hash
   * Hash of the entry
   */
  entry_hash: string;
  /** Type of the directive */
  directive_type: DirectiveType;
  /**
   * Account
   * Account of the directive
   */
  account: string;
  /**
   * Currencies
   * Valid currencies for the account
   */
  currencies?: string[] | null;
  /**
   * Booking
   * Booking method for the account
   */
  booking?: string | null;
}

/**
 * JournalPadPublic
 * A Beancount Pad directive.
 */
export interface JournalPadPublic {
  /**
   * Date
   * Date of the directive
   * @format date
   */
  date: string;
  /**
   * Meta
   * Metadata of the directive
   */
  meta?: Record<string, string | number | boolean | null> | null;
  /**
   * Entry Hash
   * Hash of the entry
   */
  entry_hash: string;
  /** Type of the directive */
  directive_type: DirectiveType;
  /**
   * Account
   * Account of the directive
   */
  account: string;
  /**
   * Source Account
   * Source account of the pad
   */
  source_account: string;
}

/**
 * JournalPostingPublic
 * A Beancount posting.
 */
export interface JournalPostingPublic {
  /** Units of the posting */
  units: JournalAmountPublic;
  /** Cost of the posting */
  cost?: JournalCostPublic | null;
  /**
   * Account
   * Account of the posting
   */
  account: string;
  /** Price of the posting */
  price?: JournalAmountPublic | null;
  /**
   * Meta
   * Metadata of the posting
   */
  meta?: Record<string, string | number | boolean | null> | null;
  /**
   * Flag
   * Flag of the posting
   */
  flag?: string | null;
}

/**
 * JournalPricePublic
 * A Beancount Price directive.
 */
export interface JournalPricePublic {
  /**
   * Date
   * Date of the directive
   * @format date
   */
  date: string;
  /**
   * Meta
   * Metadata of the directive
   */
  meta?: Record<string, string | number | boolean | null> | null;
  /**
   * Entry Hash
   * Hash of the entry
   */
  entry_hash: string;
  /** Type of the directive */
  directive_type: DirectiveType;
  /**
   * Currency
   * Currency for which this is a price
   */
  currency: string;
  /** Price amount */
  amount: JournalAmountPublic;
}

/**
 * JournalQueryResponsePublic
 * Response schema for exporting journal entries.
 */
export interface JournalQueryResponsePublic {
  /**
   * Items
   * Journal entries
   */
  items: (
    | JournalTransactionPublic
    | JournalBalancePublic
    | JournalCommodityPublic
    | JournalClosePublic
    | JournalCustomPublic
    | JournalDocumentPublic
    | JournalEventPublic
    | JournalNotePublic
    | JournalOpenPublic
    | JournalPadPublic
    | JournalPricePublic
  )[];
  /**
   * Total
   * Total number of journal entries
   */
  total: number;
  /**
   * Is Empty
   * Whether the journal is empty
   */
  is_empty: boolean;
}

/**
 * JournalTransactionPublic
 * A Beancount Transaction directive.
 */
export interface JournalTransactionPublic {
  /**
   * Date
   * Date of the directive
   * @format date
   */
  date: string;
  /**
   * Meta
   * Metadata of the directive
   */
  meta?: Record<string, string | number | boolean | null> | null;
  /**
   * Entry Hash
   * Hash of the entry
   */
  entry_hash: string;
  /** Type of the directive */
  directive_type: DirectiveType;
  /**
   * Flag
   * Flag of the transaction
   */
  flag: string;
  /**
   * Payee
   * Payee of the transaction
   */
  payee?: string | null;
  /**
   * Narration
   * Narration of the transaction
   */
  narration?: string | null;
  /**
   * Postings
   * Postings of the transaction
   */
  postings: JournalPostingPublic[];
  /**
   * Tags
   * Entry tags
   * @uniqueItems true
   */
  tags?: string[];
  /**
   * Links
   * Entry links
   * @uniqueItems true
   */
  links?: string[];
}

/**
 * KeyCreate
 * Schema for creating a new public key
 */
export interface KeyCreate {
  /**
   * Key
   * The public key content
   */
  key: string;
  /**
   * Title
   * Title for the public key
   */
  title: string;
  /**
   * Read Only
   * Whether the key is read-only
   * @default false
   */
  read_only?: boolean;
}

/**
 * KeyPublic
 * Public schema for key information (safe for API responses)
 */
export interface KeyPublic {
  /** Id */
  id: number;
  /** Fingerprint */
  fingerprint: string;
  /** Key */
  key: string;
  /** Last Used At */
  last_used_at?: string | null;
  /** Title */
  title: string;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
}

/**
 * LastEntryPublic
 * Public schema for the last entry of an account.
 */
export interface LastEntryPublic {
  /**
   * Date
   * @format date
   */
  date: string;
  /** Entry Hash */
  entry_hash: string;
}

/** LedgerAddCollaboratorOptions */
export interface LedgerAddCollaboratorOptions {
  /** Permission */
  permission?: "read" | "write" | "admin" | null;
}

/** LedgerChangeFileOperation */
export interface LedgerChangeFileOperation {
  /** Operation */
  operation: "create" | "update" | "delete";
  /** Path */
  path: string;
  /** Content */
  content?: string | null;
  /** From Path */
  from_path?: string | null;
  /** Sha */
  sha?: string | null;
}

/** LedgerChangeFilesOptions */
export interface LedgerChangeFilesOptions {
  /** Files */
  files: LedgerChangeFileOperation[];
  /** Message */
  message?: string | null;
  /** Branch */
  branch?: string | null;
  /** New Branch */
  new_branch?: string | null;
}

/** LedgerCollaboratorPermission */
export interface LedgerCollaboratorPermission {
  /** Permission */
  permission?: string | null;
  /** Role Name */
  role_name?: string | null;
  user?: UserPublic | null;
}

/** LedgerCreate */
export interface LedgerCreate {
  /** Name */
  name: string;
  /** Description */
  description?: string | null;
  /** Private */
  private?: boolean | null;
  /** Files */
  files: Record<string, string>;
}

/** LedgerCreateFileOptions */
export interface LedgerCreateFileOptions {
  /** Path */
  path: string;
  /** Content */
  content: string;
  /** Message */
  message?: string | null;
}

/** LedgerDeleteFileOptions */
export interface LedgerDeleteFileOptions {
  /** Path */
  path: string;
  /** Sha */
  sha: string;
  /** Message */
  message?: string | null;
}

/** LedgerFileContentPublic */
export interface LedgerFileContentPublic {
  /** Name */
  name: string;
  /** Path */
  path: string;
  /** Type */
  type: "file" | "dir";
  /** Sha */
  sha: string;
  /** Size */
  size: number;
  /** Content */
  content?: string | null;
  /** Encoding */
  encoding?: string | null;
  /** Last Commit Sha */
  last_commit_sha?: string | null;
  /** Last Committer Date */
  last_committer_date?: string | null;
  /** Last Author Date */
  last_author_date?: string | null;
}

/** LedgerGetFilesContentOptions */
export interface LedgerGetFilesContentOptions {
  /** Files */
  files: string[];
}

/** LedgerPublic */
export interface LedgerPublic {
  /** Id */
  id: number;
  /** Name */
  name: string;
  /** Description */
  description?: string | null;
  /** Full Name */
  full_name: string;
  /** Empty */
  empty: boolean;
  /** Private */
  private: boolean;
  /** Size */
  size: number;
  /**
   * Created At
   * @format date-time
   */
  created_at: string;
  /**
   * Updated At
   * @format date-time
   */
  updated_at: string;
  permissions?: PermissionPublic | null;
}

/**
 * LedgerSearchResults
 * Search results for ledgers
 */
export interface LedgerSearchResults {
  /** Data */
  data: LedgerPublic[];
  /** Ok */
  ok?: boolean | null;
}

/** LedgerUpdate */
export interface LedgerUpdate {
  /** Name */
  name?: string | null;
  /** Description */
  description?: string | null;
  /** Private */
  private?: boolean | null;
}

/** LedgerUpdateFileOptions */
export interface LedgerUpdateFileOptions {
  /** Path */
  path: string;
  /** Content */
  content: string;
  /** Sha */
  sha: string;
  /** Message */
  message?: string | null;
}

/**
 * Note
 * A Beancount Note directive.
 */
export interface Note {
  /**
   * Date
   * Date of the directive
   * @format date
   */
  date: string;
  /**
   * Meta
   * Metadata of the directive
   */
  meta?: Record<string, string | number | boolean | null> | null;
  /**
   * Account
   * Account of the directive
   */
  account: string;
  /**
   * Comment
   * Note comment
   */
  comment: string;
}

/**
 * Open
 * A Beancount Open directive.
 */
export interface Open {
  /**
   * Date
   * Date of the directive
   * @format date
   */
  date: string;
  /**
   * Meta
   * Metadata of the directive
   */
  meta?: Record<string, string | number | boolean | null> | null;
  /**
   * Account
   * Account of the directive
   */
  account: string;
  /**
   * Currencies
   * Valid currencies for the account
   */
  currencies: string[];
}

/**
 * OverviewPublic
 * Public schema for overview endpoint.
 */
export interface OverviewPublic {
  /** Net Worth Data */
  net_worth_data: DateAndBalancePublic[];
  /** Assets Data */
  assets_data: DateAndBalancePublic[];
  /** A serializable tree node for account hierarchy. */
  assets_hierarchy_data: SerializableTreeNodePublic;
  /** Liabilities Data */
  liabilities_data: DateAndBalancePublic[];
  /** A serializable tree node for account hierarchy. */
  liabilities_hierarchy_data: SerializableTreeNodePublic;
  /** Expenses Interval Data */
  expenses_interval_data: DateAndBalanceWithAccountBalancePublic[];
  /** A serializable tree node for account hierarchy. */
  expenses_hierarchy_data: SerializableTreeNodePublic;
  /** Expenses Data */
  expenses_data: DateAndBalancePublic[];
  /** Income Interval Data */
  income_interval_data: DateAndBalanceWithAccountBalancePublic[];
  /** A serializable tree node for account hierarchy. */
  income_hierarchy_data: SerializableTreeNodePublic;
  /** Income Data */
  income_data: DateAndBalancePublic[];
}

/** PermissionPublic */
export interface PermissionPublic {
  /** Admin */
  admin?: boolean | null;
  /** Pull */
  pull?: boolean | null;
  /** Push */
  push?: boolean | null;
}

/**
 * PlaintextJournalResponse
 * Response schema for plaintext journal.
 */
export interface PlaintextJournalResponse {
  /**
   * Content
   * Plaintext journal content
   */
  content: string;
}

/**
 * Posting
 * A Beancount posting.
 */
export interface Posting {
  /** Units of the posting */
  units: Amount;
  /** Cost of the posting */
  cost?: Cost | null;
  /**
   * Account
   * Account of the posting
   */
  account: string;
  /** Price of the posting */
  price?: Amount | null;
  /**
   * Meta
   * Metadata of the posting
   */
  meta?: Record<string, string | number | boolean | null> | null;
  /**
   * Flag
   * Flag of the posting
   */
  flag?: string | null;
}

/**
 * PostingPublic
 * Public schema for beancount posting.
 */
export interface PostingPublic {
  /** Account */
  account: string;
  /** Amount */
  amount: string;
  /** Commodity */
  commodity: string;
  /** Price */
  price?: string | null;
}

/**
 * PreReceiveCheckResponse
 * Response model for the pre-receive directive limit check
 */
export interface PreReceiveCheckResponse {
  /**
   * Allow
   * Whether the push should be accepted
   */
  allow: boolean;
  /**
   * Reason
   * Machine-readable reason code for the decision
   */
  reason: string;
  /**
   * New Directive Count
   * Directive count in the pushed tree
   */
  new_directive_count?: number | null;
  /**
   * Old Directive Count
   * Directive count currently on record, if known
   */
  old_directive_count?: number | null;
  /**
   * Limit
   * The tier's directive limit that was checked against
   */
  limit?: number | null;
}

/**
 * Price
 * A Beancount Price directive.
 */
export interface Price {
  /**
   * Date
   * Date of the directive
   * @format date
   */
  date: string;
  /**
   * Meta
   * Metadata of the directive
   */
  meta?: Record<string, string | number | boolean | null> | null;
  /**
   * Currency
   * Currency for which this is a price
   */
  currency: string;
  /** Price amount */
  amount: Amount;
}

/**
 * PricePointPublic
 * A single price point with date and value.
 */
export interface PricePointPublic {
  /**
   * Date
   * @format date
   */
  date: string;
  /** Value */
  value: string;
}

/**
 * QueryColumn
 * A query column definition.
 */
export interface QueryColumn {
  /**
   * Name
   * Name of the column
   */
  name: string;
  /**
   * Dtype
   * Data type of the column
   */
  dtype: string;
}

/**
 * QueryResult
 * Union of query result types.
 */
export interface QueryResult {
  /**
   * Result
   * The query result
   */
  result: QueryResultTable | QueryResultText;
}

/**
 * QueryResultTable
 * Table query result.
 */
export interface QueryResultTable {
  /**
   * Types
   * Column definitions
   */
  types: QueryColumn[];
  /**
   * Rows
   * Query result rows
   */
  rows: (string | number | boolean | null)[][];
  /**
   * T
   * Result type identifier
   * @default "table"
   */
  t?: string;
}

/**
 * QueryResultText
 * Text query result.
 */
export interface QueryResultText {
  /**
   * Contents
   * Text content of the query result
   */
  contents: string;
  /**
   * T
   * Result type identifier
   * @default "string"
   */
  t?: string;
}

/**
 * QueryTextResult
 * Plain text query result.
 */
export interface QueryTextResult {
  /**
   * Text
   * Formatted query output as plain text
   */
  text: string;
}

/** ReferencePublic */
export interface ReferencePublic {
  /** Ref */
  ref: string;
  object?: GitObjectPublic | null;
}

/** RenameUserRequest */
export interface RenameUserRequest {
  /** New Username */
  new_username: string;
}

/** RepoCommitPublic */
export interface RepoCommitPublic {
  /** Message */
  message: string;
}

/**
 * SerializableTreeNodePublic
 * A serializable tree node for account hierarchy.
 */
export interface SerializableTreeNodePublic {
  /** Account */
  account: string;
  /** Balance */
  balance: Record<string, string>;
  /** Balance Children */
  balance_children: Record<string, string>;
  /** Children */
  children: SerializableTreeNodePublic[];
  /** Has Txns */
  has_txns: boolean;
  /** Cost */
  cost?: Record<string, string> | null;
  /** Cost Children */
  cost_children?: Record<string, string> | null;
}

/** SuccessResponse[AccountJournalResponsePublic] */
export interface SuccessResponseAccountJournalResponsePublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Response schema for account journal entries. */
  data: AccountJournalResponsePublic;
}

/** SuccessResponse[AccountReportPublic] */
export interface SuccessResponseAccountReportPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Public schema for account report. */
  data: AccountReportPublic;
}

/** SuccessResponse[AttributesPublic] */
export interface SuccessResponseAttributesPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Public schema for attributes. */
  data: AttributesPublic;
}

/** SuccessResponse[BalanceSheetDataPublic] */
export interface SuccessResponseBalanceSheetDataPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Public schema for balance sheet data for visualization. */
  data: BalanceSheetDataPublic;
}

/** SuccessResponse[BcioOptionsPublic] */
export interface SuccessResponseBcioOptionsPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Public schema for BcioOptions (beancount.io-specific options). */
  data: BcioOptionsPublic;
}

/** SuccessResponse[BeancountOptionsPublic] */
export interface SuccessResponseBeancountOptionsPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Public schema for BeancountOptions. */
  data: BeancountOptionsPublic;
}

/** SuccessResponse[ContextPublic] */
export interface SuccessResponseContextPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Context for an entry. */
  data: ContextPublic;
}

/** SuccessResponse[DeleteMultiSourceSlicesResponse] */
export interface SuccessResponseDeleteMultiSourceSlicesResponse {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Response schema for deleting multiple source slices. */
  data: DeleteMultiSourceSlicesResponse;
}

/** SuccessResponse[DeleteSourceSliceResponse] */
export interface SuccessResponseDeleteSourceSliceResponse {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Response schema for deleting a source slice. */
  data: DeleteSourceSliceResponse;
}

/** SuccessResponse[FavaOptionsPublic] */
export interface SuccessResponseFavaOptionsPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Public schema for FavaOptions. */
  data: FavaOptionsPublic;
}

/** SuccessResponse[HealthCheck] */
export interface SuccessResponseHealthCheck {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  data: HealthCheck;
}

/** SuccessResponse[IncomeStatementDataPublic] */
export interface SuccessResponseIncomeStatementDataPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Public schema for income statement data for visualization. */
  data: IncomeStatementDataPublic;
}

/** SuccessResponse[JournalQueryResponsePublic] */
export interface SuccessResponseJournalQueryResponsePublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Response schema for exporting journal entries. */
  data: JournalQueryResponsePublic;
}

/** SuccessResponse[KeyPublic] */
export interface SuccessResponseKeyPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Public schema for key information (safe for API responses) */
  data: KeyPublic;
}

/** SuccessResponse[LedgerCollaboratorPermission] */
export interface SuccessResponseLedgerCollaboratorPermission {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  data: LedgerCollaboratorPermission;
}

/** SuccessResponse[LedgerFileContentPublic] */
export interface SuccessResponseLedgerFileContentPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  data: LedgerFileContentPublic;
}

/** SuccessResponse[LedgerPublic] */
export interface SuccessResponseLedgerPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  data: LedgerPublic;
}

/** SuccessResponse[LedgerSearchResults] */
export interface SuccessResponseLedgerSearchResults {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Search results for ledgers */
  data: LedgerSearchResults;
}

/** SuccessResponse[NoneType] */
export interface SuccessResponseNoneType {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Data */
  data: null;
}

/** SuccessResponse[OverviewPublic] */
export interface SuccessResponseOverviewPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Public schema for overview endpoint. */
  data: OverviewPublic;
}

/** SuccessResponse[PlaintextJournalResponse] */
export interface SuccessResponsePlaintextJournalResponse {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Response schema for plaintext journal. */
  data: PlaintextJournalResponse;
}

/** SuccessResponse[PreReceiveCheckResponse] */
export interface SuccessResponsePreReceiveCheckResponse {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Response model for the pre-receive directive limit check */
  data: PreReceiveCheckResponse;
}

/** SuccessResponse[QueryResult] */
export interface SuccessResponseQueryResult {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Union of query result types. */
  data: QueryResult;
}

/** SuccessResponse[QueryTextResult] */
export interface SuccessResponseQueryTextResult {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Plain text query result. */
  data: QueryTextResult;
}

/** SuccessResponse[SerializableTreeNodePublic] */
export interface SuccessResponseSerializableTreeNodePublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** A serializable tree node for account hierarchy. */
  data: SerializableTreeNodePublic;
}

/** SuccessResponse[TokenCreateResponse] */
export interface SuccessResponseTokenCreateResponse {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Response schema for token creation (may include the actual token if returned by API) */
  data: TokenCreateResponse;
}

/** SuccessResponse[TrialBalanceDataPublic] */
export interface SuccessResponseTrialBalanceDataPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Public schema for trial balance data for visualization. */
  data: TrialBalanceDataPublic;
}

/** SuccessResponse[Union[LedgerFileContentPublic, NoneType]] */
export interface SuccessResponseUnionLedgerFileContentPublicNoneType {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  data: LedgerFileContentPublic | null;
}

/** SuccessResponse[Union[TransactionPublic, NoneType]] */
export interface SuccessResponseUnionTransactionPublicNoneType {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  data: TransactionPublic | null;
}

/** SuccessResponse[UpdateSourceSliceResponse] */
export interface SuccessResponseUpdateSourceSliceResponse {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Response schema for updating a source slice. */
  data: UpdateSourceSliceResponse;
}

/** SuccessResponse[UserPublic] */
export interface SuccessResponseUserPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  data: UserPublic;
}

/** SuccessResponse[WebhookGiteaResponse] */
export interface SuccessResponseWebhookGiteaResponse {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Response model for Gitea push webhook */
  data: WebhookGiteaResponse;
}

/** SuccessResponse[WebhookRepoCreateResponse] */
export interface SuccessResponseWebhookRepoCreateResponse {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Response model for repository creation webhook */
  data: WebhookRepoCreateResponse;
}

/** SuccessResponse[WebhookResponse] */
export interface SuccessResponseWebhookResponse {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Response model for webhook data */
  data: WebhookResponse;
}

/** SuccessResponse[dict[str, AccountDataPublic]] */
export interface SuccessResponseDictStrAccountDataPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Data */
  data: Record<string, AccountDataPublic>;
}

/** SuccessResponse[list[AccountLastEntryPublic]] */
export interface SuccessResponseListAccountLastEntryPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Data */
  data: AccountLastEntryPublic[];
}

/** SuccessResponse[list[BeancountErrorPublic]] */
export interface SuccessResponseListBeancountErrorPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Data */
  data: BeancountErrorPublic[];
}

/** SuccessResponse[list[CommitPublic]] */
export interface SuccessResponseListCommitPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Data */
  data: CommitPublic[];
}

/** SuccessResponse[list[CommodityPairWithPricesPublic]] */
export interface SuccessResponseListCommodityPairWithPricesPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Data */
  data: CommodityPairWithPricesPublic[];
}

/** SuccessResponse[list[DateAndBalanceWithAccountBalancePublic]] */
export interface SuccessResponseListDateAndBalanceWithAccountBalancePublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Data */
  data: DateAndBalanceWithAccountBalancePublic[];
}

/** SuccessResponse[list[DocumentPublic]] */
export interface SuccessResponseListDocumentPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Data */
  data: DocumentPublic[];
}

/** SuccessResponse[list[EntriesCountPerTypePublic]] */
export interface SuccessResponseListEntriesCountPerTypePublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Data */
  data: EntriesCountPerTypePublic[];
}

/** SuccessResponse[list[EventPublic]] */
export interface SuccessResponseListEventPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Data */
  data: EventPublic[];
}

/** SuccessResponse[list[KeyPublic]] */
export interface SuccessResponseListKeyPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Data */
  data: KeyPublic[];
}

/** SuccessResponse[list[LedgerFileContentPublic]] */
export interface SuccessResponseListLedgerFileContentPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Data */
  data: LedgerFileContentPublic[];
}

/** SuccessResponse[list[LedgerPublic]] */
export interface SuccessResponseListLedgerPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Data */
  data: LedgerPublic[];
}

/** SuccessResponse[list[ReferencePublic]] */
export interface SuccessResponseListReferencePublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Data */
  data: ReferencePublic[];
}

/** SuccessResponse[list[TokenPublic]] */
export interface SuccessResponseListTokenPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Data */
  data: TokenPublic[];
}

/** SuccessResponse[list[UserPublic]] */
export interface SuccessResponseListUserPublic {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Data */
  data: UserPublic[];
}

/** SuccessResponse[list[WebhookResponse]] */
export interface SuccessResponseListWebhookResponse {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Data */
  data: WebhookResponse[];
}

/** SuccessResponse[list[dict]] */
export interface SuccessResponseListDict {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Data */
  data: Record<string, any>[];
}

/** SuccessResponse[list[str]] */
export interface SuccessResponseListStr {
  /**
   * Success
   * @default true
   */
  success?: boolean;
  /** Data */
  data: string[];
}

/**
 * TokenCreate
 * Schema for creating a new access token
 */
export interface TokenCreate {
  /**
   * Name
   * Name of the access token
   */
  name: string;
  /**
   * Scopes
   * List of scopes for the token.
   *         Valid values: all, read:activitypub, read:issue, write:misc, read:notification,
   *         read:organization, read:package, read:repository, read:user
   */
  scopes?:
    | (
        | "all"
        | "read:activitypub"
        | "read:issue"
        | "write:misc"
        | "read:notification"
        | "read:organization"
        | "read:package"
        | "read:repository"
        | "read:user"
      )[]
    | null;
}

/**
 * TokenCreateResponse
 * Response schema for token creation (may include the actual token if returned by API)
 */
export interface TokenCreateResponse {
  /** Id */
  id?: number | null;
  /** Name */
  name?: string | null;
  /** Scopes */
  scopes?:
    | (
        | "all"
        | "read:activitypub"
        | "read:issue"
        | "write:misc"
        | "read:notification"
        | "read:organization"
        | "read:package"
        | "read:repository"
        | "read:user"
      )[]
    | null;
  /** Sha1 */
  sha1?: string | null;
  /** Token Last Eight */
  token_last_eight?: string | null;
  /** Created At */
  created_at?: string | null;
  /** Last Used At */
  last_used_at?: string | null;
}

/**
 * TokenPublic
 * Public schema for access token information
 */
export interface TokenPublic {
  /** Id */
  id?: number | null;
  /** Name */
  name?: string | null;
  /** Scopes */
  scopes?:
    | (
        | "all"
        | "read:activitypub"
        | "read:issue"
        | "write:misc"
        | "read:notification"
        | "read:organization"
        | "read:package"
        | "read:repository"
        | "read:user"
      )[]
    | null;
  /** Sha1 */
  sha1?: string | null;
  /** Token Last Eight */
  token_last_eight?: string | null;
  /** Created At */
  created_at?: string | null;
  /** Last Used At */
  last_used_at?: string | null;
}

/**
 * Transaction
 * A Beancount Transaction directive.
 */
export interface Transaction {
  /**
   * Date
   * Date of the directive
   * @format date
   */
  date: string;
  /**
   * Meta
   * Metadata of the directive
   */
  meta?: Record<string, string | number | boolean | null> | null;
  /**
   * Flag
   * Flag of the transaction
   */
  flag: string;
  /**
   * Payee
   * Payee of the transaction
   */
  payee?: string | null;
  /**
   * Narration
   * Narration of the transaction
   */
  narration?: string | null;
  /**
   * Postings
   * Postings of the transaction
   */
  postings: Posting[];
  /**
   * Tags
   * Entry tags
   * @uniqueItems true
   */
  tags?: string[];
  /**
   * Links
   * Entry links
   * @uniqueItems true
   */
  links?: string[];
}

/**
 * TransactionPublic
 * Public schema for beancount transaction.
 */
export interface TransactionPublic {
  /**
   * Date
   * @format date
   */
  date: string;
  /** Payee */
  payee?: string | null;
  /** Narration */
  narration?: string | null;
  /** Postings */
  postings: PostingPublic[];
}

/**
 * TrialBalanceDataPublic
 * Public schema for trial balance data for visualization.
 */
export interface TrialBalanceDataPublic {
  /** A serializable tree node for account hierarchy. */
  income_hierarchy_data: SerializableTreeNodePublic;
  /** A serializable tree node for account hierarchy. */
  liabilities_hierarchy_data: SerializableTreeNodePublic;
  /** A serializable tree node for account hierarchy. */
  equity_hierarchy_data: SerializableTreeNodePublic;
  /** A serializable tree node for account hierarchy. */
  expenses_hierarchy_data: SerializableTreeNodePublic;
  /** A serializable tree node for account hierarchy. */
  assets_hierarchy_data: SerializableTreeNodePublic;
}

/**
 * UpdateSourceSliceRequest
 * Request schema for updating a source slice.
 */
export interface UpdateSourceSliceRequest {
  /**
   * Entry Hash
   * Hash of the entry to update
   */
  entry_hash: string;
  /**
   * Sha256Sum
   * SHA256 hash of the current entry source for validation
   */
  sha256sum: string;
  /**
   * New Content
   * New content for the entry
   */
  new_content: string;
}

/**
 * UpdateSourceSliceResponse
 * Response schema for updating a source slice.
 */
export interface UpdateSourceSliceResponse {
  /**
   * Message
   * Success message
   */
  message: string;
  /**
   * Entry Hash
   * Hash of the updated entry
   */
  entry_hash: string;
  /**
   * New Sha256Sum
   * SHA256 hash of the updated entry source
   */
  new_sha256sum: string;
}

/**
 * UpdateWebhookRequest
 * Request model for updating a webhook
 */
export interface UpdateWebhookRequest {
  /**
   * Active
   * Whether the webhook is active
   */
  active?: boolean | null;
  /**
   * Authorization Header
   * Authorization header value
   */
  authorization_header?: string | null;
  /**
   * Branch Filter
   * Branch filter pattern
   */
  branch_filter?: string | null;
  /**
   * Config
   * Webhook configuration
   */
  config?: Record<string, string> | null;
  /**
   * Events
   * List of events to trigger webhook
   */
  events?: WebhookEvent[] | null;
}

/** UserPublic */
export interface UserPublic {
  /** Id */
  id?: number | null;
  /** Login */
  login?: string | null;
  /** Full Name */
  full_name?: string | null;
  /** Login Name */
  login_name?: string | null;
  /** Email */
  email?: string | null;
  /** Active */
  active?: boolean | null;
  /** Is Admin */
  is_admin?: boolean | null;
  /** Created */
  created?: string | null;
  /** Last Login */
  last_login?: string | null;
  /** Source Id */
  source_id?: number | null;
  /** Visibility */
  visibility?: string | null;
  /** Restricted */
  restricted?: boolean | null;
  /** Prohibit Login */
  prohibit_login?: boolean | null;
  /** Description */
  description?: string | null;
}

/**
 * WebhookGiteaRepo
 * Repository information from Gitea webhook (matches Gitea's Repository struct)
 */
export interface WebhookGiteaRepo {
  /**
   * Full Name
   * Full repository name (owner/repo)
   */
  full_name: string;
  /**
   * Name
   * Repository name
   */
  name: string;
  /** Repository owner */
  owner: WebhookGiteaRepoOwner;
}

/**
 * WebhookGiteaRepoOwner
 * Repository owner information from Gitea webhook
 */
export interface WebhookGiteaRepoOwner {
  /**
   * Username
   * Owner username
   */
  username: string;
}

/**
 * WebhookGiteaRequestParams
 * Request parameters for Gitea webhooks (push, repository, etc.)
 *
 * This matches Gitea's webhook payload structure used across different event types.
 * The repository field is consistent across push, repository.create, and other events.
 */
export interface WebhookGiteaRequestParams {
  /** Repository that triggered the webhook */
  repository: WebhookGiteaRepo;
  /** User who triggered the event */
  sender: WebhookGiteaSender;
  /**
   * Action
   * Action that triggered the webhook
   */
  action?: string | null;
}

/**
 * WebhookGiteaResponse
 * Response model for Gitea push webhook
 */
export interface WebhookGiteaResponse {
  /**
   * Status
   * Status of the webhook processing
   */
  status: string;
  /**
   * Repository
   * Full name of the repository
   */
  repository: string;
  /**
   * Timestamp
   * ISO timestamp of when the webhook was processed
   */
  timestamp: string;
  /**
   * Message
   * Human-readable message about the action taken
   */
  message: string;
}

/**
 * WebhookGiteaSender
 * Sender/User information from Gitea webhook
 */
export interface WebhookGiteaSender {
  /**
   * Username
   * Username of the user who triggered the event
   */
  username: string;
}

/**
 * WebhookRepoCreateResponse
 * Response model for repository creation webhook
 */
export interface WebhookRepoCreateResponse {
  /**
   * Status
   * Status of the webhook processing
   */
  status: string;
  /**
   * Repository
   * Full name of the repository
   */
  repository: string;
  /**
   * Hooks Installed
   * List of hooks that were installed
   */
  hooks_installed: string[];
  /**
   * Timestamp
   * ISO timestamp of when the webhook was processed
   */
  timestamp: string;
  /**
   * Message
   * Human-readable message about the action taken
   */
  message: string;
}

/**
 * WebhookResponse
 * Response model for webhook data
 */
export interface WebhookResponse {
  /**
   * Id
   * Webhook ID
   */
  id?: number | null;
  /** Webhook type */
  type?: WebhookType | null;
  /**
   * Active
   * Whether the webhook is active
   */
  active?: boolean | null;
  /**
   * Authorization Header
   * Authorization header value
   */
  authorization_header?: string | null;
  /**
   * Branch Filter
   * Branch filter pattern
   */
  branch_filter?: string | null;
  /**
   * Config
   * Webhook configuration
   */
  config?: Record<string, string> | null;
  /**
   * Events
   * List of events
   */
  events?: WebhookEvent[] | null;
  /**
   * Created At
   * Creation timestamp
   */
  created_at?: string | null;
  /**
   * Updated At
   * Last update timestamp
   */
  updated_at?: string | null;
}

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown>
  extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = "";
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) =>
    fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: "same-origin",
    headers: {},
    redirect: "follow",
    referrerPolicy: "no-referrer",
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === "number" ? value : `${value}`)}`;
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join("&");
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter(
      (key) => "undefined" !== typeof query[key],
    );
    return keys
      .map((key) =>
        Array.isArray(query[key])
          ? this.addArrayQueryParam(query, key)
          : this.addQueryParam(query, key),
      )
      .join("&");
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : "";
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.JsonApi]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.Text]: (input: any) =>
      input !== null && typeof input !== "string"
        ? JSON.stringify(input)
        : input,
    [ContentType.FormData]: (input: any) => {
      if (input instanceof FormData) {
        return input;
      }

      return Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === "object" && property !== null
              ? JSON.stringify(property)
              : `${property}`,
        );
        return formData;
      }, new FormData());
    },
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected mergeRequestParams(
    params1: RequestParams,
    params2?: RequestParams,
  ): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected createAbortSignal = (
    cancelToken: CancelToken,
  ): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<HttpResponse<T, E>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(
      `${baseUrl || this.baseUrl || ""}${path}${queryString ? `?${queryString}` : ""}`,
      {
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type && type !== ContentType.FormData
            ? { "Content-Type": type }
            : {}),
        },
        signal:
          (cancelToken
            ? this.createAbortSignal(cancelToken)
            : requestParams.signal) || null,
        body:
          typeof body === "undefined" || body === null
            ? null
            : payloadFormatter(body),
      },
    ).then(async (response) => {
      const r = response as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const responseToParse = responseFormat ? response.clone() : response;
      const data = !responseFormat
        ? r
        : await responseToParse[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data;
              } else {
                r.error = data;
              }
              return r;
            })
            .catch((e) => {
              r.error = e;
              return r;
            });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data;
    });
  };
}

/**
 * @title Beancount Server
 * @version 1.0.0
 *
 * A FastAPI server for beancount management
 */
export class Api<
  SecurityDataType extends unknown,
> extends HttpClient<SecurityDataType> {
  admin = {
    /**
     * @description Get a ledger by its Gitea repository ID.
     *
     * @tags admin-ledgers
     * @name GetLedgerByRepoId
     * @summary Get Ledger By Repo Id
     * @request GET:/admin/ledgers/{id}
     * @secure
     */
    getLedgerByRepoId: (id: number, params: RequestParams = {}) =>
      this.request<SuccessResponseLedgerPublic, ErrorResponse>({
        path: `/admin/ledgers/${id}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Create a new user
     *
     * @tags admin-users
     * @name CreateUser
     * @summary Create User
     * @request POST:/admin/users
     * @secure
     */
    createUser: (data: CreateUserRequest, params: RequestParams = {}) =>
      this.request<SuccessResponseUserPublic, ErrorResponse>({
        path: `/admin/users`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Delete a user by username
     *
     * @tags admin-users
     * @name DeleteUser
     * @summary Delete User
     * @request DELETE:/admin/users/{username}
     * @secure
     */
    deleteUser: (username: string, params: RequestParams = {}) =>
      this.request<SuccessResponseNoneType, ErrorResponse>({
        path: `/admin/users/${username}`,
        method: "DELETE",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Edit an existing user
     *
     * @tags admin-users
     * @name EditUser
     * @summary Edit User
     * @request PATCH:/admin/users/{username}
     * @secure
     */
    editUser: (
      username: string,
      data: EditUserRequest,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseUserPublic, ErrorResponse>({
        path: `/admin/users/${username}`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Rename an existing user
     *
     * @tags admin-users
     * @name RenameUser
     * @summary Rename User
     * @request POST:/admin/users/{username}/rename
     * @secure
     */
    renameUser: (
      username: string,
      data: RenameUserRequest,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseNoneType, ErrorResponse>({
        path: `/admin/users/${username}/rename`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Create a new webhook
     *
     * @tags admin-webhooks
     * @name CreateWebhook
     * @summary Create Webhook
     * @request POST:/admin/webhooks
     * @secure
     */
    createWebhook: (data: CreateWebhookRequest, params: RequestParams = {}) =>
      this.request<SuccessResponseWebhookResponse, ErrorResponse>({
        path: `/admin/webhooks`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description List all system webhooks
     *
     * @tags admin-webhooks
     * @name ListWebhooks
     * @summary List Webhooks
     * @request GET:/admin/webhooks
     * @secure
     */
    listWebhooks: (
      query?: {
        /**
         * Page
         * Page number of results to return (1-based)
         */
        page?: number | null;
        /**
         * Limit
         * Page size of results
         */
        limit?: number | null;
        /**
         * Type
         * Filter by webhook type (system, default, or both)
         */
        type?: string | null;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListWebhookResponse, ErrorResponse>({
        path: `/admin/webhooks`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get a specific webhook by ID
     *
     * @tags admin-webhooks
     * @name GetWebhook
     * @summary Get Webhook
     * @request GET:/admin/webhooks/{hook_id}
     * @secure
     */
    getWebhook: (hookId: number, params: RequestParams = {}) =>
      this.request<SuccessResponseWebhookResponse, ErrorResponse>({
        path: `/admin/webhooks/${hookId}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Update an existing webhook
     *
     * @tags admin-webhooks
     * @name UpdateWebhook
     * @summary Update Webhook
     * @request PATCH:/admin/webhooks/{hook_id}
     * @secure
     */
    updateWebhook: (
      hookId: number,
      data: UpdateWebhookRequest,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseWebhookResponse, ErrorResponse>({
        path: `/admin/webhooks/${hookId}`,
        method: "PATCH",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Delete a webhook by ID
     *
     * @tags admin-webhooks
     * @name DeleteWebhook
     * @summary Delete Webhook
     * @request DELETE:/admin/webhooks/{hook_id}
     * @secure
     */
    deleteWebhook: (hookId: number, params: RequestParams = {}) =>
      this.request<SuccessResponseNoneType, ErrorResponse>({
        path: `/admin/webhooks/${hookId}`,
        method: "DELETE",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  user = {
    /**
     * @description Get current authenticated user information
     *
     * @tags user
     * @name GetCurrentUserInfo
     * @summary Get Current User Info
     * @request GET:/user/me
     * @secure
     */
    getCurrentUserInfo: (params: RequestParams = {}) =>
      this.request<SuccessResponseUserPublic, ErrorResponse>({
        path: `/user/me`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Search for users
     *
     * @tags user
     * @name SearchUsers
     * @summary Search Users
     * @request GET:/user/search
     * @secure
     */
    searchUsers: (
      query: {
        /** Query */
        query: string;
        /** Page */
        page?: number | null;
        /** Limit */
        limit?: number | null;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListUserPublic, ErrorResponse>({
        path: `/user/search`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),
  };
  ledgers = {
    /**
     * @description Create a new ledger for the current user.
     *
     * @tags ledgers
     * @name CreateLedger
     * @summary Create Ledger
     * @request POST:/ledgers
     * @secure
     */
    createLedger: (data: LedgerCreate, params: RequestParams = {}) =>
      this.request<SuccessResponseLedgerPublic, ErrorResponse>({
        path: `/ledgers`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description List all ledgers for the current user.
     *
     * @tags ledgers
     * @name ListLedgers
     * @summary List Ledgers
     * @request GET:/ledgers
     * @secure
     */
    listLedgers: (
      query?: {
        /** Page */
        page?: number | null;
        /** Limit */
        limit?: number | null;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListLedgerPublic, ErrorResponse>({
        path: `/ledgers`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description List all ledgers for a specific user.
     *
     * @tags ledgers
     * @name ListUserLedgers
     * @summary List User Ledgers
     * @request GET:/ledgers/users/{username}
     * @secure
     */
    listUserLedgers: (
      username: string,
      query?: {
        /** Page */
        page?: number | null;
        /** Limit */
        limit?: number | null;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListLedgerPublic, ErrorResponse>({
        path: `/ledgers/users/${username}`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Search for ledgers/repositories.
     *
     * @tags ledgers
     * @name SearchLedgers
     * @summary Search Ledgers
     * @request GET:/ledgers/search
     * @secure
     */
    searchLedgers: (
      query?: {
        /** Q */
        q?: string | null;
        /** Topic */
        topic?: boolean | null;
        /** Include Desc */
        include_desc?: boolean | null;
        /** Uid */
        uid?: number | null;
        /** Priority Owner Id */
        priority_owner_id?: number | null;
        /** Team Id */
        team_id?: number | null;
        /** Starred By */
        starred_by?: number | null;
        /** Private */
        private?: boolean | null;
        /** Is Private */
        is_private?: boolean | null;
        /** Template */
        template?: boolean | null;
        /** Archived */
        archived?: boolean | null;
        /** Mode */
        mode?: string | null;
        /** Exclusive */
        exclusive?: boolean | null;
        /** Sort */
        sort?: string | null;
        /** Order */
        order?: string | null;
        /** Page */
        page?: number | null;
        /** Limit */
        limit?: number | null;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseLedgerSearchResults, ErrorResponse>({
        path: `/ledgers/search`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Delete a specific ledger.
     *
     * @tags ledgers
     * @name DeleteLedger
     * @summary Delete Ledger
     * @request DELETE:/ledgers/{owner}/{repo_name}
     * @secure
     */
    deleteLedger: (
      owner: string,
      repoName: string,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseNoneType, ErrorResponse>({
        path: `/ledgers/${owner}/${repoName}`,
        method: "DELETE",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Update a specific ledger.
     *
     * @tags ledgers
     * @name UpdateLedger
     * @summary Update Ledger
     * @request PUT:/ledgers/{owner}/{repo_name}
     * @secure
     */
    updateLedger: (
      owner: string,
      repoName: string,
      data: LedgerUpdate,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseLedgerPublic, ErrorResponse>({
        path: `/ledgers/${owner}/${repoName}`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the content of a specific ledger.
     *
     * @tags ledgers
     * @name GetLedger
     * @summary Get Ledger
     * @request GET:/ledgers/{owner}/{repo_name}
     * @secure
     */
    getLedger: (owner: string, repoName: string, params: RequestParams = {}) =>
      this.request<SuccessResponseLedgerPublic, ErrorResponse>({
        path: `/ledgers/${owner}/${repoName}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the content of a specific ledger file, or null if it does not exist.
     *
     * @tags ledger-files
     * @name GetLedgerFile
     * @summary Get Ledger File
     * @request GET:/ledgers/{owner}/{repo_name}/files
     * @secure
     */
    getLedgerFile: (
      owner: string,
      repoName: string,
      query: {
        /** Path */
        path: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        SuccessResponseUnionLedgerFileContentPublicNoneType,
        ErrorResponse
      >({
        path: `/ledgers/${owner}/${repoName}/files`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Create a new file in a specific ledger.
     *
     * @tags ledger-files
     * @name CreateLedgerFile
     * @summary Create Ledger File
     * @request POST:/ledgers/{owner}/{repo_name}/files
     * @secure
     */
    createLedgerFile: (
      owner: string,
      repoName: string,
      data: LedgerCreateFileOptions,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseLedgerFileContentPublic, ErrorResponse>({
        path: `/ledgers/${owner}/${repoName}/files`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Update an existing file in a specific ledger.
     *
     * @tags ledger-files
     * @name UpdateLedgerFile
     * @summary Update Ledger File
     * @request PUT:/ledgers/{owner}/{repo_name}/files
     * @secure
     */
    updateLedgerFile: (
      owner: string,
      repoName: string,
      data: LedgerUpdateFileOptions,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseLedgerFileContentPublic, ErrorResponse>({
        path: `/ledgers/${owner}/${repoName}/files`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Delete a file from a specific ledger.
     *
     * @tags ledger-files
     * @name DeleteLedgerFile
     * @summary Delete Ledger File
     * @request DELETE:/ledgers/{owner}/{repo_name}/files
     * @secure
     */
    deleteLedgerFile: (
      owner: string,
      repoName: string,
      data: LedgerDeleteFileOptions,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseNoneType, ErrorResponse>({
        path: `/ledgers/${owner}/${repoName}/files`,
        method: "DELETE",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the metadata and contents of multiple ledger files in a single request.
     *
     * @tags ledger-files
     * @name GetLedgerFilesContent
     * @summary Get Ledger Files Content
     * @request POST:/ledgers/{owner}/{repo_name}/files-content
     * @secure
     */
    getLedgerFilesContent: (
      owner: string,
      repoName: string,
      data: LedgerGetFilesContentOptions,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListLedgerFileContentPublic, ErrorResponse>({
        path: `/ledgers/${owner}/${repoName}/files-content`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Modify multiple files in a ledger in a single commit.
     *
     * @tags ledger-files
     * @name ChangeLedgerFiles
     * @summary Change Ledger Files
     * @request POST:/ledgers/{owner}/{repo_name}/change-files
     * @secure
     */
    changeLedgerFiles: (
      owner: string,
      repoName: string,
      data: LedgerChangeFilesOptions,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseNoneType, ErrorResponse>({
        path: `/ledgers/${owner}/${repoName}/change-files`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the content of a specific ledger directory.
     *
     * @tags ledger-files
     * @name GetLedgerDirContent
     * @summary Get Ledger Dir Content
     * @request GET:/ledgers/{owner}/{repo_name}/dirs
     * @secure
     */
    getLedgerDirContent: (
      owner: string,
      repoName: string,
      query?: {
        /** Dir Path */
        dir_path?: string | null;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListLedgerFileContentPublic, ErrorResponse>({
        path: `/ledgers/${owner}/${repoName}/dirs`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Download a repository archive (e.g., main.zip, main.tar.gz).
     *
     * @tags ledger-files
     * @name GetLedgerArchive
     * @summary Get Ledger Archive
     * @request GET:/ledgers/{owner}/{repo_name}/archive/{archive}
     * @secure
     */
    getLedgerArchive: (
      owner: string,
      repoName: string,
      archive: string,
      params: RequestParams = {},
    ) =>
      this.request<void, ErrorResponse>({
        path: `/ledgers/${owner}/${repoName}/archive/${archive}`,
        method: "GET",
        secure: true,
        ...params,
      }),
  };
  reports = {
    /**
     * @description Query the ledger.
     *
     * @tags reports
     * @name GetLedgerAttributes
     * @summary Get Ledger Attributes
     * @request GET:/reports/{owner}/{repo_name}/attributes
     * @secure
     */
    getLedgerAttributes: (
      owner: string,
      repoName: string,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseAttributesPublic, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/attributes`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Query the ledger.
     *
     * @tags reports
     * @name GetLedgerOptions
     * @summary Get Ledger Options
     * @request GET:/reports/{owner}/{repo_name}/options
     * @secure
     */
    getLedgerOptions: (
      owner: string,
      repoName: string,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseBeancountOptionsPublic, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/options`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the fava options of a specific ledger.
     *
     * @tags reports
     * @name GetLedgerFavaOptions
     * @summary Get Ledger Fava Options
     * @request GET:/reports/{owner}/{repo_name}/fava-options
     * @secure
     */
    getLedgerFavaOptions: (
      owner: string,
      repoName: string,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseFavaOptionsPublic, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/fava-options`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the beancount.io-specific options of a ledger.
     *
     * @tags reports
     * @name GetLedgerBcioOptions
     * @summary Get Ledger Bcio Options
     * @request GET:/reports/{owner}/{repo_name}/beancountio-options
     * @secure
     */
    getLedgerBcioOptions: (
      owner: string,
      repoName: string,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseBcioOptionsPublic, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/beancountio-options`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the list of plugins configured in the beancount file.
     *
     * @tags reports
     * @name GetLedgerPlugins
     * @summary Get Ledger Plugins
     * @request GET:/reports/{owner}/{repo_name}/plugins
     * @secure
     */
    getLedgerPlugins: (
      owner: string,
      repoName: string,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListStr, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/plugins`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description List the repo-relative Beancount source files that make up this ledger. This is `main.bean` plus every file it transitively `include`s — i.e. exactly the files an entry may be written to and still be picked up by the ledger.
     *
     * @tags reports
     * @name GetLedgerSourceFiles
     * @summary Get Ledger Source Files
     * @request GET:/reports/{owner}/{repo_name}/source-files
     * @secure
     */
    getLedgerSourceFiles: (
      owner: string,
      repoName: string,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListStr, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/source-files`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the commodities of a specific ledger.
     *
     * @tags reports
     * @name GetLedgerCommodities
     * @summary Get Ledger Commodities
     * @request GET:/reports/{owner}/{repo_name}/commodities
     * @secure
     */
    getLedgerCommodities: (
      owner: string,
      repoName: string,
      query?: {
        /** Account */
        account?: string | null;
        /** Filter */
        filter?: string | null;
        /** Time */
        time?: string | null;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        SuccessResponseListCommodityPairWithPricesPublic,
        ErrorResponse
      >({
        path: `/reports/${owner}/${repoName}/commodities`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the transactions for a payee.
     *
     * @tags reports
     * @name GetLedgerPayeeTransactions
     * @summary Get Ledger Payee Transactions
     * @request GET:/reports/{owner}/{repo_name}/payee-transactions
     * @secure
     */
    getLedgerPayeeTransactions: (
      owner: string,
      repoName: string,
      query: {
        /** Payee */
        payee: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        SuccessResponseUnionTransactionPublicNoneType,
        ErrorResponse
      >({
        path: `/reports/${owner}/${repoName}/payee-transactions`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the transactions for a narration.
     *
     * @tags reports
     * @name GetLedgerNarrationTransactions
     * @summary Get Ledger Narration Transactions
     * @request GET:/reports/{owner}/{repo_name}/narration-transactions
     * @secure
     */
    getLedgerNarrationTransactions: (
      owner: string,
      repoName: string,
      query: {
        /** Narration */
        narration: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        SuccessResponseUnionTransactionPublicNoneType,
        ErrorResponse
      >({
        path: `/reports/${owner}/${repoName}/narration-transactions`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the accounts for a payee.
     *
     * @tags reports
     * @name GetLedgerPayeeAccounts
     * @summary Get Ledger Payee Accounts
     * @request GET:/reports/{owner}/{repo_name}/payee-accounts
     * @secure
     */
    getLedgerPayeeAccounts: (
      owner: string,
      repoName: string,
      query: {
        /** Payee */
        payee: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListStr, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/payee-accounts`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the accounts for a narration.
     *
     * @tags reports
     * @name GetLedgerNarrations
     * @summary Get Ledger Narrations
     * @request GET:/reports/{owner}/{repo_name}/narrations
     * @secure
     */
    getLedgerNarrations: (
      owner: string,
      repoName: string,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListStr, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/narrations`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Export events from a specific ledger with optional filtering.
     *
     * @tags reports
     * @name GetLedgerEvents
     * @summary Get Ledger Events
     * @request GET:/reports/{owner}/{repo_name}/events
     * @secure
     */
    getLedgerEvents: (
      owner: string,
      repoName: string,
      query?: {
        /** Account */
        account?: string | null;
        /** Filter */
        filter?: string | null;
        /** Time */
        time?: string | null;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListEventPublic, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/events`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get documents from a specific ledger with optional filtering.
     *
     * @tags reports
     * @name GetLedgerDocuments
     * @summary Get Ledger Documents
     * @request GET:/reports/{owner}/{repo_name}/documents
     * @secure
     */
    getLedgerDocuments: (
      owner: string,
      repoName: string,
      query?: {
        /** Account */
        account?: string | null;
        /** Filter */
        filter?: string | null;
        /** Time */
        time?: string | null;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListDocumentPublic, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/documents`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get detailed account data including metadata, close date, and last entry.
     *
     * @tags reports
     * @name GetLedgerAccounts
     * @summary Get Ledger Accounts
     * @request GET:/reports/{owner}/{repo_name}/accounts
     * @secure
     */
    getLedgerAccounts: (
      owner: string,
      repoName: string,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseDictStrAccountDataPublic, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/accounts`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the currencies of a specific ledger.
     *
     * @tags reports
     * @name GetLedgerPayees
     * @summary Get Ledger Payees
     * @request GET:/reports/{owner}/{repo_name}/payees
     * @secure
     */
    getLedgerPayees: (
      owner: string,
      repoName: string,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListStr, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/payees`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the tags of a specific ledger.
     *
     * @tags reports
     * @name GetLedgerLinks
     * @summary Get Ledger Links
     * @request GET:/reports/{owner}/{repo_name}/links
     * @secure
     */
    getLedgerLinks: (
      owner: string,
      repoName: string,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListStr, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/links`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the years of a specific ledger.
     *
     * @tags reports
     * @name GetLedgerYears
     * @summary Get Ledger Years
     * @request GET:/reports/{owner}/{repo_name}/years
     * @secure
     */
    getLedgerYears: (
      owner: string,
      repoName: string,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListStr, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/years`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the currencies of a specific ledger.
     *
     * @tags reports
     * @name GetLedgerCurrencies
     * @summary Get Ledger Currencies
     * @request GET:/reports/{owner}/{repo_name}/currencies
     * @secure
     */
    getLedgerCurrencies: (
      owner: string,
      repoName: string,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListStr, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/currencies`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the tags of a specific ledger.
     *
     * @tags reports
     * @name GetLedgerTags
     * @summary Get Ledger Tags
     * @request GET:/reports/{owner}/{repo_name}/tags
     * @secure
     */
    getLedgerTags: (
      owner: string,
      repoName: string,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListStr, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/tags`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the errors from a specific ledger.
     *
     * @tags reports
     * @name GetLedgerErrors
     * @summary Get Ledger Errors
     * @request GET:/reports/{owner}/{repo_name}/errors
     * @secure
     */
    getLedgerErrors: (
      owner: string,
      repoName: string,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListBeancountErrorPublic, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/errors`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the account hierarchy of a specific ledger.
     *
     * @tags reports
     * @name GetLedgerHierarchy
     * @summary Get Ledger Hierarchy
     * @request GET:/reports/{owner}/{repo_name}/hierarchy
     * @secure
     */
    getLedgerHierarchy: (
      owner: string,
      repoName: string,
      query: {
        /**
         * Conversion
         * @default "USD"
         */
        conversion?: string;
        /** Account Name */
        account_name: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseSerializableTreeNodePublic, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/hierarchy`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get interval totals for a specific account.
     *
     * @tags reports
     * @name GetLedgerIntervalTotals
     * @summary Get Ledger Interval Totals
     * @request GET:/reports/{owner}/{repo_name}/interval-totals
     * @secure
     */
    getLedgerIntervalTotals: (
      owner: string,
      repoName: string,
      query: {
        /** Account */
        account?: string | null;
        /** Filter */
        filter?: string | null;
        /** Time */
        time?: string | null;
        /** Account Name */
        account_name: string;
        /**
         * Interval
         * Time interval for data aggregation
         * @default "monthly"
         */
        interval?:
          | "year"
          | "yearly"
          | "quarter"
          | "quarterly"
          | "month"
          | "monthly"
          | "week"
          | "weekly"
          | "day"
          | "daily";
        /**
         * Conversion
         * @default "USD"
         */
        conversion?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<
        SuccessResponseListDateAndBalanceWithAccountBalancePublic,
        ErrorResponse
      >({
        path: `/reports/${owner}/${repoName}/interval-totals`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the last entries of assets and liabilities accounts.
     *
     * @tags reports
     * @name GetLedgerAccountLastEntries
     * @summary Get Ledger Account Last Entries
     * @request GET:/reports/{owner}/{repo_name}/account_last_entries
     * @secure
     */
    getLedgerAccountLastEntries: (
      owner: string,
      repoName: string,
      query?: {
        /** Time */
        time?: string | null;
        /** Filter */
        filter?: string | null;
        /** Account */
        account?: string | null;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListAccountLastEntryPublic, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/account_last_entries`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the count of entries per type.
     *
     * @tags reports
     * @name GetLedgerEntriesCountPerType
     * @summary Get Ledger Entries Count Per Type
     * @request GET:/reports/{owner}/{repo_name}/entries_count_per_type
     * @secure
     */
    getLedgerEntriesCountPerType: (
      owner: string,
      repoName: string,
      query?: {
        /** Time */
        time?: string | null;
        /** Filter */
        filter?: string | null;
        /** Account */
        account?: string | null;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListEntriesCountPerTypePublic, ErrorResponse>(
        {
          path: `/reports/${owner}/${repoName}/entries_count_per_type`,
          method: "GET",
          query: query,
          secure: true,
          format: "json",
          ...params,
        },
      ),

    /**
     * @description Get the report of a specific account.
     *
     * @tags reports
     * @name GetLedgerAccountReport
     * @summary Get Ledger Account Report
     * @request GET:/reports/{owner}/{repo_name}/account_report
     * @secure
     */
    getLedgerAccountReport: (
      owner: string,
      repoName: string,
      query: {
        /** Account */
        account?: string | null;
        /** Filter */
        filter?: string | null;
        /** Time */
        time?: string | null;
        /** Account Name */
        account_name: string;
        /**
         * Conversion
         * @default "USD"
         */
        conversion?: string;
        /**
         * Interval
         * Time interval for data aggregation
         * @default "monthly"
         */
        interval?:
          | "year"
          | "yearly"
          | "quarter"
          | "quarterly"
          | "month"
          | "monthly"
          | "week"
          | "weekly"
          | "day"
          | "daily";
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseAccountReportPublic, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/account_report`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the income statement of a specific ledger.
     *
     * @tags reports
     * @name GetLedgerIncomeStatement
     * @summary Get Ledger Income Statement
     * @request GET:/reports/{owner}/{repo_name}/income-statement
     * @secure
     */
    getLedgerIncomeStatement: (
      owner: string,
      repoName: string,
      query?: {
        /** Account */
        account?: string | null;
        /** Filter */
        filter?: string | null;
        /** Time */
        time?: string | null;
        /**
         * Conversion
         * @default "USD"
         */
        conversion?: string;
        /**
         * Interval
         * Time interval for data aggregation
         * @default "month"
         */
        interval?:
          | "year"
          | "yearly"
          | "quarter"
          | "quarterly"
          | "month"
          | "monthly"
          | "week"
          | "weekly"
          | "day"
          | "daily";
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseIncomeStatementDataPublic, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/income-statement`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the trial balance of a specific ledger.
     *
     * @tags reports
     * @name GetLedgerTrialBalance
     * @summary Get Ledger Trial Balance
     * @request GET:/reports/{owner}/{repo_name}/trial-balance
     * @secure
     */
    getLedgerTrialBalance: (
      owner: string,
      repoName: string,
      query?: {
        /** Account */
        account?: string | null;
        /** Filter */
        filter?: string | null;
        /** Time */
        time?: string | null;
        /**
         * Conversion
         * @default "USD"
         */
        conversion?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseTrialBalanceDataPublic, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/trial-balance`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the balance sheet of a specific ledger.
     *
     * @tags reports
     * @name GetLedgerBalanceSheet
     * @summary Get Ledger Balance Sheet
     * @request GET:/reports/{owner}/{repo_name}/balance-sheet
     * @secure
     */
    getLedgerBalanceSheet: (
      owner: string,
      repoName: string,
      query?: {
        /** Account */
        account?: string | null;
        /** Filter */
        filter?: string | null;
        /** Time */
        time?: string | null;
        /**
         * Conversion
         * @default "USD"
         */
        conversion?: string;
        /**
         * Interval
         * Time interval for data aggregation
         * @default "monthly"
         */
        interval?:
          | "year"
          | "yearly"
          | "quarter"
          | "quarterly"
          | "month"
          | "monthly"
          | "week"
          | "weekly"
          | "day"
          | "daily";
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseBalanceSheetDataPublic, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/balance-sheet`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Query the ledger.
     *
     * @tags reports
     * @name GetLedgerOverview
     * @summary Get Ledger Overview
     * @request GET:/reports/{owner}/{repo_name}/overview
     * @secure
     */
    getLedgerOverview: (
      owner: string,
      repoName: string,
      query?: {
        /** Account */
        account?: string | null;
        /** Filter */
        filter?: string | null;
        /** Time */
        time?: string | null;
        /**
         * Conversion
         * @default "USD"
         */
        conversion?: string;
        /**
         * Interval
         * @default "monthly"
         */
        interval?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseOverviewPublic, ErrorResponse>({
        path: `/reports/${owner}/${repoName}/overview`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),
  };
  keys = {
    /**
     * @description Create a new public key for the current user.
     *
     * @tags keys
     * @name CreatePublicKey
     * @summary Create Public Key
     * @request POST:/keys
     * @secure
     */
    createPublicKey: (data: KeyCreate, params: RequestParams = {}) =>
      this.request<SuccessResponseKeyPublic, ErrorResponse>({
        path: `/keys`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description List all public keys for the current user.
     *
     * @tags keys
     * @name ListPublicKeys
     * @summary List Public Keys
     * @request GET:/keys
     * @secure
     */
    listPublicKeys: (
      query?: {
        /**
         * Page
         * Page number for pagination
         */
        page?: number | null;
        /**
         * Limit
         * Number of items per page
         */
        limit?: number | null;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListKeyPublic, ErrorResponse>({
        path: `/keys`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get a specific public key by ID for the current user.
     *
     * @tags keys
     * @name GetPublicKey
     * @summary Get Public Key
     * @request GET:/keys/{key_id}
     * @secure
     */
    getPublicKey: (keyId: number, params: RequestParams = {}) =>
      this.request<SuccessResponseKeyPublic, ErrorResponse>({
        path: `/keys/${keyId}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Delete a specific public key by ID for the current user.
     *
     * @tags keys
     * @name DeletePublicKey
     * @summary Delete Public Key
     * @request DELETE:/keys/{key_id}
     * @secure
     */
    deletePublicKey: (keyId: number, params: RequestParams = {}) =>
      this.request<SuccessResponseNoneType, ErrorResponse>({
        path: `/keys/${keyId}`,
        method: "DELETE",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  collaborators = {
    /**
     * @description List all collaborators for a specific ledger.
     *
     * @tags collaborators
     * @name ListLedgerCollaborators
     * @summary List Ledger Collaborators
     * @request GET:/collaborators/{owner}/{repo_name}
     * @secure
     */
    listLedgerCollaborators: (
      owner: string,
      repoName: string,
      query?: {
        /**
         * Page
         * Page number of results to return (1-based)
         */
        page?: number | null;
        /**
         * Limit
         * Page size of results
         */
        limit?: number | null;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListUserPublic, ErrorResponse>({
        path: `/collaborators/${owner}/${repoName}`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get the permission of a specific collaborator for a ledger.
     *
     * @tags collaborators
     * @name GetLedgerCollaboratorPermission
     * @summary Get Ledger Collaborator Permission
     * @request GET:/collaborators/{owner}/{repo_name}/{collaborator}
     * @secure
     */
    getLedgerCollaboratorPermission: (
      owner: string,
      repoName: string,
      collaborator: string,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseLedgerCollaboratorPermission, ErrorResponse>({
        path: `/collaborators/${owner}/${repoName}/${collaborator}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Add or update a collaborator for a specific ledger.
     *
     * @tags collaborators
     * @name AddOrUpdateLedgerCollaborator
     * @summary Add Or Update Ledger Collaborator
     * @request PUT:/collaborators/{owner}/{repo_name}/{collaborator}
     * @secure
     */
    addOrUpdateLedgerCollaborator: (
      owner: string,
      repoName: string,
      collaborator: string,
      data: LedgerAddCollaboratorOptions,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseNoneType, ErrorResponse>({
        path: `/collaborators/${owner}/${repoName}/${collaborator}`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Delete a collaborator from a specific ledger.
     *
     * @tags collaborators
     * @name DeleteLedgerCollaborator
     * @summary Delete Ledger Collaborator
     * @request DELETE:/collaborators/{owner}/{repo_name}/{collaborator}
     * @secure
     */
    deleteLedgerCollaborator: (
      owner: string,
      repoName: string,
      collaborator: string,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseNoneType, ErrorResponse>({
        path: `/collaborators/${owner}/${repoName}/${collaborator}`,
        method: "DELETE",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  entries = {
    /**
     * @description Add multiple entries of mixed directive types in a single atomic commit. This is the canonical entry-insertion endpoint. All-or-nothing: an un-buildable item (400) or a missing target file (404) aborts the whole request before any write. Valid entries (possibly across several files) are committed together via one Gitea commit.
     *
     * @tags entries
     * @name AddBulkEntries
     * @summary Add Bulk Entries
     * @request POST:/entries/{owner}/{repo_name}/bulk
     * @secure
     */
    addBulkEntries: (
      owner: string,
      repoName: string,
      data: EntryAddBulkEntriesRequest,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseNoneType, ErrorResponse>({
        path: `/entries/${owner}/${repoName}/bulk`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  shell = {
    /**
     * @description Query the shell
     *
     * @tags shell
     * @name QueryShell
     * @summary Query Shell
     * @request GET:/shell/{owner}/{repo_name}/query
     * @secure
     */
    queryShell: (
      owner: string,
      repoName: string,
      query: {
        /** Query */
        query: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseQueryResult, ErrorResponse>({
        path: `/shell/${owner}/${repoName}/query`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Query the shell and return plain text output.
     *
     * @tags shell
     * @name QueryShellText
     * @summary Query Shell Text
     * @request GET:/shell/{owner}/{repo_name}/query-text
     * @secure
     */
    queryShellText: (
      owner: string,
      repoName: string,
      query: {
        /** Query */
        query: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseQueryTextResult, ErrorResponse>({
        path: `/shell/${owner}/${repoName}/query-text`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),
  };
  repo = {
    /**
     * @description Get a list of all commits from a repository.
     *
     * @tags repo
     * @name RepoGetAllCommits
     * @summary Repo Get All Commits
     * @request GET:/repo/{owner}/{repo_name}/commits
     * @secure
     */
    repoGetAllCommits: (
      owner: string,
      repoName: string,
      query?: {
        /** Sha */
        sha?: string | null;
        /** Path */
        path?: string | null;
        /** Stat */
        stat?: boolean | null;
        /** Verification */
        verification?: boolean | null;
        /** Files */
        files?: boolean | null;
        /** Page */
        page?: number | null;
        /** Limit */
        limit?: number | null;
        /** Var Not */
        var_not?: string | null;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListCommitPublic, ErrorResponse>({
        path: `/repo/${owner}/${repoName}/commits`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get specified ref or filtered repository's refs.
     *
     * @tags repo
     * @name RepoListAllGitRefs
     * @summary Repo List All Git Refs
     * @request GET:/repo/{owner}/{repo_name}/git/refs
     * @secure
     */
    repoListAllGitRefs: (
      owner: string,
      repoName: string,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListReferencePublic, ErrorResponse>({
        path: `/repo/${owner}/${repoName}/git/refs`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  journal = {
    /**
     * @description Get journal with advanced filtering support
     *
     * @tags journal
     * @name GetJournal
     * @summary Get Journal
     * @request GET:/journal/{owner}/{repo_name}
     * @secure
     */
    getJournal: (
      owner: string,
      repoName: string,
      query?: {
        /** Account */
        account?: string | null;
        /** Filter */
        filter?: string | null;
        /** Time */
        time?: string | null;
        /**
         * Offset
         * Offset of the first entry
         * @default 0
         */
        offset?: number;
        /**
         * Limit
         * Number of entries to return
         * @min 1
         * @max 1000
         * @default 20
         */
        limit?: number;
        /**
         * Directive Types
         * Filter by directive types (e.g., [DirectiveType.TRANSACTION, DirectiveType.BALANCE], [DirectiveType.COMMODITY], etc.)
         */
        directive_types?: DirectiveType[] | null;
        /**
         * Transaction Subtypes
         * Filter transaction subtypes: cleared (*), pending (!), other (x)
         */
        transaction_subtypes?: TransactionSubtype[] | null;
        /**
         * Document Subtypes
         * Filter document subtypes: discovered (D), linked (L)
         */
        document_subtypes?: DocumentSubtype[] | null;
        /**
         * Custom Subtypes
         * Filter custom subtypes: budget (B)
         */
        custom_subtypes?: CustomSubtype[] | null;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseJournalQueryResponsePublic, ErrorResponse>({
        path: `/journal/${owner}/${repoName}`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Plaintext journal as a beancount file. This endpoint generates a beancount file from the ledger entries, allowing users to get their journal in beancount format. The file includes ledger options and all entries rendered as beancount syntax. Uses string concatenation instead of template engine for generation. Args: ctx: Context dependency with authentication and clients owner: Repository owner repo_name: Repository name account: Optional account filter filter: Optional filter expression time: Optional time filter (e.g., 'year', 'quarter', 'month') Returns: Response with beancount file content
     *
     * @tags journal
     * @name PlaintextJournal
     * @summary Plaintext Journal
     * @request GET:/journal/{owner}/{repo_name}/plaintext
     * @secure
     */
    plaintextJournal: (
      owner: string,
      repoName: string,
      query?: {
        /**
         * Account
         * Account filter
         */
        account?: string | null;
        /**
         * Filter
         * Filter expression
         */
        filter?: string | null;
        /**
         * Time
         * Time filter
         */
        time?: string | null;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponsePlaintextJournalResponse, ErrorResponse>({
        path: `/journal/${owner}/${repoName}/plaintext`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get account journal with change and balance information. This endpoint provides a journal view for a specific account, showing all entries that affect the account along with the change amounts and running balances. This is similar to fava's account journal view. Args: ctx: Context dependency with authentication and clients owner: Repository owner repo_name: Repository name query: Query parameters including account name and options Returns: Response with account journal entries including changes and balances
     *
     * @tags journal
     * @name GetAccountJournal
     * @summary Get Account Journal
     * @request GET:/journal/{owner}/{repo_name}/account-journal
     * @secure
     */
    getAccountJournal: (
      owner: string,
      repoName: string,
      query: {
        /**
         * Account
         * Account name to get journal for
         */
        account: string;
        /** Filter */
        filter?: string | null;
        /** Time */
        time?: string | null;
        /**
         * Offset
         * Offset of the first entry
         * @default 0
         */
        offset?: number;
        /**
         * Limit
         * Number of entries to return
         * @min 1
         * @max 1000
         * @default 20
         */
        limit?: number;
        /**
         * With Children
         * Whether to include subaccounts
         * @default true
         */
        with_children?: boolean;
        /**
         * Conversion
         * Conversion method (at_cost, at_value, units)
         * @default "at_cost"
         */
        conversion?: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseAccountJournalResponsePublic, ErrorResponse>({
        path: `/journal/${owner}/${repoName}/account-journal`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Get context for a specific entry. Returns the entry with its balances before and after, source slice, and SHA256 hash. This is useful for understanding the impact of an entry on account balances.
     *
     * @tags journal
     * @name GetContext
     * @summary Get Context
     * @request GET:/journal/{owner}/{repo_name}/context/{entry_hash}
     * @secure
     */
    getContext: (
      owner: string,
      repoName: string,
      entryHash: string,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseContextPublic, ErrorResponse>({
        path: `/journal/${owner}/${repoName}/context/${entryHash}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Delete a source slice from a journal entry. This endpoint deletes a specific entry from the ledger file by removing its source code lines from the file. The operation is validated using the SHA256 hash to ensure the entry hasn't been modified since it was last read. Args: ctx: Context dependency with authentication and clients owner: Repository owner repo_name: Repository name request: Delete request with entry hash and SHA256 validation Returns: Success response with deletion confirmation Raises: HTTPException: If entry not found, hash mismatch, or deletion fails
     *
     * @tags journal
     * @name DeleteSourceSlice
     * @summary Delete Source Slice
     * @request DELETE:/journal/{owner}/{repo_name}/source-slice
     * @secure
     */
    deleteSourceSlice: (
      owner: string,
      repoName: string,
      data: DeleteSourceSliceRequest,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseDeleteSourceSliceResponse, ErrorResponse>({
        path: `/journal/${owner}/${repoName}/source-slice`,
        method: "DELETE",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Update a source slice in a journal entry. This endpoint updates a specific entry in the ledger file by replacing its source code lines with new content. The operation is validated using the SHA256 hash to ensure the entry hasn't been modified since it was last read. Args: ctx: Context dependency with authentication and clients owner: Repository owner repo_name: Repository name request: Update request with entry hash, SHA256 validation, and new content Returns: Success response with update confirmation and new SHA256 hash Raises: HTTPException: If entry not found, hash mismatch, or update fails
     *
     * @tags journal
     * @name UpdateSourceSlice
     * @summary Update Source Slice
     * @request PUT:/journal/{owner}/{repo_name}/source-slice
     * @secure
     */
    updateSourceSlice: (
      owner: string,
      repoName: string,
      data: UpdateSourceSliceRequest,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseUpdateSourceSliceResponse, ErrorResponse>({
        path: `/journal/${owner}/${repoName}/source-slice`,
        method: "PUT",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Delete multiple source slices from journal entries in a single operation. Entries in the same file are removed with one read and one write per file, validated against their SHA256 hashes before any modification is applied. Args: ctx: Context dependency with authentication and clients owner: Repository owner repo_name: Repository name request: Delete request containing a list of entry hashes and SHA256 checksums Returns: Success response with a list of deleted entry hashes Raises: HTTPException: If any entry is not found, any hash mismatches, or deletion fails
     *
     * @tags journal
     * @name DeleteMultiSourceSlices
     * @summary Delete Multi Source Slices
     * @request DELETE:/journal/{owner}/{repo_name}/source-slices
     * @secure
     */
    deleteMultiSourceSlices: (
      owner: string,
      repoName: string,
      data: DeleteMultiSourceSlicesRequest,
      params: RequestParams = {},
    ) =>
      this.request<
        SuccessResponseDeleteMultiSourceSlicesResponse,
        ErrorResponse
      >({
        path: `/journal/${owner}/${repoName}/source-slices`,
        method: "DELETE",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  legacy = {
    /**
     * @description Get legacy journal entries with enhanced search, filtering, and GraphQL-like pagination
     *
     * @tags legacy
     * @name GetLegacyJournal
     * @summary Get Legacy Journal
     * @request GET:/legacy/journal/{owner}/{repo_name}
     * @secure
     */
    getLegacyJournal: (
      owner: string,
      repoName: string,
      query?: {
        /**
         * First
         * Number of entries to return from the beginning
         */
        first?: number | null;
        /**
         * After
         * Cursor for pagination (date YYYY-MM-DD or index)
         */
        after?: string | null;
        /**
         * Last
         * Number of entries to return from the end
         */
        last?: number | null;
        /**
         * Before
         * Cursor for pagination (date YYYY-MM-DD or index)
         */
        before?: string | null;
        /**
         * Search Query
         * Search across payee, narration, and accounts
         */
        search_query?: string | null;
        /**
         * Account Filter
         * Filter by account (supports regex)
         */
        account_filter?: string | null;
        /**
         * Amount Min
         * Minimum amount filter
         */
        amount_min?: number | null;
        /**
         * Amount Max
         * Maximum amount filter
         */
        amount_max?: number | null;
        /**
         * Entry Types
         * Comma-separated list of entry types to filter
         */
        entry_types?: string | null;
        /**
         * Sort By
         * Sort by field (date, amount, payee)
         * @default "date"
         */
        sort_by?: string;
        /**
         * Sort Order
         * Sort order (asc, desc)
         * @default "desc"
         */
        sort_order?: string;
        /**
         * Detailed
         * Return detailed entry data with additional fields
         * @default false
         */
        detailed?: boolean;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListDict, ErrorResponse>({
        path: `/legacy/journal/${owner}/${repoName}`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),
  };
  healthz = {
    /**
     * @description Health check
     *
     * @tags health
     * @name HealthCheck
     * @summary Health Check
     * @request GET:/healthz
     */
    healthCheck: (params: RequestParams = {}) =>
      this.request<SuccessResponseHealthCheck, ErrorResponse>({
        path: `/healthz`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
  webhook = {
    /**
     * @description Receives Gitea push webhook events and clears the cache for the affected repository
     *
     * @tags webhook
     * @name WebhookGiteaRepoPush
     * @summary Handle Gitea webhook
     * @request POST:/webhook/gitea/repo-push
     * @secure
     */
    webhookGiteaRepoPush: (
      data: WebhookGiteaRequestParams,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseWebhookGiteaResponse, ErrorResponse>({
        path: `/webhook/gitea/repo-push`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Receives Gitea repository.create webhook events and automatically installs custom hooks
     *
     * @tags webhook
     * @name WebhookGiteaRepoCreate
     * @summary Handle Gitea repository creation webhook
     * @request POST:/webhook/gitea/repo-create
     * @secure
     */
    webhookGiteaRepoCreate: (
      data: WebhookGiteaRequestParams,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseWebhookRepoCreateResponse, ErrorResponse>({
        path: `/webhook/gitea/repo-create`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Called synchronously by the Gitea pre-receive custom hook (custom-hooks/pre-receive.d/enforce-directive-limit.sh) with both the pushed (new) and pre-push (old) trees as gzipped tarballs — the hook archives both locally itself, since it already has unauthenticated access to both revisions' git objects and this avoids needing ledger-service to clone (which would require Gitea credentials for private repos) or rely on its ledger cache (which is cleared after every push and would otherwise almost always be cold for a pure git-push workflow). old_archive is omitted for a brand-new branch, treated as 0 pre-existing directives. This endpoint is fail-open: it always returns HTTP 200 with allow=true unless the push definitively grows an already-over-limit free-tier ledger's directive count.
     *
     * @tags webhook
     * @name WebhookGiteaPreReceiveCheck
     * @summary Check the free-tier directive limit before accepting a git push
     * @request POST:/webhook/gitea/pre-receive-check
     * @secure
     */
    webhookGiteaPreReceiveCheck: (
      data: BodyWebhookGiteaPreReceiveCheck,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponsePreReceiveCheckResponse, ErrorResponse>({
        path: `/webhook/gitea/pre-receive-check`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.FormData,
        format: "json",
        ...params,
      }),
  };
  tokens = {
    /**
     * @description List all access tokens for a specific user.
     *
     * @tags tokens
     * @name ListUserTokens
     * @summary List User Tokens
     * @request GET:/tokens/{username}
     * @secure
     */
    listUserTokens: (
      username: string,
      query?: {
        /**
         * Page
         * Page number for pagination
         */
        page?: number | null;
        /**
         * Limit
         * Number of items per page
         */
        limit?: number | null;
      },
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseListTokenPublic, ErrorResponse>({
        path: `/tokens/${username}`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Create a new access token for a specific user.
     *
     * @tags tokens
     * @name CreateUserToken
     * @summary Create User Token
     * @request POST:/tokens/{username}
     * @secure
     */
    createUserToken: (
      username: string,
      data: TokenCreate,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseTokenCreateResponse, ErrorResponse>({
        path: `/tokens/${username}`,
        method: "POST",
        body: data,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Delete a specific access token for a user.
     *
     * @tags tokens
     * @name DeleteUserToken
     * @summary Delete User Token
     * @request DELETE:/tokens/{username}/{token}
     * @secure
     */
    deleteUserToken: (
      username: string,
      token: string,
      params: RequestParams = {},
    ) =>
      this.request<SuccessResponseNoneType, ErrorResponse>({
        path: `/tokens/${username}/${token}`,
        method: "DELETE",
        secure: true,
        format: "json",
        ...params,
      }),
  };
}
