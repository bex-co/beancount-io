/**
 * Domain input/output types for the ledger workflow. These are plain,
 * transport-agnostic types the workflow OWNS — deliberately decoupled from the
 * GraphQL `@ArgsType`/`@ObjectType` classes in `api/` (which carry TypeGraphQL +
 * class-validator decorators). Resolvers map their GraphQL args/DTOs to/from
 * these (structural compatibility makes the mapping implicit), so the workflow
 * stays reusable from MCP/CLI/Cron without dragging in the transport layer.
 */

// --- Inputs (commands / queries) --------------------------------------------

export enum LedgerTemplate {
  STARTER = "STARTER",
  SAMPLE = "SAMPLE",
}

export interface CreateLedgerCommand {
  name: string;
  description?: string;
  private?: boolean;
  template?: LedgerTemplate;
}

export interface UpdateLedgerCommand {
  name?: string;
  description?: string;
  private?: boolean;
}

export interface CreateLedgerFileCommand {
  path: string;
  content: string;
  message?: string;
}

export interface UpdateLedgerFileCommand {
  path: string;
  content: string;
  sha: string;
  message?: string;
}

export interface DeleteLedgerFileCommand {
  path: string;
  sha: string;
  message?: string;
}

export interface RenameLedgerFileCommand {
  newPath: string;
  oldPath: string;
  message?: string;
}

export interface ListLedgersParams {
  page?: number;
  limit?: number;
}

export interface SearchLedgersParams {
  q?: string;
  topic?: boolean;
  includeDesc?: boolean;
  uid?: number;
  priorityOwnerId?: number;
  teamId?: number;
  starredBy?: number;
  private?: boolean;
  isPrivate?: boolean;
  template?: boolean;
  archived?: boolean;
  mode?: string;
  exclusive?: boolean;
  sort?: string;
  order?: string;
  page?: number;
  limit?: number;
}

export interface GetLedgerFileParams {
  path: string;
}

export interface GetLedgerDirContentParams {
  dirPath?: string | null;
}

// --- Outputs (results) ------------------------------------------------------

export interface LedgerPermissionData {
  admin: boolean;
  pull: boolean;
  push: boolean;
}

export interface LedgerData {
  id: string;
  name: string;
  fullName: string;
  sshUrl: string;
  httpUrl: string;
  empty: boolean;
  private: boolean;
  createdAt: string;
  updatedAt: string;
  size: number;
  permissions?: LedgerPermissionData;
  description?: string | null;
  isStarred?: boolean;
}

export interface LedgerWithDirectiveCountData extends LedgerData {
  // null means the per-ledger count fetch failed (e.g. Fava parse error) —
  // distinct from 0, which means the ledger is empty or genuinely has none.
  directiveCount: number | null;
}

export interface LedgerFileData {
  name: string;
  path: string;
  type: string;
  sha: string;
  size: number;
  content?: string;
  encoding?: string;
  lastCommitSha?: string;
  lastCommitterDate?: string;
  lastAuthorDate?: string;
}

export interface DeleteLedgerResult {
  ledgerId: string;
}

export interface DeleteLedgerFileResult {
  path: string;
}

export interface RenameLedgerFileResult {
  newPath: string;
  oldPath: string;
}

export interface StarLedgerResult {
  success: boolean;
  isStarred: boolean;
  message?: string;
}

export interface LedgerAttributesData {
  accounts: string[];
  tags: string[];
  years: string[];
  links: string[];
  payees: string[];
  currencies: string[];
}

export interface LedgerOptionsData {
  title: string;
  nameAssets: string;
  nameEquity: string;
  nameExpenses: string;
  nameIncome: string;
  nameLiabilities: string;
  accountCurrentConversions: string;
  accountCurrentEarnings: string;
  renderCommas: boolean;
  operatingCurrency: string[];
}

export interface FavaOptionsData {
  accountJournalIncludeChildren: boolean;
  autoReload: boolean;
  collapsePattern: string[];
  conversionCurrencies: string[];
  currencyColumn: number;
  defaultPage: string;
  fiscalYearEnd: { month: number; day: number };
  indent: number;
  invertIncomeLiabilitiesEquity: boolean;
  language: string | null;
  locale: string | null;
  showAccountsWithZeroBalance: boolean;
  showAccountsWithZeroTransactions: boolean;
  showClosedAccounts: boolean;
  sidebarShowQueries: number;
  unrealized: string;
  upcomingEvents: number;
  uptodateIndicatorGreyLookbackDays: number;
  useExternalEditor: boolean;
}

export interface BcioOptionsData {
  defaultFile: string;
  transactionFile: string | null;
  accountFile: string | null;
  priceFile: string | null;
  balanceFile: string | null;
  noteFile: string | null;
  padFile: string | null;
  budgetFile: string | null;
  receiptBaseFolder: string | null;
  receiptStorage: string | null;
  documentFile: string | null;
}
