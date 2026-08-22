import { type DbExecutor } from "@/drizzle/drizzle";

export interface PlaidTransaction {
  id: string;
  plaidAccountId: string;
  transactionId: string;
  pendingTransactionId?: string;
  date: Date;
  amount: string; // Decimal as string
  merchantName?: string;
  name: string;
  category?: string; // JSON array as string
  isPending: boolean;
  syncedToLedger: boolean;
  ledgerEntryHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlaidTransactionInput {
  plaidAccountId: string;
  transactionId: string;
  pendingTransactionId?: string;
  date: Date;
  amount: string;
  merchantName?: string;
  name: string;
  category?: string;
  isPending: boolean;
}

export interface UpdatePlaidTransactionInput {
  date?: Date;
  amount?: string;
  merchantName?: string | null;
  name?: string;
  category?: string | null;
  isPending?: boolean;
  syncedToLedger?: boolean;
  ledgerEntryHash?: string | null;
}

export interface IPlaidTransactionModel {
  getById(db: DbExecutor, id: string): Promise<PlaidTransaction | null>;
  getByTransactionId(
    db: DbExecutor,
    transactionId: string,
  ): Promise<PlaidTransaction | null>;
  getByAccountId(
    db: DbExecutor,
    plaidAccountId: string,
    limit?: number,
  ): Promise<PlaidTransaction[]>;
  getUnsyncedByAccountId(
    db: DbExecutor,
    plaidAccountId: string,
  ): Promise<PlaidTransaction[]>;
  getUnsyncedByAccountIds(
    db: DbExecutor,
    plaidAccountIds: string[],
  ): Promise<PlaidTransaction[]>;
  getByIds(db: DbExecutor, ids: string[]): Promise<PlaidTransaction[]>;
  getByTransactionIds(
    db: DbExecutor,
    transactionIds: string[],
  ): Promise<PlaidTransaction[]>;
  create(
    db: DbExecutor,
    input: CreatePlaidTransactionInput,
  ): Promise<PlaidTransaction>;
  update(
    db: DbExecutor,
    id: string,
    input: UpdatePlaidTransactionInput,
  ): Promise<void>;
  markAsSynced(
    db: DbExecutor,
    ids: string[],
    ledgerEntryHash: string,
  ): Promise<void>;
  delete(db: DbExecutor, id: string): Promise<void>;
  deleteMany(db: DbExecutor, ids: string[]): Promise<void>;
}
