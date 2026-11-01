import type { DbExecutor } from "@/drizzle/drizzle";
import type {
  BillingInterval,
  SubscriptionTier,
} from "@/features/stripe/service/stripe";

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

export interface StoreSubscription {
  id: string;
  userId: string | null;
  provider: StoreProvider;
  environment: StoreEnvironment;
  externalId: string;
  replacedById: string | null;
  productId: string;
  basePlanId: string | null;
  tier: SubscriptionTier | null;
  cycle: BillingInterval | null;
  providerStatus: string;
  status: StoreSubscriptionStatus;
  accessEndsAt: Date | null;
  willRenew: boolean;
  pendingProductId: string | null;
  acknowledgedAt: Date | null;
  revokedAt: Date | null;
  providerUpdatedAt: Date;
  lastVerifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

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
