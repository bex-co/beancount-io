import { type DbExecutor } from "@/drizzle/drizzle";
import type { PlaidItemStatus } from "../../types";

export interface PlaidItem {
  id: string;
  userId: string;
  ledgerRepoId: number;
  itemId: string;
  accessToken: string; // Encrypted
  institutionId: string;
  institutionName: string;
  status: PlaidItemStatus;
  errorCode?: string;
  errorMessage?: string;
  transactionsCursor?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlaidItemInput {
  userId: string;
  ledgerRepoId: number;
  itemId: string;
  accessToken: string; // Already encrypted
  institutionId: string;
  institutionName: string;
}

export interface UpdatePlaidItemInput {
  status?: PlaidItemStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
  transactionsCursor?: string | null;
  accessToken?: string; // Already encrypted
  ledgerRepoId?: number;
}

export interface IPlaidItemModel {
  getById(db: DbExecutor, id: string): Promise<PlaidItem | null>;
  getByItemId(db: DbExecutor, itemId: string): Promise<PlaidItem | null>;
  getByUserId(db: DbExecutor, userId: string): Promise<PlaidItem[]>;
  getByLedgerRepoId(db: DbExecutor, ledgerRepoId: number): Promise<PlaidItem[]>;
  getActiveItems(
    db: DbExecutor,
    limit: number,
    offset: number,
  ): Promise<PlaidItem[]>;
  create(db: DbExecutor, input: CreatePlaidItemInput): Promise<PlaidItem>;
  update(
    db: DbExecutor,
    id: string,
    input: UpdatePlaidItemInput,
  ): Promise<void>;
  delete(db: DbExecutor, id: string): Promise<void>;
  /**
   * Deletes all Plaid items owned by a user (account-deletion cleanup, #1619
   * follow-up). Callers are responsible for best-effort removing each item
   * from Plaid first — this only removes the local rows. Child rows in
   * plaid_accounts/plaid_transactions/plaid_sync_logs cascade-delete via FK.
   */
  deleteByUserId(db: DbExecutor, userId: string): Promise<void>;
  /**
   * Deletes all Plaid items scoped to a ledger (ledger-deletion cleanup).
   * Callers are responsible for best-effort removing each item from Plaid
   * first — this only removes the local rows. Child rows in
   * plaid_accounts/plaid_transactions/plaid_sync_logs cascade-delete via FK.
   */
  deleteByLedgerRepoId(db: DbExecutor, ledgerRepoId: number): Promise<void>;
}
