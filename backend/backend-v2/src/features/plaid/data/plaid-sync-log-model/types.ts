import { type DbExecutor } from "@/drizzle/drizzle";
import type { PlaidSyncType, PlaidSyncStatus } from "../../types";

export interface PlaidSyncLog {
  id: string;
  userId: string;
  plaidItemId?: string;
  syncType: PlaidSyncType;
  status: PlaidSyncStatus;
  transactionsFetched: number;
  transactionsAdded: number;
  transactionsModified: number;
  transactionsRemoved: number;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface CreatePlaidSyncLogInput {
  userId: string;
  plaidItemId?: string;
  syncType: PlaidSyncType;
  startedAt: Date;
  status: PlaidSyncStatus;
  transactionsFetched?: number;
  transactionsAdded?: number;
  transactionsModified?: number;
  transactionsRemoved?: number;
  errorMessage?: string;
  completedAt?: Date;
}

export interface IPlaidSyncLogModel {
  getById(db: DbExecutor, id: string): Promise<PlaidSyncLog | null>;
  getByUserId(
    db: DbExecutor,
    userId: string,
    limit?: number,
  ): Promise<PlaidSyncLog[]>;
  getByItemId(
    db: DbExecutor,
    plaidItemId: string,
    limit?: number,
  ): Promise<PlaidSyncLog[]>;
  getLatestByItemIds(
    db: DbExecutor,
    plaidItemIds: string[],
  ): Promise<Map<string, PlaidSyncLog[]>>;
  create(db: DbExecutor, input: CreatePlaidSyncLogInput): Promise<PlaidSyncLog>;
}
