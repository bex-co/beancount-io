import type { InferSelectModel } from "drizzle-orm";
import type { DbExecutor } from "@/drizzle/drizzle";
import type { storeSubscriptions } from "./schema";

export enum StoreProvider {
  APP_STORE = "APP_STORE",
  GOOGLE_PLAY = "GOOGLE_PLAY",
}

/** App Review and license testers buy with sandbox evidence (ADR 001 D8). */
export enum StoreEnvironment {
  PRODUCTION = "PRODUCTION",
  SANDBOX = "SANDBOX",
}

export enum StoreSubscriptionStatus {
  ACTIVE = "ACTIVE",
  GRACE = "GRACE",
  PENDING = "PENDING",
  ON_HOLD = "ON_HOLD",
  EXPIRED = "EXPIRED",
  REVOKED = "REVOKED",
  UNKNOWN = "UNKNOWN",
}

export type StoreSubscription = InferSelectModel<typeof storeSubscriptions>;

export type UpsertStoreSubscriptionInput = Omit<
  StoreSubscription,
  "id" | "createdAt" | "updatedAt"
>;

export interface IStoreSubscriptionModel {
  /**
   * Store the verified state of one purchase and return the row as it now
   * stands, which is not the input when the store already holds newer state
   * or the purchase belongs to another account. Writing never moves an owned
   * purchase to a different account.
   */
  upsert(
    db: DbExecutor,
    input: UpsertStoreSubscriptionInput,
  ): Promise<StoreSubscription>;
  findByUserId(db: DbExecutor, userId: string): Promise<StoreSubscription[]>;
}
