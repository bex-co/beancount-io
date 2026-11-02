import type { InferSelectModel } from "drizzle-orm";
import type { DbExecutor } from "@/drizzle/drizzle";
import type {
  StoreEnvironment,
  StoreProvider,
} from "../store-subscription-model/types";
import type { storeBillingEvents } from "./schema";

export type StoreBillingEvent = InferSelectModel<typeof storeBillingEvents>;

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
