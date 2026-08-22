import type { InferSelectModel } from "drizzle-orm";
import { type DbExecutor } from "@/drizzle/drizzle";
import type { plaidWebhookEvents } from "./schema";

export type PlaidWebhookEvent = InferSelectModel<typeof plaidWebhookEvents>;

export type PlaidWebhookEventStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface CreatePlaidWebhookEventInput {
  webhookType: string;
  webhookCode: string;
  itemId: string;
  rawBody: string;
}

export interface UpdatePlaidWebhookEventStatusInput {
  status: PlaidWebhookEventStatus;
  processedAt?: Date;
  errorMessage?: string;
}

export interface IPlaidWebhookEventModel {
  create(
    db: DbExecutor,
    input: CreatePlaidWebhookEventInput,
  ): Promise<PlaidWebhookEvent>;
  getById(db: DbExecutor, id: string): Promise<PlaidWebhookEvent>;
  getPendingEvents(
    db: DbExecutor,
    limit?: number,
  ): Promise<PlaidWebhookEvent[]>;
  markAsProcessing(db: DbExecutor, id: string): Promise<void>;
  markAsCompleted(db: DbExecutor, id: string): Promise<void>;
  markAsFailed(db: DbExecutor, id: string, error: Error): Promise<void>;
  getByItemId(
    db: DbExecutor,
    itemId: string,
    limit?: number,
  ): Promise<PlaidWebhookEvent[]>;
  getByStatus(
    db: DbExecutor,
    status: PlaidWebhookEventStatus,
    limit?: number,
  ): Promise<PlaidWebhookEvent[]>;
  deleteCompletedEvents(db: DbExecutor, olderThan: Date): Promise<number>;
}
