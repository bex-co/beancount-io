import type { DbExecutor } from "@/drizzle/drizzle";
import type {
  StoreEnvironment,
  StoreProvider,
} from "../store-subscription-model/types";

export interface StoreBillingEvent {
  id: string;
  provider: StoreProvider;
  environment: StoreEnvironment;
  externalEventId: string;
  payload: unknown;
  receivedAt: Date;
  processedAt: Date | null;
  attempts: number;
  lastError: string | null;
}

export interface RecordStoreBillingEventInput {
  provider: StoreProvider;
  environment: StoreEnvironment;
  externalEventId: string;
  payload?: unknown;
}

export interface IStoreBillingEventModel {
  /**
   * Record a notification once, and return its row either way. `isNew` is
   * false for a redelivery, so the caller can tell whether it was processed.
   */
  record(
    db: DbExecutor,
    input: RecordStoreBillingEventInput,
  ): Promise<{ event: StoreBillingEvent; isNew: boolean }>;
  markProcessed(db: DbExecutor, id: string): Promise<void>;
  /** Count a failed attempt. `error` must already be redacted. */
  markFailed(db: DbExecutor, id: string, error: string): Promise<void>;
}
