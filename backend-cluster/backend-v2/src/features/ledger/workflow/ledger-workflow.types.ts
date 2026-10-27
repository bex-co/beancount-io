import type { LedgerSetup } from "@/features/ledger/setup/build-ledger";

/**
 * Domain input/output types for the ledger workflow. These are plain,
 * transport-agnostic types the workflow OWNS — deliberately decoupled from the
 * GraphQL `@ArgsType`/`@ObjectType` classes in `api/` (which carry TypeGraphQL +
 * class-validator decorators). Resolvers map their GraphQL args/DTOs to/from
 * these (structural compatibility makes the mapping implicit), so the workflow
 * stays reusable from MCP/CLI/Cron without dragging in the transport layer.
 */

// --- Inputs (commands / queries) --------------------------------------------

/**
 * The repository host's limit on a ledger description (Gitea 1.24's
 * `MaxSize(2048)` on create and edit), declared on every surface (w23/037).
 */
export const LEDGER_DESCRIPTION_MAX = 2048;

export enum LedgerTemplate {
  STARTER = "STARTER",
  SAMPLE = "SAMPLE",
}

export interface CreateLedgerCommand {
  name: string;
  description?: string | null;
  private?: boolean | null;
  template?: LedgerTemplate | null;
  /** Setup specification (ADR021); mutually exclusive with `template`. */
  setup?: LedgerSetup | null;
  /** Client-generated idempotency identifier for creation retries (ADR021). */
  requestId?: string | null;
}

export interface UpdateLedgerCommand {
  name?: string | null;
  description?: string | null;
  private?: boolean | null;
  /** Preview the update without committing it (w23/m13/t002). */
  dryRun?: boolean | null;
}

/** One field's current→new values in an updateLedger preview. */
interface LedgerUpdateFieldPreview<T> {
  from: T;
  to: T;
}

/**
 * What an updateLedger preview renders (w23/m13/t002): only provided fields
 * appear, and `warnings` names what deserves a second look — currently a
 * privacy flip to public. Absent on committed updates.
 */
export interface LedgerUpdatePreview {
  name?: LedgerUpdateFieldPreview<string>;
  description?: { from: string | null; to: string };
  private?: LedgerUpdateFieldPreview<boolean>;
  warnings: string[];
}

export interface CreateLedgerFileCommand {
  path: string;
  /** Base64 content, limited to 1 MiB of decoded bytes. */
  content: string;
  message?: string;
}

export interface UpdateLedgerFileCommand {
  path: string;
  /** Base64 full replacement, limited to 1 MiB of decoded bytes. */
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
  updateIncludes?: boolean;
  dryRun?: boolean;
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

interface LedgerPermissionData {
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
  /** True when this is an updateLedger preview; reads and creates omit it. */
  dryRun?: boolean;
  /** The rendered diff; present only on updateLedger previews. */
  preview?: LedgerUpdatePreview;
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

export interface DeleteLedgerCommand {
  /** Preview the deletion without destroying anything (w23/m13/t003). */
  dryRun?: boolean | null;
}

/**
 * What a deleteLedger preview renders (w23/m13/t003): the ledger that would
 * be destroyed plus the warnings that make the irreversibility unmissable.
 * Absent on committed deletes. Counts are deliberately absent — identity +
 * irreversibility is the decision-relevant content, and every count would be
 * another cross-service read with its own failure modes (t001 allowed
 * "counts or equivalent").
 */
export interface LedgerDeletePreview {
  ledgerId: string;
  name: string;
  description: string | null;
  private: boolean;
  empty: boolean;
  size: number;
  warnings: string[];
}

export interface DeleteLedgerResult {
  ledgerId: string;
  /** True when this is a deleteLedger preview; commits echo false. */
  dryRun?: boolean;
  /** The destroy summary; present only on deleteLedger previews. */
  preview?: LedgerDeletePreview;
}

export interface DeleteLedgerFileResult {
  path: string;
}

export interface RenameLedgerFileResult {
  newPath: string;
  oldPath: string;
  updatedIncludes: string[];
  message: string;
  dryRun: boolean;
  /** The rewritten include lines per file; populated on dry runs only. */
  preview: { path: string; text: string }[];
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

export interface LegacyJournalQuery {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  detailed?: boolean;
  searchQuery?: string;
  accountFilter?: string;
  amountMin?: number;
  amountMax?: number;
  entryTypes?: string[];
  sortBy?: string;
  sortOrder?: string;
  groupBy?: string;
}

export interface LegacyJournalResult {
  data: Array<Record<string, unknown> & { date: string }>;
  success: boolean;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string;
    endCursor: string;
    totalCount: number;
  };
}
